/**
 * pages/HistoryPage.jsx
 * Shows all gesture records for the logged-in user.
 * Updated: language badge on each record + suggest equivalent button.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Trash2, RefreshCw, AlertTriangle, Link } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const LANG_COLORS = {
  ASL: { bg: 'rgba(34,211,238,0.12)',  border: 'rgba(34,211,238,0.35)',  text: 'var(--neon-cyan)'   },
  ISL: { bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.35)',  text: 'var(--neon-green)'  },
  BSL: { bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.35)', text: 'var(--neon-purple)' },
  LSF: { bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.35)',  text: 'var(--neon-yellow)' },
}
const DEFAULT_LANG_COLOR = { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.15)', text: 'var(--text-secondary)' }

function LangBadge({ code }) {
  const c = LANG_COLORS[code] || DEFAULT_LANG_COLOR
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 600,
      padding: '2px 8px', borderRadius: '6px', letterSpacing: '0.08em',
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
    }}>
      {code || 'ASL'}
    </span>
  )
}

function SuggestModal({ gesture, allGestures, onClose, onSubmit }) {
  const [targetId, setTargetId] = useState('')
  const [note,     setNote]     = useState('')

  // Only show gestures from different languages
  const candidates = allGestures.filter(g =>
    g.id !== gesture.id &&
    (g.signLanguage || 'ASL') !== (gesture.signLanguage || 'ASL')
  )

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px'
    }} onClick={onClose}>
      <div className="glass" style={{ padding: '28px', maxWidth: '500px', width: '100%' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Suggest equivalent gesture
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
          Mark <span style={{ color: 'var(--neon-cyan)', fontWeight: 600 }}>
            {gesture.gesture} ({gesture.signLanguage || 'ASL'})
          </span> as equivalent to a gesture in another language.
          Datasets stay independent — this just links them.
        </div>

        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Select equivalent gesture
          </div>
          {candidates.length === 0 ? (
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-muted)', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
              No gestures from other languages found. Record gestures in multiple languages first.
            </div>
          ) : (
            <select
              value={targetId}
              onChange={e => setTargetId(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(8px)',
                border: '1px solid var(--glass-border)', color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)', fontSize: '1rem',
                padding: '11px 16px', borderRadius: '10px', width: '100%', outline: 'none',
              }}
            >
              <option value="">— Choose a gesture —</option>
              {candidates.map(g => (
                <option key={g.id} value={g.id}>
                  {g.gesture} ({g.signLanguage || 'ASL'})
                </option>
              ))}
            </select>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Note (optional)
          </div>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. same handshape, slightly different motion"
            style={{
              background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)',
              border: '1px solid var(--glass-border)', color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)', fontSize: '0.95rem',
              padding: '11px 16px', borderRadius: '10px', width: '100%', outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)',
            color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: '0.9rem',
            padding: '8px 18px', borderRadius: '8px', cursor: 'pointer'
          }}>
            Cancel
          </button>
          <button
            disabled={!targetId}
            onClick={() => onSubmit(targetId, note)}
            style={{
              background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.4)',
              color: 'var(--neon-cyan)', fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 600,
              padding: '8px 20px', borderRadius: '8px',
              cursor: !targetId ? 'not-allowed' : 'pointer', opacity: !targetId ? 0.4 : 1
            }}
          >
            Submit for review
          </button>
        </div>
      </div>
    </div>
  )
}

export default function HistoryPage() {
  const { user, refreshUserStats } = useAuth()

  const [records,     setRecords]     = useState([])
  const [allGestures, setAllGestures] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [deleteId,    setDeleteId]    = useState(null)
  const [deleting,    setDeleting]    = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const [suggestFor,  setSuggestFor]  = useState(null)
  const [toast,       setToast]       = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const fetchRecords = useCallback(async () => {
    if (!user?.email) return
    setLoading(true); setError(null)
    try {
      const [mineRes, allRes] = await Promise.all([
        fetch(`${API_URL}/gestures/mine?email=${encodeURIComponent(user.email)}`),
        fetch(`${API_URL}/gestures/`),
      ])
      const mine = await mineRes.json()
      const all  = await allRes.json()
      setRecords(mine.data || [])
      setAllGestures(all.data || [])
    } catch (err) {
      setError('Could not load history — is the backend running?')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  const handleDelete = async (id) => {
    setDeleting(true); setDeleteError(null)
    try {
      const res = await fetch(
        `${API_URL}/gestures/${id}?email=${encodeURIComponent(user.email)}`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Delete failed')
      }
      setRecords(prev => prev.filter(r => r.id !== id))
      setDeleteId(null)
      refreshUserStats(user.email)
    } catch (err) {
      setDeleteError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const handleSuggest = async (targetId, note) => {
    const src = suggestFor
    const tgt = allGestures.find(g => g.id === targetId)
    try {
      const res = await fetch(`${API_URL}/equivalents/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggested_by:  user.email,
          gesture_id_a:  src.id,
          lang_a:        src.signLanguage || 'ASL',
          gesture_id_b:  targetId,
          lang_b:        tgt?.signLanguage || 'ASL',
          note,
        })
      })
      const data = await res.json()
      if (res.ok) showToast('Suggestion submitted — admin will review it')
      else        showToast(data.detail || 'Failed to submit suggestion')
    } catch {
      showToast('Network error — could not submit suggestion')
    }
    setSuggestFor(null)
  }

  const formatDate = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 28px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-primary)' }}>
            My Gesture History
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {records.length} record{records.length !== 1 ? 's' : ''} found
          </div>
        </div>
        <button onClick={fetchRecords} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)',
          color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: '0.9rem',
          padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s'
        }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div style={{ padding: '14px 20px', marginBottom: '20px', background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.3)', borderRadius: '10px', fontFamily: 'var(--font-body)', fontSize: '0.95rem', color: 'var(--neon-orange)' }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Loading your history…
        </div>
      )}

      {!loading && records.length === 0 && !error && (
        <div className="glass" style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🧤</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>No gestures recorded yet</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.95rem', color: 'var(--text-muted)' }}>Head to the Dashboard and record your first gesture!</div>
        </div>
      )}

      {/* Records table */}
      {!loading && records.length > 0 && (
        <div className="glass" style={{ overflow: 'hidden' }}>
          {/* Header row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 100px 130px 110px 96px',
            gap: '16px', padding: '14px 20px',
            borderBottom: '1px solid var(--glass-border)',
            fontFamily: 'var(--font-display)', fontSize: '0.78rem', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)'
          }}>
            <div>Gesture</div>
            <div>Language</div>
            <div>Recorded</div>
            <div>Samples</div>
            <div></div>
          </div>

          {records.map((record, i) => (
            <div key={record.id}>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 100px 130px 110px 96px',
                gap: '16px', padding: '14px 20px',
                borderBottom: i < records.length - 1 ? '1px solid var(--glass-border)' : 'none',
                alignItems: 'center', transition: 'background 0.15s',
                background: deleteId === record.id ? 'rgba(248,113,113,0.06)' : 'transparent'
              }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, color: 'var(--neon-cyan)', letterSpacing: '0.06em' }}>
                  {record.gesture}
                </div>

                <div>
                  <LangBadge code={record.signLanguage || 'ASL'} />
                </div>

                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {formatDate(record.capturedAt)}
                </div>

                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {record.sampleCount} samples
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  {/* Suggest equivalent */}
                  <button
                    onClick={() => setSuggestFor(record)}
                    title="Suggest this gesture is equivalent to another language's gesture"
                    style={{
                      background: 'none', border: '1px solid rgba(167,139,250,0.3)',
                      color: 'var(--neon-purple)', width: '34px', height: '34px',
                      borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    <Link size={13} />
                  </button>
                  {/* Delete */}
                  <button
                    onClick={() => setDeleteId(record.id)}
                    style={{
                      background: 'none', border: '1px solid rgba(248,113,113,0.3)',
                      color: 'var(--neon-orange)', width: '34px', height: '34px',
                      borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    title="Delete this record"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {deleteId === record.id && (
                <div style={{
                  padding: '14px 20px', background: 'rgba(248,113,113,0.08)',
                  borderBottom: i < records.length - 1 ? '1px solid var(--glass-border)' : 'none',
                  display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap'
                }}>
                  <AlertTriangle size={16} color="var(--neon-orange)" />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.95rem', color: 'var(--neon-orange)', flex: 1 }}>
                    Delete this "{record.gesture}" recording? This cannot be undone.
                  </span>
                  {deleteError && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--neon-orange)' }}>{deleteError}</span>}
                  <button onClick={() => { setDeleteId(null); setDeleteError(null) }} disabled={deleting} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: '0.9rem', padding: '6px 16px', borderRadius: '8px', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={() => handleDelete(record.id)} disabled={deleting} style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.5)', color: 'var(--neon-orange)', fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 600, padding: '6px 16px', borderRadius: '8px', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1 }}>
                    {deleting ? 'Deleting…' : 'Yes, Delete'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Suggest equivalent modal */}
      {suggestFor && (
        <SuggestModal
          gesture={suggestFor}
          allGestures={allGestures}
          onClose={() => setSuggestFor(null)}
          onSubmit={handleSuggest}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
          border: '1px solid var(--glass-border)', borderRadius: '10px',
          padding: '12px 24px', fontFamily: 'var(--font-body)', fontSize: '0.95rem',
          color: 'var(--text-primary)', zIndex: 300,
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)'
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
