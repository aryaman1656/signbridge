import React from 'react'

// ─── SerialConnect ────────────────────────────────────────────────────────────
// Props:
//   connected      {boolean}
//   error          {string|null}
//   portInfo       {object|null}
//   deviceConfig   {object}   – the currently active device profile
//   onConnect      {function}
//   onDisconnect   {function}

export default function SerialConnect({ connected, error, portInfo, deviceConfig, onConnect, onDisconnect }) {
  const { label, baudRate } = deviceConfig

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '12px 18px', borderRadius: '12px',
      background: 'var(--glass-bg)', backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: `1px solid ${connected ? 'rgba(74,222,128,0.35)' : error ? 'rgba(248,113,113,0.35)' : 'var(--glass-border)'}`,
      transition: 'border-color 0.3s', flex: 1,
    }}>

      {/* Status dot */}
      <div style={{
        width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
        background:  connected ? 'var(--neon-green)' : error ? '#f87171' : 'var(--text-muted)',
        boxShadow:   connected ? '0 0 8px var(--neon-green)' : error ? '0 0 8px #f87171' : 'none',
        transition:  'all 0.3s',
      }} />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {connected && portInfo ? (
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--neon-green)', letterSpacing: '0.08em' }}>
              {portInfo.device} CONNECTED
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {portInfo.baudRate} BAUD
              {portInfo.usbVendorId  ? ` · VID 0x${portInfo.usbVendorId.toString(16).toUpperCase().padStart(4,'0')}`  : ''}
              {portInfo.usbProductId ? ` · PID 0x${portInfo.usbProductId.toString(16).toUpperCase().padStart(4,'0')}` : ''}
            </div>
          </div>
        ) : error ? (
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: '#f87171', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            ⚠ {error}
          </div>
        ) : (
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>
              {label} NOT CONNECTED
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {baudRate} BAUD · WEB SERIAL API
            </div>
          </div>
        )}
      </div>

      {/* Button */}
      {connected ? (
        <button onClick={onDisconnect} style={{
          fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700,
          letterSpacing: '0.06em', padding: '7px 16px', borderRadius: '8px',
          border: '1px solid rgba(248,113,113,0.4)', background: 'rgba(248,113,113,0.1)',
          color: '#f87171', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
        }}>
          ⏏ Disconnect
        </button>
      ) : (
        <button onClick={onConnect} style={{
          fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700,
          letterSpacing: '0.06em', padding: '7px 16px', borderRadius: '8px',
          border: '1px solid rgba(34,211,238,0.4)', background: 'rgba(34,211,238,0.1)',
          color: 'var(--neon-cyan)', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
        }}>
          ⚡ Connect {label}
        </button>
      )}
    </div>
  )
}
