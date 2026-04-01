import React from 'react'
import { normalizeFlex } from '../utils/parser'

const FINGERS = [
  { key: 'f1', label: 'THUMB',  color: 'var(--flex-1)' },
  { key: 'f2', label: 'INDEX',  color: 'var(--flex-2)' },
  { key: 'f3', label: 'MIDDLE', color: 'var(--flex-3)' },
  { key: 'f4', label: 'RING',   color: 'var(--flex-4)' },
  { key: 'f5', label: 'PINKY',  color: 'var(--flex-5)' },
]

function FlexBar({ label, color, rawValue }) {
  const pct = normalizeFlex(rawValue)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
      {/* Bar track */}
      <div style={{
        width: '34px',
        height: '130px',
        background: 'rgba(255,255,255,0.05)',
        border: `1px solid ${color}33`,
        borderRadius: '8px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Fill */}
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: `${pct}%`,
          background: `linear-gradient(to top, ${color}, ${color}66)`,
          boxShadow: `0 0 12px ${color}55`,
          transition: 'height 0.06s ease',
          borderRadius: '6px',
        }} />
        {/* Tick marks */}
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

      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: color }}>
        {rawValue}
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
  return (
    <div className="glass" style={{ padding: '22px' }}>
      <div className="panel-title">
        <span className="panel-title-dot">◆</span>
        Flex Sensors
      </div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-around' }}>
        {FINGERS.map(f => (
          <FlexBar key={f.key} label={f.label} color={f.color} rawValue={flex[f.key] ?? 0} />
        ))}
      </div>
    </div>
  )
}
