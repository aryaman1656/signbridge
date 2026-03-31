import React, { useCallback, useState, useEffect } from 'react'
import SerialConnect from './components/SerialConnect'
import FlexPanel from './components/FlexPanel'
import MPUPanel from './components/MPUPanel'
import RecordPanel from './components/RecordPanel'
import ContribStats from './components/ContribStats'
import { useSerial } from './hooks/useSerial'
import { useSensorBuffer } from './hooks/useSensorBuffer'

export default function App() {
  const { buffer, latest, isLive, push, startCapture, stopCapture } = useSensorBuffer()
  const { connected, error, portInfo, connect, disconnect } = useSerial(push)

  const [sessionCount, setSessionCount] = useState(0)
  const [gestureBreakdown, setGestureBreakdown] = useState([])
  const [theme, setTheme] = useState('dark')

  // Apply theme to root element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  const handleSubmit = useCallback(({ gesture, samples }) => {
    setSessionCount(prev => prev + 1)
    setGestureBreakdown(prev => {
      const existing = prev.find(g => g.gesture === gesture)
      if (existing) {
        return prev.map(g => g.gesture === gesture ? { ...g, count: g.count + 1 } : g)
      }
      return [...prev, { gesture, count: 1 }]
    })

    const record = {
      gesture,
      sampleCount: samples.length,
      capturedAt: new Date().toISOString(),
      samples
    }
    console.log('GESTURE RECORDED:', record)

    // Auto-download as JSON until backend is ready
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${gesture}_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '48px' }}>

      {/* ── Header ── */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '18px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--header-bg)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        {/* Logo */}
        <div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2rem',
            fontWeight: 700,
            letterSpacing: '0.15em',
            lineHeight: 1,
            color: 'var(--neon-cyan)',
          }}>
            SIGN<span style={{ color: 'var(--neon-green)' }}>BRIDGE</span>
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            letterSpacing: '0.18em',
            marginTop: '3px'
          }}>
            GESTURE DATA COLLECTION PORTAL
          </div>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {isLive && (
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.9rem',
              color: 'var(--neon-green)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              letterSpacing: '0.1em'
            }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: 'var(--neon-green)',
                animation: 'blink 1.2s infinite'
              }} />
              LIVE
            </div>
          )}

          {/* Theme toggle */}
          <button className="btn-theme" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '28px 28px 0' }}>

        {/* Connection bar */}
        <div style={{ marginBottom: '24px' }}>
          <SerialConnect
            connected={connected}
            error={error}
            portInfo={portInfo}
            onConnect={connect}
            onDisconnect={disconnect}
          />
        </div>

        {/* How-to banner — only when not connected */}
        {!connected && (
          <div style={{
            marginBottom: '24px',
            padding: '18px 24px',
            border: '1px solid var(--border)',
            borderLeft: '3px solid var(--neon-cyan)',
            background: theme === 'dark' ? 'rgba(0,200,212,0.04)' : 'rgba(0,120,140,0.05)',
            borderRadius: '6px',
          }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.05rem',
              fontWeight: 700,
              letterSpacing: '0.15em',
              color: 'var(--neon-cyan)',
              marginBottom: '8px'
            }}>
              HOW TO CONTRIBUTE
            </div>
            <div style={{
              fontFamily: 'var(--font-body)',
              fontSize: '1.05rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.9,
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px 0'
            }}>
              {[
                '1. Flash your ESP32 with the SignBridge firmware',
                '2. Plug in via USB',
                '3. Click CONNECT ESP32',
                '4. Select a gesture from the dropdown',
                '5. Hit RECORD and hold the gesture steady'
              ].map((step, i) => (
                <span key={i} style={{ marginRight: '16px' }}>
                  <span style={{ color: 'var(--neon-cyan)', marginRight: '6px' }}>›</span>
                  {step}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Sensor row ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) minmax(0,2fr)',
          gap: '20px',
          marginBottom: '20px'
        }}>
          <FlexPanel flex={latest.flex} />
          <MPUPanel buffer={buffer} latest={latest} />
        </div>

        {/* ── Record + Stats row ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)',
          gap: '20px'
        }}>
          <RecordPanel
            connected={connected}
            isLive={isLive}
            onStartCapture={startCapture}
            onStopCapture={stopCapture}
            onSubmit={handleSubmit}
          />
          <ContribStats
            sessionCount={sessionCount}
            totalCount={null}
            gestureBreakdown={gestureBreakdown}
          />
        </div>

      </main>

      {/* ── Footer ── */}
      <footer style={{
        textAlign: 'center',
        padding: '40px 32px 0',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.85rem',
        color: 'var(--text-muted)',
        letterSpacing: '0.12em'
      }}>
        SIGNBRIDGE — OPEN SOURCE SIGN LANGUAGE DATASET &nbsp;·&nbsp; ESP32 + FLEX SENSORS + MPU6050
      </footer>
    </div>
  )
}
