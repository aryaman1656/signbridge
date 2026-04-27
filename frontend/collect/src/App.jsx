import React, { useCallback, useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LanguageProvider, useLanguage } from './context/LanguageContext'
import LoginPage from './pages/LoginPage'
import HistoryPage from './pages/HistoryPage'
import AdminPage from './pages/AdminPage'
import PredictPage from './pages/PredictPage'
import SerialConnect from './components/SerialConnect'
import FlexPanel from './components/FlexPanel'
import MPUPanel from './components/MPUPanel'
import RecordPanel from './components/RecordPanel'
import ContribStats from './components/ContribStats'
import { useSerial } from './hooks/useSerial'
import { useSensorBuffer } from './hooks/useSensorBuffer'
import { DEVICE_PROFILES, DEFAULT_DEVICE } from './config/deviceConfig'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ─── DeviceToggle ─────────────────────────────────────────────────────────────
// The Arduino ↔ ESP32 switch in the header. Disabled while a device is connected
// so you can't change the baud rate mid-session.
function DeviceToggle({ deviceType, onChange, disabled }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
        DEVICE
      </span>
      <div style={{
        display: 'flex', borderRadius: '8px', overflow: 'hidden',
        border: '1px solid var(--glass-border)',
        opacity: disabled ? 0.45 : 1,
        cursor:  disabled ? 'not-allowed' : 'pointer',
      }}>
        {Object.keys(DEVICE_PROFILES).map(key => {
          const active = deviceType === key
          return (
            <button
              key={key}
              onClick={() => !disabled && onChange(key)}
              title={disabled ? 'Disconnect first to switch device' : `Switch to ${DEVICE_PROFILES[key].label}`}
              style={{
                fontFamily:  'var(--font-display)',
                fontSize:    '0.78rem',
                fontWeight:  700,
                letterSpacing: '0.06em',
                padding:     '5px 13px',
                border:      'none',
                borderRight: key === 'arduino' ? '1px solid var(--glass-border)' : 'none',
                background:  active ? 'rgba(34,211,238,0.15)' : 'transparent',
                color:       active ? 'var(--neon-cyan)' : 'var(--text-muted)',
                cursor:      disabled ? 'not-allowed' : 'pointer',
                transition:  'all 0.2s',
              }}
            >
              {DEVICE_PROFILES[key].label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── TabButton ────────────────────────────────────────────────────────────────
function TabButton({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 600,
      letterSpacing: '0.08em', padding: '8px 20px', borderRadius: '8px',
      border: active ? '1px solid rgba(34,211,238,0.4)' : '1px solid transparent',
      background: active ? 'rgba(34,211,238,0.1)' : 'transparent',
      color: active ? 'var(--neon-cyan)' : 'var(--text-muted)',
      cursor: 'pointer', transition: 'all 0.2s',
    }}>
      {label}
    </button>
  )
}

// ─── LanguageSelector ─────────────────────────────────────────────────────────
function LanguageSelector() {
  const { languages, sessionLanguage, changeSessionLanguage, loadingLangs } = useLanguage()
  if (loadingLangs || languages.length === 0) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
        LANG
      </span>
      <select
        value={sessionLanguage || ''}
        onChange={e => changeSessionLanguage(e.target.value)}
        style={{
          background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(8px)',
          border: '1px solid var(--glass-border)', color: 'var(--text-primary)',
          fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 600,
          padding: '5px 10px', borderRadius: '8px', cursor: 'pointer', outline: 'none',
        }}
      >
        {languages.map(l => (
          <option key={l.code} value={l.code}>{l.code} — {l.name}</option>
        ))}
      </select>
    </div>
  )
}

// ─── CollectPage ──────────────────────────────────────────────────────────────
function CollectPage() {
  const { user, logout, userStats, refreshUserStats } = useAuth()
  const { sessionLanguage } = useLanguage()
  const { buffer, latest, isLive, isDemoMode, push, startCapture, stopCapture, startDemo, stopDemo } = useSensorBuffer()

  // ── Device state ────────────────────────────────────────────────────────────
  // Persisted in localStorage so the choice survives a page refresh
  const [deviceType, setDeviceType] = useState(() => {
    return localStorage.getItem('sb_device') || DEFAULT_DEVICE
  })
  const deviceConfig = DEVICE_PROFILES[deviceType]

  const handleDeviceChange = (key) => {
    setDeviceType(key)
    localStorage.setItem('sb_device', key)
  }

  // ── Serial ──────────────────────────────────────────────────────────────────
  const { connected, error, portInfo, connect, disconnect } = useSerial(push, deviceConfig)

  // ── UI state ────────────────────────────────────────────────────────────────
  const [tab,              setTab]              = useState('dashboard')
  const [sessionCount,     setSessionCount]     = useState(0)
  const [gestureBreakdown, setGestureBreakdown] = useState([])
  const [totalSamples,     setTotalSamples]     = useState(null)
  const [contributors,     setContributors]     = useState(null)
  const [theme,            setTheme]            = useState('dark')
  const [submitError,      setSubmitError]      = useState(null)

  const isAdmin     = (user?.isAdmin || user?.isSuperAdmin) ?? false
  const isConnected = connected || isDemoMode

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    fetch(`${API_URL}/stats/`)
      .then(r => r.json())
      .then(data => { setTotalSamples(data.totalSamples); setContributors(data.uniqueContributors) })
      .catch(() => {})
  }, [sessionCount])

  const handleSubmit = useCallback(async ({ gesture, samples, signLanguage, word }) => {
    setSubmitError(null)
    setSessionCount(prev => prev + 1)
    setGestureBreakdown(prev => {
      const existing = prev.find(g => g.gesture === gesture)
      if (existing) return prev.map(g => g.gesture === gesture ? { ...g, count: g.count + 1 } : g)
      return [...prev, { gesture, count: 1 }]
    })
    try {
      const res = await fetch(`${API_URL}/gestures/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gesture,
          word:         word || gesture,
          signLanguage: signLanguage || sessionLanguage || 'ASL',
          samples,
          contributor:  user?.email || 'anonymous',
          region:       null,
        }),
      })
      if (!res.ok) throw new Error('Server error')
      if (user?.email) refreshUserStats(user.email)
    } catch (err) {
      setSubmitError(err.message)
      const blob = new Blob([JSON.stringify({ gesture, signLanguage, samples }, null, 2)], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `${gesture}_${signLanguage || 'ASL'}_${Date.now()}.json`; a.click()
      URL.revokeObjectURL(url)
    }
  }, [user, sessionLanguage])

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '48px' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={{
        padding: '16px 36px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--glass-bg)', backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--glass-border)',
        position: 'sticky', top: 0, zIndex: 100, gap: '16px', flexWrap: 'wrap',
      }}>

        {/* Logo */}
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 700, letterSpacing: '0.12em', lineHeight: 1 }}>
            <span style={{ color: 'var(--neon-cyan)' }}>SIGN</span>
            <span style={{ color: 'var(--neon-green)' }}>BRIDGE</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)', letterSpacing: '0.18em', marginTop: '2px' }}>
            GESTURE DATA COLLECTION · {deviceConfig.label.toUpperCase()}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <TabButton label="Dashboard"  active={tab === 'dashboard'} onClick={() => setTab('dashboard')} />
          <TabButton label="My History" active={tab === 'history'}   onClick={() => setTab('history')} />
          <TabButton label="🔮 Predict" active={tab === 'predict'}   onClick={() => setTab('predict')} />
          {isAdmin && <TabButton label="⚙ Admin" active={tab === 'admin'} onClick={() => setTab('admin')} />}
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>

          {/* ← Device toggle lives here in the header */}
          <DeviceToggle
            deviceType={deviceType}
            onChange={handleDeviceChange}
            disabled={connected}   // can't switch while a port is open
          />

          <LanguageSelector />

          {/* DB status */}
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: totalSamples !== null ? 'var(--neon-green)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: totalSamples !== null ? 'var(--neon-green)' : 'var(--text-muted)', boxShadow: totalSamples !== null ? '0 0 6px var(--neon-green)' : 'none' }} />
            {totalSamples !== null ? 'DB ONLINE' : 'DB OFFLINE'}
          </div>

          {isDemoMode && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--neon-yellow)', padding: '3px 10px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '6px' }}>
              ⚡ DEMO
            </div>
          )}

          {isLive && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--neon-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--neon-cyan)', animation: 'blink 1.2s infinite' }} />
              LIVE
            </div>
          )}

          {/* Theme toggle */}
          <button className="btn-theme" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '☀' : '☾'}
          </button>

          {/* User */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {user?.photo ? (
              <img src={user.photo} alt={user.name} style={{ width: '34px', height: '34px', borderRadius: '50%', border: '2px solid var(--glass-border)' }} />
            ) : (
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                {user?.name?.[0] ?? 'U'}
              </div>
            )}
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name}</div>
            <button onClick={logout} style={{ background: 'none', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.8rem', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' }}>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ── Tab content ─────────────────────────────────────────────────────── */}
      {tab === 'history' ? <HistoryPage /> :
       tab === 'admin'   ? <AdminPage />   :
       tab === 'predict' ? <PredictPage /> : (
        <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '28px 28px 0' }}>

          {submitError && (
            <div style={{ marginBottom: '16px', padding: '12px 20px', border: '1px solid rgba(251,146,60,0.4)', borderRadius: '12px', background: 'rgba(251,146,60,0.08)', backdropFilter: 'blur(8px)', fontFamily: 'var(--font-body)', fontSize: '0.95rem', color: 'var(--neon-orange)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>⚠ Backend unreachable — saved as JSON file instead</span>
              <button onClick={() => setSubmitError(null)} style={{ background: 'none', border: 'none', color: 'var(--neon-orange)', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>
          )}

          {/* Connection row */}
          <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'stretch' }}>
            <div style={{ flex: 1 }}>
              <SerialConnect
                connected={connected}
                error={error}
                portInfo={portInfo}
                deviceConfig={deviceConfig}
                onConnect={connect}
                onDisconnect={disconnect}
              />
            </div>
            <button
              onClick={isDemoMode ? stopDemo : startDemo}
              disabled={connected}
              style={{
                fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 600,
                letterSpacing: '0.06em', padding: '0 24px', borderRadius: '12px',
                border: `1px solid ${isDemoMode ? 'rgba(251,191,36,0.6)' : 'rgba(251,191,36,0.3)'}`,
                background: isDemoMode ? 'rgba(251,191,36,0.15)' : 'rgba(251,191,36,0.06)',
                color: 'var(--neon-yellow)', cursor: connected ? 'not-allowed' : 'pointer',
                opacity: connected ? 0.4 : 1, backdropFilter: 'blur(8px)',
                transition: 'all 0.2s', whiteSpace: 'nowrap',
              }}
            >
              {isDemoMode ? '⏹ Stop Demo' : '⚡ Demo Mode'}
            </button>
          </div>

          {/* How-to banner */}
          {!isConnected && (
            <div style={{ marginBottom: '20px', padding: '18px 24px', background: 'rgba(34,211,238,0.05)', backdropFilter: 'blur(8px)', border: '1px solid rgba(34,211,238,0.2)', borderLeft: '3px solid var(--neon-cyan)', borderRadius: '12px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.14em', color: 'var(--neon-cyan)', marginBottom: '10px' }}>
                HOW TO CONTRIBUTE
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 2, display: 'flex', flexWrap: 'wrap' }}>
                {deviceConfig.steps.map((s, i) => (
                  <span key={i} style={{ marginRight: '20px' }}>
                    <span style={{ color: 'var(--neon-cyan)', marginRight: '6px' }}>›</span>{s}
                  </span>
                ))}
              </div>
              <div style={{ marginTop: '10px', fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--neon-yellow)' }}>
                ⚡ No hardware yet? Click <strong>Demo Mode</strong> to simulate sensor data.
              </div>
            </div>
          )}

          {/* Sensor panels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,2fr)', gap: '20px', marginBottom: '20px' }}>
            <FlexPanel flex={latest.flex} />
            <MPUPanel buffer={buffer} latest={latest} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: '20px' }}>
            <RecordPanel connected={isConnected} isLive={isLive} onStartCapture={startCapture} onStopCapture={stopCapture} onSubmit={handleSubmit} sensorBuffer={latest} hardwareType={deviceType} />
            <ContribStats sessionCount={sessionCount} totalCount={totalSamples} gestureBreakdown={gestureBreakdown} contributors={contributors} userStats={userStats} />
          </div>
        </main>
      )}

      <footer style={{ textAlign: 'center', padding: '40px 32px 0', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.12em' }}>
        SIGNBRIDGE — OPEN SOURCE SIGN LANGUAGE DATASET · {deviceConfig.footerTag}
      </footer>
    </div>
  )
}

function AppInner() {
  const { user } = useAuth()
  useEffect(() => { document.documentElement.setAttribute('data-theme', 'dark') }, [])
  return user ? <CollectPage /> : <LoginPage />
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <AppInner />
      </LanguageProvider>
    </AuthProvider>
  )
}
