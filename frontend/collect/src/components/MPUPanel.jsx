import React from 'react'
import { ResponsiveContainer, LineChart, Line, YAxis, ReferenceLine } from 'recharts'

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
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.8rem',
        marginBottom: '8px',
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
        background: 'rgba(0,0,0,0.15)',
        border: '1px solid var(--glass-border)',
        borderRadius: '10px',
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
      background: 'rgba(255,255,255,0.05)',
      border: `1px solid ${color}33`,
      borderRadius: '10px',
      padding: '10px 12px',
      minWidth: '72px',
      gap: '2px'
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', color, fontWeight: 600 }}>
        {typeof value === 'number' ? value.toFixed(2) : '0.00'}
      </span>
    </div>
  )
}

// Compute a tight auto-domain from the buffer for a given key,
// with a minimum span so the line is never invisible.
function autoDomain(buffer, key, minSpan = 2) {
  const vals = buffer.map(r => r[key]).filter(v => v != null && isFinite(v))
  if (vals.length === 0) return ['auto', 'auto']
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const span = hi - lo
  if (span < minSpan) {
    const mid = (lo + hi) / 2
    return [parseFloat((mid - minSpan / 2).toFixed(2)), parseFloat((mid + minSpan / 2).toFixed(2))]
  }
  const pad = span * 0.15
  return [parseFloat((lo - pad).toFixed(2)), parseFloat((hi + pad).toFixed(2))]
}

export default function MPUPanel({ buffer, latest }) {
  const mpu = latest?.mpu ?? {}

  // Auto-scale ACCEL domain so AZ (gravity ~9.81) variation is visible
  const accelDomain = (() => {
    const allVals = buffer.flatMap(r => [r.accelX, r.accelY, r.accelZ]).filter(v => v != null && isFinite(v))
    if (!allVals.length) return [-15, 15]
    const lo = Math.min(...allVals)
    const hi = Math.max(...allVals)
    const span = Math.max(hi - lo, 2)
    const pad  = span * 0.2
    return [parseFloat((lo - pad).toFixed(1)), parseFloat((hi + pad).toFixed(1))]
  })()

  const gyroDomain = (() => {
    const allVals = buffer.flatMap(r => [r.gyroX, r.gyroY, r.gyroZ]).filter(v => v != null && isFinite(v))
    if (!allVals.length) return [-250, 250]
    const lo = Math.min(...allVals)
    const hi = Math.max(...allVals)
    const span = Math.max(hi - lo, 10)
    const pad  = span * 0.2
    return [parseFloat((lo - pad).toFixed(1)), parseFloat((hi + pad).toFixed(1))]
  })()

  return (
    <div className="glass" style={{ padding: '22px' }}>
      <div className="panel-title">
        <span className="panel-title-dot">&#9670;</span>
        MPU6050 &mdash; Accelerometer + Gyroscope
      </div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <ValueBadge label="ACCEL X" value={mpu.accelX} color="var(--accel-x)" />
        <ValueBadge label="ACCEL Y" value={mpu.accelY} color="var(--accel-y)" />
        <ValueBadge label="ACCEL Z" value={mpu.accelZ} color="var(--accel-z)" />
        <ValueBadge label="GYRO X"  value={mpu.gyroX}  color="var(--gyro-x)" />
        <ValueBadge label="GYRO Y"  value={mpu.gyroY}  color="var(--gyro-y)" />
        <ValueBadge label="GYRO Z"  value={mpu.gyroZ}  color="var(--gyro-z)" />
      </div>
      <div style={{ display: 'flex', gap: '16px' }}>
        <MiniGraph title="ACCEL" lines={ACCEL_LINES} buffer={buffer} domain={accelDomain} />
        <MiniGraph title="GYRO"  lines={GYRO_LINES}  buffer={buffer} domain={gyroDomain} />
      </div>
    </div>
  )
}
