import React from 'react'
import { Database, Globe, TrendingUp, User } from 'lucide-react'

function StatBox({ icon, label, value, color, sub }) {
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
      gap: '4px'
    }}>
      <div style={{ color: color, display: 'flex', alignItems: 'center', gap: '6px' }}>
        {icon}
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.75rem', fontWeight: 600,
          letterSpacing: '0.08em', color: 'var(--text-muted)',
          textTransform: 'uppercase'
        }}>
          {label}
        </span>
      </div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: '2.2rem', fontWeight: 700,
        color: color, lineHeight: 1,
        textShadow: `0 0 20px ${color}44`
      }}>
        {value ?? '—'}
      </div>
      {sub && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
          {sub}
        </div>
      )}
    </div>
  )
}

export default function ContribStats({ sessionCount, totalCount, gestureBreakdown, contributors, userStats }) {
  return (
    <div className="glass" style={{ padding: '26px' }}>
      <div className="panel-title">
        <span className="panel-title-dot">◆</span>
        Contributions
      </div>

      {/* Global stats */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
        <StatBox
          icon={<TrendingUp size={15} />}
          label="This session"
          value={sessionCount}
          color="var(--neon-green)"
        />
        <StatBox
          icon={<Database size={15} />}
          label="Global total"
          value={totalCount}
          color="var(--neon-cyan)"
        />
        <StatBox
          icon={<Globe size={15} />}
          label="Contributors"
          value={contributors}
          color="var(--neon-purple)"
        />
      </div>

      {/* Personal stats from backend */}
      {userStats && (
        <>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.78rem', fontWeight: 600,
            letterSpacing: '0.1em', color: 'var(--text-muted)',
            marginBottom: '10px', textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <User size={13} />
            Your contributions
          </div>

          <div style={{
            padding: '14px 16px',
            background: 'rgba(34,211,238,0.06)',
            border: '1px solid rgba(34,211,238,0.15)',
            borderRadius: '10px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2rem', fontWeight: 700,
                color: 'var(--neon-cyan)', lineHeight: 1
              }}>
                {userStats.totalGestures}
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px'
              }}>
                total gestures recorded
              </div>
            </div>

            {userStats.memberSince && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  member since
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {new Date(userStats.memberSince).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            )}
          </div>

          {/* User's gesture breakdown */}
          {userStats.breakdown && userStats.breakdown.length > 0 && (
            <>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.72rem', fontWeight: 600,
                letterSpacing: '0.08em', color: 'var(--text-muted)',
                marginBottom: '8px', textTransform: 'uppercase'
              }}>
                Your gestures
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {userStats.breakdown.map(({ gesture, count }) => (
                  <div key={gesture} style={{
                    fontFamily: 'var(--font-body)', fontSize: '0.9rem',
                    padding: '4px 10px',
                    background: 'rgba(255,255,255,0.05)',
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
        </>
      )}

      {/* Session breakdown if no backend stats yet */}
      {!userStats && gestureBreakdown && gestureBreakdown.length > 0 && (
        <>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.78rem', fontWeight: 600,
            letterSpacing: '0.1em', color: 'var(--text-muted)',
            marginBottom: '8px', textTransform: 'uppercase'
          }}>
            Session gestures
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {gestureBreakdown.map(({ gesture, count }) => (
              <div key={gesture} style={{
                fontFamily: 'var(--font-body)', fontSize: '0.95rem',
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
