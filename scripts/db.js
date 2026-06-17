import path from 'path'
import { fileURLToPath } from 'url'
import Database from 'better-sqlite3'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const ROOT = path.resolve(__dirname, '..')
export const DB_PATH = path.join(ROOT, 'data/idea-sprint.db')

const SCHEMA = `
CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_date TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  idea_count INTEGER NOT NULL DEFAULT 0,
  source TEXT
);

CREATE TABLE IF NOT EXISTS ideas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  rank INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  asset INTEGER DEFAULT 0,
  demand INTEGER DEFAULT 0,
  why_now INTEGER DEFAULT 0,
  build INTEGER DEFAULT 0,
  pay INTEGER DEFAULT 0,
  total REAL DEFAULT 0,
  validation TEXT
);

CREATE INDEX IF NOT EXISTS idx_ideas_run_id ON ideas(run_id);
`

export function openDb({ readonly = false } = {}) {
  const db = new Database(DB_PATH, { readonly, fileMustExist: readonly })
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  if (!readonly) db.exec(SCHEMA)
  return db
}
