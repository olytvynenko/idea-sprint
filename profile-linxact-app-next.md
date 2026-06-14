## Linxact: Next.js SEO/Backlink Analysis Platform

### 1. Application Purpose & Problem Statement

Linxact is a SaaS web application for SEO professionals and marketers targeting the iGaming vertical. It provides backlink and link analysis tools to uncover competitor private blog networks (PBNs), referring domains, metadata, and redirect chains. Users can query domains/URLs across multiple search schemas (hidden/public backlinks), filter by anchor text, link type, and protocol, then export results as CSV. The platform operates on a subscription model (monthly/annual) integrated with Stripe, managing query/export quotas per tier. Primary users investigate SEO competition and PBN structures; the application solves opaque competitor link intelligence at scale.

### 2. Architecture & Key Components

**Routing & Structural Layers:**
- Next.js 14 App Router (file-based) with dynamic route groups: `(front)` (public landing), `(user)` (auth), `(userside)` (authenticated app), `(pbn)` (PBN analysis), `(privacy)/(terms)` (legal)
- 41 API routes in `app/api/` handling: Stripe webhooks, user data mutations, email delivery (SES), CSV export coordination, authentication flow, checkout
- Middleware at root level: geolocation-based pricing model assignment via Cloudflare `CF-IPCountry` header, setting mode cookie for budget vs. premium markets (India, Pakistan, Africa, etc.)

**Component Organization:**
- `src/` contains feature-organized components: `userside/desktop/`, `homepage/`, `pricing/`, `signin/`, `pbn/`, `ui-kit/` (reusable controls), `ui-components/` (page-level)
- Core stateful container: `(userside)/layout.tsx` establishes `UsersideContext` via `useReducer` to share userData (subscription, query counts, limits) and dispatch actions across child routes
- Main analysis UI (`Lens` component): ~300+ lines, renders conditional panes (start state, explorer, error states) based on subscription status, query limits, maintenance mode

**State Management:**
- React Context API + `useReducer` for application-wide state (userData, navigation state, blank account links)
- SessionStorage for search parameters, localStorage for email/pw_hash (SHA256 hashes, not plain passwords)

**Data Fetching & GraphQL:**
- AWS Amplify AppSync GraphQL for core queries and mutations
- Standalone query functions in `src/lib/athena/queries.ts` (~770 lines): `backlinksQuery`, `domainsQuery`, `nhBacklinksQuery` (non-hidden variants), `allMetadataQuery`, `redirectsQuery`, `exportCSVQueryGetQueryId`
- Generic `performQuery` function normalizes input, validates quotas (export/query limits), obfuscates results for "SamplesOnly" tier (masking 10+ rows with asterisks)
- GraphQL subscriptions for CSV export progress monitoring via RxJS Observable pattern

### 3. Notable Technical Decisions

**Authentication & Access Control:**
- AWS Cognito for user identity; custom attributes store `stay_signed_in`, profile metadata as JSON
- Session validation in userside layout checks: Auth status → Stripe session → DynamoDB user record → redirect to /welcome or /pricing if unresolved
- Password hash (SHA256) cached in localStorage to validate email change without re-authentication

**Data Masking for Tier Segmentation:**
- "SamplesOnly" subscription tier shows first 10 results unmasked, remaining results redacted with asterisks (domain, link_url, meta_title, ip fields)
- Logic embedded in `performQuery` function before returning to UI; prevents tier-bridging by export

**Subscription & Billing Integration:**
- Stripe as primary payment processor; webhooks handle `customer.subscription.updated` and `customer.subscription.deleted` events
- DynamoDB `UserData` table stores: StripeCustomerId, Subscription (price tag), SubscriptionTitle, SubscriptionStatus (ACTIVE/CANCELED), QueriesLimit, ExportsLimit, query/export counters
- Checkout session ID stored in cookie; after payment, DynamoDB record created/updated via `/api/userdata/checkout`

**Email Delivery & Notifications:**
- AWS SES for transactional emails (password change, email change notifications)
- Mailchimp integration for newsletter subscription with tag-based segmentation

**Export Mechanism:**
- CSV export uses GraphQL mutation to request async query ID, then polls via RxJS Observable subscription
- Limit checking: export quota validated before mutation

**Geolocation-Based Pricing:**
- Middleware intercepts all requests, reads Cloudflare geolocation header
- Budget countries (India, Bangladesh, Pakistan, Nigeria, Egypt, Ukraine): base pricing
- Extra budget (Indonesia, Philippines, Vietnam, Mexico, Brazil): medium tier
- Hidden backlink markets (US, EU, UK, Canada, Australia): premium pricing with full link data
- Logic gates visibility of backlink types to enforce regional monetization

### 4. Scale & Performance Characteristics

**Data Pagination & Limits:**
- Default pagination: 15 rows per query (backlinks, domains, redirects); 10 rows for metadata aggregations
- Offset-based pagination via `offset`/`limit` parameters in GraphQL inputs
- IP geolocation lookup (`ipinfo.io`) performed per metadata query to track request origin

**Query Quota System:**
- Per-subscription tier: `QueriesLimit` (e.g., 100, 500, unlimited) and `ExportsLimit` (e.g., 5, 50)
- Counter incremented via `incrementNumberOfQueries` and `incrementNumberOfExports` mutations
- Counters reset on subscription renewal via Stripe webhook handler

**Bundle & Runtime:**
- Standalone Next.js build; SWC minification enabled
- Node memory allocation: `--max_old_space_size=8000` for dev server (indicates large-scale GraphQL result sets)

### 5. Technology Stack

**Core:**
- Next.js 14.2.3, React 18.2.0, TypeScript 4.7.4 (non-strict mode)
- Tailwind CSS 3.1.8 (custom breakpoints: 360px mobile, 1200px desktop, 1920px big-desktop)
- Emotion for styled components

**Backend/API:**
- AWS Amplify 5.3.18 (AppSync GraphQL, Cognito, S3)
- AWS SDK: Cognito Identity Provider, S3, SES, S3 Request Presigner
- Stripe 11.9.1 (payment processing, subscription lifecycle)

**UI & Visualization:**
- Material-UI 5.13
- ApexCharts 3.37.3 + Chart.js 4.3.0 (analytics visualizations)
- React Leaflet 4.1.0 (geospatial link/domain visualization)
- React Select 5.7.0, React Toastify 9.1.1

**Utilities:**
- PSL (Public Suffix List) 1.9.0 — domain parsing and root domain extraction
- RxJS — GraphQL subscription streaming
- MD5 2.3.0, UUID 9.0.1, Moment.js 2.30.1

**Analytics:** Matomo (injected with `beforeInteractive` strategy)

### 6. Non-Obvious Patterns & Domain-Specific Logic

**URL/Domain Input Normalization:**
- Four input modes: `url` (exact), `path` (domain + pathname), `domain` (hostname only), `root_domain` (registered domain via PSL)
- Functions `getDomain()`, `getRootDomain()`, `getPath()` handle edge cases: protocol inference, IPv4/IPv6 detection, fallback regex patterns
- Root domain extraction delegates to PSL library for accurate TLD+1 extraction

**Hidden vs. Non-Hidden Backlinks:**
- Dual query system: `getHBacklinks` (hidden/secret PBNs) vs. `getNhBacklinks` (discovered/known networks)
- Frontend toggles between tabs; user sees different link sources based on search schema selection
- PBN analysis specifically targets hidden networks for competitive intelligence

**Lazy Data Masking:**
- Sample-tier results masked on-the-fly within `performQuery()` before returning to UI
- Mask logic checks row index (hide rows 10+), overwrites sensitive fields
- Prevents tier-bridging by data export; masking happens before observable subscription delivers data

**Custom Popup Manager:**
- `PopupManager` component renders conditional modal overlays (unlock filtering, need SEO, quota warnings)
- Centralized context dispatch for modal lifecycle, triggered by quota/subscription state changes

**Search Parameter Persistence:**
- Query params encoded in session storage at layout level; survives page navigation but not reload
- Supports deep-linking with `target`, `protocol`, `target_mode` URL params

This is a complex, feature-dense SaaS platform leveraging AWS Amplify for backend infrastructure, strict quota enforcement for monetization, geolocation-based pricing tiers, and sophisticated domain/link analysis tooling optimized for SEO competitive intelligence in the iGaming vertical.
