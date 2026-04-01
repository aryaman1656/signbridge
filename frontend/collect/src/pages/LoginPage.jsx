/**
 * pages/LoginPage.jsx
 * Glassmorphism login page with real Google OAuth.
 */

import React, { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const [error, setError] = useState(null)

  const handleSuccess = (credentialResponse) => {
    setError(null)
    login(credentialResponse)
  }

  const handleError = () => {
    setError('Google sign-in failed. Please try again.')
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div className="glass animate-fade-in" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '52px 44px',
        textAlign: 'center',
      }}>

        {/* Logo */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '3rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            lineHeight: 1,
            marginBottom: '8px',
          }}>
            <span style={{ color: 'var(--neon-cyan)' }}>SIGN</span>
            <span style={{ color: 'var(--neon-green)' }}>BRIDGE</span>
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            letterSpacing: '0.2em',
            color: 'var(--text-muted)',
          }}>
            GESTURE DATA COLLECTION
          </div>
        </div>

        {/* Accent line */}
        <div style={{
          width: '56px',
          height: '2px',
          background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-green))',
          borderRadius: '2px',
          margin: '0 auto 28px',
        }} />

        {/* Tagline */}
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: '1.05rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.7,
          marginBottom: '36px',
        }}>
          Help us build the world's largest open source sign language dataset. Sign in to start contributing.
        </p>

        {/* Google Login button */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '16px',
        }}>
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={handleError}
            theme="filled_blue"
            size="large"
            shape="rectangular"
            text="continue_with"
            width="320"
          />
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.9rem',
            color: 'var(--neon-orange)',
            marginBottom: '16px',
            padding: '8px 14px',
            background: 'rgba(251,146,60,0.08)',
            border: '1px solid rgba(251,146,60,0.3)',
            borderRadius: '8px',
          }}>
            {error}
          </div>
        )}

        {/* Privacy note */}
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.68rem',
          color: 'var(--text-muted)',
          letterSpacing: '0.04em',
          marginBottom: '32px',
        }}>
          We only store your email to track contributions. No personal data is shared.
        </p>

        {/* Feature list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
          {[
            { icon: '🧤', text: 'Record sign language gestures with your glove' },
            { icon: '🌍', text: 'Contribute to a global crowdsourced dataset' },
            { icon: '🤖', text: 'Help train AI to understand sign language' },
          ].map((f, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '11px 16px',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: '10px',
              border: '1px solid var(--glass-border)',
            }}>
              <span style={{ fontSize: '1.2rem' }}>{f.icon}</span>
              <span style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.95rem',
                color: 'var(--text-secondary)',
              }}>
                {f.text}
              </span>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
