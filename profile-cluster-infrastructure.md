## Cluster Infrastructure Repository Technical Profile

### Purpose and Problem Solved

This repository manages **distributed multi-region Kubernetes infrastructure for large-scale web crawling operations** across four AWS regions (us-east-1, us-west-1, us-east-2, us-west-2). It solves the problem of provisioning, scaling, and orchestrating compute-intensive crawling workloads while maintaining cost efficiency through ARM64 architecture and automated cluster lifecycle management. The system processes crawl results through Delta Lake (Parquet-based ACID transactions) for deduplication and data enrichment across iterations.

### Architecture and Key Components

#### Orchestration Layer: cluster_manager.py (1126 lines)
Central Python orchestrator that executes Terraform across workspace-isolated clusters. Key responsibilities:
- **Workspace management**: Multi-cluster isolation via Terraform workspaces (nv, nc, ohio, oregon)
- **Configuration hierarchy**: Environment variables → Parameter Store (`/crawl/clusters`) → Local `terraform.tfvars.json`
- **State lock handling**: Automatic detection and force-unlock of Terraform state locks
- **Orphan resource cleanup**: ENI (Elastic Network Interface) cleanup and pattern-matching for cluster-specific resources
- **Health checks**: Cluster status verification and comprehensive health diagnostics

#### Infrastructure-as-Code (41,525 lines of Terraform HCL)

**Core modules**:
- `cluster/` - EKS cluster provisioning with VPC, managed node groups
  - Uses terraform-aws-modules/eks v20.37
  - System managed node group: 2x m7i.large (ON_DEMAND, CriticalAddonsOnly taint)
  - EKS 1.33, API authentication mode
  - VPC: 10.0.0.0/16 with public subnets (10.0.0.0/20, 10.0.16.0/20, etc.) and intra subnets
  - Auto-scales across 3-4 availability zones per region

- `karpenter/` - Dynamic node provisioning
  - Terraform-aws-modules/karpenter v20.37
  - Helm chart v1.5.0 deployed with 2 replicas
  - NodePool template with taints (`CrawlJob=true:NoSchedule`)
  - EC2NodeClass discovery tags and custom IAM role
  - Consolidation: 60-second window, WhenEmpty policy, 20% disruption budget

- `exit-code-monitor/` - Pod exit code analyzer
  - Kubernetes Deployment (1 replica, 128Mi/256Mi memory requests/limits)
  - RBAC: watch pods, patch nodes
  - CloudWatch metrics publisher for exit codes (0=success, 1=failure, 2=IP abuse, 137=OOM)
  - Image: `411623750878.dkr.ecr.us-east-1.amazonaws.com/crawler-arm:exit-code-monitor-latest`

- `ip-abuse-monitor/` - Node tainting for IP-blocked instances
  - DaemonSet in `ip-abuse-monitor` namespace
  - Host networking, tolerates all taints
  - Watches pod failures and taints nodes with `crawler/ip-blocked:NoSchedule`
  - ConfigMap-based monitoring script

#### Networking Architecture
- **VPC CNI optimization** for 1000+ pod clusters:
  - `WARM_ENI_TARGET=1`, `WARM_IP_TARGET=2`, `MINIMUM_IP_TARGET=5`
  - Prefix delegation disabled for better IP visibility
  - Subnet auto-discovery enabled
- **VPC Endpoints**: S3 Gateway (no transfer costs), DynamoDB Gateway, future ECR/EKS/CloudWatch
- **Security groups**: Per-cluster isolation with Karpenter discovery tags

#### Instance Sizing Tiers
Three predefined compute classes via `terraform.tfvars.json`:
- **inst4**: t4g.medium, m6g.medium (2 vCPU, 4GB) — light testing
- **inst8**: r7g.medium, r6g.medium, x2gd.medium, r6gd.medium (2-4 vCPU, 8GB) — standard crawling
- **inst16**: r7g.large, m7g.large, c7g.large (4-8 vCPU, 16GB) — high-parallelism jobs

All instances are ARM64 Graviton processors exclusively (cost optimization).

### Notable Technical Decisions

1. **Workspace-Based Multi-Tenancy**: Terraform workspaces isolate cluster state, allowing independent create/destroy/resize operations without affecting other regions. Critical for multi-region operations.

2. **Two-Phase Destroy Pattern**: Karpenter cleanup (`null_resource.karpenter_cleanup`) runs first to handle finalizers before full infrastructure teardown, preventing dangling nodes and ENIs.

3. **ENI Cleanup Strategy**: `_delete_orphan_enis()` uses three discovery methods (tag keys, cluster-specific tags, description patterns) to handle edge cases where pods are killed but network interfaces remain attached.

4. **Managed Node Group for System Services**: 2x m7i.large nodes with `CriticalAddonsOnly` taint run CNI, CoreDNS, kube-proxy, EBS CSI driver. Separate from Karpenter nodes to isolate crawler workloads.

5. **ARM64-Only Architecture**: Reduces compute costs by 30%+ versus x86, but requires all images (exit-code-monitor, ip-abuse-monitor) to be built for ARM64.

6. **IP Abuse Detection via Exit Codes**: Pod exit code 2 signals IP blocking; nodes are automatically tainted, preventing new workload scheduling without manual intervention.

### Scale/Performance Characteristics

- **Cluster capacity**: 1000+ pods per cluster (tested at this scale)
- **Node scaling**: 30-60 seconds with Karpenter auto-provisioning
- **Job duration**: 15-45 minutes for 1000-URL crawl batches
- **Data processing**: 10-50M records per AWS Glue job
- **Resource utilization**: 90% CPU, 85% memory average during jobs
- **Delta Lake compression**: ~70% space savings via Parquet compression
- **Disruption tolerance**: 20% of nodes can be consolidated/replaced per cycle

### Technologies and Frameworks

**Infrastructure**:
- Terraform 1.5+, AWS EKS 1.33, Karpenter 1.0
- AWS services: EKS, EC2, VPC, Parameter Store, S3, DynamoDB, CloudWatch, SNS
- IAM IRSA (role for service accounts) for fine-grained pod permissions

**Data Processing**:
- Apache Spark 3.3 via AWS Glue 5.0
- Delta Lake format (ACID, time-travel, Z-ordering) on S3
- DynamoDB for execution checkpoints and metrics
- Athena for ad-hoc analysis

**Container Orchestration**:
- Kubernetes 1.33 with managed node groups + Karpenter
- Helm 3 for Karpenter deployment
- kubectl provisioners for manifest application

**Programming**:
- Python 3.11 (cluster_manager.py, analysis scripts)
- Go 1.21 (compiled into container images)
- HCL (Terraform), YAML (Kubernetes manifests)

**CI/CD**:
- AWS CodeBuild (buildspec.yml, Terraform 1.12.2)
- AWS CodePipeline integration (cluster_manager invoked via build phase)

### Distinguishing Technical Approaches

1. **DynamoDB-Backed State Tracking**: DynamoDB tables (`crawl-execution-checkpoints`, `crawler-metrics`, `ip-abuse-tracking`) serve as the single source of truth for job state, enabling resumption across cluster restarts.

2. **Delta Lake MERGE Operations**: Crawl data is deduplicated using Delta's MERGE statement, comparing new results against prior snapshots. This preserves net link discovery metrics despite deduplication (insert + delete operations tracked separately).

3. **CloudWatch Custom Metrics for Pod Analysis**: Exit code monitor publishes per-exit-code metrics, enabling precise alerting on IP blocks (exit 2) versus OOM (exit 137) versus general failures (exit 1).

4. **Orphan Resource Cleanup Strategy**: Three-method ENI discovery (tags, cluster patterns, descriptions) handles edge cases where Terraform state diverges from AWS reality, critical in high-churn cluster lifecycles.

5. **Flexible Instance Selection**: Karpenter NodePool supports instance-families and instance-sizes (not just type whitelists), allowing AWS to select based on real-time spot/on-demand availability.

6. **Kubernetes-Native IP Abuse Detection**: Rather than external IP reputation services, the system uses pod exit codes to identify IP blocks in real-time, taint nodes, and prevent cascading failures.

7. **S3 Gateway Endpoints**: Avoids NAT gateway data transfer charges ($0.045/GB) by routing S3 traffic over private VPC endpoints—critical for 10-50M record Glue jobs.

This architecture prioritizes **cost efficiency through ARM64 + spot instances**, **operational automation via Terraform/Python**, and **intelligent failure recovery through Kubernetes-native monitoring**.
