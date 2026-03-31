import React from 'react'
import { ResponsiveContainer, LineChart, Line, YAxis } from 'recharts'

const ACCEL_LINES = [
  { key: 'accelX', label: 'AX', color: 'var(--accel-x)' },
  { key: 'accelY', label: 'AY', color: 'var(--accel-y)' },
  { key: 'accelZ', label: 'AZ', color: 'var(--accel-z)' },
]
const GYRO_LINES = [
  { key: 'gyroX', label: 'GX', color: 'var(--gyro-x)' },
  { key: 'gyroY', label: 'GY', color: 'var(--gyro-y)' },
  { key: 'gyroZ', label: 'GZ', color: 'var(--gyro-z)' },
]

function MiniGraph({ title, lines, buffer, domain }) {
  return (
    <div style={{ flex: 1 }}>
      {/* Graph label row */}
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.88rem',
        marginBottom: '6px',
        display: 'flex',
        gap: '10px',
        alignItems: 'center'
      }}>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{title}</span>
        {lines.map(l => (
          <span key={l.key} style={{ color: l.color }}>{l.label}</span>
        ))}
      </div>
      <div style={{
        height: '100px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={buffer} margin={{ top: 4, right: 4, left: -28, bottom: 4 }}>
            <YAxis domain={domain} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} width={34} />
            {lines.map(l => (
              <Line
                key={l.key}
                type="monotone"
                dataKey={l.key}
                stroke={l.color}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function ValueBadge({ label, value, color }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      background: 'var(--bg-secondary)',
      border: `1px solid ${color}33`,
      borderRadius: '4px',
      padding: '8px 12px',
      minWidth: '68px',
      gap: '2px'
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', color: color, fontWeight: 600 }}>
        {typeof value === 'number' ? value.toFixed(2) : '0.00'}
      </span>
    </div>
  )
}

export default function MPUPanel({ buffer, latest }) {
  const mpu = latest?.mpu ?? {}
  return (
    <div className="card" style={{ padding: '20px' }}>
      <div className="panel-title">
        <span className="panel-title-dot">◆</span>
        MPU6050 — Accelerometer + Gyroscope
      </div>

      {/* Value badges */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <ValueBadge label="ACCEL X" value={mpu.accelX} color="var(--accel-x)" />
        <ValueBadge label="ACCEL Y" value={mpu.accelY} color="var(--accel-y)" />
        <ValueBadge label="ACCEL Z" value={mpu.accelZ} color="var(--accel-z)" />
        <ValueBadge label="GYRO X"  value={mpu.gyroX}  color="var(--gyro-x)" />
        <ValueBadge label="GYRO Y"  value={mpu.gyroY}  color="var(--gyro-y)" />
        <ValueBadge label="GYRO Z"  value={mpu.gyroZ}  color="var(--gyro-z)" />
      </div>

      {/* Graphs */}
      <div style={{ display: 'flex', gap: '16px' }}>
        <MiniGraph title="ACCEL" lines={ACCEL_LINES} buffer={buffer} domain={[-20, 20]} />
        <MiniGraph title="GYRO"  lines={GYRO_LINES}  buffer={buffer} domain={[-500, 500]} />
      </div>
    </div>
  )
}
