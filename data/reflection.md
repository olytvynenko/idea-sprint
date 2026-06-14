# Tomorrow's Focus (for Day 2 — 2026-06-03)

## Veins to deepen

1. **AI agent cost + observability** (rank 1, 35.5) — Deepest vein, most money. Search HN specifically for complaints about LangSmith, Helicone, Arize. What do people dislike about existing tools? What do they still do manually after buying an observability tool? Look for Upwork/job postings for "LLM cost monitoring" or "AI agent instrumentation."

2. **AI code quality enforcement** (ranks 2, 5, 16, 17) — Multiple candidates cluster here. Need to distinguish: is the real pain at CI/PR time, in-session, or architectural rules? Find more independent builders (search GitHub for "claude rules", "AI lint", "agent quality"). Check if rust-bucket or ProjectLint have GitHub issues/stars showing demand.

3. **LLM SEO / AI brand + audit** (ranks 3, 4) — These two should probably merge into one product. Search for complaints from SEO professionals about declining organic traffic and missing AI visibility. Look at Product Hunt for AISee / First Answer comments.

## Sources to use tomorrow
- HN Algolia: "LangSmith missing", "Helicone lacks", "agent monitoring wish", "AI lint rules", "organic traffic AI", "brand ChatGPT"
- G2 low-star: Arize AI, Helicone, Braintrust (LLM observability space)
- Product Hunt: search "AI observability", "LLM monitoring" for comments on recent launches
- GitHub: search "claude rules", "agent quality gate", "AI lint" for repos showing demand

## Source fixes
- Remove Stack Exchange from task-prompt (blocked by proxy)
- HN Algolia works well — keep as primary API, use hitsPerPage=8 to avoid oversized responses
- Lemmy: try tomorrow with `https://lemmy.world/api/v3/post/list?type_=All&sort=TopWeek&limit=20`

## Strategic note for Day 2
Ideas #1, #9, #13 (agent cost SDK + output validator + cost forecasting) are a natural bundle — consider treating them as one product in scoring going forward rather than three separate candidates. Same for #3 + #4 (LLM brand visibility + AI SEO audit).
