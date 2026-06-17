import { useState, useEffect, useCallback } from 'react'
import styles from './App.module.css'

export default function Admin() {
  const [tabs, setTabs] = useState([])
  const [activeKey, setActiveKey] = useState(null)
  const [content, setContent] = useState('')
  const [savedContent, setSavedContent] = useState('')
  const [updated, setUpdated] = useState(null)
  const [status, setStatus] = useState(null) // null | 'saving' | 'saved' | { error }
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(list => {
        setTabs(list)
        if (list.length > 0) selectTab(list[0].key)
      })
      .catch(err => setStatus({ error: err.message }))
  }, [])

  const selectTab = useCallback((key) => {
    setActiveKey(key)
    setLoading(true)
    setStatus(null)
    fetch(`/api/config/${key}`)
      .then(r => r.json())
      .then(data => {
        setContent(data.content)
        setSavedContent(data.content)
        setUpdated(data.updated)
      })
      .catch(err => setStatus({ error: err.message }))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = useCallback(async () => {
    if (!activeKey) return
    setStatus('saving')
    try {
      const res = await fetch(`/api/config/${activeKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setSavedContent(content)
      setUpdated(data.updated)
      setStatus('saved')
      setTimeout(() => setStatus(null), 2500)
    } catch (err) {
      setStatus({ error: err.message })
    }
  }, [activeKey, content])

  const handleRevert = useCallback(() => {
    if (!activeKey) return
    selectTab(activeKey)
  }, [activeKey, selectTab])

  const isDirty = content !== savedContent
  const updatedLabel = updated ? new Date(updated).toLocaleString() : null

  return (
    <div className={styles.adminWrap}>
      <div className={styles.adminTabs}>
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            className={`${styles.adminTab} ${t.key === activeKey ? styles.adminTabActive : ''}`}
            onClick={() => selectTab(t.key)}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className={styles.adminEditor}>
        <div className={styles.adminToolbar}>
          <span className={styles.adminMeta}>
            {updatedLabel && <>Last saved: {updatedLabel}</>}
            {isDirty && <span className={styles.adminDirty}> · unsaved changes</span>}
          </span>
          <div className={styles.adminActions}>
            {status === 'saving' && <span className={styles.adminStatus}>Saving…</span>}
            {status === 'saved' && <span className={`${styles.adminStatus} ${styles.adminStatusOk}`}>Saved</span>}
            {status?.error && <span className={`${styles.adminStatus} ${styles.adminStatusErr}`}>{status.error}</span>}
            <button
              type="button"
              className={styles.refreshBtn}
              onClick={handleRevert}
              disabled={loading}
            >
              Revert
            </button>
            <button
              type="button"
              className={`${styles.refreshBtn} ${styles.adminSaveBtn}`}
              onClick={handleSave}
              disabled={!isDirty || status === 'saving'}
            >
              Save
            </button>
          </div>
        </div>

        {loading
          ? <p className={styles.empty}>Loading…</p>
          : (
            <textarea
              className={styles.adminTextarea}
              value={content}
              onChange={e => { setContent(e.target.value); setStatus(null) }}
              spellCheck={false}
              aria-label={`Edit ${tabs.find(t => t.key === activeKey)?.name ?? activeKey}`}
            />
          )
        }
      </div>
    </div>
  )
}
