## Linxact Lens Technical Report

**Linxact Lens** is an enterprise-scale SEO and backlink analysis platform that discovers hidden backlinks and analyzes private blog networks (PBNs). The system combines distributed web crawling, massive data processing pipelines, and a modern web application to deliver competitive intelligence on link profiles.

### Purpose and Problem Solved

The platform solves a critical problem for SEO professionals and digital marketers: discovering high-quality, often-hidden backlinks that competitors use. It analyzes both publicly visible and obscured link networks (including Private Blog Networks) across the web, then exposes relationship patterns through an interactive query and analysis interface. Users can search by domain, link type, server information, WordPress detection, and custom filters to find both obvious and concealed link networks.

### Architecture and Key Components

**Multi-Tiered System**:

**1. Distributed Web Crawler (.NET 6 | linxact-crawler/)**
- Parallel multi-threaded domain crawling with configurable concurrency
- Sitemap discovery and processing with XML parsing
- WordPress detection and classification heuristics
- IP abuse checking, robots.txt compliance, and domain parsing using public suffix lists
- Link extraction and parsing with protocol validation (http/https)
- Horizontal scalability via AWS SQS-driven work dispatch
- Integration with AWS S3 for seed/result artifact storage

**2. Data Processing Pipelines (Python/AWS Glue | glue-scripts/)**
- ETL filtering and transformations for linkcwp, sitemap data, and WordPress imports
- JSON-to-Parquet conversion with compression (snappy encoding)
- Large-scale deduplication and data quality scoring
- Spark-based distributed processing on AWS Glue infrastructure
- Output partitioning optimized for query performance (partitioned by first 2 characters of root domain)

**3. Lambda/Athena Query Engine (Python AWS Lambda | linxact-api/lens/)**
- GraphQL resolver functions bridging frontend to data warehouse
- AWS Athena SQL queries against Parquet datasets stored in S3
- Multiple dataset variants: hidden links (H), non-hidden links (NH), sitemaps (SM), WordPress imports, linkcwp heuristics, redirects
- Aggregate query support: metadata, backlinks, referring domains, redirects
- CSV/TXT export capabilities with on-demand streaming
- Query result caching with 360-minute TTL via Athena's ResultReuseConfiguration
- Complex SQL with filtering: anchor text matching, nofollow/dofollow distinction, text vs. image links

**4. Frontend Application (Next.js 14.2 | lens/)**
- Server-side rendered React 18 web application
- Tailwind CSS with custom breakpoints (mobile: 360px, desktop: 1200px, big-desktop: 1920px)
- Material-UI components for charts and complex UI
- React Leaflet for geographic visualization; dual Google Maps integration
- User session management with cookie-based auth

**5. API Service (Cloudflare Workers/Wrangler | lens/api-service/)**
- Serverless API hosted on Cloudflare edge network
- GraphQL resolvers for Amplify AppSync integration
- Stripe payment processing with session management
- User authentication (signup, signin, password reset)
- Rate limiting and session validation
- CORS origin validation for cross-domain requests
- Email sending via SES integration

**6. Infrastructure Orchestration (Python/Kubernetes | kube-jobs/)**
- EKS job orchestration across multiple AWS regions (Virginia, North Carolina, Ohio, Oregon)
- YAML-based Kubernetes job definitions
- S3 lifecycle management
- Batch job enqueuing and monitoring with cross-region result replication

### Data Scale and Performance

- **Total dataset scope**: ~8.6 billion initial records, optimized to 7.6 billion after deduplication
- **Processed file volume**: 45,761 newly added files containing 16.2+ billion records during single pipeline run
- **Delta Lake storage**: 48,467 files removed through optimization — aggressive compaction
- **Query handling**: Partition-based pruning via 2-character domain prefix reduces query scope dramatically on billion-record tables
- **Athena caching**: 6-hour query result reuse window minimizes redundant computation
- **Export batching**: SQS-based message batching (10 items per batch) for scalable async operations
- **Pagination**: Offset/limit queries on billion-record datasets with sorting flexibility

### Notable Technical Decisions

**Partition Strategy**: Domain prefixes (first 2 chars of lowercased, dot-stripped domain) dramatically narrow query scope for single-domain lookups. This compensates for otherwise massive table sizes without requiring a dedicated data warehouse.

**Dataset Multiplexing**: Maintains parallel dataset variants (H, NH, SM, heuristics, linkcwp) enabling A/B comparison of crawl strategies and filtering effectiveness. MERGE operations deduplicate across versions.

**Cloudflare Workers Edge Deployment**: API service runs on Cloudflare Workers for global latency reduction and cost efficiency vs. traditional cloud VMs.

**Athena over Traditional Data Warehouse**: SQL-on-S3 via Athena avoids maintaining expensive managed clusters; queries read Parquet directly from S3 with columnar pruning. Cost scales with queries, not uptime.

**Serverless-First Architecture**: Lambda functions for query execution, Cognito for auth, AppSync for GraphQL layer removes operational burden while maintaining auto-scaling.

**WordPress-Specific Detection**: Pipeline includes dedicated WordPress heuristics, indicating PBN networks often built on WordPress (easy deployment, common CMS in spam networks).

### Technology Stack

- **Crawling**: .NET 6, C#, AngleSharp (HTML parsing), Nager.PublicSuffix (domain parsing), DnsClient (IP resolution)
- **Data Processing**: Python 3, AWS Glue, Apache Spark, Delta Lake (ACID transactions), Parquet (columnar storage)
- **Query Engine**: AWS Athena, SQL, Lambda, GraphQL
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Material-UI, Leaflet, ApexCharts
- **API**: Cloudflare Workers, itty-router, Stripe SDK, Resend (email)
- **Auth**: AWS Cognito, bcryptjs password hashing
- **Infrastructure**: AWS EKS, Kubernetes, SQS, S3, IAM
- **Deployment**: Wrangler (Cloudflare), pnpm workspaces, Docker (via EKS)

### Unusual Technical Challenges Solved

**Detecting Intentional Link Obscuration**: The hidden vs. non-hidden classification suggests the crawler detects advanced evasion (JavaScript rendering of links, iframe injection, client-side link generation) that naive HTML parsers miss. This is the core differentiating IP — most backlink tools only see what's in raw HTML.

**Massive Deduplication at Scale**: Processing 16B+ records to remove 1B+ duplicates while maintaining link context requires sophisticated MERGE logic — evidenced by detailed Delta Lake transaction audit logs showing insert + delete counts tracked separately.

**Query Performance on 8B+ Record Tables**: Partition pruning reduces search space; Athena's columnar format ensures only referenced fields are scanned; result caching prevents repeated computation of expensive aggregations. No traditional database could serve these queries at this cost.

**Cross-Region Consistency**: EKS jobs distributed across 4 AWS regions coordinate results via S3 replication with lifecycle policies, ensuring eventual consistency without blocking writes.

**Real-Time Link Metadata**: The system extracts and indexes rich metadata per link (server type, IP geolocation, WordPress version detection, word count, image count, internal/external link ratios) from billions of URLs — requiring custom detectors and content-type inference built into the crawler.

The platform represents a sophisticated link intelligence engine combining industrial-strength crawling, petabyte-scale data processing, and interactive query capabilities to reveal hidden link networks that standard SEO tools miss.
