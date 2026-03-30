import React, { useState, useEffect, useRef } from 'react'
import { CircleDot, CheckCircle, Clock } from 'lucide-react'

const GESTURE_LIST = [
  'A','B','C','D','E','F','G','H','I','J','K','L','M',
  'N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
  'Hello','Thank You','Yes','No','Please','Sorry',
  'Help','More','Stop','Good','Bad','I Love You'
]

const RECORD_DURATION = 3000
const COUNTDOWN_FROM  = 3

export default function RecordPanel({ connected, isLive, onStartCapture, onStopCapture, onSubmit }) {
  const [selectedGesture, setSelectedGesture] = useState('')
  const [customGesture,   setCustomGesture]   = useState('')
  const [phase,           setPhase]           = useState('idle')
  const [countdown,       setCountdown]       = useState(COUNTDOWN_FROM)
  const [progress,        setProgress]        = useState(0)
  const [lastSubmitted,   setLastSubmitted]   = useState(null)
  const timerRef = useRef(null)

  const gestureName = selectedGesture === '__custom__' ? customGesture.trim() : selectedGesture
  const canRecord   = connected && isLive && gestureName.length > 0 && phase === 'idle'

  const startSequence = () => {
    if (!canRecord) return
    setPhase('countdown')
    setCountdown(COUNTDOWN_FROM)
    let c = COUNTDOWN_FROM
    const iv = setInterval(() => {
      c -= 1
      setCountdown(c)
      if (c <= 0) { clearInterval(iv); beginRecording() }
    }, 1000)
  }

  const beginRecording = () => {
    setPhase('recording')
    onStartCapture()
    const start = Date.now()
    const iv = setInterval(() => {
      const pct = Math.min(((Date.now() - start) / RECORD_DURATION) * 100, 100)
      setProgress(pct)
      if (pct >= 100) { clearInterval(iv); finishRecording() }
    }, 50)
    timerRef.current = iv
  }

  const finishRecording = () => {
    const samples = onStopCapture()
    setPhase('done')
    onSubmit({ gesture: gestureName, samples })
    setLastSubmitted(gestureName)
    setTimeout(() => { setPhase('idle'); setProgress(0) }, 2000)
  }

  useEffect(() => () => clearInterval(timerRef.current), [])

  return (
    <div className="card" style={{ padding: '24px' }}>
      <div className="panel-title">
        <span className="panel-title-dot">◆</span>
        Gesture Recording
      </div>

      {/* Gesture selector */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <select
          value={selectedGesture}
          onChange={e => setSelectedGesture(e.target.value)}
          disabled={phase !== 'idle'}
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)',
            fontSize: '0.95rem',
            padding: '10px 14px',
            borderRadius: '4px',
            flex: 1,
            minWidth: '180px',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          <option value="">— Select a gesture —</option>
          {GESTURE_LIST.map(g => <option key={g} value={g}>{g}</option>)}
          <option value="__custom__">+ Custom gesture</option>
        </select>

        {selectedGesture === '__custom__' && (
          <input
            type="text"
            placeholder="Type gesture name..."
            value={customGesture}
            onChange={e => setCustomGesture(e.target.value)}
            disabled={phase !== 'idle'}
            style={{
              background: 'var(--bg-secondary)',
              border: '1.5px solid var(--neon-cyan)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: '0.95rem',
              padding: '10px 14px',
              borderRadius: '4px',
              flex: 1,
              minWidth: '180px',
              outline: 'none'
            }}
          />
        )}
      </div>

      {/* Status display */}
      <div style={{
        height: '72px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '20px'
      }}>
        {phase === 'idle' && (
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
            {!connected  ? '⚠  Connect ESP32 first' :
             !isLive     ? '⚠  Waiting for sensor data…' :
             !gestureName? 'Select a gesture to begin' :
             `Ready to record "${gestureName}"`}
          </span>
        )}

        {phase === 'countdown' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '3rem',
              fontWeight: 700,
              color: 'var(--neon-yellow)',
              lineHeight: 1
            }}>
              {countdown}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Get ready…
            </div>
          </div>
        )}

        {phase === 'recording' && (
          <div style={{ textAlign: 'center', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px' }}>
              <CircleDot size={16} color="var(--neon-orange)" style={{ animation: 'blink 0.6s infinite' }} />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 700, color: 'var(--neon-orange)', letterSpacing: '0.08em' }}>
                Recording — {gestureName}
              </span>
            </div>
            <div style={{
              height: '5px',
              background: 'var(--bg-secondary)',
              borderRadius: '3px',
              overflow: 'hidden',
              margin: '0 24px'
            }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: 'var(--neon-orange)',
                borderRadius: '3px',
                transition: 'width 0.05s linear'
              }} />
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle size={20} color="var(--neon-green)" />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--neon-green)', letterSpacing: '0.06em' }}>
              Sample saved!
            </span>
          </div>
        )}
      </div>

      {/* Record button */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
        <button
          className={`btn btn-record ${phase === 'recording' ? 'recording-pulse' : ''}`}
          onClick={startSequence}
          disabled={!canRecord}
        >
          {phase === 'idle'      ? '● Record Gesture'       :
           phase === 'countdown' ? `Starting in ${countdown}…` :
           phase === 'recording' ? '● Capturing…'           :
           '✓ Saved'}
        </button>

        {gestureName && phase === 'idle' && (
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={13} /> {RECORD_DURATION / 1000}s capture
          </span>
        )}
      </div>

      {lastSubmitted && phase === 'idle' && (
        <div style={{ marginTop: '14px', textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Last recorded: <span style={{ color: 'var(--neon-green)', fontWeight: 600 }}>{lastSubmitted}</span>
        </div>
      )}
    </div>
  )
}
