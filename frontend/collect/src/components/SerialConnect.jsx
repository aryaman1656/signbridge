import React from 'react'
import { Usb, Unplug, AlertCircle, Radio } from 'lucide-react'

export default function SerialConnect({ connected, error, portInfo, onConnect, onDisconnect }) {
  const isSupported = typeof navigator !== 'undefined' && 'serial' in navigator

  return (
    <div className="glass" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '14px 22px',
      flexWrap: 'wrap',
    }}>
      {/* Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '10px', height: '10px', borderRadius: '50%',
          background: connected ? 'var(--neon-green)' : error ? 'var(--neon-orange)' : 'var(--text-muted)',
          boxShadow: connected ? '0 0 10px var(--neon-green)' : 'none',
          flexShrink: 0,
          animation: connected ? 'pulse-glow 2s infinite' : 'none'
        }} />
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1rem',
          fontWeight: 600,
          letterSpacing: '0.06em',
          color: connected ? 'var(--neon-green)' : error ? 'var(--neon-orange)' : 'var(--text-muted)',
        }}>
          {connected ? 'ESP32 Connected' : error ? 'Connection Error' : 'ESP32 Disconnected'}
        </span>
      </div>

      {portInfo && (
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          background: 'rgba(255,255,255,0.06)',
          padding: '3px 10px',
          borderRadius: '6px',
          border: '1px solid var(--glass-border)',
          display: 'flex', alignItems: 'center', gap: '5px'
        }}>
          <Radio size={11} /> {portInfo}
        </span>
      )}

      {error && (
        <span style={{
          fontFamily: 'var(--font-body)', fontSize: '0.9rem',
          color: 'var(--neon-orange)',
          display: 'flex', alignItems: 'center', gap: '5px'
        }}>
          <AlertCircle size={14} /> {error}
        </span>
      )}

      <div style={{ marginLeft: 'auto' }}>
        {!isSupported ? (
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--neon-orange)' }}>
            ⚠ Use Chrome or Edge
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
