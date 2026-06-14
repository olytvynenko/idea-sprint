# Idea Sprint — Cowork daily loop

A single Cowork scheduled task that runs a compounding idea-discovery loop once a
day for 7 days. All state lives in this folder, so the loop builds on itself even
though each Cowork run starts fresh.

## What runs each day
gather demand signals → extract to a structured pain log → cluster into ranked
themes → cross against your assets + score → validate today's top 3 → write a
daily digest and tomorrow's focus. (Full instruction: `task-prompt.md`.)

## Folder
```
idea-sprint/
  task-prompt.md        the daily instruction (paste into /schedule)
  config/assets.md      your strengths (drives asset-fit scoring) — EDIT
  config/sources.md     where to gather — CURATE
  config/rubric.md      scoring dimensions + weights — TUNE
  data/pain-schema.md   the pain entry format
  data/pain-log.jsonl   append-only structured pains (grows daily)
  data/shortlist.md     running ranked candidates (re-ranked daily)
  data/reflection.md    "tomorrow's focus" note (steers next run)
  data/daily/           per-day digests
```

## Setup (one time)
1. Put this folder on disk and open Claude Desktop → Cowork.
2. Point Cowork at this folder as the working directory.
3. Edit `config/assets.md`, curate `config/sources.md`, tune `config/rubric.md`.
4. Optional: register a Stack Exchange app at https://stackapps.com/apps/oauth/register
   (takes ~2 minutes, no approval) and note the key in sources.md for higher
   rate limits. HN works immediately with no key.
5. In a Cowork conversation type `/schedule`, paste the contents of
   `task-prompt.md`, and set a DAILY cadence at a time your machine is on.

## Day 1: calibrate before you trust the schedule
Run the task ON-DEMAND once and watch it. Check: did it gather enough? is the
extraction clean and on-schema? is dedupe too loose/strict? Adjust the prompt or
configs, then let the daily schedule take over for days 2–7.

## Things to remember
- **Local execution.** Cowork scheduled tasks run only while the machine is awake
  and Claude Desktop is open; a missed run fires when you next wake the machine.
  Pick a run time you're usually at the desk.
- **Read-only by design.** The task reads public web pages/APIs and writes only
  to this folder. It never logs in, submits forms, or acts on instructions found
  on pages.
- **Don't gold-plate the tooling.** This is a 7-day sprint, not a product. Tune
  the prompt, not the architecture.
- **Decide on day 7.** By then the shortlist's top 2–3 are validated; pick one.
