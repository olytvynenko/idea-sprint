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
  config/assets.md      your strengths (drives asset-fit scoring) — EDIT
  config/sources.md     where to gather — CURATE
  config/rubric.md      scoring dimensions + weights — TUNE
  profile/              CV summary + crawl/infra repo deep dives (reference)
  data/pain-schema.md   the pain entry format
  data/pain-log.jsonl   append-only structured pains (grows daily) — local only
  data/shortlist.md     running ranked candidates (re-ranked daily) — local only
  data/reflection.md    "tomorrow's focus" note (steers next run) — local only
  data/daily/           per-day digests — local only
  data/*.template.md    empty starting points for a fresh clone
  dashboard/            React app — browse ranked ideas
  dashboard-vue/        Vue app — browse job proposals
  home/                 link hub for both dashboards
  build-all.sh          build dashboards and start/restart PM2
  pm2.config.js         PM2 process definitions
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
cp dashboard/src/data/ideas.example.js dashboard/src/data/ideas.js
cp dashboard-vue/public/data/jobs.example.json dashboard-vue/public/data/jobs.json
```

Sprint and dashboard run data is gitignored — it stays local and is never
committed.

## Day 1: calibrate before you trust the schedule
Run the task ON-DEMAND once and watch it. Check: did it gather enough? is the
extraction clean and on-schema? is dedupe too loose/strict? Adjust the prompt or
configs, then let the daily schedule take over for days 2–7.

## Dashboards

Two local web dashboards let you browse sprint output without reading markdown
files. A home page links to both.

| URL | App | What it shows |
|-----|-----|---------------|
| http://localhost:4000 | Home | Links to both dashboards |
| http://localhost:4001 | Idea Sprint (React) | Ranked ideas with scores, validation notes, competitors |
| http://localhost:4002 | Job Proposals (Vue) | freelancermap proposals with fit scores and draft replies |

There is no backend API — PM2 serves static files only. The Cowork task writes
data to disk; the dashboards read it.

### Prerequisites

- **Node.js** (v18+) and **npm**
- **PM2** — install globally once: `npm install -g pm2`

### Install and run (production)

From the project root:

```bash
./build-all.sh
```

This installs dependencies, builds both dashboards, and starts (or restarts) PM2.
Open http://localhost:4000 in your browser.

To start manually without rebuilding:

```bash
pm2 start pm2.config.js
```

Useful PM2 commands:

```bash
pm2 stop all          # stop all dashboards
pm2 restart all       # restart after a rebuild
pm2 logs              # view process output
pm2 startup && pm2 save   # auto-start on login (optional)
```

### Dev mode (hot reload)

For UI work, run each dashboard separately instead of PM2:

```bash
cd dashboard && npm install && npm run dev       # http://localhost:5173
cd dashboard-vue && npm install && npm run dev     # http://localhost:5174
```

Dev mode does not start the home page on port 4000.

### Using the dashboards

**Idea Sprint** — search, filter by theme, sort by rank/score/asset-fit/demand.
Click a card to expand score breakdown, competitors, gap, and validation notes.

**Job Proposals** — filter by minimum score, show new only, sort by date or
score. Click a card to expand stack requirements, gaps, recommended action, and
a draft reply message. The app polls `jobs.json` every 2 minutes; hit Refresh
to reload immediately.

### Keeping data in sync

The dashboards do not auto-sync from the Cowork sprint output.

| Dashboard | Data source | How to update |
|-----------|-------------|---------------|
| Idea Sprint | `dashboard/src/data/ideas.js` | Export from `data/shortlist.md`, then `./build-all.sh` |
| Job Proposals | `dashboard-vue/public/data/jobs.json` | Written by the jobs Cowork task; rebuild, or copy to `dashboard-vue/dist/data/jobs.json` for a live reload without rebuild |

After updating ideas data, always run `./build-all.sh` (or at least `npm run build`
in `dashboard/` and `pm2 restart ideas`).

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
