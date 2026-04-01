import React from 'react'
import { Database, Globe, TrendingUp } from 'lucide-react'

function StatBox({ icon, label, value, color }) {
  return (
    <div style={{
      flex: 1,
      minWidth: '90px',
      background: 'rgba(255,255,255,0.05)',
      border: `1px solid ${color}22`,
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    }}>
      <div style={{ color: color, display: 'flex', alignItems: 'center', gap: '6px' }}>
        {icon}
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.75rem',
          fontWeight: 600,
          letterSpacing: '0.08em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase'
        }}>
          {label}
        </span>
      </div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: '2.2rem',
        fontWeight: 700,
        color: color,
        lineHeight: 1,
        textShadow: `0 0 20px ${color}44`
      }}>
        {value ?? '—'}
      </div>
    </div>
  )
}

export default function ContribStats({ sessionCount, totalCount, gestureBreakdown, contributors }) {
  return (
    <div className="glass" style={{ padding: '26px' }}>
      <div className="panel-title">
        <span className="panel-title-dot">◆</span>
        Contributions
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
        <StatBox icon={<TrendingUp size={15} />} label="Session"      value={sessionCount}  color="var(--neon-green)"  />
        <StatBox icon={<Database size={15} />}   label="Total"        value={totalCount}    color="var(--neon-cyan)"   />
        <StatBox icon={<Globe size={15} />}      label="Contributors" value={contributors}  color="var(--neon-purple)" />
      </div>

      {gestureBreakdown && gestureBreakdown.length > 0 && (
        <>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.78rem', fontWeight: 600,
            letterSpacing: '0.1em', color: 'var(--text-muted)',
            marginBottom: '10px', textTransform: 'uppercase'
          }}>
            Session gestures
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {gestureBreakdown.map(({ gesture, count }) => (
              <div key={gesture} style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.95rem',
                padding: '5px 12px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                color: 'var(--text-secondary)'
              }}>
                {gesture} <span style={{ color: 'var(--neon-cyan)', fontWeight: 700 }}>×{count}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
