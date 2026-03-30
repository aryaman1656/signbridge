import React from 'react'
import { Database, Globe, TrendingUp } from 'lucide-react'

function StatBox({ icon, label, value, color }) {
  return (
    <div style={{
      flex: 1,
      minWidth: '90px',
      background: 'var(--bg-secondary)',
      border: `1px solid ${color}22`,
      borderRadius: '5px',
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    }}>
      <div style={{ color: color, display: 'flex', alignItems: 'center', gap: '6px' }}>
        {icon}
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          {label}
        </span>
      </div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.8rem',
        fontWeight: 700,
        color: color,
        lineHeight: 1
      }}>
        {value}
      </div>
    </div>
  )
}

export default function ContribStats({ sessionCount, totalCount, gestureBreakdown }) {
  return (
    <div className="card" style={{ padding: '24px' }}>
      <div className="panel-title">
        <span className="panel-title-dot">◆</span>
        Contributions
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <StatBox icon={<TrendingUp size={15} />} label="This session" value={sessionCount}       color="var(--neon-green)" />
        <StatBox icon={<Database size={15} />}   label="Total samples" value={totalCount ?? '—'} color="var(--neon-cyan)" />
        <StatBox icon={<Globe size={15} />}      label="Contributors"  value="—"                 color="var(--neon-purple)" />
      </div>

      {gestureBreakdown && gestureBreakdown.length > 0 && (
        <>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
            Session gestures
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {gestureBreakdown.map(({ gesture, count }) => (
              <div key={gesture} style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.85rem',
                padding: '3px 10px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--text-secondary)'
              }}>
                {gesture} <span style={{ color: 'var(--neon-cyan)', fontWeight: 600 }}>×{count}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
