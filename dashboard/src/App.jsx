import { useState, useMemo, useEffect, useCallback } from 'react'
import styles from './App.module.css'
import Admin from './Admin.jsx'

const SCORE_LABELS = {
  asset: 'Asset fit',
  demand: 'Demand',
  whyNow: 'Why now / AI',
  build: 'Buildable',
  pay: 'WTP',
}

const SCORE_MAX = 40
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function scoreColor(total) {
  if (total >= 32) return 'high'
  if (total >= 29) return 'mid'
  return 'low'
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function toDateStr(year, monthIdx, day) {
  return `${year}-${pad(monthIdx + 1)}-${pad(day)}`
}

function formatDateLabel(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${MONTHS[m - 1]} ${d}, ${y}`
}

function ScoreBar({ label, value, max = 5 }) {
  return (
    <div className={styles.scoreRow}>
      <span className={styles.scoreLabel}>{label}</span>
      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <span className={styles.scoreValue}>{value}</span>
    </div>
  )
}

function Calendar({ availableDates, selectedDate, latestDate, onSelect }) {
  const initial = selectedDate || latestDate || new Date().toISOString().slice(0, 10)
  const [y0, m0] = initial.split('-').map(Number)
  const [view, setView] = useState({ year: y0, month: m0 - 1 })

  useEffect(() => {
    if (!selectedDate) return
    const [y, m] = selectedDate.split('-').map(Number)
    setView({ year: y, month: m - 1 })
  }, [selectedDate])

  const { year, month } = view
  const firstDay = new Date(year, month, 1)
  // Convert Sun-based getDay() to Mon-based offset.
  const leading = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < leading; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const goPrev = () => setView(v => {
    const m = v.month - 1
    return m < 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: m }
  })
  const goNext = () => setView(v => {
    const m = v.month + 1
    return m > 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: m }
  })

  return (
    <div className={styles.calendar}>
      <div className={styles.calHeader}>
        <button type="button" className={styles.calNav} onClick={goPrev} aria-label="Previous month">‹</button>
        <span className={styles.calMonth}>{MONTHS[month]} {year}</span>
        <button type="button" className={styles.calNav} onClick={goNext} aria-label="Next month">›</button>
      </div>
      <div className={styles.calGrid}>
        {WEEKDAYS.map(w => (
          <span key={w} className={styles.calWeekday}>{w}</span>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <span key={`b${i}`} className={styles.calBlank} />
          const dateStr = toDateStr(year, month, d)
          const hasRun = availableDates.has(dateStr)
          const isSelected = dateStr === selectedDate
          const isLatest = dateStr === latestDate
          const cls = [
            styles.calDay,
            hasRun ? styles.calDayHasRun : styles.calDayEmpty,
            isSelected ? styles.calDaySelected : '',
            isLatest && !isSelected ? styles.calDayLatest : '',
          ].filter(Boolean).join(' ')
          return (
            <button
              key={dateStr}
              type="button"
              className={cls}
              disabled={!hasRun}
              onClick={() => hasRun && onSelect(dateStr)}
              aria-label={`${formatDateLabel(dateStr)}${hasRun ? ' (has run)' : ''}`}
            >
              {d}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function DetailPanel({ idea, onClose }) {
  if (!idea) return null
  const color = scoreColor(idea.total)
  return (
    <div className={styles.panelOverlay} onClick={onClose} role="presentation">
      <div className={styles.panel} onClick={e => e.stopPropagation()} role="dialog" aria-label="Idea details">
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.panelRank}>#{idea.rank}</span>
            <h2 className={styles.panelTitle}>{idea.title}</h2>
          </div>
          <button type="button" className={styles.panelClose} onClick={onClose} aria-label="Close">×</button>
        </div>
        {idea.description && (
          <p className={styles.panelDesc}>{idea.description}</p>
        )}
        <div className={styles.panelScoreWrap}>
          <span className={`${styles.panelTotal} ${styles[`score_${color}`]}`}>
            {idea.total}
            <span className={styles.scoreMax}>/ {SCORE_MAX}</span>
          </span>
        </div>
        <h3 className={styles.sectionLabel}>Score breakdown</h3>
        <div className={styles.scores}>
          {Object.entries(SCORE_LABELS).map(([key, label]) => (
            <ScoreBar key={key} label={label} value={idea.scores?.[key] ?? 0} />
          ))}
        </div>
        {idea.validation && (
          <div className={styles.validationBlock}>
            <h3 className={styles.sectionLabel}>Validation note</h3>
            <p className={styles.validationText}>{idea.validation}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function IdeaCard({ idea, onClick }) {
  const color = scoreColor(idea.total)
  const hasScores = idea.scores && Object.values(idea.scores).some(v => v > 0)
  return (
    <button type="button" className={styles.card} onClick={onClick}>
      <div className={styles.cardTop}>
        <span className={styles.cardRank}>#{idea.rank}</span>
        <span className={`${styles.cardTotal} ${styles[`score_${color}`]}`}>
          {idea.total}
          {hasScores && <span className={styles.cardTotalMax}>/{SCORE_MAX}</span>}
        </span>
      </div>
      <h3 className={styles.cardTitle}>{idea.title}</h3>
      {idea.description && <p className={styles.cardDesc}>{idea.description}</p>}
      {idea.validation && <p className={styles.cardValidation}>{idea.validation}</p>}
    </button>
  )
}

export default function App() {
  const [view, setView] = useState('dashboard')
  const [runs, setRuns] = useState([])
  const [run, setRun] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('rank')
  const [selectedId, setSelectedId] = useState(null)

  const latestDate = runs[0]?.date ?? null

  const loadRun = useCallback(async (date) => {
    const url = date ? `/api/runs/${date}` : '/api/runs/latest'
    const res = await fetch(`${url}?t=${Date.now()}`)
    if (!res.ok) throw new Error('Run not found')
    const json = await res.json()
    setRun(json)
    setSelectedDate(json.date)
  }, [])

  const refresh = useCallback(async (date) => {
    try {
      const res = await fetch(`/api/runs?t=${Date.now()}`)
      if (!res.ok) throw new Error('API unavailable — is the server running?')
      const list = await res.json()
      setRuns(list)
      if (list.length === 0) {
        setRun(null)
        setError(null)
        return
      }
      const target = date && list.some(r => r.date === date) ? date : undefined
      await loadRun(target)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [loadRun])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleSelect = useCallback(async (date) => {
    try {
      await loadRun(date)
      setSelectedId(null)
    } catch (e) {
      setError(e.message)
    }
  }, [loadRun])

  const availableDates = useMemo(() => new Set(runs.map(r => r.date)), [runs])

  const ideas = run?.ideas ?? []

  const filtered = useMemo(() => {
    let list = [...ideas]
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(i =>
        i.title.toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        (i.validation || '').toLowerCase().includes(q)
      )
    }
    if (sortBy === 'rank') {
      list.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
    } else if (sortBy === 'score') {
      list.sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
    }
    return list
  }, [ideas, query, sortBy])

  const selected = ideas.find(i => i.id === selectedId) ?? null
  const isLatest = selectedDate && selectedDate === latestDate
  const strong = ideas.filter(i => (i.total ?? 0) >= 32).length

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div>
            <h1 className={styles.appTitle}>Idea Sprint</h1>
            {view === 'dashboard' && (
              <p className={styles.appSub}>
                {selectedDate
                  ? <>{formatDateLabel(selectedDate)} · {ideas.length} ideas{isLatest && <span className={styles.updated}> · current</span>}</>
                  : 'No runs yet'}
              </p>
            )}
          </div>
          <div className={styles.headerActions}>
            <nav className={styles.nav}>
              <button
                type="button"
                className={`${styles.navBtn} ${view === 'dashboard' ? styles.navBtnActive : ''}`}
                onClick={() => setView('dashboard')}
              >
                Dashboard
              </button>
              <button
                type="button"
                className={`${styles.navBtn} ${view === 'admin' ? styles.navBtnActive : ''}`}
                onClick={() => setView('admin')}
              >
                Admin
              </button>
            </nav>
            {view === 'dashboard' && (
              <>
                {strong > 0 && (
                  <span className={`${styles.badge} ${styles.badgeHigh}`}>{strong} strong ≥32</span>
                )}
                {!isLatest && latestDate && (
                  <button type="button" className={styles.refreshBtn} onClick={() => handleSelect(latestDate)}>Current</button>
                )}
                <button type="button" className={styles.refreshBtn} onClick={() => refresh(selectedDate)}>↻ Refresh</button>
              </>
            )}
          </div>
        </div>
      </header>

      {view === 'dashboard' && (
        <main className={styles.layout}>
          <aside className={styles.sidebar}>
            <Calendar
              availableDates={availableDates}
              selectedDate={selectedDate}
              latestDate={latestDate}
              onSelect={handleSelect}
            />
            <div className={styles.runList}>
              <span className={styles.sectionLabel}>Runs ({runs.length})</span>
              {runs.map(r => (
                <button
                  key={r.date}
                  type="button"
                  className={`${styles.runItem} ${r.date === selectedDate ? styles.runItemActive : ''}`}
                  onClick={() => handleSelect(r.date)}
                >
                  <span>{formatDateLabel(r.date)}</span>
                  <span className={styles.runCount}>{r.ideaCount}</span>
                </button>
              ))}
            </div>
          </aside>

          <section className={styles.content}>
            <div className={styles.toolbar}>
              <input
                className={styles.search}
                type="search"
                placeholder="Search ideas…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                aria-label="Search ideas"
              />
              <div className={styles.sortGroup}>
                <label className={styles.sortLabel} htmlFor="sort">Sort</label>
                <select
                  id="sort"
                  className={styles.sortSelect}
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                >
                  <option value="rank">Rank</option>
                  <option value="score">Score</option>
                </select>
              </div>
            </div>

            {loading && <p className={styles.empty}>Loading…</p>}
            {!loading && error && <p className={styles.empty}>{error}</p>}
            {!loading && !error && runs.length === 0 && (
              <p className={styles.empty}>No runs yet. Run <code>node scripts/ingest.js</code> after a Cowork run.</p>
            )}
            {!loading && !error && runs.length > 0 && filtered.length === 0 && (
              <p className={styles.empty}>No ideas match your search.</p>
            )}
            {!loading && !error && filtered.length > 0 && (
              <div className={styles.cards}>
                {filtered.map(idea => (
                  <IdeaCard key={idea.id} idea={idea} onClick={() => setSelectedId(idea.id)} />
                ))}
              </div>
            )}
          </section>
        </main>
      )}

      {view === 'admin' && <Admin />}

      {selected && view === 'dashboard' && (
        <DetailPanel idea={selected} onClose={() => setSelectedId(null)} />
      )}
    </div>
  )
}
