/**
 * pages/AdminPage.jsx
 * Admin dashboard — existing charts/leaderboard/feed/timeline preserved.
 * New tabs added: Languages, Word List, Equivalents.
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid
} from 'recharts'
import { RefreshCw, Trophy, Clock, BarChart2, Activity, UserPlus, UserMinus, Shield, ShieldCheck, Globe, BookOpen, Link } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Shared sub-components ─────────────────────────────────────

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

function GlassInput({ value, onChange, placeholder, type = 'text', disabled = false, style = {} }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)',
        color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '1rem',
        padding: '11px 16px', borderRadius: '10px', outline: 'none', ...style
      }}
    />
  )
}

function Msg({ msg }) {
  if (!msg) return null
  const isErr = msg.type === 'error'
  return (
    <div style={{
      padding: '10px 16px', borderRadius: '8px', marginBottom: '16px',
      background: isErr ? 'rgba(251,146,60,0.08)' : 'rgba(52,211,153,0.08)',
      border: `1px solid ${isErr ? 'rgba(251,146,60,0.3)' : 'rgba(52,211,153,0.3)'}`,
      fontFamily: 'var(--font-body)', fontSize: '0.92rem',
      color: isErr ? 'var(--neon-orange)' : 'var(--neon-green)',
    }}>
      {msg.text}
    </div>
  )
}

// ── Languages Tab ─────────────────────────────────────────────

function LanguagesTab({ email }) {
  const [langs, setLangs]   = useState([])
  const [form,  setForm]    = useState({ code: '', name: '', description: '' })
  const [msg,   setMsg]     = useState(null)
  const [busy,  setBusy]    = useState(false)

  const load = useCallback(() => {
    fetch(`${API_URL}/languages/all?requester_email=${encodeURIComponent(email)}`)
      .then(r => r.json()).then(setLangs).catch(() => {})
  }, [email])

  useEffect(() => { load() }, [load])

  const notify = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 4000)
  }

  const addLang = async () => {
    if (!form.code.trim() || !form.name.trim()) return notify('Code and name are required', 'error')
    setBusy(true)
    try {
      const res  = await fetch(`${API_URL}/languages/add`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requester_email: email, code: form.code.trim().toUpperCase(), name: form.name.trim(), description: form.description.trim() })
      })
      const data = await res.json()
      notify(res.ok ? data.message : data.detail, res.ok ? 'success' : 'error')
      if (res.ok) { load(); setForm({ code: '', name: '', description: '' }) }
    } catch { notify('Network error', 'error') }
    finally   { setBusy(false) }
  }

  const toggle = async (lang) => {
    const endpoint = lang.status === 'published' ? 'unpublish' : 'publish'
    const res  = await fetch(`${API_URL}/languages/${endpoint}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requester_email: email, code: lang.code })
    })
    const data = await res.json()
    notify(res.ok ? data.message : data.detail, res.ok ? 'success' : 'error')
    load()
  }

  const deleteLang = async (code) => {
    if (!window.confirm(`Delete language "${code}"? Existing gesture data is preserved.`)) return
    const res  = await fetch(`${API_URL}/languages/delete`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requester_email: email, code })
    })
    const data = await res.json()
    notify(res.ok ? data.message : data.detail, res.ok ? 'success' : 'error')
    load()
  }

  return (
    <div>
      {/* Add form */}
      <div className="glass" style={{ padding: '22px', marginBottom: '16px' }}>
        <SectionTitle icon={<Globe size={16} />} title="Add New Language" />
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <GlassInput value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="Code (e.g. ASL)" style={{ width: '100px' }} />
          <GlassInput value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name (e.g. American Sign Language)" style={{ flex: 1, minWidth: '220px' }} />
          <GlassInput value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description (optional)" style={{ flex: 1, minWidth: '200px' }} />
        </div>
        <button
          onClick={addLang} disabled={busy}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'rgba(52,211,153,0.1)', border: '1.5px solid rgba(52,211,153,0.4)',
            color: 'var(--neon-green)', fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 600,
            padding: '10px 22px', borderRadius: '10px', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1
          }}
        >
          <Globe size={15} /> Add as Draft
        </button>
      </div>

      <Msg msg={msg} />

      {/* List */}
      {langs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          No languages yet — add one above
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {langs.map(l => (
            <div key={l.code} className="glass" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{l.name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{l.code}</span>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 600,
                    padding: '2px 8px', borderRadius: '6px',
                    background: l.status === 'published' ? 'rgba(52,211,153,0.12)' : 'rgba(251,191,36,0.12)',
                    border: `1px solid ${l.status === 'published' ? 'rgba(52,211,153,0.35)' : 'rgba(251,191,36,0.35)'}`,
                    color: l.status === 'published' ? 'var(--neon-green)' : 'var(--neon-yellow)',
                  }}>
                    {l.status}
                  </span>
                </div>
                {l.description && <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '3px' }}>{l.description}</div>}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => toggle(l)} style={{
                  background: l.status === 'published' ? 'rgba(251,191,36,0.08)' : 'rgba(52,211,153,0.08)',
                  border: `1px solid ${l.status === 'published' ? 'rgba(251,191,36,0.3)' : 'rgba(52,211,153,0.3)'}`,
                  color: l.status === 'published' ? 'var(--neon-yellow)' : 'var(--neon-green)',
                  fontFamily: 'var(--font-body)', fontSize: '0.85rem', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer'
                }}>
                  {l.status === 'published' ? 'Unpublish' : 'Publish'}
                </button>
                <button onClick={() => deleteLang(l.code)} style={{
                  background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)',
                  color: 'var(--neon-orange)', fontFamily: 'var(--font-body)', fontSize: '0.85rem',
                  padding: '6px 14px', borderRadius: '8px', cursor: 'pointer'
                }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Words Tab ─────────────────────────────────────────────────

function WordsTab({ email }) {
  const [words, setWords] = useState([])
  const [langs, setLangs] = useState([])
  const [form,  setForm]  = useState({ word: '', is_base: true, languages: [] })
  const [msg,   setMsg]   = useState(null)
  const [busy,  setBusy]  = useState(false)

  const load = useCallback(() => {
    fetch(`${API_URL}/words/all?requester_email=${encodeURIComponent(email)}`)
      .then(r => r.json()).then(setWords).catch(() => {})
    fetch(`${API_URL}/languages/all?requester_email=${encodeURIComponent(email)}`)
      .then(r => r.json()).then(setLangs).catch(() => {})
  }, [email])

  useEffect(() => { load() }, [load])

  const notify = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 4000) }

  const toggleLang = (code) => setForm(prev => ({
    ...prev,
    languages: prev.languages.includes(code) ? prev.languages.filter(l => l !== code) : [...prev.languages, code]
  }))

  const addWord = async () => {
    if (!form.word.trim()) return notify('Word cannot be empty', 'error')
    if (!form.is_base && form.languages.length === 0) return notify('Select at least one language', 'error')
    setBusy(true)
    try {
      const res  = await fetch(`${API_URL}/words/add`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requester_email: email, word: form.word.trim(), is_base: form.is_base, languages: form.languages })
      })
      const data = await res.json()
      notify(res.ok ? data.message : data.detail, res.ok ? 'success' : 'error')
      if (res.ok) { load(); setForm({ word: '', is_base: true, languages: [] }) }
    } catch { notify('Network error', 'error') }
    finally   { setBusy(false) }
  }

  const deleteWord = async (word) => {
    if (!window.confirm(`Delete word "${word}"?`)) return
    const res  = await fetch(`${API_URL}/words/delete`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requester_email: email, word })
    })
    const data = await res.json()
    notify(res.ok ? data.message : data.detail, res.ok ? 'success' : 'error')
    load()
  }

  return (
    <div>
      <div className="glass" style={{ padding: '22px', marginBottom: '16px' }}>
        <SectionTitle icon={<BookOpen size={16} />} title="Add Word / Gesture" />
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
          <GlassInput value={form.word} onChange={e => setForm({ ...form, word: e.target.value })} placeholder="Word (e.g. Hello)" style={{ flex: 1, minWidth: '180px' }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_base} onChange={e => setForm({ ...form, is_base: e.target.checked, languages: [] })} />
            Base word (all languages)
          </label>
        </div>
        {!form.is_base && langs.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Assign to languages
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {langs.map(l => (
                <label key={l.code} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.languages.includes(l.code)} onChange={() => toggleLang(l.code)} />
                  {l.code}
                </label>
              ))}
            </div>
          </div>
        )}
        <button onClick={addWord} disabled={busy} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'rgba(52,211,153,0.1)', border: '1.5px solid rgba(52,211,153,0.4)',
          color: 'var(--neon-green)', fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 600,
          padding: '10px 22px', borderRadius: '10px', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1
        }}>
          <BookOpen size={15} /> Add Word
        </button>
      </div>

      <Msg msg={msg} />

      {words.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>No words yet — add one above</div>
      ) : (
        <div className="glass" style={{ overflow: 'hidden' }}>
          {words.map((w, i) => (
            <div key={w.word} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 20px',
              borderBottom: i < words.length - 1 ? '1px solid var(--glass-border)' : 'none',
            }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{w.word}</span>
                {w.is_base ? (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: '10px' }}>all languages</span>
                ) : (
                  w.languages.map(l => (
                    <span key={l} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', padding: '1px 7px', borderRadius: '5px', background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.25)', color: 'var(--neon-cyan)', marginLeft: '6px' }}>{l}</span>
                  ))
                )}
              </div>
              <button onClick={() => deleteWord(w.word)} style={{
                background: 'none', border: '1px solid rgba(248,113,113,0.3)',
                color: 'var(--neon-orange)', fontFamily: 'var(--font-body)', fontSize: '0.82rem',
                padding: '4px 12px', borderRadius: '6px', cursor: 'pointer'
              }}>
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Equivalents Tab ───────────────────────────────────────────

function EquivalentsTab({ email }) {
  const [items,  setItems]  = useState([])
  const [filter, setFilter] = useState('pending')
  const [msg,    setMsg]    = useState(null)

  const load = useCallback(() => {
    fetch(`${API_URL}/equivalents/all?requester_email=${encodeURIComponent(email)}`)
      .then(r => r.json()).then(setItems).catch(() => {})
  }, [email])

  useEffect(() => { load() }, [load])

  const notify = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 4000) }

  const review = async (id, action) => {
    const res  = await fetch(`${API_URL}/equivalents/review`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requester_email: email, equivalent_id: id, action })
    })
    const data = await res.json()
    notify(res.ok ? data.message : data.detail, res.ok ? 'success' : 'error')
    load()
  }

  const filtered = items.filter(i => i.status === filter)

  const filterBtn = (s, count) => (
    <button key={s} onClick={() => setFilter(s)} style={{
      fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 600,
      letterSpacing: '0.06em', padding: '6px 16px', borderRadius: '8px',
      border: filter === s ? '1px solid rgba(34,211,238,0.4)' : '1px solid var(--glass-border)',
      background: filter === s ? 'rgba(34,211,238,0.1)' : 'transparent',
      color: filter === s ? 'var(--neon-cyan)' : 'var(--text-muted)',
      cursor: 'pointer'
    }}>
      {s} ({count})
    </button>
  )

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {['pending','approved','rejected'].map(s => filterBtn(s, items.filter(i => i.status === s).length))}
      </div>

      <Msg msg={msg} />

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          No {filter} equivalents
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(item => (
            <div key={item.id} className="glass" style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--neon-cyan)' }}>
                    {item.gesture_name_a || item.gesture_id_a.slice(-6)}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', padding: '1px 7px', borderRadius: '5px', background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.25)', color: 'var(--neon-cyan)' }}>
                    {item.lang_a}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>↔</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--neon-purple)' }}>
                    {item.gesture_name_b || item.gesture_id_b.slice(-6)}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', padding: '1px 7px', borderRadius: '5px', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', color: 'var(--neon-purple)' }}>
                    {item.lang_b}
                  </span>
                </div>
                {item.note && (
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Note: {item.note}
                  </div>
                )}
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  Suggested by {item.suggested_by}
                  {item.reviewed_by && ` · ${item.status} by ${item.reviewed_by}`}
                </div>
              </div>
              {item.status === 'pending' && (
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button onClick={() => review(item.id, 'approve')} style={{
                    background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)',
                    color: 'var(--neon-green)', fontFamily: 'var(--font-body)', fontSize: '0.85rem',
                    padding: '6px 14px', borderRadius: '8px', cursor: 'pointer'
                  }}>Approve</button>
                  <button onClick={() => review(item.id, 'reject')} style={{
                    background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)',
                    color: 'var(--neon-orange)', fontFamily: 'var(--font-body)', fontSize: '0.85rem',
                    padding: '6px 14px', borderRadius: '8px', cursor: 'pointer'
                  }}>Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main AdminPage ────────────────────────────────────────────

export default function AdminPage() {
  const { user } = useAuth()
  const [data,         setData]         = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [admins,       setAdmins]       = useState([])
  const [newAdminEmail,setNewAdminEmail]= useState('')
  const [adminMsg,     setAdminMsg]     = useState(null)
  const [adminLoading, setAdminLoading] = useState(false)
  const [activeTab,    setActiveTab]    = useState('overview')

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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requester_email: user.email, target_email: newAdminEmail.trim() })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed')
      setAdminMsg({ type: 'success', text: data.message })
      setNewAdminEmail(''); fetchAdmins()
    } catch (err) { setAdminMsg({ type: 'error', text: err.message }) }
    finally { setAdminLoading(false) }
  }

  const handleRemoveAdmin = async (email) => {
    setAdminLoading(true); setAdminMsg(null)
    try {
      const res  = await fetch(`${API_URL}/auth/admin/remove`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requester_email: user.email, target_email: email })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed')
      setAdminMsg({ type: 'success', text: data.message }); fetchAdmins()
    } catch (err) { setAdminMsg({ type: 'error', text: err.message }) }
    finally { setAdminLoading(false) }
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

  const tabs = [
    { id: 'overview',    label: 'Overview' },
    { id: 'languages',   label: '🌐 Languages' },
    { id: 'words',       label: '📖 Word List' },
    { id: 'equivalents', label: '🔗 Equivalents' },
    ...(isSuperAdmin ? [{ id: 'admins', label: '🛡 Admins' }] : []),
  ]

  // Overview tab content (existing dashboard)
  const renderOverview = () => {
    if (loading) return <div style={{ textAlign: 'center', padding: '80px', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Loading admin data…</div>
    if (error)   return <div style={{ maxWidth: '500px', margin: '0 auto' }}><div style={{ padding: '20px', background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.3)', borderRadius: '12px', fontFamily: 'var(--font-body)', color: 'var(--neon-orange)' }}>⚠ {error}</div></div>
    if (!data)   return null
    const { overview, gestureBreakdown, leaderboard, recentFeed, timeline } = data
    return (
      <>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '28px' }}>
          <StatCard label="Total Records"   value={overview.totalRecords}       color="var(--neon-cyan)"   icon={<Activity size={16} />} />
          <StatCard label="Total Samples"   value={overview.totalSamples}       color="var(--neon-green)"  icon={<BarChart2 size={16} />} />
          <StatCard label="Unique Gestures" value={overview.uniqueGestures}     color="var(--neon-yellow)" icon={<BarChart2 size={16} />} />
          <StatCard label="Contributors"    value={overview.uniqueContributors} color="var(--neon-purple)" icon={<Trophy size={16} />} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: '20px', marginBottom: '20px' }}>
          <div className="glass" style={{ padding: '22px' }}>
            <SectionTitle icon={<Activity size={16} />} title="Contributions Over Time" />
            {timeline.length === 0 ? <div style={{ textAlign: 'center', padding: '40px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>No data yet</div> : (
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
            {gestureBreakdown.length === 0 ? <div style={{ textAlign: 'center', padding: '40px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>No data yet</div> : (
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

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '20px' }}>
          <div className="glass" style={{ padding: '22px' }}>
            <SectionTitle icon={<Trophy size={16} />} title="Contributor Leaderboard" />
            {leaderboard.length === 0 ? <div style={{ textAlign: 'center', padding: '30px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>No contributors yet</div> : (
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
            {recentFeed.length === 0 ? <div style={{ textAlign: 'center', padding: '30px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>No submissions yet</div> : (
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
      </>
    )
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 28px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
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

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '24px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 600,
            letterSpacing: '0.06em', padding: '8px 18px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            borderBottom: activeTab === t.id ? '2px solid var(--neon-cyan)' : '2px solid transparent',
            background: activeTab === t.id ? 'rgba(34,211,238,0.08)' : 'transparent',
            color: activeTab === t.id ? 'var(--neon-cyan)' : 'var(--text-muted)',
            cursor: 'pointer', transition: 'all 0.2s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview'    && renderOverview()}
      {activeTab === 'languages'   && <LanguagesTab   email={user?.email} />}
      {activeTab === 'words'       && <WordsTab       email={user?.email} />}
      {activeTab === 'equivalents' && <EquivalentsTab email={user?.email} />}

      {/* Admins tab — original code preserved */}
      {activeTab === 'admins' && isSuperAdmin && (
        <div className="glass" style={{ padding: '28px' }}>
          <SectionTitle icon={<Shield size={16} />} title="Admin Management" />
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>Add New Admin</div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input type="email" placeholder="teammate@email.com" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddAdmin()} style={{ flex: 1, minWidth: '260px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '1rem', padding: '11px 16px', borderRadius: '10px', outline: 'none' }} />
              <button onClick={handleAddAdmin} disabled={adminLoading || !newAdminEmail.trim()} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(52,211,153,0.1)', border: '1.5px solid rgba(52,211,153,0.4)', color: 'var(--neon-green)', fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 600, padding: '11px 24px', borderRadius: '10px', cursor: 'pointer', opacity: adminLoading || !newAdminEmail.trim() ? 0.5 : 1 }}>
                <UserPlus size={16} /> Add Admin
              </button>
            </div>
          </div>
          {adminMsg && (
            <div style={{ padding: '10px 16px', borderRadius: '8px', marginBottom: '20px', background: adminMsg.type === 'success' ? 'rgba(52,211,153,0.08)' : 'rgba(251,146,60,0.08)', border: `1px solid ${adminMsg.type === 'success' ? 'rgba(52,211,153,0.3)' : 'rgba(251,146,60,0.3)'}`, fontFamily: 'var(--font-body)', fontSize: '0.92rem', color: adminMsg.type === 'success' ? 'var(--neon-green)' : 'var(--neon-orange)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {adminMsg.text}
              <button onClick={() => setAdminMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '1rem' }}>✕</button>
            </div>
          )}
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>Current Admins ({admins.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {admins.map(admin => (
              <div key={admin.email} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: admin.isSuperAdmin ? 'rgba(251,191,36,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${admin.isSuperAdmin ? 'rgba(251,191,36,0.2)' : 'var(--glass-border)'}`, borderRadius: '10px' }}>
                {admin.photo ? <img src={admin.photo} alt={admin.name} style={{ width: '36px', height: '36px', borderRadius: '50%' }} /> : <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, color: '#fff' }}>{admin.name?.[0]?.toUpperCase() ?? '?'}</div>}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{admin.name}</span>
                    {admin.isSuperAdmin && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--neon-yellow)', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', padding: '1px 7px', borderRadius: '4px' }}>SUPER ADMIN</span>}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{admin.email}</div>
                  {admin.addedAt && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>Added {new Date(admin.addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}{admin.addedBy && admin.addedBy !== 'system' ? ` by ${admin.addedBy}` : ''}</div>}
                </div>
                {!admin.isSuperAdmin && <button onClick={() => handleRemoveAdmin(admin.email)} disabled={adminLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', color: 'var(--neon-orange)', fontFamily: 'var(--font-body)', fontSize: '0.85rem', padding: '6px 14px', borderRadius: '8px', cursor: adminLoading ? 'not-allowed' : 'pointer', opacity: adminLoading ? 0.5 : 1 }}><UserMinus size={14} /> Remove</button>}
                {admin.isSuperAdmin && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}><ShieldCheck size={13} /> Protected</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
