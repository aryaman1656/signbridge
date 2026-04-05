/**
 * pages/AdminPage.jsx
 * Admin dashboard with full admin management controls.
 * Super admin can add/remove other admins.
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid
} from 'recharts'
import { RefreshCw, Trophy, Clock, BarChart2, Activity, UserPlus, UserMinus, Shield, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function StatCard({ label, value, color, icon }) {
  return (
    <div className="glass" style={{ padding: '20px 24px', flex: 1, minWidth: '140px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ color }}>{icon}</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 700, color, lineHeight: 1, textShadow: `0 0 20px ${color}44` }}>
        {value ?? '—'}
      </div>
    </div>
  )
}

function SectionTitle({ icon, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
      <span style={{ color: 'var(--neon-cyan)' }}>{icon}</span>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{title}</span>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(10,20,30,0.95)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-primary)' }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color: p.color }}>{p.name}: {p.value}</div>)}
    </div>
  )
}

export default function AdminPage() {
  const { user } = useAuth()
  const [data,         setData]         = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [admins,       setAdmins]       = useState([])
  const [newAdminEmail,setNewAdminEmail]= useState('')
  const [adminMsg,     setAdminMsg]     = useState(null)
  const [adminLoading, setAdminLoading] = useState(false)

  const isAdmin      = user?.isAdmin      ?? false
  const isSuperAdmin = user?.isSuperAdmin ?? false

  const fetchData = useCallback(async () => {
    if (!user?.email || !isAdmin) return
    setLoading(true); setError(null)
    try {
      const res  = await fetch(`${API_URL}/stats/admin?email=${encodeURIComponent(user.email)}`)
      if (res.status === 403) throw new Error('forbidden')
      if (!res.ok) throw new Error('Failed to load admin data')
      setData(await res.json())
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [user, isAdmin])

  const fetchAdmins = useCallback(async () => {
    if (!user?.email || !isAdmin) return
    try {
      const res  = await fetch(`${API_URL}/auth/admins?requester_email=${encodeURIComponent(user.email)}`)
      const data = await res.json()
      setAdmins(data.admins || [])
    } catch (_) {}
  }, [user, isAdmin])

  useEffect(() => { fetchData(); fetchAdmins() }, [fetchData, fetchAdmins])

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) return
    setAdminLoading(true); setAdminMsg(null)
    try {
      const res  = await fetch(`${API_URL}/auth/admin/add`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ requester_email: user.email, target_email: newAdminEmail.trim() })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed')
      setAdminMsg({ type: 'success', text: data.message })
      setNewAdminEmail('')
      fetchAdmins()
    } catch (err) {
      setAdminMsg({ type: 'error', text: err.message })
    } finally { setAdminLoading(false) }
  }

  const handleRemoveAdmin = async (email) => {
    setAdminLoading(true); setAdminMsg(null)
    try {
      const res  = await fetch(`${API_URL}/auth/admin/remove`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ requester_email: user.email, target_email: email })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed')
      setAdminMsg({ type: 'success', text: data.message })
      fetchAdmins()
    } catch (err) {
      setAdminMsg({ type: 'error', text: err.message })
    } finally { setAdminLoading(false) }
  }

  if (!isAdmin) return (
    <div style={{ maxWidth: '500px', margin: '80px auto', textAlign: 'center', padding: '0 24px' }}>
      <div className="glass" style={{ padding: '48px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔒</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--neon-orange)', marginBottom: '8px' }}>Access Denied</div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.95rem', color: 'var(--text-muted)' }}>You don't have admin privileges.</div>
      </div>
    </div>
  )

  if (loading) return <div style={{ textAlign: 'center', padding: '80px', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Loading admin data…</div>
  if (error)   return <div style={{ maxWidth: '500px', margin: '60px auto', padding: '0 24px' }}><div style={{ padding: '20px', background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.3)', borderRadius: '12px', fontFamily: 'var(--font-body)', color: 'var(--neon-orange)' }}>⚠ {error}</div></div>

  const { overview, gestureBreakdown, leaderboard, recentFeed, timeline } = data

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 28px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-primary)' }}>Admin Dashboard</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {isSuperAdmin ? '⭐ Super Admin' : '🛡 Admin'} — {user?.email}
          </div>
        </div>
        <button onClick={() => { fetchData(); fetchAdmins() }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: '0.9rem', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '28px' }}>
        <StatCard label="Total Records"   value={overview.totalRecords}       color="var(--neon-cyan)"   icon={<Activity size={16} />} />
        <StatCard label="Total Samples"   value={overview.totalSamples}       color="var(--neon-green)"  icon={<BarChart2 size={16} />} />
        <StatCard label="Unique Gestures" value={overview.uniqueGestures}     color="var(--neon-yellow)" icon={<BarChart2 size={16} />} />
        <StatCard label="Contributors"    value={overview.uniqueContributors} color="var(--neon-purple)" icon={<Trophy size={16} />} />
      </div>

      {/* Timeline + Gesture breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: '20px', marginBottom: '20px' }}>
        <div className="glass" style={{ padding: '22px' }}>
          <SectionTitle icon={<Activity size={16} />} title="Contributions Over Time" />
          {timeline.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={timeline} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="count" name="Submissions" stroke="var(--neon-cyan)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass" style={{ padding: '22px' }}>
          <SectionTitle icon={<BarChart2 size={16} />} title="Gesture Breakdown" />
          {gestureBreakdown.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={gestureBreakdown.slice(0, 12)} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                <XAxis dataKey="gesture" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="records" name="Records" fill="var(--neon-green)" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Leaderboard + Recent feed */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '20px', marginBottom: '20px' }}>
        <div className="glass" style={{ padding: '22px' }}>
          <SectionTitle icon={<Trophy size={16} />} title="Contributor Leaderboard" />
          {leaderboard.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>No contributors yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {leaderboard.map((entry, i) => (
                <div key={entry.email} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: i === 0 ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${i === 0 ? 'rgba(251,191,36,0.2)' : 'var(--glass-border)'}`, borderRadius: '10px' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: i === 0 ? 'var(--neon-yellow)' : i === 1 ? 'var(--text-secondary)' : 'var(--text-muted)', width: '24px', textAlign: 'center' }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </div>
                  {entry.photo ? <img src={entry.photo} alt={entry.name} style={{ width: '30px', height: '30px', borderRadius: '50%' }} /> : (
                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.8rem', color: '#fff' }}>
                      {entry.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.email}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--neon-cyan)' }}>{entry.totalGestures}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)' }}>gestures</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass" style={{ padding: '22px' }}>
          <SectionTitle icon={<Clock size={16} />} title="Recent Submissions" />
          {recentFeed.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>No submissions yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
              {recentFeed.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '10px' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 700, color: 'var(--neon-cyan)', letterSpacing: '0.06em', background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)', borderRadius: '6px', padding: '3px 10px', whiteSpace: 'nowrap' }}>{item.gesture}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.contributor}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>{new Date(item.capturedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{item.sampleCount} samples</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Admin Management (Super Admin only) ── */}
      {isSuperAdmin && (
        <div className="glass" style={{ padding: '28px' }}>
          <SectionTitle icon={<Shield size={16} />} title="Admin Management" />

          {/* Add admin */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>
              Add New Admin
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="email"
                placeholder="teammate@email.com"
                value={newAdminEmail}
                onChange={e => setNewAdminEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddAdmin()}
                style={{
                  flex: 1, minWidth: '260px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)', fontSize: '1rem',
                  padding: '11px 16px', borderRadius: '10px', outline: 'none'
                }}
              />
              <button
                onClick={handleAddAdmin}
                disabled={adminLoading || !newAdminEmail.trim()}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(52,211,153,0.1)',
                  border: '1.5px solid rgba(52,211,153,0.4)',
                  color: 'var(--neon-green)',
                  fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 600,
                  padding: '11px 24px', borderRadius: '10px', cursor: 'pointer',
                  opacity: adminLoading || !newAdminEmail.trim() ? 0.5 : 1
                }}
              >
                <UserPlus size={16} /> Add Admin
              </button>
            </div>
          </div>

          {/* Feedback message */}
          {adminMsg && (
            <div style={{
              padding: '10px 16px', borderRadius: '8px', marginBottom: '20px',
              background: adminMsg.type === 'success' ? 'rgba(52,211,153,0.08)' : 'rgba(251,146,60,0.08)',
              border: `1px solid ${adminMsg.type === 'success' ? 'rgba(52,211,153,0.3)' : 'rgba(251,146,60,0.3)'}`,
              fontFamily: 'var(--font-body)', fontSize: '0.92rem',
              color: adminMsg.type === 'success' ? 'var(--neon-green)' : 'var(--neon-orange)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              {adminMsg.text}
              <button onClick={() => setAdminMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '1rem' }}>✕</button>
            </div>
          )}

          {/* Current admins list */}
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>
            Current Admins ({admins.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {admins.map(admin => (
              <div key={admin.email} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px',
                background: admin.isSuperAdmin ? 'rgba(251,191,36,0.06)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${admin.isSuperAdmin ? 'rgba(251,191,36,0.2)' : 'var(--glass-border)'}`,
                borderRadius: '10px'
              }}>
                {admin.photo ? (
                  <img src={admin.photo} alt={admin.name} style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                ) : (
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, color: '#fff' }}>
                    {admin.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{admin.name}</span>
                    {admin.isSuperAdmin && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--neon-yellow)', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', padding: '1px 7px', borderRadius: '4px' }}>SUPER ADMIN</span>
                    )}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{admin.email}</div>
                  {admin.addedAt && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      Added {new Date(admin.addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {admin.addedBy && admin.addedBy !== 'system' ? ` by ${admin.addedBy}` : ''}
                    </div>
                  )}
                </div>

                {/* Remove button — only for non-super admins */}
                {!admin.isSuperAdmin && (
                  <button
                    onClick={() => handleRemoveAdmin(admin.email)}
                    disabled={adminLoading}
                    title="Remove admin access"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: 'rgba(248,113,113,0.08)',
                      border: '1px solid rgba(248,113,113,0.3)',
                      color: 'var(--neon-orange)',
                      fontFamily: 'var(--font-body)', fontSize: '0.85rem',
                      padding: '6px 14px', borderRadius: '8px',
                      cursor: adminLoading ? 'not-allowed' : 'pointer',
                      opacity: adminLoading ? 0.5 : 1
                    }}
                  >
                    <UserMinus size={14} /> Remove
                  </button>
                )}

                {admin.isSuperAdmin && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    <ShieldCheck size={13} /> Protected
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
