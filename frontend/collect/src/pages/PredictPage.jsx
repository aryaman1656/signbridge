/**
 * PredictPage.jsx  —  SignBridge live prediction + TTS
 * Connects ESP32 via Web Serial, runs sliding-window inference,
 * speaks the predicted gesture aloud, and shows live sensor panels.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useSerial }       from '../hooks/useSerial'
import { useSensorBuffer } from '../hooks/useSensorBuffer'
import { DEVICE_PROFILES } from '../config/deviceConfig'
import SerialConnect       from '../components/SerialConnect'
import FlexPanel           from '../components/FlexPanel'
import MPUPanel            from '../components/MPUPanel'

const API_URL     = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const WINDOW_SIZE = 50
const SLIDE_EVERY = 10
const MIN_CONF    = 0.60

// ── TTS helpers ────────────────────────────────────────────────────────────
const synth = window.speechSynthesis
let lastSpoken = ''

function speak(word) {
  if (!synth || word === lastSpoken) return
  lastSpoken = word
  synth.cancel()
  const utt = new SpeechSynthesisUtterance(word)
  utt.rate = 0.95; utt.pitch = 1; utt.volume = 1
  synth.speak(utt)
}

// ── Confidence bar ─────────────────────────────────────────────────────────
function ConfBar({ label, value, highlight }) {
  const pct = Math.round(value * 100)
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between',
                    fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
                    color: highlight ? 'var(--neon-cyan)' : 'var(--text-muted)',
                    marginBottom: '3px' }}>
        <span>{label}</span><span>{pct}%</span>
      </div>
      <div style={{ height: '6px', borderRadius: '3px',
                    background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: '3px', width: `${pct}%`,
          background: highlight
            ? 'linear-gradient(90deg, var(--neon-cyan), var(--neon-green))'
            : 'rgba(255,255,255,0.15)',
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export default function PredictPage() {
  const deviceConfig = DEVICE_PROFILES['esp32']

  const { buffer, latest, isLive, push } = useSensorBuffer()
  const { connected, error, portInfo, connect, disconnect } = useSerial(push, deviceConfig)

  const [prediction,  setPrediction]  = useState(null)
  const [modelStatus, setModelStatus] = useState(null)
  const [predicting,  setPredicting]  = useState(false)
  const [predError,   setPredError]   = useState(null)
  const [history,     setHistory]     = useState([])
  const [speechOn,    setSpeechOn]    = useState(true)

  const slideCount = useRef(0)

  // Check model status on mount
  useEffect(() => {
    fetch(`${API_URL}/predict/status`)
      .then(r => r.json())
      .then(setModelStatus)
      .catch(() => setModelStatus({ ready: false, message: 'Backend unreachable' }))
  }, [])

  // Sliding window inference
  useEffect(() => {
    if (!isLive || !connected || !modelStatus?.ready) return
    slideCount.current += 1
    if (slideCount.current < SLIDE_EVERY) return
    slideCount.current = 0
    if (buffer.length < 10) return
    runPredict(buffer.slice(-WINDOW_SIZE))
  }, [latest])

  const runPredict = useCallback(async (samples) => {
    if (predicting) return
    setPredicting(true); setPredError(null)
    try {
      const res = await fetch(`${API_URL}/predict/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ samples }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setPrediction(data)
      setHistory(prev => [
        { word: data.word, confidence: data.confidence, ts: Date.now() },
        ...prev.slice(0, 4),
      ])
      if (speechOn && data.confidence >= MIN_CONF) speak(data.word)
    } catch (e) {
      setPredError(e.message)
    } finally {
      setPredicting(false)
    }
  }, [predicting, speechOn])

  const topWord     = prediction?.word
  const topConf     = prediction?.confidence ?? 0
  const isUncertain = topConf < MIN_CONF
  const allScores   = prediction?.all_scores
    ? Object.entries(prediction.all_scores).sort((a, b) => b[1] - a[1]).slice(0, 5)
    : []

  const card = {
    background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
    border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '24px',
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '28px' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700,
                      letterSpacing: '0.12em', color: 'var(--neon-cyan)', marginBottom: '4px' }}>
          LIVE PREDICTION
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
                      color: 'var(--text-muted)', letterSpacing: '0.14em' }}>
          ESP32 → sliding window ({WINDOW_SIZE} samples) → 1D-CNN → gesture + speech
        </div>
      </div>

      {/* Model status */}
      {modelStatus && !modelStatus.ready && (
        <div style={{ ...card, border: '1px solid rgba(251,146,60,0.4)',
                      background: 'rgba(251,146,60,0.06)', marginBottom: '20px',
                      fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--neon-orange)' }}>
          ⚠ {modelStatus.message || 'Model not ready — run python ml/train.py first'}
        </div>
      )}
      {modelStatus?.ready && (
        <div style={{ ...card, border: '1px solid rgba(52,211,153,0.3)',
                      background: 'rgba(52,211,153,0.04)', marginBottom: '20px',
                      display: 'flex', gap: '24px', flexWrap: 'wrap',
                      fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
          <span style={{ color: 'var(--neon-green)' }}>✓ Model ready</span>
          <span style={{ color: 'var(--text-muted)' }}>
            Classes: {modelStatus.classes?.join(', ')}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            Val accuracy: {modelStatus.val_accuracy
              ? `${(modelStatus.val_accuracy * 100).toFixed(1)}%` : '—'}
          </span>
        </div>
      )}

      {/* Serial connect */}
      <div style={{ marginBottom: '20px' }}>
        <SerialConnect
          connected={connected} error={error} portInfo={portInfo}
          deviceConfig={deviceConfig} onConnect={connect} onDisconnect={disconnect}
        />
      </div>

      {/* Prediction + scores */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

        {/* Big word */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
          {!connected && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem',
                          color: 'var(--text-muted)', textAlign: 'center' }}>
              Connect ESP32 to start
            </div>
          )}
          {connected && !prediction && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem',
                          color: 'var(--text-muted)', textAlign: 'center' }}>
              {isLive ? 'Collecting samples…' : 'Waiting for sensor data…'}
            </div>
          )}
          {prediction && (
            <>
              <div style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: isUncertain ? '1.8rem' : '3rem',
                color: isUncertain ? 'var(--text-muted)' : 'var(--neon-cyan)',
                letterSpacing: '0.1em', marginBottom: '8px',
                filter: isUncertain ? 'none' : 'drop-shadow(0 0 20px var(--neon-cyan))',
                transition: 'all 0.3s',
              }}>
                {isUncertain ? '?' : topWord}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem',
                            color: isUncertain ? 'var(--text-muted)' : 'var(--neon-green)' }}>
                {isUncertain
                  ? `uncertain (${Math.round(topConf * 100)}%)`
                  : `${Math.round(topConf * 100)}% confidence`}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button
                  onClick={() => { setSpeechOn(s => !s); lastSpoken = '' }}
                  style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.72rem', padding: '5px 12px',
                    borderRadius: '8px', cursor: 'pointer',
                    background: speechOn ? 'rgba(34,211,238,0.1)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${speechOn ? 'var(--neon-cyan)' : 'var(--glass-border)'}`,
                    color: speechOn ? 'var(--neon-cyan)' : 'var(--text-muted)',
                  }}>
                  {speechOn ? '🔊 Speech on' : '🔇 Speech off'}
                </button>
                {topWord && !isUncertain && (
                  <button
                    onClick={() => { lastSpoken = ''; speak(topWord) }}
                    style={{
                      fontFamily: 'var(--font-mono)', fontSize: '0.72rem', padding: '5px 12px',
                      borderRadius: '8px', cursor: 'pointer',
                      background: 'rgba(52,211,153,0.1)',
                      border: '1px solid var(--neon-green)',
                      color: 'var(--neon-green)',
                    }}>
                    ▶ Speak
                  </button>
                )}
              </div>
              {predicting && (
                <div style={{ marginTop: '8px', fontFamily: 'var(--font-mono)',
                              fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  ↻ updating…
                </div>
              )}
            </>
          )}
        </div>

        {/* Score breakdown */}
        <div style={card}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
                        letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '14px' }}>
            TOP SCORES
          </div>
          {allScores.length === 0 && (
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem',
                          color: 'var(--text-muted)' }}>
              Scores will appear here
            </div>
          )}
          {allScores.map(([cls, score]) => (
            <ConfBar key={cls} label={cls} value={score} highlight={cls === topWord} />
          ))}
          {predError && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
                          color: '#f87171', marginTop: '8px' }}>
              Error: {predError}
            </div>
          )}
        </div>
      </div>

      {/* Recent predictions */}
      {history.length > 0 && (
        <div style={{ ...card, marginBottom: '16px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
                        letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '14px' }}>
            RECENT PREDICTIONS
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {history.map((h, i) => (
              <div key={h.ts}
                onClick={() => { lastSpoken = ''; speak(h.word) }}
                style={{
                  fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.9rem',
                  padding: '6px 14px', borderRadius: '8px', cursor: 'pointer',
                  border: '1px solid var(--glass-border)',
                  background: i === 0 ? 'rgba(34,211,238,0.1)' : 'rgba(255,255,255,0.04)',
                  color: i === 0 ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                }}>
                {h.word}
                <span style={{ marginLeft: '6px', fontSize: '0.72rem',
                               color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {Math.round(h.confidence * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How to use — when not connected */}
      {!connected && (
        <div style={{ ...card, borderLeft: '3px solid var(--neon-cyan)',
                      background: 'rgba(34,211,238,0.04)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700,
                        letterSpacing: '0.12em', color: 'var(--neon-cyan)', marginBottom: '10px' }}>
            HOW TO USE
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem',
                        color: 'var(--text-secondary)', lineHeight: 2.1 }}>
            1. Train the model — <code>python ml/train.py</code><br/>
            2. Start the backend — <code>uvicorn main:app --reload</code><br/>
            3. Connect your ESP32 above<br/>
            4. Sign a gesture — prediction + speech fires every {SLIDE_EVERY} samples automatically
          </div>
        </div>
      )}

      {/* Live sensor panels — when connected */}
      {connected && (
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 340px' }}>
            <FlexPanel flex={latest.flex} />
          </div>
          <div style={{ flex: '2 1 480px' }}>
            <MPUPanel latest={latest} buffer={buffer} />
          </div>
        </div>
      )}

    </div>
  )
}
