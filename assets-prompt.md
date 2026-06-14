# Sync config/assets.md from profile/ (run on demand in Cowork)

Regenerate `config/assets.md` from the profile documents. This file drives the
"asset-fit" score in the idea sprint — it must be a honest, distilled view of
what the builder can build *unusually well*, not a copy of the full CV.

Work entirely inside this project folder. One focused pass.

## Step 1 — Read sources

Read ALL of these before writing anything:

- `profile/profile.md` — master summary (primary)
- every `profile/profile-*.md` — Linxact repo deep dives; mine for concrete
  scale numbers, rare combinations, and defensible edges
- `config/assets.md` — current file (preserve section structure unless a section
  is clearly outdated)

## Step 2 — Distill

Extract only what matters for **scoring candidate ideas**:

**Include in Core strengths**
- Capabilities backed by production systems the builder designed and operated
- Combine related bullets; prefer outcome + scale over tool lists
- Flagship work first (distributed crawler, AWS data pipeline, infra)

**Include in Rare / differentiating assets**
- Combinations few solo builders have (e.g. SEO domain + terabyte crawler +
  Glue/Athena depth + agentic AI fluency)
- Things that make an idea *defensible*, not just buildable

**Include in Languages**
- From `profile/profile.md` — keep concise, note German warm-up caveat if present

**Include in Constraints**
- Solo builder
- Demo/MVP buildable in days, not months
- Goal: job proof OR income/business seed
- Near-zero infra budget preferred
- Add or update constraints if profile.md states new goals (rate, remote, comms
  style) that would affect which ideas score well — keep this section short

**Exclude**
- Raw repo file paths, line counts, and architecture detail (that stays in profile/)
- Technologies mentioned once with no production story
- CV one-liners, job-application skills lists, freelance rate (unless added to
  Constraints as relevant)
- Idea-market fit hypotheses from profile.md (that belongs in the sprint shortlist,
  not assets)

## Step 3 — Write

Overwrite `config/assets.md` using exactly these sections and headings:

```
# Builder Assets

Edit this freely — it drives the "asset-fit" score. Be honest about what you can
build *unusually well*, not just what you've touched once.

## Core strengths

(bullet list — 5–8 bullets, bold lead phrase per bullet)

## Rare / differentiating assets (these make ideas defensible)

(bullet list — 3–6 bullets)

## Languages

(bullet list)

## Constraints (the scorer must respect these)

(bullet list)
```

Target length: roughly what fits on one screen (~40–60 lines). Shorter is fine
if nothing was overstated.

## Step 4 — Sanity check

Before finishing, verify:

- Every core strength claim is supported by at least one profile file
- Nothing in assets.md contradicts profile.md
- Wording is scorer-oriented ("can build X at Y scale") not résumé-oriented
- If profile files were updated since the last assets sync, the diff is reflected

Do not modify any file except `config/assets.md`.

## Guardrails

- Only READ profile files and the existing assets file; WRITE only
  `config/assets.md`.
- Do not invent projects, scale numbers, or skills absent from profile/.
- When in doubt, omit rather than inflate — asset-fit scoring depends on honesty.
