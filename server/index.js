import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import express from 'express'
import { openDb, ROOT } from '../scripts/db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 4001
const DIST_DIR = path.join(ROOT, 'dashboard/dist')

let db
try {
  db = openDb({ readonly: true })
} catch (err) {
  console.error('[api] could not open SQLite DB — run `node scripts/ingest.js` first')
  console.error(`[api] ${err.message}`)
  process.exit(1)
}

function mapIdea(row) {
  return {
    id: row.slug,
    rank: row.rank,
    title: row.title,
    description: row.description || '',
    scores: {
      asset: row.asset,
      demand: row.demand,
      whyNow: row.why_now,
      build: row.build,
      pay: row.pay,
    },
    total: row.total,
    validation: row.validation || '',
  }
}

function ideasForRun(runId) {
  return db
    .prepare('SELECT * FROM ideas WHERE run_id = ? ORDER BY rank ASC')
    .all(runId)
    .map(mapIdea)
}

function runPayload(run) {
  return {
    date: run.run_date,
    updated: run.created_at,
    ideaCount: run.idea_count,
    ideas: ideasForRun(run.id),
  }
}

const CONFIGS = {
  assets:  { name: 'Assets',  file: 'config/assets.md' },
  sources: { name: 'Sources', file: 'config/sources.md' },
  rubric:  { name: 'Rubric',  file: 'config/rubric.md' },
}

const app = express()
app.use(express.json({ limit: '1mb' }))

app.get('/api/config', (req, res) => {
  res.json(Object.entries(CONFIGS).map(([key, c]) => ({ key, name: c.name })))
})

app.get('/api/config/:key', (req, res) => {
  const cfg = CONFIGS[req.params.key]
  if (!cfg) return res.status(404).json({ error: 'unknown config key' })
  const filePath = path.join(ROOT, cfg.file)
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const stat = fs.statSync(filePath)
    res.json({ key: req.params.key, name: cfg.name, content, updated: stat.mtime.toISOString() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/config/:key', (req, res) => {
  const cfg = CONFIGS[req.params.key]
  if (!cfg) return res.status(404).json({ error: 'unknown config key' })
  const { content } = req.body
  if (typeof content !== 'string') return res.status(400).json({ error: 'body.content must be a string' })
  const filePath = path.join(ROOT, cfg.file)
  try {
    fs.writeFileSync(filePath, content, 'utf8')
    const stat = fs.statSync(filePath)
    res.json({ ok: true, updated: stat.mtime.toISOString() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/runs', (req, res) => {
  const runs = db
    .prepare('SELECT run_date, idea_count, created_at FROM runs ORDER BY run_date DESC')
    .all()
    .map(r => ({ date: r.run_date, ideaCount: r.idea_count, updated: r.created_at }))
  res.json(runs)
})

app.get('/api/runs/latest', (req, res) => {
  const run = db.prepare('SELECT * FROM runs ORDER BY run_date DESC LIMIT 1').get()
  if (!run) return res.status(404).json({ error: 'no runs yet' })
  res.json(runPayload(run))
})

app.get('/api/runs/:date', (req, res) => {
  const run = db.prepare('SELECT * FROM runs WHERE run_date = ?').get(req.params.date)
  if (!run) return res.status(404).json({ error: `no run for ${req.params.date}` })
  res.json(runPayload(run))
})

app.use(express.static(DIST_DIR))
app.use((req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`[api] idea-sprint API + dashboard on http://localhost:${PORT}`)
})
