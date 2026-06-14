## Crawl Infrastructure: Comprehensive Technical Report

### Purpose and Problem Statement

Crawl Infrastructure is an enterprise-grade, multi-region Kubernetes-based distributed web crawling system that automates the provisioning, management, and teardown of EKS clusters across multiple AWS regions. It solves the core infrastructure problem of scaling ephemeral crawling workloads dynamically without manual cluster management, using infrastructure-as-code (Terraform) and automated lifecycle orchestration via AWS CodeBuild.

### Architecture Overview

The system operates as a three-layer infrastructure stack:

1. **Orchestration Layer**: Python-based `ClusterManager` (in `cluster_manager.py`) orchestrates Terraform operations across multiple workspaces, each representing an independent Kubernetes cluster.

2. **Infrastructure Layer**: Terraform modules provision EKS clusters with supporting AWS resources (VPC, IAM, security groups, VPC endpoints) across four regions:
   - Virginia (us-east-1, workspace "nv")
   - North California (us-west-1, workspace "nc")
   - Ohio (us-east-2, workspace "ohio")
   - Oregon (us-west-2, workspace "oregon")

3. **Compute Scaling Layer**: Karpenter handles dynamic node provisioning within each cluster using flexible instance selection rather than hardcoded types.

### Key Components

**Core Orchestration**
- **`cluster_manager.py`** (18,905 bytes): Main orchestrator that implements four actions—`create`, `plan`, `destroy`, `resize`—using a `ClusterManager` class. It manages cluster lifecycle with:
  - Pre-creation health checks (`check_cluster_status`) to detect existing clusters and skip redundant creation
  - Three-stage cluster creation (EKS + node groups → Karpenter deployment → remaining resources)
  - Access entry conflict handling for CodeBuild role integration
  - Force-destroy capability that strips Kubernetes resources from state and uses AWS APIs to terminate instances
  - Orphaned ENI cleanup post-destruction

- **`terraform_runner.py`**: Wraps Terraform CLI execution with:
  - State lock detection and automatic unlocking with `terraform force-unlock`
  - Streaming output for long-running operations
  - Workspace selection/creation helpers
  - Dynamic `cluster_level` resizing (inst4, inst8, inst16) via tfvars modification
  - Cluster config extraction from `terraform.tfvars.json`

- **`config.py`**: Configuration resolution hierarchy:
  1. Environment variables (`ACTION`, `LEVEL`, `CLUSTERS`)
  2. AWS Parameter Store (`/crawl/clusters` StringList)
  3. Fallback to `CLUSTERS` env var
  - Includes `InstanceLevel` enum for sizing tiers and orphan ENI cleanup helpers

- **`eks_health.py`**: Comprehensive health checking:
  - Cluster status polling (ACTIVE/DELETING/etc.)
  - API server connectivity via curl
  - Authentication validation (`aws eks get-token`)
  - Node group health inspection via EKS API
  - kubectl-based checks: node readiness and core pod health (coredns, aws-node, kube-proxy)
  - 10-minute timeout for cluster deletion waits

- **`karpenter_cleanup.py`**: Handles Karpenter lifecycle issues:
  - Access entry conflict resolution (import existing or delete conflicting)
  - Job/pod/NodeClaim deletion before cluster operations
  - Comprehensive Karpenter resource cleanup (helm release, kubectl resources, rbac)
  - Orphaned Karpenter tags removal from cross-VPC security groups/subnets

**Terraform Modules**

- **`cluster/` module**: EKS cluster provisioning
  - `eks.tf`: terraform-aws-modules/eks/aws (~20.37)
    - Kubernetes 1.33, API authentication mode
    - CodeBuild IAM role access entry with cluster admin policy
    - x86_64 managed node group ("default"): m7i.large, 2 nodes, on-demand, CriticalAddonsOnly taints
    - 30GB gp3 EBS volumes per node
    - CloudWatch logs: audit, api, authenticator, controllerManager, scheduler
  
  - `vpc.tf`: terraform-aws-modules/vpc/aws (5.0.0)
    - CIDR 172.31.0.0/16
    - 4 public subnets (172.31.0.0/20 through 172.31.48.0/20)
    - Subnet tagging for Karpenter discovery and ELB provisioning
    - Cleanup provisioner: terminates orphaned EKS and Karpenter instances on destroy
  
  - `vpc_endpoints.tf`: Gateway and Interface endpoints
    - S3 Gateway endpoint with restrictive bucket-level policies
    - ECR API/DKR (Interface), CloudWatch Logs, STS, SSM endpoints
    - VPC endpoint security group limiting to HTTPS (port 443) from VPC CIDR

- **`karpenter/` module**: Karpenter autoscaler (v1.5.0)
  - `karpenter.tf`: 
    - Terraform aws-modules/eks/aws//modules/karpenter creates dedicated node IAM role
    - Helm release with 2 replicas, CriticalAddonsOnly tolerations, 20-minute timeout
    - kubectl manifests: NodePool and EC2NodeClass from templates
    - EKS access entry for Karpenter node role (EC2_LINUX type)
    - Cleanup provisioner on destroy
  
  - `configs/karpenter-nodepool.yaml.tmpl`:
    - Spot instances only
    - Instance categories: m, r, t, c (general/memory/burstable/compute)
    - Generation > 5 (6th gen+), ARM64 architecture
    - Optional instance-families and instance-sizes constraints
    - Taints: CrawlJob with NoSchedule effect
    - Disruption: expireAfter 10000s, consolidation when empty after 10s
  
  - `configs/karpenter-ec2nodeclass.yaml.tmpl`: References cluster instance profile, cluster name

**Backend and State Management**
- S3 remote state bucket (`crawl-terraform-state`, read-only data source)
- DynamoDB lock table (`terraform-locks` with encryption enabled)
- Workspace key prefix: `eks/` (per-workspace state files)
- Multiple provider aliases: `aws` (default region-specific), `aws.state`, `aws.n_virginia` (ECR auth)

**Deployment Pipeline**
- `buildspec.yml`: AWS CodeBuild specification
  - Installs: Terraform 1.12.2, Python 3.11, kubectl
  - Runs: `terraform init` + `python crawl_infrastructure/cluster_manager.py`
  - Caches terraform plugins at `/root/.terraform/`

### Notable Technical Decisions and Patterns

**1. Workspace-Based Multi-Cluster Isolation**
Each cluster (nv, nc, ohio, oregon) runs in a separate Terraform workspace, enabling independent state files and lifecycle management. The `terraform.tfvars.json` maps workspace names to region/cluster-name pairs, avoiding the need for multiple directories.

**2. Three-Stage Cluster Creation with Idempotence**
- **Stage 1** creates core infrastructure (EKS cluster + managed node groups)
- **Stage 2** installs Karpenter (with health checks and cleanup)
- **Stage 3** applies remaining resources
This prevents Karpenter access entry conflicts and ensures proper OIDC provider availability before Helm installation.

**3. Flexible Karpenter Instance Selection**
Rather than hardcoding instance types (e.g., `r7g.medium`, `r6g.medium`), the configuration uses instance category/generation constraints. This:
- Adapts to AWS instance lifecycle (6th gen → 7th gen)
- Allows Karpenter and EC2 Fleet API to optimize cost dynamically
- Reduces availability zone constraints by accepting multiple instance families

**4. Force-Destroy with State Stripping**
The destroy operation has two modes:
- **Normal**: Target Karpenter resources first (respecting finalizers), then terraform destroy
- **Force** (triggered on health check failure): Strip Kubernetes resources from Terraform state, then use AWS APIs (EC2, EKS) to directly terminate instances. This breaks stuck finalizers without manual intervention.

**5. Access Entry Conflict Handling**
CodeBuild and Karpenter node provisioning can conflict when adding EKS access entries. The system detects conflicts and either:
- Imports existing entries (if they match expected configuration)
- Deletes conflicting entries (if external systems created them)

**6. Health Check-Driven Recreation**
If an existing cluster is unhealthy (API inaccessible, auth failures, unhealthy node groups), the system automatically destroys and recreates it rather than attempting repair. This ensures predictable, repeatable state.

**7. Orphan Resource Cleanup**
The system cleans up three types of orphans:
- ENIs (via boto3, tagged with cluster identifiers, status=available)
- Karpenter discovery tags on cross-VPC security groups/subnets
- Karpenter instances/jobs before reinstallation

### Scale and Performance Characteristics

**Multi-Region Deployment**
- Four independent clusters across four AWS regions (Virginia, N. California, Ohio, Oregon)
- Each cluster spans 2–4 availability zones (az count varies by region)
- Up to 5 cluster workspaces configurable (default, nv, nc, ohio, oregon)

**Node Sizing Tiers**
Three predefined instance levels (controlled via `cluster_level` tfvar):
- **inst4**: Small (t4g.medium, m6g.medium) — cost-optimized for light workloads
- **inst8**: Medium (r7g.medium, r6g.medium) — balanced for crawling workloads
- **inst16**: Large (r7g.large) — high-memory for data-heavy operations

**Cluster Compute Resources**
- Managed node group: 2 on-demand m7i.large nodes (x86_64, CriticalAddonsOnly taint)
- Karpenter: 2 Helm replicas, dynamic spot instances (arm64, ARM64 Graviton processors)
- EKS 1.33 API server, CloudWatch audit/API/authentication logging

**Networking**
- VPC CIDR: 172.31.0.0/16 (65,536 IPs)
- 4 public subnets per cluster (/20 each, 4,096 IPs per subnet)
- VPC endpoints: S3, ECR, CloudWatch, STS, SSM (Interface endpoints shared across subnets)

**Timeouts and Delays**
- Karpenter Helm release wait timeout: 1,200 seconds (20 minutes)
- Cluster deletion wait: 600 seconds (10 minutes) with 30-second polls
- Token retrieval: 10-second timeout
- Job/pod deletion: 30–60 second kubectl timeouts
- OIDC provider ready wait: 30-second sleep (null_resource provisioner)

### Technology Stack and Dependencies

**Infrastructure Provisioning**
- Terraform 1.12.2+ with state in S3 + DynamoDB
- terraform-aws-modules/eks/aws ~20.37
- terraform-aws-modules/vpc/aws 5.0.0
- Terraform providers: aws, helm, kubectl

**Kubernetes and Container Orchestration**
- EKS 1.33 (Kubernetes 1.33)
- Karpenter 1.5.0 (Helm chart)
- kubectl CLI for resource management

**Programming and Scripting**
- Python 3.11 (cluster_manager, terraform_runner, config, eks_health, karpenter_cleanup)
- Bash scripting (buildspec.yml, run-terraform-pipeline.sh, cleanup provisioners)

**AWS Services**
- EKS (Kubernetes control plane)
- EC2 (on-demand and spot instances, instance termination)
- IAM (roles, access entries, IRSA/OIDC)
- VPC (subnets, security groups, endpoints)
- S3 (Terraform state, data buckets)
- DynamoDB (Terraform locks)
- CloudWatch (logs, monitoring)
- Parameter Store (cluster list configuration)
- SQS (Karpenter interruption queue, auto-created)
- CodeBuild (pipeline execution)

### Distinguishing and Hard-Problem Features

**1. Automated Cluster Health Validation**
Before applying Terraform changes, the system validates cluster health across multiple dimensions: API connectivity (curl), authentication (AWS SDK), node readiness (kubectl), and core system pod health. Failed checks trigger automatic cluster recreation—a pattern rarely seen in IaC-only approaches.

**2. Stateful Cleanup Despite Terraform Immutability**
Terraform destroy can leave orphaned resources (ENIs, security group tags) when Kubernetes finalizers or custom cleanup logic fail. The system accounts for this by:
- Running post-destroy cleanup scripts via null_resource provisioners
- Using boto3 to query and delete ENIs by tag
- Manually scrubbing Karpenter discovery tags from out-of-scope VPC resources

**3. Three-Way Access Entry Conflict Resolution**
EKS access entries are a point of friction when multiple systems (CodeBuild, Karpenter, Terraform, kubectl) attempt to manage them. The system detects, diagnoses, and resolves conflicts programmatically without human intervention.

**4. Flexible Instance Selection Without Hardcoding**
By configuring Karpenter with instance category/generation constraints rather than explicit types, the system allows dynamic AWS API-driven selection (EC2 Fleet) while maintaining predictable cost and performance profiles. This is more sophisticated than simple instance-type lists.

**5. Workspace-Driven Multi-Region Architecture**
Using Terraform workspaces (rather than separate directories or modules) for region isolation provides a clean separation of state while allowing shared module code. Combined with dynamic azs from tfvars, it scales to arbitrary regions without code duplication.

**6. Force-Destroy with State Stripping**
When cluster health fails, the system bypasses Terraform destroy (which can hang on stuck finalizers) by:
- Removing Kubernetes resource types from state (helm_release, kubectl_manifest, kubernetes_*)
- Using AWS APIs directly to terminate EC2 instances and node groups
- Allowing terraform destroy to succeed without waiting for pods

This pattern is essential for ephemeral infrastructure where Kubernetes cleanup can deadlock.

### Summary

Crawl Infrastructure is a production-grade, multi-region Kubernetes cluster provisioning system optimized for distributed web crawling workloads. Its architecture balances automation (Terraform, CodeBuild, Karpenter) with robustness (health checks, force-destroy, conflict resolution). The codebase demonstrates sophisticated patterns for managing Kubernetes lifecycle edge cases, particularly around finalizers, access control, and orphaned resource cleanup—problems that generic IaC approaches rarely handle well. The system prioritizes repeatability and self-healing over manual recovery, critical for ephemeral infrastructure supporting data-intensive batch workloads.
