<script setup>
import { ref } from 'vue'

const props = defineProps({ job: Object })
const expanded = ref(false)
const copied = ref(false)

function scoreColor(total) {
  if (total >= 20) return 'high'
  if (total >= 15) return 'mid'
  return 'low'
}

function copyDraft() {
  navigator.clipboard.writeText(props.job.draft_message || '').then(() => {
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
  })
}
</script>

<template>
  <article :class="['card', job.is_new && 'card-new']">
    <button class="card-header" @click="expanded = !expanded" :aria-expanded="expanded">
      <div class="header-left">
        <div class="meta-row">
          <span :class="['score-badge', `score-${scoreColor(job.score_total)}`]">{{ job.score_total }}/30</span>
          <span v-if="job.is_new" class="new-badge">New</span>
          <span class="date">{{ job.date }}</span>
        </div>
        <h2 class="title">{{ job.title }}</h2>
        <p class="summary">{{ job.summary }}</p>
      </div>
      <svg :class="['chevron', expanded && 'open']" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <div v-if="expanded" class="body">
      <!-- Score breakdown -->
      <div class="section">
        <div class="section-label">Score breakdown</div>
        <div class="score-grid">
          <div class="score-item">
            <span class="score-dim">Tech fit ×2</span>
            <div class="bar-track"><div class="bar-fill" :style="{width: `${(job.scores.tech/5)*100}%`}"/></div>
            <span class="score-val">{{ job.scores.tech }}</span>
          </div>
          <div class="score-item">
            <span class="score-dim">Domain ×1.5</span>
            <div class="bar-track"><div class="bar-fill" :style="{width: `${(job.scores.domain/5)*100}%`}"/></div>
            <span class="score-val">{{ job.scores.domain }}</span>
          </div>
          <div class="score-item">
            <span class="score-dim">Seniority ×1</span>
            <div class="bar-track"><div class="bar-fill" :style="{width: `${(job.scores.seniority/5)*100}%`}"/></div>
            <span class="score-val">{{ job.scores.seniority }}</span>
          </div>
          <div class="score-item">
            <span class="score-dim">Remote ×1</span>
            <div class="bar-track"><div class="bar-fill" :style="{width: `${(job.scores.remote/5)*100}%`}"/></div>
            <span class="score-val">{{ job.scores.remote }}</span>
          </div>
          <div class="score-item">
            <span class="score-dim">Language ×0.5</span>
            <div class="bar-track"><div class="bar-fill" :style="{width: `${(job.scores.language/5)*100}%`}"/></div>
            <span class="score-val">{{ job.scores.language }}</span>
          </div>
        </div>
      </div>

      <!-- Tech and gaps -->
      <div class="two-col">
        <div>
          <div class="section-label">Required stack</div>
          <div class="tags">
            <span v-for="t in job.stack_required" :key="t" class="tag">{{ t }}</span>
          </div>
        </div>
        <div v-if="job.gaps && job.gaps.length">
          <div class="section-label">Gaps (not in profile)</div>
          <div class="tags">
            <span v-for="g in job.gaps" :key="g" class="tag tag-gap">{{ g }}</span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="section">
        <div class="section-label">Proposed action</div>
        <p class="action-text">{{ job.action }}</p>
      </div>

      <!-- Draft message -->
      <div v-if="job.draft_message" class="section">
        <div class="draft-header">
          <span class="section-label">Draft reply (copy → paste into freelancermap)</span>
          <button class="copy-btn" @click="copyDraft">
            {{ copied ? '✓ Copied' : 'Copy' }}
          </button>
        </div>
        <pre class="draft-text">{{ job.draft_message }}</pre>
      </div>
    </div>
  </article>
</template>

<style scoped>
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  transition: border-color 0.15s;
}
.card:hover { border-color: var(--border-strong); }
.card-new { border-left: 3px solid var(--accent); }

.card-header {
  width: 100%; display: flex; align-items: flex-start; justify-content: space-between;
  padding: 14px 16px; text-align: left; cursor: pointer; gap: 12px;
  background: none; border: none; color: inherit;
}
.card-header:hover { background: var(--tag-bg); }

.header-left { flex: 1; min-width: 0; }
.meta-row { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }

.score-badge { font-size: 13px; font-weight: 600; padding: 2px 8px; border-radius: 6px; }
.score-high { background: var(--green-bg); color: var(--green); }
.score-mid  { background: var(--amber-bg); color: var(--amber); }
.score-low  { background: var(--tag-bg); color: var(--text-muted); }

.new-badge { font-size: 11px; font-weight: 500; background: var(--accent-bg); color: var(--accent); padding: 2px 8px; border-radius: 20px; }
.date { font-size: 12px; color: var(--text-faint); }

.title { font-size: 14px; font-weight: 500; line-height: 1.3; margin-bottom: 4px; }
.summary { font-size: 13px; color: var(--text-muted); line-height: 1.5; }

.chevron { color: var(--text-faint); transition: transform 0.2s; flex-shrink: 0; margin-top: 2px; }
.chevron.open { transform: rotate(180deg); }

.body { border-top: 1px solid var(--border); padding: 14px 16px; display: flex; flex-direction: column; gap: 14px; }

.section-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-faint); margin-bottom: 7px; }

.score-grid { display: flex; flex-direction: column; gap: 5px; }
.score-item { display: grid; grid-template-columns: 110px 1fr 24px; align-items: center; gap: 8px; }
.score-dim { font-size: 12px; color: var(--text-muted); }
.bar-track { height: 4px; border-radius: 2px; background: var(--tag-bg); overflow: hidden; }
.bar-fill { height: 100%; border-radius: 2px; background: var(--accent); }
.score-val { font-size: 12px; color: var(--text-muted); text-align: right; }

.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.tags { display: flex; flex-wrap: wrap; gap: 5px; }
.tag { font-size: 12px; padding: 2px 9px; border-radius: 20px; background: var(--tag-bg); color: var(--tag-text); }
.tag-gap { background: #fef2f2; color: #b91c1c; }

.action-text { font-size: 13px; color: var(--text-muted); line-height: 1.5; }

.draft-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.copy-btn {
  font-size: 12px; padding: 4px 12px; border: 1px solid var(--border);
  border-radius: 6px; background: var(--surface); color: var(--accent); cursor: pointer;
  transition: all 0.15s;
}
.copy-btn:hover { border-color: var(--accent); background: var(--accent-bg); }
.draft-text {
  font-family: inherit; font-size: 13px; color: var(--text-muted);
  background: var(--tag-bg); border-radius: 8px; padding: 12px 14px;
  white-space: pre-wrap; line-height: 1.6; border: 1px solid var(--border);
}
</style>
