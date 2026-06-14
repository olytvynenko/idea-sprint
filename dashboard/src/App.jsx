import { useState, useMemo } from 'react'
import { IDEAS, THEMES, SCORE_MAX } from './data/ideas'
import styles from './App.module.css'

const SCORE_LABELS = {
  asset: 'Asset fit',
  demand: 'Demand',
  whyNow: 'Why now / AI',
  build: 'Buildable',
  pay: 'WTP',
}

function scoreColor(total) {
  if (total >= 32) return 'high'
  if (total >= 29) return 'mid'
  return 'low'
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

function IdeaCard({ idea, expanded, onToggle }) {
  const color = scoreColor(idea.total)
  return (
    <article className={`${styles.card} ${expanded ? styles.cardExpanded : ''}`}>
      <button className={styles.cardHeader} onClick={onToggle} aria-expanded={expanded}>
        <div className={styles.headerLeft}>
          <span className={styles.rank}>#{idea.rank}</span>
          <div>
            <h2 className={styles.title}>{idea.title}</h2>
            <span className={styles.theme}>{idea.theme}</span>
          </div>
        </div>
        <div className={styles.headerRight}>
          <span className={`${styles.totalScore} ${styles[`score_${color}`]}`}>
            {idea.total}
            <span className={styles.scoreMax}>/ {SCORE_MAX}</span>
          </span>
          <svg className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`}
            width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className={styles.body}>
          <p className={styles.description}>{idea.description}</p>

          <div className={styles.columns}>
            <div className={styles.column}>
              <h3 className={styles.sectionLabel}>Score breakdown</h3>
              <div className={styles.scores}>
                {Object.entries(SCORE_LABELS).map(([key, label]) => (
                  <ScoreBar key={key} label={label} value={idea.scores[key]} />
                ))}
              </div>
            </div>

            <div className={styles.column}>
              <h3 className={styles.sectionLabel}>Competitors</h3>
              <ul className={styles.tagList}>
                {idea.competitors.map(c => (
                  <li key={c} className={styles.tag}>{c}</li>
                ))}
              </ul>

              <h3 className={styles.sectionLabel} style={{ marginTop: '1rem' }}>Gap</h3>
              <p className={styles.gap}>{idea.gap}</p>
            </div>
          </div>

          <div className={styles.validationBlock}>
            <h3 className={styles.sectionLabel}>Validation note</h3>
            <p className={styles.validationText}>{idea.validation}</p>
          </div>

          {idea.links.length > 0 && (
            <div className={styles.links}>
              {idea.links.map(l => (
                <a key={l.url} href={l.url} target="_blank" rel="noreferrer"
                  className={styles.link}>
                  {l.label}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                    style={{ marginLeft: 4 }} aria-hidden="true">
                    <path d="M3.5 1.5H10.5V8.5M10.5 1.5L1.5 10.5"
                      stroke="currentColor" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  )
}

export default function App() {
  const [query, setQuery] = useState('')
  const [activeTheme, setActiveTheme] = useState('All')
  const [expandedId, setExpandedId] = useState(null)
  const [sortBy, setSortBy] = useState('rank')

  const filtered = useMemo(() => {
    let list = [...IDEAS]
    if (activeTheme !== 'All') list = list.filter(i => i.theme === activeTheme)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.theme.toLowerCase().includes(q) ||
        i.validation.toLowerCase().includes(q)
      )
    }
    if (sortBy === 'rank') list.sort((a, b) => a.rank - b.rank)
    else if (sortBy === 'score') list.sort((a, b) => b.total - a.total)
    else if (sortBy === 'asset') list.sort((a, b) => b.scores.asset - a.scores.asset)
    else if (sortBy === 'demand') list.sort((a, b) => b.scores.demand - a.scores.demand)
    else if (sortBy === 'build') list.sort((a, b) => b.scores.build - a.scores.build)
    return list
  }, [query, activeTheme, sortBy])

  const high = IDEAS.filter(i => i.total >= 32).length
  const mid = IDEAS.filter(i => i.total >= 29 && i.total < 32).length
  const low = IDEAS.filter(i => i.total < 29).length

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div>
            <h1 className={styles.appTitle}>Idea Sprint</h1>
            <p className={styles.appSub}>Day 1 · {IDEAS.length} candidates · June 2 2026</p>
          </div>
          <div className={styles.summaryBadges}>
            <span className={`${styles.badge} ${styles.badgeHigh}`}>{high} strong ≥32</span>
            <span className={`${styles.badge} ${styles.badgeMid}`}>{mid} mid 29–31</span>
            <span className={`${styles.badge} ${styles.badgeLow}`}>{low} weak &lt;29</span>
          </div>
        </div>
      </header>

      <div className={styles.toolbar}>
        <input
          className={styles.search}
          type="search"
          placeholder="Search ideas…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Search ideas"
        />

        <div className={styles.themeFilter} role="group" aria-label="Filter by theme">
          {['All', ...THEMES].map(t => (
            <button
              key={t}
              className={`${styles.themeBtn} ${activeTheme === t ? styles.themeBtnActive : ''}`}
              onClick={() => setActiveTheme(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className={styles.sortGroup}>
          <label className={styles.sortLabel} htmlFor="sort">Sort</label>
          <select
            id="sort"
            className={styles.sortSelect}
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            <option value="rank">Rank</option>
            <option value="score">Total score</option>
            <option value="asset">Asset fit</option>
            <option value="demand">Demand</option>
            <option value="build">Buildable</option>
          </select>
        </div>
      </div>

      <main className={styles.main}>
        {filtered.length === 0 && (
          <p className={styles.empty}>No ideas match your filters.</p>
        )}
        {filtered.map(idea => (
          <IdeaCard
            key={idea.rank}
            idea={idea}
            expanded={expandedId === idea.rank}
            onToggle={() => setExpandedId(expandedId === idea.rank ? null : idea.rank)}
          />
        ))}
      </main>
    </div>
  )
}
