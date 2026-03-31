import React from 'react'
import { Usb, Unplug, AlertCircle, Radio } from 'lucide-react'

export default function SerialConnect({ connected, error, portInfo, onConnect, onDisconnect }) {
  const isSupported = typeof navigator !== 'undefined' && 'serial' in navigator

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '14px 20px',
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '6px',
      flexWrap: 'wrap',
      boxShadow: '0 2px 12px var(--shadow-glow)'
    }}>
      {/* Status dot + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '10px', height: '10px', borderRadius: '50%',
          background: connected ? 'var(--neon-green)' : error ? 'var(--neon-orange)' : 'var(--text-muted)',
          boxShadow: connected ? '0 0 8px var(--neon-green)' : 'none',
          flexShrink: 0
        }} />
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1rem',
          fontWeight: 600,
          letterSpacing: '0.08em',
          color: connected ? 'var(--neon-green)' : error ? 'var(--neon-orange)' : 'var(--text-muted)',
        }}>
          {connected ? 'Connected' : error ? 'Error' : 'Disconnected'}
        </span>
      </div>

      {/* Port info */}
      {portInfo && (
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.95rem',
          color: 'var(--text-secondary)',
          background: 'var(--bg-secondary)',
          padding: '3px 10px',
          borderRadius: '4px',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '5px'
        }}>
          <Radio size={12} />
          {portInfo}
        </span>
      )}

      {/* Error message */}
      {error && (
        <span style={{
          fontFamily: 'var(--font-body)',
          fontSize: '1rem',
          color: 'var(--neon-orange)',
          display: 'flex',
          alignItems: 'center',
          gap: '5px'
        }}>
          <AlertCircle size={14} />
          {error}
        </span>
      )}

      <div style={{ marginLeft: 'auto' }}>
        {!isSupported ? (
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--neon-orange)' }}>
            ⚠ Use Chrome or Edge for Web Serial support
          </span>
        ) : connected ? (
          <button className="btn btn-danger" onClick={onDisconnect}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Unplug size={15} /> Disconnect
          </button>
        ) : (
          <button className="btn btn-primary" onClick={onConnect}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Usb size={15} /> Connect ESP32
          </button>
        )}
      </div>
    </div>
  )
}
