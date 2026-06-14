## Technical Report: linxact-api

### Overview and Problem Domain

**linxact-api** is a serverless AWS GraphQL API providing backlink analysis and domain intelligence services for SEO and competitive research. It enables users to query massive hyperlink datasets across the internet to discover which domains/URLs link to a target, with granular filtering and aggregation capabilities. The service targets SEO professionals and content marketers needing rich linking data for competitor analysis and link building strategy.

### Architecture and Core Components

The system is built on **AWS Serverless** using three independent Lambda functions (Python 3.9, 120-second timeout):

1. **LinxactAthenaFunction** (`lens/app.py`) — Primary query router (50+ field mutations/queries via GraphQL). Routes by `fieldName`, dispatching to domain-specific query modules for metadata, backlinks, domains, redirects, and exports. Uses 11-way if/elif chain to map GraphQL field names to handler functions.

2. **S3AnnouncerFunction** (`s3_announcer/app.py`) — Event-driven export trigger. Listens to S3 ObjectCreated events on the export bucket, publishes via AppSync GraphQL mutation to signal export completion.

3. **UserdataFunction** (`userdata/app.py`) — Cognito lifecycle hook. Auto-confirms/verifies users on signup; validates against existing email addresses to prevent duplicates.

#### Data Pipeline

```
GraphQL Request → Lambda (app.py) → Route by fieldName → Query Module
  → Build Athena SQL → Execute async → Poll status → Process results → Return
```

### Query and Data Model

**Data sources** are partitioned Athena tables on S3:
- `dataset_2409_h` (hidden backlinks, crawler-discovered)
- `dataset_2409_nh` (non-hidden/public backlinks)
- `linkcwp_sm` (sitemap sources)
- `linkcwp_heuristics` (heuristic-derived links)
- `linkcwp` (LinkCWP dataset)
- `hredirects` (HTTP redirect chains)

**Partition strategy**: First 2 characters of lowercased root domain (no dots). Example: `example.com` → `part = 'ex'`. Used in every WHERE clause for partition pruning.

**Core tables** carry link-level granularity:
```
link_protocol, link_domain, link_path, link_query, link_root_domain
domain, path, query, protocol (linking page)
meta_title, text (anchor text), img, rel, wordcount, server
internal_link_count, external_link_count, root_domain_count, wordpress
```

**Query modules** (lens/ directory):
- `backlinks_filtered.py` — Returns inbound links to target with optional filters (anchor text, dofollow/nofollow, text/image links, HTTP/HTTPS schema). Two separate query strings for hidden vs. non-hidden datasets.
- `domains_filtered.py` — Aggregates backlinks by source domain, groups URLs from same domain, counts links per domain.
- `metadata_filtered.py` — High-level summaries: link/domain/root domain/IP/CC counts, TLD distribution, dofollow vs. nofollow split, image vs. text link counts, average content length.
- `redirects.py` — Resolves redirect chains for target URL.

### Technical Decisions

**1. Async Query Execution Model**
- Athena queries are fire-and-forget via `start_query_execution()`. Caller gets back query ID immediately.
- Separate GraphQL mutations (`getAggregates`, `exportGetBodyById`) poll query status in a tight loop (0.5s sleep) waiting for completion.
- Trade-off: Avoids 120-second Lambda timeout wall; scales to multi-minute queries. Downsides: two-stage UX, client must track query IDs.

**2. Query Result Caching (6 hours)**
```python
ResultReuseConfiguration: {
  'ResultReuseByAgeConfiguration': {
    'Enabled': True,
    'MaxAgeInMinutes': 360
  }
}
```
Athena caches query results for 6 hours. Identical queries reuse cached results at no cost.

**3. Synchronous Post-Query Processing**
- Once Athena query completes, Lambda immediately fetches results and transforms them inline.
- HTML unescaping applied to link anchor text, page titles, image alt text.
- Synthetic data injection for heuristic/sitemap sources: inflates link counts (+5 internal, +1 external, +2 root domains) to denote lower confidence.

**4. URL Input Normalization** (functions.py)
- `get_input_term()` converts user input (root_domain/domain/url/path) into SQL WHERE clauses.
- Uses `tldextract` (no-fetch mode) for TLD parsing to extract registered domain, subdomain.
- Path matching supports wildcards: `/blog` matches `/blog`, `/blog/`, `/blog/post1`, etc.

**5. Quota/Rate Limiting via DynamoDB**
- `UserData` table tracks per-user queries/exports, subscription tier, expiration date.
- Increments counter via `Stats.increment_queries()`, compares against `QueriesLimit`.
- No built-in enforcement in code; assumes frontend/AppSync middleware checks limits.

### Performance & Scale Characteristics

**Timeout**: 120 seconds (SAM Globals). Most backlink queries complete in 2–5 seconds; metadata aggregations 1–2 seconds.

**Partition Pruning**: All queries filter by `part = 'XX'` (first 2 chars of root domain), dramatically reducing Athena scan scope. Partitioning likely reduces per-query scan from terabytes to gigabytes.

**Result Limits**:
- Export queries: `LIMIT 1000000` (hard cap)
- Pagination: `OFFSET`/`LIMIT` used for UI pagination (typical limits 10–100 rows per request)

**Athena Query Reuse**: 360-minute (6-hour) cache avoids redundant scans for repeated queries (same filters → same hash → cache hit).

**Pagination via OFFSET**: Used in backlinks/domains queries; no cursor-based pagination. OFFSET can become slow on large datasets but acceptable given typical result set sizes.

**S3 Export Storage**: Results written to `s3://linxact-export/public/` (Athena output) and `s3://linxact-export/csv/` (post-processed CSV exports). S3 trigger → AppSync publish pattern notifies clients of export completion.

### Authentication & Authorization

**Cognito Integration** (UserdataFunction):
- Pre-signup trigger auto-confirms/auto-verifies users.
- Validates unique email (raises exception if user exists).
- No explicit auth in Athena queries; assumes AppSync/API Gateway enforces via Cognito tokens.

**AppSync/GraphQL**: API layer sits in front. API Key hardcoded in S3Announcer; security risk in production.

### Database and Caching Strategy

**Primary Storage**: Partitioned S3-backed Athena tables (immutable, append-only, queried via Presto SQL).

**User Metadata**: DynamoDB `UserData` table (email as partition key). Atomic increments, no transactions.

**Export Metadata**: DynamoDB `ExportQueryCounter` table (query ID as key; tracks in-flight exports).

**No application-level caching** (Redis, ElastiCache); relies entirely on Athena result cache.

### Notable Design Patterns

**1. Service Classes with Static Methods**
`Stats` encapsulates DynamoDB operations. All methods static, shared boto3 client instantiated at module load.

**2. String-Based SQL Construction**
Raw f-strings build SQL queries. Input validation only via `tldextract` and URL parsing; comma-separated filter values (anchor text LIKE clauses) are passed largely unsanitized.

**3. Data Transformation Post-Query**
HTML unescaping and synthetic data injection happen in Lambda, not in SQL. Keeps SQL simple but couples logic to result format.

**4. Sibling Domain Amplification**
SM (sitemap) and heuristics-sourced links receive inflated counts (+5 internal, +1 external, +2 root domains), acknowledging lower data quality and signaling to downstream consumers.

**5. Dual Hidden/Non-Hidden Query Paths**
Most query modules maintain separate SQL builders for hidden vs. non-hidden datasets, reflecting different table schemas and data provenance.

**6. Map Aggregation in SQL**
TLD/dofollow/linktype counts use Athena's `map_agg()` function, serialized as map literals and parsed post-hoc in Python with manual `=` → `:` substitution to make it JSON-parseable.

### Technology Stack

- **Compute**: AWS Lambda (Python 3.9)
- **Query Engine**: Amazon Athena (Presto dialect SQL)
- **Storage**: S3 (Athena tables, export results)
- **Metadata/Quotas**: DynamoDB
- **API**: AppSync (GraphQL)
- **Auth**: Cognito
- **IaC**: AWS SAM (CloudFormation)
- **Libraries**: `boto3`, `tldextract`, `requests`, `html` (stdlib)

linxact-api is a narrowly-scoped serverless backlink intelligence API relying on Athena for analytical queries over massive S3-backed datasets, with user quotas tracked in DynamoDB and exports signaled via S3 events. Architecture prioritizes query throughput over real-time latency; async execution model and result caching are core to handling variable query complexity over terabyte-scale datasets.
