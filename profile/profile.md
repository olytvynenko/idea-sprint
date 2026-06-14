# Alex — Professional Profile

_Last updated: 2026-06-02_

---

## Summary

Senior software engineer, 10+ years. Sole developer at a small SEO company (Linxact), owning everything from frontend to infrastructure. Built and operated a production web-scale data platform — distributed crawler, AWS data engineering pipeline (billions of records, Delta Lake, Athena), multi-region EKS infrastructure, and SaaS product — entirely solo. Currently deepening expertise in AI/LLM tooling and agentic systems.

---

## Core technical strengths

### Distributed web crawler (flagship, production)

Designed and built a distributed web crawler and data platform from scratch, alone:

- **Crawler** (.NET 8 / C#): TPL Dataflow in-pod pipeline, AngleSharp HTML parsing, custom DNS resolution against a rotating resolver pool, manual redirect handling.
- **Distribution**: Kubernetes Jobs + AWS SQS — thousands of ephemeral pods, one seed batch per pod, delete-on-success fault tolerance, pod anti-affinity for egress-IP spread.
- **Anti-detection**: bot-identity rotation (Googlebot, MJ12bot, Semrush, Ahrefs, Chrome UA), Cloudflare block/challenge detection with proxy fallback, robots.txt handling, IP-reputation gating via AbuseIPDB cached in DynamoDB.
- **Scale**: terabytes of crawl data per run to S3 as Parquet/Snappy; up to 1,000 K8s instances per crawl stage; 1.5+ TB processed per pipeline execution.

### AWS data engineering

- AWS Glue / PySpark pipelines producing well-partitioned datasets (billions of records, G.8X workers × 20).
- Delta Lake for incremental updates (MERGE/upserts), schema evolution, data versioning.
- Athena + SAM-based GraphQL backend with seconds-level search latency (360-minute result caching, partition pruning).
- Partitioning strategy: first 2 chars of root domain — every query uses partition pruning.
- Common Crawl data processing: CC domain ranks preprocessor (Lambda, 10 GB memory) + Glue jobs (fallback paths for 48-hour timeout scenarios).
- Cost-aware pipeline design: ~$615 per complete pipeline run across 12–48 hours.

### Multi-region Kubernetes infrastructure (Cluster Infrastructure)

- **4 AWS regions**: us-east-1 (nv), us-west-1 (nc), us-east-2 (ohio), us-west-2 (oregon).
- **Python orchestrator** (`cluster_manager.py`, 1,126 lines): manages Terraform across workspace-isolated clusters; handles state lock detection + force-unlock, orphan ENI cleanup, health checks.
- **41,525 lines of Terraform HCL**: EKS provisioning, VPC, IAM, Karpenter, custom DaemonSets.
- **Karpenter**: dynamic node provisioning with SPOT-based scaling, consolidation policies, NodePool taints (`CrawlJob=true:NoSchedule`).
- **Custom monitoring**: `exit-code-monitor` (CloudWatch metrics for pod exit codes: 0=success, 1=failure, 2=IP abuse, 137=OOM); `ip-abuse-monitor` DaemonSet tainting nodes with `crawler/ip-blocked:NoSchedule`.
- **VPC CNI tuning** for 1,000+ pod clusters: `WARM_ENI_TARGET=1`, `WARM_IP_TARGET=2`, prefix delegation disabled.
- **Ephemeral environments**: fully automated provision → crawl → process → publish → teardown via Step Functions + CodeBuild.

### Step Functions pipeline orchestration (Crawl Pipeline)

- `dataset-create-state-machine`: 1,879 lines, 85+ states across 7 stages; 12–48 hour execution.
- `dataset-update-state-machine`: 1,017 lines for incremental updates.
- Check→execute→notify pattern with comprehensive error handling and retry logic.
- Dynamic stage skipping based on input configuration.

### Infrastructure & automation

- Terraform, CodeBuild, Step Functions for fully automated end-to-end workflows.
- EKS at scale: batch workloads, orchestration, reliability, operational automation.
- Force-destroy capability with AWS API-level cleanup (not just Terraform).

### Linxact SaaS product (full-stack)

- **Backend**: Serverless GraphQL API (AWS Lambda, Python 3.9) with 50+ mutations/queries routing to Athena.
- **Frontend**: Next.js 14 App Router SaaS targeting iGaming SEO vertical; Stripe subscription integration; geolocation-based pricing (Cloudflare `CF-IPCountry`); Cognito auth; 41 API routes.
- **Data model**: multiple Athena table variants (hidden/non-hidden backlinks, sitemaps, WordPress imports, redirect chains); partition strategy consistent across all queries.

### AI / LLM tooling (active)

- Built an AI-powered website modernisation pipeline ("Wayback to the Future" / linxact-build): 6-phase pipeline using Claude Agent SDK, Playwright, Astro, Tailwind CSS.
- `build_validator.py` (2,775 lines): AI-powered pre/post-build error detection and fixing; parses npm/TypeScript errors and applies targeted fixes.
- Fluent with agentic tool use, Claude Code, MCP, prompt engineering.
- Treats AI as an unreliable component — validation, retries, evals.

### Frontend (working level)

- React, Angular, Next.js 14 — sufficient to ship full-stack products solo.

---

## Tech stack

| Area | Technologies |
|---|---|
| Cloud / AWS | Glue, Athena, S3, Lambda, EKS, Step Functions, CodeBuild, SAM, SQS, DynamoDB, CloudWatch |
| Data | Delta Lake, Spark/PySpark, Parquet, Common Crawl, GraphQL |
| Infrastructure | Terraform, Karpenter, Kubernetes, CI/CD, CodeBuild |
| Backend | .NET 8 / .NET Core, C#, Python, GraphQL, REST |
| Frontend | Next.js 14, React, Angular, Tailwind CSS |
| AI/LLM | Claude Agent SDK, Claude Code, MCP, Playwright (AI pipelines) |
| Languages | C#, Python, Scala |

---

## Domain exposure

### SEO and large-scale web data (10+ years)

- Built the full data platform behind a backlink/SEO intelligence product (Linxact Lens): crawler → pipeline → API → SaaS, all solo.
- Deep familiarity with how search engines crawl, index, and rank content.
- Understands buyer language and pain points of SEO teams and digital agencies.
- Relevant emerging area: AI answer engine visibility (LLM SEO) — brands invisible in ChatGPT/Perplexity despite ranking on Google.

---

## Working style

Solo, end-to-end. Designed and operated production systems alone — from Kubernetes manifests to query API to schema design to SaaS billing. Comfortable making architectural calls without committee. Optimises for a working system fast, then hardens from there.

---

## Languages

- **German**: Professional working proficiency. Lived and worked in Germany for 10+ years. Four years without active use — comprehension and writing are solid, spoken fluency needs a short warm-up period.
- **English**: Fluent.
- **Ukrainian**: Native.

## Freelance / contracting preferences

- **Hourly rate**: 60 EUR/hr
- **Communication**: Written preferred (email, chat, async). No phone calls — all project discussions via written channels.
- **Availability**: Short notice.

## Current focus / goals

- AI/LLM systems: agent architecture, observability, evals, cost control.
- Transitioning from freelance delivery to product ownership.
- Target: a senior IC engineering role with clear portfolio proof, or a revenue-generating product seed.

---

## Strongest idea-market fits (idea-sprint, June 2026)

1. **AI agent observability / cost control** — data pipeline thinking applied to LLM token flows.
2. **ETL pipeline monitoring and reliability** — direct AWS data engineering edge; SMB gap below Monte Carlo.
3. **LLM SEO / AI brand visibility** — SEO domain expertise + production-scale web crawling = rare combination.
4. **AI-powered ETL / data pipeline builder** — NL-to-Glue-ETL generation is directly in the wheelhouse.

---

## CV one-liners

- "Senior engineer — built a production web-scale data platform solo: distributed .NET crawler (1,000+ K8s pods, TB/day), AWS Glue/Delta Lake pipeline (billions of records), multi-region EKS infrastructure, and SaaS product."
- "10+ years sole engineer at a SEO data company: designed and operated distributed web crawler, AWS data pipeline, Kubernetes infrastructure (4 regions, 41K lines Terraform), and GraphQL query API — all solo."
- "Polyglot systems engineer (C#, Python, AWS) with deep data engineering and Kubernetes background, now building in the AI agent infrastructure space."

---

## Skills for job applications

**Distributed Systems**: web crawling at scale, .NET 8/C#, Kubernetes (EKS, Karpenter), SQS, fault-tolerant batch orchestration, anti-detection engineering  
**Data Engineering**: AWS Glue, PySpark, Delta Lake, Athena, S3, Parquet, Common Crawl, pipeline design, partitioning, cost optimisation  
**Infrastructure**: Terraform (41K+ lines), AWS Step Functions, CodeBuild, SAM, Lambda, DynamoDB, CloudWatch, Karpenter  
**AI/LLM**: Claude Agent SDK, Claude Code, MCP, agentic pipelines, build validation automation  
**Backend**: .NET Core, C#, Python, GraphQL, REST, Serverless  
**Frontend**: Next.js 14, React, Angular, Tailwind CSS (full-stack capable, not primary)  
**Languages**: C#, Python, Scala  
**Domain**: SEO, backlink intelligence, large-scale web data, iGaming vertical
