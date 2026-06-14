<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import JobCard from './components/JobCard.vue'

const jobs = ref([])
const loading = ref(true)
const lastUpdated = ref(null)
const error = ref(null)
const filterScore = ref(0)
const sortOrder = ref('date_desc')
const showOnlyNew = ref(false)

async function fetchJobs() {
  try {
    const res = await fetch(`/data/jobs.json?t=${Date.now()}`)
    if (!res.ok) throw new Error('Not found')
    const data = await res.json()
    jobs.value = data.proposals || []
    lastUpdated.value = data.updated || null
    error.value = null
  } catch (e) {
    if (jobs.value.length === 0) error.value = 'No data yet — the scheduled task hasn\'t run yet, or the file isn\'t in place.'
  } finally {
    loading.value = false
  }
}

const filtered = computed(() => {
  let list = [...jobs.value]
  if (filterScore.value > 0) list = list.filter(j => j.score_total >= filterScore.value)
  if (showOnlyNew.value) list = list.filter(j => j.is_new)
  if (sortOrder.value === 'score_desc') list.sort((a, b) => b.score_total - a.score_total)
  else if (sortOrder.value === 'score_asc') list.sort((a, b) => a.score_total - b.score_total)
  else if (sortOrder.value === 'date_desc') list.sort((a, b) => new Date(b.date) - new Date(a.date))
  else list.sort((a, b) => new Date(a.date) - new Date(b.date))
  return list
})

const strongCount = computed(() => jobs.value.filter(j => j.score_total >= 20).length)

let interval
onMounted(() => {
  fetchJobs()
  interval = setInterval(fetchJobs, 2 * 60 * 1000)
})
onUnmounted(() => clearInterval(interval))
</script>

<template>
  <div class="layout">
    <header class="header">
      <div class="header-inner">
        <div>
          <h1 class="app-title">Job Proposals</h1>
          <p class="app-sub">
            freelancermap · {{ jobs.length }} total
            <span v-if="strongCount > 0" class="badge-strong">{{ strongCount }} strong match{{ strongCount > 1 ? 'es' : '' }}</span>
            <span v-if="lastUpdated" class="last-updated">· last checked {{ lastUpdated }}</span>
          </p>
        </div>
        <button class="refresh-btn" @click="fetchJobs" title="Refresh">↻ Refresh</button>
      </div>
    </header>

    <div class="toolbar">
      <div class="filters">
        <label class="filter-label">
          Min score
          <select v-model.number="filterScore" class="select">
            <option :value="0">All</option>
            <option :value="15">15+</option>
            <option :value="18">18+</option>
            <option :value="20">20+ (strong)</option>
            <option :value="24">24+</option>
          </select>
        </label>
        <label class="filter-label checkbox-label">
          <input type="checkbox" v-model="showOnlyNew" />
          New only
        </label>
      </div>
      <label class="filter-label">
        Sort
        <select v-model="sortOrder" class="select">
          <option value="date_desc">Newest first</option>
          <option value="date_asc">Oldest first</option>
          <option value="score_desc">Highest score</option>
          <option value="score_asc">Lowest score</option>
        </select>
      </label>
    </div>

    <main class="main">
      <div v-if="loading" class="empty">Loading…</div>
      <div v-else-if="error" class="empty error">{{ error }}</div>
      <div v-else-if="filtered.length === 0" class="empty">No proposals match the current filter.</div>
      <JobCard v-for="job in filtered" :key="job.thread_id" :job="job" />
    </main>
  </div>
</template>

<style scoped>
.layout { min-height: 100vh; display: flex; flex-direction: column; }

.header {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 18px 24px;
  position: sticky; top: 0; z-index: 10;
}
.header-inner { max-width: 860px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.app-title { font-size: 17px; font-weight: 600; }
.app-sub { font-size: 13px; color: var(--text-muted); margin-top: 2px; }
.badge-strong { background: #dcfce7; color: #15803d; font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 20px; margin-left: 6px; }
.last-updated { color: var(--text-faint); }
.refresh-btn { font-size: 13px; padding: 6px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); color: var(--text-muted); cursor: pointer; }
.refresh-btn:hover { border-color: var(--border-strong); color: var(--text); }

.toolbar { max-width: 860px; margin: 16px auto 0; padding: 0 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
.filters { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
.filter-label { font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }
.checkbox-label { cursor: pointer; }
.select { font-size: 13px; padding: 5px 8px; border: 1px solid var(--border); border-radius: 7px; background: var(--surface); color: var(--text); cursor: pointer; outline: none; }
.select:focus { border-color: var(--accent); }

.main { max-width: 860px; margin: 16px auto 60px; padding: 0 24px; display: flex; flex-direction: column; gap: 10px; }
.empty { text-align: center; color: var(--text-muted); padding: 48px 0; }
.error { color: var(--red); }
</style>
