## Technical Report: linxact-build Repository

### What It Does

**linxact-build** (internally "Wayback to the Future") is an AI-powered website modernization pipeline that transforms legacy HTML websites into modern, semantic HTML5 Astro sites with Tailwind CSS styling. It's a Python-based orchestration system that takes old websites—from URLs or local directories—and generates completely modernized versions with improved UX, responsive design, and contemporary web standards. It serves as a bridge from the past web (1990s–2000s styling) to modern standards, optionally deploying results to Cloudflare Pages.

### Architecture & Key Components

The pipeline follows a six-phase processing model with clear separation of concerns:

**Phase 1: Prefetching (prefetcher.py, 855 lines)**
- Playwright-based crawler using async I/O to capture complete website content
- Handles archive URLs (Wayback Machine) with special URL normalization
- Downloads and caches all HTML, extracts metadata, respects robots.txt constraints
- Configurable max-pages (default 50), timeout, and depth limits loaded from YAML
- Stores raw HTML and metadata as JSON for downstream processing

**Phase 2: Analysis (analyzer.py, 392 lines)**
- Semantic analysis of prefetched content to extract structure and meaning
- Builds site metadata (title, description, navigation hierarchy)
- Optional: Creates "knowledge graph" for content relationships
- Produces JSON metadata fed to design and generation phases

**Phase 3: Design System Generation (design_agent.py, 522 lines)**
- Uses Claude Agent SDK to analyze site content and generate cohesive Tailwind theme
- Generates tailwind.config.js, global.css, and design tokens
- Detects site type (academic, corporate, creative, tech, nonprofit, blog) from keywords
- Outputs semantic color system + standard Tailwind utilities (pragmatic hybrid approach)
- Creates custom utilities (shadows, animations, z-index layers)

**Phase 4: Astro Site Generation (modernizer.py, 983 lines)**
- Core transformation using Claude Code SDK with prompt-based HTML-to-Astro conversion
- Reads prefetched HTML from pages_dir, applies optimized single-batch processing
- Converts semantic legacy HTML → Astro components + Tailwind-only styling
- Generated sites output to `sites/[domain]/astro-site/`
- Test mode supported: generates only 2-3 full pages, rest as placeholders

**Phase 5: Content Enhancement (rephraser.py, 554 lines; content_generator.py)**
- Optional content rephrase or generation using Claude API
- Supports four generation modes: expand, summarize, restyle, recreate
- Batch processing with configurable parallelism

**Phase 6: Link Enhancement & Build Validation**
- `link_inserter.py`: Adds external links via Perplexity API
- `build_validator.py` (2,775 lines): AI-powered error detection and fixing
  - Pre-build phase: fixes common errors (import statements, path aliases, syntax)
  - Post-build phase: parses npm/TypeScript errors and applies targeted fixes
  - Implements error pattern registry with AI-assisted remediation

**Orchestration (main.py, 671 lines)**
- Command-line entry point with 30+ flags for granular control
- Manages skip flags for each pipeline stage
- Handles three input modes: URL crawling, local HTML, raw content (markdown/YAML/JSON)
- Generates output directory dynamically from domain name

### Technical Decisions & Clever Approaches

**1. AI-First Philosophy (Mandatory)**
- No regex parsers or algorithmic extraction — all content transformation via AI prompts
- YAML-based prompt storage (`prompts/claude-code/`) separate from code
- 3 major prompts: modernize.yaml (20KB), design_agent.yaml, content_analyzer.yaml
- Enforced by CRITICAL_RULES.md and CLAUDE.md documentation

**2. Prompt-Based Design Generation**
- Instead of programmatic color selection, design agent analyzes content semantically and generates CSS
- Produces both semantic (primary, accent, surface) and standard Tailwind colors pragmatically
- Avoids over-abstraction; recognizes that "use gray-200" is sometimes clearer than custom tokens

**3. Prefetch Decoupling**
- Separates crawling from modernization — captures raw HTML once, processes many times
- Enables fast iteration on prompts without re-crawling
- Stores image downloads locally, reducing external dependencies during modernization

**4. Build Validation Loop**
- Two-phase approach: pre-build fixup (syntax, imports) + post-build error parsing
- Maintains error pattern registry; applies targeted AI fixes for categories of errors
- Avoids manual patch anti-pattern by improving prompts/validators instead
- The validator (`build_validator.py`) at 2,775 lines is the most complex file — reflects how hard reliable AI code generation is

**5. Archive URL Support**
- Special handling for Wayback Machine URLs with domain extraction
- Normalizes archive links to enable proper prefetching of archived content
- Detects archive service, timestamp, and original domain automatically

**6. Multi-Provider Support (Extensible)**
- Connector pattern: ClaudeCodeConnector, OpenAI, Gemini options
- Config-driven provider selection; same prompts work across providers
- Enables A/B testing of LLM performance without code changes

### Scale & Performance Characteristics

- **Concurrency**: Playwright crawling uses async I/O; batch size configurable (default 3, recommended 10+ for large sites)
- **Memory**: Prefetch stores pages as JSON in memory (50 pages ~50MB typical)
- **Build Time**: Astro build + npm deps ~2-3 min per site; modernization ~1-2 min for 50 pages
- **Retry Logic**: Exponential backoff for API calls, max-retries flag (default 2)
- **Max Pages**: Configurable (default 50); test mode limits to 3 for speed
- **Repository Size**: ~2.2GB (mostly node_modules); core source is ~11K lines Python; prompt files total ~50KB
- **Tested Against**: 7+ real legacy sites (heavensgate.com, jahrbuch, servaholics.de, etc.)

### Technologies & Dependencies

**Core Stack:**
- Claude Code SDK + Anthropic SDK (AI provider)
- Astro (static site generator, target output)
- Tailwind CSS (styling framework)
- Playwright (browser automation for crawling)
- FastAPI (optional backend for UI)
- SQLAlchemy + aiosqlite (metadata caching)

**Supporting:**
- BeautifulSoup4 (HTML parsing)
- PyYAML (config/prompt loading)
- Python-dotenv (env var management)
- Tenacity (retry logic)
- Pydantic (data validation)

**Deployment:**
- Express.js server (Node) for browsing generated sites locally
- Apache config generation for VirtualHosts
- Cloudflare Pages support (optional deployment)

### Non-Obvious Technical Details

**YAML Prompts as First-Class Config**: Prompts are not inline strings but first-class YAML files with model selection, system prompts, and task templates — enables version control and A/B testing of prompt variations without code changes.

**Design Philosophy Documented**: DESIGN_PHILOSOPHY.md explicitly permits both semantic and standard Tailwind colors, rejecting dogmatic purity in favor of pragmatism — unusual for a design system generator to document this explicitly.

**Forbidden Manual Fixes**: CRITICAL_RULES.md enforces an iron rule: never edit generated sites directly; always fix prompts or validators instead — prevents technical debt accumulation at the cost of requiring prompt engineering discipline.

**Express Server Auto-Start**: `run_pipeline.sh` automatically starts a Node.js Express server (port 3100) to browse generated sites, with Apache VirtualHost auto-configuration.

**Content Ingestion Flexibility**: Accepts markdown, YAML, JSON, or plain text — converts to synthetic HTML prefetch structure, enabling website generation from unstructured content, not just crawled HTML. This is a notable inversion: you don't need a website to generate a website.

**Test Mode Trade-Off**: Generates full pages for only first 2-3 URLs, creates placeholder stubs for remaining — enables rapid prototyping without full generative cost. Smart for a prompt-iteration workflow.
