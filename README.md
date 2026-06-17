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
  assets-prompt.md      regenerate config/assets.md from profile/ (on demand)
  scripts/              ingest.js (shortlist → SQLite), db.js, parse-shortlist.js
  server/               Express API serving SQLite + the built dashboard
  config/assets.md      your strengths (drives asset-fit scoring) — EDIT
  config/sources.md     where to gather — CURATE
  config/rubric.md      scoring dimensions + weights — TUNE
  profile/              CV summary + crawl/infra repo deep dives (reference)
  data/pain-schema.md   the pain entry format
  data/pain-log.jsonl   append-only structured pains (grows daily) — local only
  data/shortlist.md     running ranked candidates (re-ranked daily) — local only
  data/reflection.md    "tomorrow's focus" note (steers next run) — local only
  data/daily/           per-day digests — local only
  data/idea-sprint.db   SQLite store of every dated run — local only
  data/*.template.md    empty starting points for a fresh clone
  dashboard/            React app — current ideas + calendar of past runs
  home/                 link to the ideas dashboard
  build-all.sh          install, build dashboard, ingest, start/restart PM2
  pm2.config.cjs        PM2 process definitions
```

## Setup (one time)
1. Put this folder on disk and open Claude Desktop → Cowork.
2. Point Cowork at this folder as the working directory.
3. Edit `config/assets.md`, curate `config/sources.md`, tune `config/rubric.md`.
   After updating files in `profile/`, run `assets-prompt.md` on demand in Cowork
   to regenerate `config/assets.md`.
4. Optional: register a Stack Exchange app at https://stackapps.com/apps/oauth/register
   (takes ~2 minutes, no approval) and note the key in sources.md for higher
   rate limits. HN works immediately with no key.
5. In a Cowork conversation type `/schedule`, paste the contents of
   `task-prompt.md`, and set a DAILY cadence at a time your machine is on.

On a fresh clone, copy the data templates before the first run:

```bash
cp data/shortlist.template.md data/shortlist.md
cp data/reflection.template.md data/reflection.md
touch data/pain-log.jsonl
```

The SQLite database (`data/idea-sprint.db`) is created automatically the first
time you run `node scripts/ingest.js` (or `./build-all.sh`).

Sprint and dashboard run data is gitignored — it stays local and is never
committed.

## Day 1: calibrate before you trust the schedule
Run the task ON-DEMAND once and watch it. Check: did it gather enough? is the
extraction clean and on-schema? is dedupe too loose/strict? Adjust the prompt or
configs, then let the daily schedule take over for days 2–7.

## Dashboard

A local web dashboard shows the **current run** (latest ingest) as a grid of
scored idea cards. A **calendar** highlights every day that has a stored run —
click a day to view that run's ideas, or hit **Current** to jump back to the
latest. Click any card for its score breakdown and validation note.

| URL | What it shows |
|-----|---------------|
| http://localhost:4000 | Home — link to ideas dashboard |
| http://localhost:4001 | Current ideas + calendar of historical runs |

Runs are **on demand**: each ingest imports `data/shortlist.md` into SQLite as a
dated run, so history is kept. Data flow:

```
data/shortlist.md  →  node scripts/ingest.js  →  data/idea-sprint.db  →  Express API (:4001)  →  dashboard
```

The dashboard reads the API directly, so a new run shows up after the next
ingest (use the Refresh button) — no rebuild needed.

### Prerequisites

- **Node.js** (v18+) and **npm**
- **PM2** — install globally once: `npm install -g pm2`

### Install and run (production)

From the project root:

```bash
./build-all.sh
```

This installs dependencies, builds the dashboard, ingests the current shortlist
into SQLite, and starts (or restarts) PM2. Open http://localhost:4000 or
http://localhost:4001.

PM2 processes: `home` (link hub) and `api` (Express serving the API + dashboard).

To start manually without rebuilding:

```bash
pm2 start pm2.config.cjs
```

Useful PM2 commands:

```bash
pm2 stop all          # stop everything
pm2 restart all       # restart after a dashboard rebuild
pm2 logs api          # watch API activity
pm2 startup && pm2 save   # auto-start on login (optional)
```

### Dev mode (hot reload)

For UI work, run the API and the Vite dev server side by side:

```bash
node server/index.js                             # API on :4001
cd dashboard && npm install && npm run dev       # http://localhost:5173
```

The dev server proxies `/api` to the API on :4001.

### Recording a run

After Cowork updates `data/shortlist.md`, store it as today's run:

```bash
node scripts/ingest.js            # stores under today's date
node scripts/ingest.js --date 2026-06-14   # or backfill a specific date
```

Re-running for the same date replaces that day's ideas. Cowork Step 6 runs
`node scripts/ingest.js` automatically after each daily digest.

### Admin

The dashboard header has an **Admin** tab with a plain-text editor for the three
scoring config files (`config/assets.md`, `config/sources.md`, `config/rubric.md`).
Changes are saved to disk immediately and take effect on the next Cowork run /
ingest — no restart needed.

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
