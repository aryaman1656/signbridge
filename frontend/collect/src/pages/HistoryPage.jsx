/**
 * pages/HistoryPage.jsx
 * Shows all gesture records for the logged-in user.
 * Allows deleting individual records with confirmation.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Trash2, RefreshCw, AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function HistoryPage() {
  const { user, refreshUserStats } = useAuth()

  const [records,     setRecords]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [deleteId,    setDeleteId]    = useState(null)  // id pending confirmation
  const [deleting,    setDeleting]    = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  const fetchRecords = useCallback(async () => {
    if (!user?.email) return
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(`${API_URL}/gestures/mine?email=${encodeURIComponent(user.email)}`)
      const data = await res.json()
      setRecords(data.data || [])
    } catch (err) {
      setError('Could not load history — is the backend running?')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  const handleDelete = async (id) => {
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(
        `${API_URL}/gestures/${id}?email=${encodeURIComponent(user.email)}`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Delete failed')
      }
      // Remove from local list
      setRecords(prev => prev.filter(r => r.id !== id))
      setDeleteId(null)
      // Refresh personal stats in the contributions panel
      refreshUserStats(user.email)
    } catch (err) {
      setDeleteError(err.message)
    } finally {
      setDeleting(false)
    }
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
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: '24px'
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem', fontWeight: 700,
            letterSpacing: '0.1em', color: 'var(--text-primary)'
          }}>
            My Gesture History
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
            color: 'var(--text-muted)', marginTop: '4px'
          }}>
            {records.length} record{records.length !== 1 ? 's' : ''} found
          </div>
        </div>

        <button
          onClick={fetchRecords}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)', fontSize: '0.9rem',
            padding: '8px 16px', borderRadius: '8px',
            cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '14px 20px', marginBottom: '20px',
          background: 'rgba(251,146,60,0.08)',
          border: '1px solid rgba(251,146,60,0.3)',
          borderRadius: '10px',
          fontFamily: 'var(--font-body)', fontSize: '0.95rem',
          color: 'var(--neon-orange)'
        }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{
          textAlign: 'center', padding: '60px',
          fontFamily: 'var(--font-mono)', fontSize: '0.9rem',
          color: 'var(--text-muted)'
        }}>
          Loading your history…
        </div>
      )}

      {/* Empty state */}
      {!loading && records.length === 0 && !error && (
        <div className="glass" style={{
          textAlign: 'center', padding: '60px',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🧤</div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: '1.1rem',
            fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px'
          }}>
            No gestures recorded yet
          </div>
          <div style={{
            fontFamily: 'var(--font-body)', fontSize: '0.95rem',
            color: 'var(--text-muted)'
          }}>
            Head to the Dashboard and record your first gesture!
          </div>
        </div>
      )}

      {/* Records table */}
      {!loading && records.length > 0 && (
        <div className="glass" style={{ overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 120px 120px 60px',
            gap: '16px',
            padding: '14px 20px',
            borderBottom: '1px solid var(--glass-border)',
            fontFamily: 'var(--font-display)',
            fontSize: '0.78rem', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--text-muted)'
          }}>
            <div>Gesture</div>
            <div>Recorded</div>
            <div>Samples</div>
            <div></div>
          </div>

          {/* Rows */}
          {records.map((record, i) => (
            <div key={record.id}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 120px 120px 60px',
                gap: '16px',
                padding: '14px 20px',
                borderBottom: i < records.length - 1 ? '1px solid var(--glass-border)' : 'none',
                alignItems: 'center',
                transition: 'background 0.15s',
                background: deleteId === record.id ? 'rgba(248,113,113,0.06)' : 'transparent'
              }}>
                {/* Gesture name */}
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1rem', fontWeight: 600,
                  color: 'var(--neon-cyan)',
                  letterSpacing: '0.06em'
                }}>
                  {record.gesture}
                </div>

                {/* Date */}
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem', color: 'var(--text-muted)'
                }}>
                  {formatDate(record.capturedAt)}
                </div>

                {/* Sample count */}
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem', color: 'var(--text-secondary)'
                }}>
                  {record.sampleCount} samples
                </div>

                {/* Delete button */}
                <div>
                  <button
                    onClick={() => setDeleteId(record.id)}
                    style={{
                      background: 'none',
                      border: '1px solid rgba(248,113,113,0.3)',
                      color: 'var(--neon-orange)',
                      width: '34px', height: '34px',
                      borderRadius: '8px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    title="Delete this record"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Inline confirmation row */}
              {deleteId === record.id && (
                <div style={{
                  padding: '14px 20px',
                  background: 'rgba(248,113,113,0.08)',
                  borderBottom: i < records.length - 1 ? '1px solid var(--glass-border)' : 'none',
                  display: 'flex', alignItems: 'center',
                  gap: '12px', flexWrap: 'wrap'
                }}>
                  <AlertTriangle size={16} color="var(--neon-orange)" />
                  <span style={{
                    fontFamily: 'var(--font-body)', fontSize: '0.95rem',
                    color: 'var(--neon-orange)', flex: 1
                  }}>
                    Delete this "{record.gesture}" recording? This cannot be undone.
                  </span>

                  {deleteError && (
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
                      color: 'var(--neon-orange)'
                    }}>
                      {deleteError}
                    </span>
                  )}

                  <button
                    onClick={() => { setDeleteId(null); setDeleteError(null) }}
                    disabled={deleting}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid var(--glass-border)',
                      color: 'var(--text-secondary)',
                      fontFamily: 'var(--font-body)', fontSize: '0.9rem',
                      padding: '6px 16px', borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={() => handleDelete(record.id)}
                    disabled={deleting}
                    style={{
                      background: 'rgba(248,113,113,0.15)',
                      border: '1px solid rgba(248,113,113,0.5)',
                      color: 'var(--neon-orange)',
                      fontFamily: 'var(--font-body)', fontSize: '0.9rem',
                      fontWeight: 600,
                      padding: '6px 16px', borderRadius: '8px',
                      cursor: deleting ? 'not-allowed' : 'pointer',
                      opacity: deleting ? 0.6 : 1
                    }}
                  >
                    {deleting ? 'Deleting…' : 'Yes, Delete'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
