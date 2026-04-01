import React, { useCallback, useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import SerialConnect from './components/SerialConnect'
import FlexPanel from './components/FlexPanel'
import MPUPanel from './components/MPUPanel'
import RecordPanel from './components/RecordPanel'
import ContribStats from './components/ContribStats'
import { useSerial } from './hooks/useSerial'
import { useSensorBuffer } from './hooks/useSensorBuffer'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function CollectPage() {
  const { user, logout } = useAuth()
  const { buffer, latest, isLive, push, startCapture, stopCapture } = useSensorBuffer()
  const { connected, error, portInfo, connect, disconnect } = useSerial(push)

  const [sessionCount,     setSessionCount]     = useState(0)
  const [gestureBreakdown, setGestureBreakdown] = useState([])
  const [totalSamples,     setTotalSamples]     = useState(null)
  const [contributors,     setContributors]     = useState(null)
  const [theme,            setTheme]            = useState('dark')
  const [submitError,      setSubmitError]      = useState(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    fetch(`${API_URL}/stats/`)
      .then(r => r.json())
      .then(data => {
        setTotalSamples(data.totalSamples)
        setContributors(data.uniqueContributors)
      })
      .catch(() => {})
  }, [sessionCount])

  const handleSubmit = useCallback(async ({ gesture, samples }) => {
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
          samples,
          contributor: user?.email || 'anonymous',
          region: null
        })
      })
      if (!res.ok) throw new Error('Server error')
      const result = await res.json()
      console.log('✅ Saved:', result)
    } catch (err) {
      setSubmitError(err.message)
      // Fallback download
      const blob = new Blob([JSON.stringify({ gesture, samples }, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${gesture}_${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }, [user])

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '48px' }}>

      {/* ── Header ── */}
      <header style={{
        padding: '16px 36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--glass-border)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        {/* Logo */}
        <div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.8rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            lineHeight: 1,
          }}>
            <span style={{ color: 'var(--neon-cyan)' }}>SIGN</span>
            <span style={{ color: 'var(--neon-green)' }}>BRIDGE</span>
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.68rem',
            color: 'var(--text-muted)',
            letterSpacing: '0.18em',
            marginTop: '2px'
          }}>
            GESTURE DATA COLLECTION
          </div>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>

          {/* DB status */}
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: totalSamples !== null ? 'var(--neon-green)' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <div style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: totalSamples !== null ? 'var(--neon-green)' : 'var(--text-muted)',
              boxShadow: totalSamples !== null ? '0 0 6px var(--neon-green)' : 'none'
            }} />
            {totalSamples !== null ? 'DB ONLINE' : 'DB OFFLINE'}
          </div>

          {/* Live indicator */}
          {isLive && (
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
              color: 'var(--neon-cyan)',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}>
              <div style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: 'var(--neon-cyan)',
                animation: 'blink 1.2s infinite'
              }} />
              LIVE
            </div>
          )}

          {/* Theme toggle */}
          <button className="btn-theme" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '☀' : '☾'}
          </button>

          {/* User avatar + logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {user?.photo ? (
              <img src={user.photo} alt={user.name}
                style={{ width: '34px', height: '34px', borderRadius: '50%', border: '2px solid var(--glass-border)' }} />
            ) : (
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: '#fff'
              }}>
                {user?.name?.[0] ?? 'U'}
              </div>
            )}
            <div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {user?.name}
              </div>
            </div>
            <button onClick={logout} style={{
              background: 'none', border: '1px solid var(--glass-border)',
              color: 'var(--text-muted)', fontFamily: 'var(--font-body)',
              fontSize: '0.8rem', padding: '4px 10px', borderRadius: '6px',
              cursor: 'pointer', transition: 'all 0.2s'
            }}>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '28px 28px 0' }}>

        {/* Error banner */}
        {submitError && (
          <div style={{
            marginBottom: '16px', padding: '12px 20px',
            border: '1px solid rgba(251,146,60,0.4)',
            borderRadius: '12px',
            background: 'rgba(251,146,60,0.08)',
            backdropFilter: 'blur(8px)',
            fontFamily: 'var(--font-body)', fontSize: '0.95rem',
            color: 'var(--neon-orange)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span>⚠ Backend unreachable — saved as JSON file instead</span>
            <button onClick={() => setSubmitError(null)} style={{
              background: 'none', border: 'none', color: 'var(--neon-orange)',
              cursor: 'pointer', fontSize: '1.1rem'
            }}>✕</button>
          </div>
        )}

        {/* Connection bar */}
        <div style={{ marginBottom: '20px' }}>
          <SerialConnect connected={connected} error={error} portInfo={portInfo} onConnect={connect} onDisconnect={disconnect} />
        </div>

        {/* How-to */}
        {!connected && (
          <div style={{
            marginBottom: '20px', padding: '18px 24px',
            background: 'rgba(34,211,238,0.05)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(34,211,238,0.2)',
            borderLeft: '3px solid var(--neon-cyan)',
            borderRadius: '12px',
          }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: '0.85rem',
              fontWeight: 700, letterSpacing: '0.14em',
              color: 'var(--neon-cyan)', marginBottom: '10px'
            }}>
              HOW TO CONTRIBUTE
            </div>
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: '1rem',
              color: 'var(--text-secondary)', lineHeight: 2,
              display: 'flex', flexWrap: 'wrap'
            }}>
              {[
                '1. Flash ESP32 with SignBridge firmware',
                '2. Plug in via USB',
                '3. Click Connect ESP32',
                '4. Select a gesture',
                '5. Hit Record and hold steady'
              ].map((s, i) => (
                <span key={i} style={{ marginRight: '20px' }}>
                  <span style={{ color: 'var(--neon-cyan)', marginRight: '6px' }}>›</span>{s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Sensor row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,2fr)', gap: '20px', marginBottom: '20px' }}>
          <FlexPanel flex={latest.flex} />
          <MPUPanel buffer={buffer} latest={latest} />
        </div>

        {/* Record + Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: '20px' }}>
          <RecordPanel connected={connected} isLive={isLive} onStartCapture={startCapture} onStopCapture={stopCapture} onSubmit={handleSubmit} />
          <ContribStats sessionCount={sessionCount} totalCount={totalSamples} gestureBreakdown={gestureBreakdown} contributors={contributors} />
        </div>
      </main>

      <footer style={{
        textAlign: 'center', padding: '40px 32px 0',
        fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
        color: 'var(--text-muted)', letterSpacing: '0.12em'
      }}>
        SIGNBRIDGE — OPEN SOURCE SIGN LANGUAGE DATASET · ESP32 + FLEX SENSORS + MPU6050
      </footer>
    </div>
  )
}

function AppInner() {
  const { user } = useAuth()

  // Apply default theme on first load
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
  }, [])

  return user ? <CollectPage /> : <LoginPage />
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
