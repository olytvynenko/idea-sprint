export function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

export function parseIdeaCell(cell) {
  const cleaned = cell
    .replace(/\*\(NEW\)\*/gi, '')
    .replace(/\(NEW[^)]*\)/gi, '')
    .replace(/\*\([^*]*\)\*/g, '')
    .replace(/\([^)]*upgraded[^)]*\)/gi, '')
    .replace(/\([^)]*downgraded[^)]*\)/gi, '')
    .trim()

  const match = cleaned.match(/^\*\*(.+?)\*\*\s*[—–-]\s*(.+)$/)
  if (match) {
    return { title: match[1].trim(), description: match[2].trim() }
  }
  const boldOnly = cleaned.match(/^\*\*(.+?)\*\*$/)
  if (boldOnly) {
    return { title: boldOnly[1].trim(), description: '' }
  }
  return { title: cleaned.replace(/\*\*/g, '').trim(), description: '' }
}

export function parseTotal(cell) {
  const m = String(cell).match(/([\d.]+)/)
  return m ? parseFloat(m[1]) : 0
}

export function parseShortlistTable(content) {
  const lines = content.split('\n')
  const startIdx = lines.findIndex(l => /^\|\s*rank\s*\|/i.test(l.trim()))
  if (startIdx === -1) return []

  const ideas = []
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim().startsWith('|')) break
    if (/^\|\s*[-:]+\s*\|/.test(line.trim())) continue

    const cols = line.split('|').map(c => c.trim())
    if (cols.length < 10) continue

    const rank = parseInt(cols[1], 10)
    if (Number.isNaN(rank)) continue

    const { title, description } = parseIdeaCell(cols[2])
    ideas.push({
      id: slugify(title),
      rank,
      title,
      description,
      scores: {
        asset: parseInt(cols[3], 10) || 0,
        demand: parseInt(cols[4], 10) || 0,
        whyNow: parseInt(cols[5], 10) || 0,
        build: parseInt(cols[6], 10) || 0,
        pay: parseInt(cols[7], 10) || 0,
      },
      total: parseTotal(cols[8]),
      validation: cols[9] || '',
    })
  }
  return ideas
}

export function parseDigestTop5(content) {
  const ideas = []
  const section = content.match(/Top 5 by score:([\s\S]*?)(?:\n##|\n---|$)/i)
    || content.match(/top 5[^:]*:([\s\S]*?)(?:\n##|\n---|$)/i)
  if (!section) return ideas

  for (const line of section[1].split('\n')) {
    const m = line.match(/^\d+\.\s+(.+?)\s+[—–-]\s+([\d.]+)/)
    if (!m) continue
    const title = m[1].trim()
    ideas.push({
      id: slugify(title),
      rank: ideas.length + 1,
      title,
      description: '',
      scores: { asset: 0, demand: 0, whyNow: 0, build: 0, pay: 0 },
      total: parseFloat(m[2]),
      validation: '',
    })
  }
  return ideas
}

export function parseDigestShortlistTable(content) {
  const lines = content.split('\n')
  let tableStart = -1
  for (let i = 0; i < lines.length; i++) {
    if (/Full shortlist/i.test(lines[i])) {
      const next = lines.findIndex((l, j) => j > i && /^\|\s*rank\s*\|/i.test(l.trim()))
      if (next !== -1) {
        tableStart = next
        break
      }
    }
  }
  if (tableStart === -1) {
    tableStart = lines.findIndex(l => /^\|\s*rank\s*\|/i.test(l.trim()))
  }
  if (tableStart === -1) return []

  const ideas = []
  for (let i = tableStart + 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim().startsWith('|')) break
    if (/^\|\s*[-:]+\s*\|/.test(line.trim())) continue

    const cols = line.split('|').map(c => c.trim())
    if (cols.length < 5) continue

    const rank = parseInt(cols[1], 10)
    if (Number.isNaN(rank)) continue

    const { title } = parseIdeaCell(cols[2])
    const totalCol = cols.length >= 5 ? cols[3] : cols[2]

    ideas.push({
      id: slugify(title),
      rank,
      title,
      description: '',
      scores: { asset: 0, demand: 0, whyNow: 0, build: 0, pay: 0 },
      total: parseTotal(totalCol),
      validation: '',
    })
  }
  return ideas
}

export function extractDayFromDigest(content) {
  const m = content.match(/Day\s+(\d+)/i)
  return m ? parseInt(m[1], 10) : null
}
