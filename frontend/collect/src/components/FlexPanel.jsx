import React from 'react'

const FINGERS = [
  { key: 'f1', label: 'THUMB',  color: 'var(--flex-1)' },
  { key: 'f2', label: 'INDEX',  color: 'var(--flex-2)' },
  { key: 'f3', label: 'MIDDLE', color: 'var(--flex-3)' },
  { key: 'f4', label: 'RING',   color: 'var(--flex-4)' },
  { key: 'f5', label: 'PINKY',  color: 'var(--flex-5)' },
]

// Arduino ADC is 10-bit (0-1023). Adjust if your sensor range differs.
const FLEX_MIN = 0
const FLEX_MAX = 1023

function toPercent(raw) {
  const v = Number(raw)
  if (!isFinite(v)) return 0
  const clamped = Math.min(Math.max(v, FLEX_MIN), FLEX_MAX)
  return Math.round(((clamped - FLEX_MIN) / (FLEX_MAX - FLEX_MIN)) * 100)
}

// Accepts array [n,n,n,n,n], numeric-indexed obj {0:n,...}, or named obj {f1:n,...}
function toFlexObj(raw) {
  if (!raw) return { f1: 0, f2: 0, f3: 0, f4: 0, f5: 0 }
  if (Array.isArray(raw))
    return { f1: raw[0]??0, f2: raw[1]??0, f3: raw[2]??0, f4: raw[3]??0, f5: raw[4]??0 }
  if ('0' in raw)
    return { f1: raw[0]??0, f2: raw[1]??0, f3: raw[2]??0, f4: raw[3]??0, f5: raw[4]??0 }
  return raw
}

function FlexBar({ label, color, rawValue }) {
  const pct = toPercent(rawValue)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
      <div style={{
        width: '34px',
        height: '130px',
        background: 'rgba(255,255,255,0.05)',
        border: `1px solid ${color}33`,
        borderRadius: '8px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${pct}%`,
          background: `linear-gradient(to top, ${color}, ${color}66)`,
          boxShadow: `0 0 12px ${color}55`,
          transition: 'height 0.06s ease',
          borderRadius: '6px',
        }} />
        {[25, 50, 75].map(p => (
          <div key={p} style={{
            position: 'absolute',
            bottom: `${p}%`,
            left: '20%', right: '20%',
            height: '1px',
            background: 'rgba(255,255,255,0.1)',
          }} />
        ))}
      </div>

      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color }}>
        {rawValue ?? 0}
      </span>
      <span style={{
        fontFamily: 'var(--font-display)',
        fontSize: '0.7rem',
        fontWeight: 600,
        letterSpacing: '0.06em',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
      }}>
        {label}
      </span>
    </div>
  )
}

export default function FlexPanel({ flex }) {
  const safe = toFlexObj(flex)

  return (
    <div className="glass" style={{ padding: '22px' }}>
      <div className="panel-title">
        <span className="panel-title-dot">&#9670;</span>
        Flex Sensors
      </div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-around' }}>
        {FINGERS.map(f => (
          <FlexBar
            key={f.key}
            label={f.label}
            color={f.color}
            rawValue={safe[f.key] ?? 0}
          />
        ))}
      </div>
    </div>
  )
}
