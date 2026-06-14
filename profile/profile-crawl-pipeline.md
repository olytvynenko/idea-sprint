## Crawl Pipeline: Distributed Web Crawling Orchestration System

### Overview and Problem Statement

The Crawl Pipeline is a sophisticated AWS-based infrastructure-as-code project that orchestrates large-scale, distributed web crawling operations. It solves the core problems of (1) coordinating complex multi-stage data pipelines spanning 36-48 hours of continuous execution, (2) managing dynamic resource allocation across multiple AWS regions with cost control, (3) handling massive data ingestion (1.5+ TB per run) with ACID guarantees, and (4) preventing IP abuse through exit code monitoring and node tainting. The system processes Common Crawl data, generates seed lists, crawls WordPress sites via multiple strategies (API, sitemaps, URL-based), applies quality filters, and produces queryable Delta Lake tables in Athena.

### Architecture and Core Components

**Orchestration Layer (AWS Step Functions)**
- Two primary state machines: `dataset-create-state-machine` (1,879 lines, 85+ states across 7 stages) and `dataset-update-state-machine` (1,017 lines, manages incremental updates)
- States employ consistent check→execute→notify patterns with comprehensive error handling and retry logic
- Execution time: 12-48 hours depending on enabled stages; cost: ~$615 per complete run
- Dynamic stage skipping based on input configuration enables flexible partial executions

**Infrastructure Management (CodeBuild + Kubernetes)**
- `cluster-manager` CodeBuild project creates/destroys EKS clusters in multiple regions (us-east-1, us-west-2, eu-west-1)
- `crawler-arm-build` builds ARM64 Docker images for cost-optimized container workloads (2-hour timeout)
- `crawler-runner` executes crawl jobs on EKS (20-hour timeout); manages up to 1,000 instances per stage
- Karpenter for dynamic SPOT-based worker scaling (typically 20-50 nodes per crawl stage)
- Admin nodes: 2× m7i.large (persistent) + auto-scaling worker pools (15-minute visibility timeout on queues)

**Data Processing Pipeline (AWS Glue 5.0 + Delta Lake + Spark)**

*CC Domain Ranks Processing (Two-Stage Optimization):*
- Stage 1: `cc-domain-ranks-preprocessor` Lambda (10 GB memory) converts gzipped Common Crawl domain-ranks files to Parquet format (enables parallelization)
- Stage 2: `cc-graph-seed-create-v2` Glue job (G.8X workers × 20, 12-hour timeout) processes Parquet files with optimized Spark configuration; fallback to legacy `cc-graph-seed-create` (48-hour timeout) if optimization fails

*WordPress Data Import:*
- `delta-upsert` Glue job (G.8X workers × 10, 80 DPUs) reads raw crawler output, performs left-join with IP reference data, explodes external links, extracts link components, adds partition columns (`part`, `stage`), and upserts into Delta Lake
- Spark configuration: 800 shuffle partitions, adaptive coalescing, 4GB off-heap memory, 128MB max partition bytes
- Output: 50 coalesced files per run, written to `/links/delta/{dataset}/{h|nh}/`

*Snapshot Creation:*
- Separate Glue jobs for sitemap processing (`sitemap_urls_filters`) and HTML crawl filtering generate Parquet snapshots in `/links/snapshots/{dataset}/{h|nh}/`
- Glue crawlers auto-discover schema and create Athena tables (`dataset_2409_h`, `dataset_2409_nh`)

**Kubernetes Job Specifications**
- Job manifests in YAML (do_sitemap.yaml, do_bot.yaml, etc.) define crawl job specifications
- Key environment variables: `TASK` (sitemap|bot|links), `WORKFLOW`, `IP_ABUSE_CHECK=1`, `SAVE_FORMAT=parquet`, `PAR=100` (parallelism), `RUNS=1`
- Affinity rules: anti-pod affinity preferred, node affinity requires absence of `ip-abuse` label (nodes tainted after exit code 2)
- Image policy: Always pull from `411623750878.dkr.ecr.us-east-1.amazonaws.com/crawler-arm:latest`
- TTL after finished: 60 seconds; backoff limit: 0 (fail fast)

**Data Paths and S3 Organization**
- SSM parameters control bucket (`/s3/bucket`) and dataset (`/crawl/dataset/current`)
- Test mode paths: `test/seed/`, `test/results/` with 5-minute S3 deletion delays
- Production paths: `update/seed/`, `update/results/` with 24-hour deletion delays
- Raw crawl output → `/update/results/{crawl_type}/{h|nh}/` → Glue processing → `/links/delta/` (Delta Lake) and `/links/snapshots/` (Parquet)

**Lambda Functions (12 core functions)**
- `schedule_s3_deletion`: Uses EventBridge cron rules to schedule deletions at precise UTC times; sends HTML-formatted email notifications with timezone conversion (EDT/EST aware)
- `check_s3_deletions`: Verifies deletion success; updates EventBridge rules on completion
- `create_athena_tables`: Runs Glue crawlers for schema discovery (15-minute timeout, 256 MB memory)
- `maintain_cc_domain_ranks`: Downloads latest 4 Common Crawl domain-ranks files
- `stage_notification`: Sends templated email/Slack notifications at pipeline milestones
- `pipeline_advance_notification`: Handles pipeline progression logic
- Exit code monitor: Kubernetes-based deployment preventing IP abuse by tainting nodes on crawler exit code 2

### Notable Technical Decisions and Patterns

**Two-Stage Common Crawl Processing (Preprocess → Process)**
- Initial design ran gzipped CC files directly in Glue (48-hour timeout); analysis revealed 85% time spent decompressing
- Optimization: Lambda preprocesses to Parquet (sequential, bounded) enabling Spark parallelization (12-hour timeout)
- Automatic fallback to legacy job prevents pipeline failure if optimization times out
- Saves ~36 hours per full pipeline run when optimization succeeds

**Exit Code 2 → Node Taint Pattern (IP Abuse Prevention)**
- Crawler exit code 2 signals IP blocklist detection (AbuseDB integration)
- Exit code monitor patches node with `ip-abuse=true:NoSchedule` taint after detecting exit code 2
- Subsequent jobs require absence of `ip-abuse` label in affinity rules (prevents reusing poisoned IPs)
- Critical for maintaining IP reputation across multi-node distributed crawling

**Delta Lake Upsert Strategy (ACID Transactions)**
- Raw Parquet files written by crawlers are read, transformed, joined with IP reference data, exploded on external links, and upserts into Delta table
- Delta format ensures ACID guarantees even with Spark executor failures mid-job
- Partition columns (`part=XX`, `stage=1`) enable efficient querying on root domain hash and stage number
- Snapshot creation via Glue produces separate Parquet files for Athena tables (avoiding direct Delta Lake reads in Athena)

**Dynamic Worker Allocation in Glue**
- Glue jobs use G.8X (32 vCPU, 128 GB) and G.2X (8 vCPU, 32 GB) worker types configured as variables
- CC seed generation: 20 × G.8X workers (160 vCPU total); Delta upsert: 10 × G.8X workers (80 DPUs)
- Spark adaptive shuffle partitions (400-800) prevent memory overflow on large intermediate datasets
- Off-heap memory allocation (4-8GB) reduces GC pauses on long-running jobs

**Multi-Region Cluster Management**
- Single Step Functions execution can orchestrate cluster creation in multiple regions (us-east-1 "nv", us-west-2 "oregon", etc.)
- Cluster aliases (nc, oregon, nv, ohio) mapped to full EKS context names in kube_job.py
- Cross-region data transfer costs (~$144 for 1.6TB egress per full run) factored into pipeline economics

### Scale and Performance Characteristics

**Data Volumes Per Complete Run:**
- WordPress crawl output: ~500 GB
- Sitemap crawl output: ~300 GB
- URL crawl output: ~700 GB
- Total S3 storage footprint: ~1.5 TB (+ intermediate shuffle data)
- Glue shuffle bucket: `linxact-glue-shuffle` (dedicated S3 staging for Spark shuffle operations)

**Concurrency and Scaling:**
- Maximum EKS worker nodes per crawl stage: 1,000 (configurable via MAX_INSTANCES in kube_job.py)
- Typical parallelism: 20-50 SPOT nodes with 1 vCPU, 0GB memory request (burstable)
- SQS message volumes: ~5M messages per full run (2M WordPress, 1M sitemaps, 2M URLs)
- Glue shuffle partitions: 800 for Delta upsert, 200-400 for other jobs

**Timeouts and Delays:**
- Crawler ARM64 build: 120 minutes
- Crawler runner (crawl execution): 1,200 minutes (20 hours)
- Cluster creation/destruction: 10 hours each
- CC seed generation (optimized): 12 hours; (legacy fallback): 48 hours
- Delta upsert: 2 hours per execution
- Athena table creation Lambda: 900 seconds (15 minutes)
- S3 deletion delay (test): 300 seconds (5 minutes); (production): 86,400 seconds (24 hours)
- SQS visibility timeout: 900 seconds (15 minutes)

**Cost Profile (~$615 per complete run):**
- AWS Glue (45%): $321 for 3 jobs totaling 11 DPU-hours
- Data transfer (20%): $144 for 1.6TB egress
- EKS worker nodes (8%): $57.60 for 1,440 node-hours (SPOT)
- S3 storage/requests (4.5%): $32.45
- CloudWatch logs/metrics (3.8%): $27.50
- CodeBuild (2.2%): $15.60
- Remaining (2%): ~$17 (control plane, Lambda, SQS, Step Functions)
- Monthly projection (4 runs): $2,460; annual: $29,520

### Technologies and Frameworks

**Orchestration:** AWS Step Functions (JSON ASL), EventBridge (cron scheduling)
**Container Orchestration:** Amazon EKS, Karpenter (dynamic SPOT scaling), Kubernetes 1.27+
**Data Processing:** Apache Spark (Glue 5.0), Delta Lake, Parquet
**Infrastructure as Code:** Terraform 1.3+, AWS provider 5.0+
**Compute:** AWS CodeBuild, Lambda, AWS Glue Jobs (Python/Spark)
**Storage:** Amazon S3, DynamoDB (ImportData table for upsert tracking)
**Messaging:** Amazon SQS (link distribution), EventBridge (scheduling)
**Monitoring:** CloudWatch (logs, metrics, alarms), CloudWatch Dashboards
**Languages:** Python 3.x (Glue, Lambda, kube-jobs), YAML (Kubernetes manifests), HCL (Terraform)
**APIs:** Boto3 (AWS SDK), Kubernetes Python client, PyYAML

### Non-Obvious Design Patterns and Hard Problems Solved

**IP Reputation Management Across Distributed Crawlers**
- Crawlers run on independent nodes; exiting with code 2 (AbuseDB detection) doesn't directly signal siblings
- Solution: Exit code monitor runs as sidecar DaemonSet, watches Kubernetes events, taints offending nodes
- Subsequent job submissions fail to schedule on tainted nodes even after node reuse (prevents cascade failures)

**Atomic Seed List Generation from Multi-Source Data**
- Common Crawl domain-ranks files arrive as gzipped CSVs (100+ GB), must be processed without holding in memory
- Preprocessing job decompresses streaming to Parquet partition files, enabling Spark to parallelize subsequent graph traversal
- Two-stage design avoids OOM errors that killed earlier monolithic approach (48-hour limit → 12-hour optimization)

**Delta Lake Upsert in Spark Without Merge Contention**
- WordPress data arrives as multiple Parquet files with overlapping domains (same RootDomain in multiple files)
- Naive Spark join + union approach causes shuffle explosion (800 partition joins)
- Solution: Delta Lake MERGE operation with partition pruning; Spark coalesces output to 50 files for efficient snapshots

**Kubernetes Job Scaling Without Cluster Resize Latency**
- Karpenter consolidates Kubernetes workloads onto SPOT nodes with instant termination on pricing changes
- Job manifests use `podAntiAffinity.preferredDuringSchedulingIgnoredDuringExecution` (soft constraint) to spread crawlers
- Allows overcommit during bursty stages; no hard node count limits (graceful degradation under pressure)

**Cost Optimization via ARM64 + SPOT**
- Crawlers are single-threaded (sequential link following); CPU-bound but not memory-intensive
- ARM64 instances (t4g, c7g SPOT) cost ~40% less than x86; custom Docker builds for arm64v8 base images
- SPOT pricing: ~$0.04/hour vs $0.12/hour on-demand (3× savings per worker node)
- Combined savings: ~$150/run compared to equivalent x86 on-demand deployment

### Repository Structure

- `/lambdas/` — 12 Lambda function implementations
- `/kube-jobs/` — Kubernetes job enqueue logic (kube_job.py, 452 lines), YAML templates, utilities
- `/spark/` — Glue job scripts (Delta upsert, sitemap generation, HTML filtering, heuristics)
- `state_machine_*.tf` — Step Functions definitions (nested JSON encoding)
- `glue_jobs*.tf` — Glue job configurations, worker counts, timeouts
- `/docs/` — Comprehensive operational runbooks and architecture guides
