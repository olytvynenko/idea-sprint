# Builder Assets

Edit this freely — it drives the "asset-fit" score. Be honest about what you can
build *unusually well*, not just what you've touched once.

## Core strengths

- **Distributed web crawler (flagship)**: Designed and built solo in .NET 8/C# — TPL Dataflow
  in-pod pipeline, custom DNS against rotating resolver pool, Kubernetes Jobs + SQS for
  distribution (thousands of ephemeral pods), pod anti-affinity for egress-IP spread,
  bot-identity rotation, Cloudflare detection + proxy fallback, AbuseIPDB gating via DynamoDB.
  Output: terabytes/day to S3 as Parquet/Snappy.

- **AWS data engineering**: Glue/PySpark pipelines at billions of records; Delta Lake
  (MERGE/upserts, schema evolution, versioning); Athena + SAM-based GraphQL backend with
  seconds-level search latency; partitioning, file-sizing, cost/performance tuning.

- **Infrastructure & automation**: Terraform + CodeBuild + Step Functions for fully automated
  provision → crawl → process → publish → teardown workflows. EKS at scale, ephemeral
  environments, batch orchestration.

- **SEO domain (10+ years sole engineer)**: Deep understanding of how search engines crawl,
  index, and rank. Built the data platform that collects this at web scale.

- **AI / LLM tooling (active)**: Agentic workflows, Claude Code, MCP, prompt engineering.
  Understands observability, cost attribution, structured output, evals. Treats AI as an
  unreliable component — not a black box.

- **Frontend (working level)**: React, Angular — enough to ship full-stack products solo.

## Rare / differentiating assets (these make ideas defensible)

- Production distributed crawler with anti-detection, K8s orchestration, and terabyte-scale
  output — very few solo builders have shipped this.
- End-to-end AWS data pipeline (Glue → Delta Lake → Athena → GraphQL) at billions of records,
  designed and operated alone.
- SEO + web-data domain depth combined with the engineering to build the underlying platform.
- LLM/agentic fluency layered on top of a strong systems background — rare combination.

## Languages
- German: professional working proficiency (10+ years in Germany); 4 years without active use — writing/reading solid, spoken needs warm-up
- English: fluent
- Ukrainian: native

## Constraints (the scorer must respect these)

- Solo builder
- A demo/MVP must be buildable in days, not months
- Goal: a job (legible proof for hiring managers) OR an income/business seed
- Near-zero infra budget preferred for any build
