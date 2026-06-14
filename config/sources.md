# Sources

Curate this list. The task reads it each day and prioritizes per yesterday's
reflection. Prefer complaint-rich, publicly readable text. Read only — never
log in.

## Source categories (broad → narrow over the week)

- **Hacker News** (API, no key needed). Use the Algolia search API:
  `https://hn.algolia.com/api/v1/search?query=<term>&tags=comment&numericFilters=created_at_i>1700000000`
  Good queries: "is there a tool for", "frustrated with", "wish there was",
  "how do you handle", "what do you use for". Also mine Ask HN threads and
  monthly "Who is Hiring" comments for pain in job descriptions.

- **Stack Exchange** (API, free, register an app at stackapps.com for a key —
  takes minutes, no approval process). Endpoint:
  `https://api.stackexchange.com/2.3/questions?order=desc&sort=votes&site=<site>`
  Good sites: stackoverflow, softwareengineering, devops, datascience,
  superuser, workplace. Look for questions with high vote counts and no
  accepted answer — those are unresolved pain.

- **Review sites, 2–3 star reviews**: G2, Capterra, Trustpilot, app stores.
  (Low-star reviews literally enumerate missing features = pure pain signal.)
  Browse these directly via the browser.

- **Lemmy** (open federated Reddit alternative, public API, no auth needed).
  `https://lemmy.world/api/v3/post/list?type_=All&sort=TopWeek`
  Tech-focused communities: lemmy.ml, programming.dev.

- **Freelance demand**: public Upwork / Contra job descriptions — what are
  people repeatedly paying contractors to do by hand?

- **"I wish a tool existed that…" / "is there an app for…"** searches via
  the browser.

- **Product Hunt comments** and "alternatives to X" pages.

## Rotation guidance
- Day 1: one or two sources from EVERY category (broad map).
- Days 2–4: follow the themes that scored well; go deeper in those niches.
- Days 5–7: hunt narrowly in the 2–3 veins that produced the top shortlist.

## Notes
- If a source blocks reading, skip it and note it in the digest.
- Favor sources where pain is stated by the person who has it, not by vendors.
