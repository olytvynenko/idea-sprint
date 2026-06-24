#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { openDb, ROOT } from './db.js'
import { parseShortlistTable, slugify } from './parse-shortlist.js'

const SHORTLIST_PATH = path.join(ROOT, 'data/shortlist.md')
const SNAPSHOTS_DIR = path.join(ROOT, 'data/snapshots')
const DAILY_DIR = path.join(ROOT, 'data/daily')

function readIfExists(p) {
  try {
    return fs.readFileSync(p, 'utf8')
  } catch {
    return null
  }
}

function parseArgs(argv) {
  const args = { date: null }
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--date' && argv[i + 1]) {
      args.date = argv[i + 1]
      i++
    } else if (argv[i].startsWith('--date=')) {
      args.date = argv[i].slice('--date='.length)
    }
  }
  return args
}

function normalizeIdea(idea) {
  const scores = idea.scores || {}
  return {
    slug: idea.id || slugify(idea.title),
    rank: idea.rank ?? null,
    title: idea.title,
    description: idea.description || '',
    asset: scores.asset || 0,
    demand: scores.demand || 0,
    why_now: scores.whyNow || 0,
    build: scores.build || 0,
    pay: scores.pay || 0,
    total: idea.total || 0,
    validation: idea.validation || '',
  }
}

function upsertRun(db, { date, ideas, source }) {
  const insertIdea = db.prepare(`
    INSERT INTO ideas (run_id, slug, rank, title, description, asset, demand, why_now, build, pay, total, validation)
    VALUES (@run_id, @slug, @rank, @title, @description, @asset, @demand, @why_now, @build, @pay, @total, @validation)
  `)

  const tx = db.transaction(() => {
    let run = db.prepare('SELECT id FROM runs WHERE run_date = ?').get(date)
    if (run) {
      db.prepare('UPDATE runs SET created_at = ?, idea_count = ?, source = ? WHERE id = ?')
        .run(new Date().toISOString(), ideas.length, source, run.id)
      db.prepare('DELETE FROM ideas WHERE run_id = ?').run(run.id)
    } else {
      const info = db.prepare('INSERT INTO runs (run_date, created_at, idea_count, source) VALUES (?, ?, ?, ?)')
        .run(date, new Date().toISOString(), ideas.length, source)
      run = { id: info.lastInsertRowid }
    }
    for (const idea of ideas) {
      insertIdea.run({ run_id: run.id, ...normalizeIdea(idea) })
    }
  })

  tx()
}

function backfillSnapshots(db) {
  if (!fs.existsSync(SNAPSHOTS_DIR)) return 0
  const files = fs.readdirSync(SNAPSHOTS_DIR).filter(f => f.endsWith('.json')).sort()
  let imported = 0
  for (const file of files) {
    const date = file.replace('.json', '')
    const exists = db.prepare('SELECT 1 FROM runs WHERE run_date = ?').get(date)
    if (exists) continue
    try {
      const snap = JSON.parse(fs.readFileSync(path.join(SNAPSHOTS_DIR, file), 'utf8'))
      const ideas = Array.isArray(snap.ideas) ? snap.ideas : []
      if (ideas.length === 0) continue
      upsertRun(db, { date, ideas, source: 'snapshot-backfill' })
      imported++
    } catch (err) {
      console.warn(`[ingest] skipped snapshot ${file}: ${err.message}`)
    }
  }
  return imported
}

export function resolveRunDate(explicitDate) {
  if (explicitDate) return explicitDate

  if (fs.existsSync(DAILY_DIR)) {
    const dates = fs.readdirSync(DAILY_DIR)
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace('.md', ''))
      .filter(date => {
        try {
          return fs.readFileSync(path.join(DAILY_DIR, `${date}.md`), 'utf8').trim().length > 0
        } catch {
          return false
        }
      })
      .sort()
    if (dates.length > 0) return dates[dates.length - 1]
  }

  return new Date().toISOString().slice(0, 10)
}

export function getIngestStatus({ date } = {}) {
  const runDate = resolveRunDate(date)
  let shortlistUpdated = null
  let ideaCount = 0

  try {
    if (fs.existsSync(SHORTLIST_PATH)) {
      shortlistUpdated = fs.statSync(SHORTLIST_PATH).mtime.toISOString()
      const content = readIfExists(SHORTLIST_PATH)
      if (content) ideaCount = parseShortlistTable(content).length
    }
  } catch {
    // leave defaults
  }

  let dbUpdated = null
  try {
    const db = openDb({ readonly: true })
    try {
      const row = db.prepare('SELECT created_at FROM runs WHERE run_date = ?').get(runDate)
      dbUpdated = row?.created_at ?? null
    } finally {
      db.close()
    }
  } catch {
    // DB may not exist yet
  }

  const hasNewData = ideaCount > 0 && (
    !dbUpdated ||
    (shortlistUpdated && new Date(shortlistUpdated) > new Date(dbUpdated))
  )

  return { runDate, shortlistUpdated, dbUpdated, ideaCount, hasNewData }
}

export function ingest({ date, force = false } = {}) {
  const status = getIngestStatus({ date })
  if (!force && !status.hasNewData) {
    if (status.ideaCount === 0) {
      console.log('[ingest] no parseable ideas in shortlist — skipping')
      return null
    }
    console.log(`[ingest] already up to date for ${status.runDate}`)
    return { date: status.runDate, ideaCount: status.ideaCount, skipped: true }
  }

  const db = openDb()
  try {
    const backfilled = backfillSnapshots(db)
    if (backfilled > 0) console.log(`[ingest] backfilled ${backfilled} historical run(s) from snapshots`)

    const content = readIfExists(SHORTLIST_PATH)
    if (!content) {
      console.log('[ingest] no data/shortlist.md found — nothing to ingest for today')
      return null
    }
    const ideas = parseShortlistTable(content)
    if (ideas.length === 0) {
      console.log('[ingest] data/shortlist.md has no parseable ideas — skipping today')
      return null
    }

    const runDate = resolveRunDate(date)
    upsertRun(db, { date: runDate, ideas, source: 'shortlist' })
    console.log(`[ingest] stored run ${runDate} — ${ideas.length} idea(s)`)
    return { date: runDate, ideaCount: ideas.length, skipped: false }
  } finally {
    db.close()
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const { date } = parseArgs(process.argv)
  ingest({ date })
}
