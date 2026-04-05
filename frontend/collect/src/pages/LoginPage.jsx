/**
 * pages/LoginPage.jsx
 * Full marketing homepage with Google login.
 * Sections: Hero, Stats, How It Works, Features, Team, FAQ, Footer
 */

import React, { useState, useEffect, useRef } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Animated counter ──────────────────────────────────────────
function AnimatedNumber({ target, suffix = '' }) {
  const [current, setCurrent] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        const duration = 1800
        const steps = 60
        const increment = target / steps
        let count = 0
        const timer = setInterval(() => {
          count += increment
          if (count >= target) { setCurrent(target); clearInterval(timer) }
          else setCurrent(Math.floor(count))
        }, duration / steps)
      }
    }, { threshold: 0.3 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target])

  return <span ref={ref}>{current.toLocaleString()}{suffix}</span>
}

// ── FAQ item ──────────────────────────────────────────────────
function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{
      border: '1px solid var(--glass-border)',
      borderRadius: '12px',
      overflow: 'hidden',
      background: open ? 'rgba(34,211,238,0.04)' : 'rgba(255,255,255,0.02)',
      transition: 'background 0.2s'
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left',
          padding: '20px 24px',
          background: 'none', border: 'none',
          cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: '16px'
        }}
      >
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>{q}</span>
        <span style={{ color: 'var(--neon-cyan)', fontSize: '1.3rem', flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(45deg)' : 'none' }}>+</span>
      </button>
      {open && (
        <div style={{ padding: '0 24px 20px', fontFamily: 'var(--font-body)', fontSize: '0.97rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          {a}
        </div>
      )}
    </div>
  )
}

// ── Team card ─────────────────────────────────────────────────
function TeamCard({ name, role, emoji }) {
  return (
    <div className="glass" style={{ padding: '28px 24px', textAlign: 'center', flex: 1, minWidth: '180px' }}>
      <div style={{ fontSize: '2.8rem', marginBottom: '12px' }}>{emoji}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{name}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--neon-cyan)', letterSpacing: '0.08em' }}>{role}</div>
    </div>
  )
}

// ── Feature card ──────────────────────────────────────────────
function FeatureCard({ icon, title, desc }) {
  return (
    <div className="glass" style={{ padding: '28px 24px', flex: 1, minWidth: '240px' }}>
      <div style={{ fontSize: '2rem', marginBottom: '14px' }}>{icon}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '0.04em' }}>{title}</div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{desc}</div>
    </div>
  )
}

// ── Step card ─────────────────────────────────────────────────
function StepCard({ num, title, desc, icon }) {
  return (
    <div style={{ flex: 1, minWidth: '200px', textAlign: 'center', padding: '0 16px' }}>
      <div style={{
        width: '64px', height: '64px', borderRadius: '50%',
        background: 'rgba(34,211,238,0.1)',
        border: '2px solid rgba(34,211,238,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px', fontSize: '1.8rem'
      }}>
        {icon}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.15em', color: 'var(--neon-cyan)', marginBottom: '6px' }}>
        STEP {num}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>{title}</div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.93rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{desc}</div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export default function LoginPage() {
  const { login } = useAuth()
  const [error,       setError]       = useState(null)
  const [globalStats, setGlobalStats] = useState({ totalSamples: 0, uniqueContributors: 0, uniqueGestures: 0 })
  const [theme,       setTheme]       = useState('dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Fetch live global stats for the counter section
  useEffect(() => {
    fetch(`${API_URL}/stats/`)
      .then(r => r.json())
      .then(data => setGlobalStats(data))
      .catch(() => {})
  }, [])

  const handleSuccess = (credentialResponse) => {
    setError(null)
    login(credentialResponse)
  }

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div style={{ minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── Navbar ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '16px 48px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--glass-border)',
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, letterSpacing: '0.12em' }}>
          <span style={{ color: 'var(--neon-cyan)' }}>SIGN</span>
          <span style={{ color: 'var(--neon-green)' }}>BRIDGE</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          {['features', 'how-it-works', 'stats', 'team', 'faq'].map(id => (
            <button key={id} onClick={() => scrollTo(id)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: '0.95rem',
              fontWeight: 600, color: 'var(--text-secondary)',
              transition: 'color 0.2s', textTransform: 'capitalize',
              letterSpacing: '0.02em'
            }}>
              {id.replace('-', ' ')}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn-theme" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '☀' : '☾'}
          </button>
          <button onClick={() => scrollTo('login')} style={{
            fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 600,
            letterSpacing: '0.06em', padding: '9px 22px', borderRadius: '8px',
            border: '1.5px solid var(--neon-cyan)',
            background: 'rgba(34,211,238,0.1)',
            color: 'var(--neon-cyan)', cursor: 'pointer', transition: 'all 0.2s'
          }}>
            Sign In
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '120px 24px 80px',
      }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '6px 16px', borderRadius: '999px',
          background: 'rgba(34,211,238,0.08)',
          border: '1px solid rgba(34,211,238,0.25)',
          fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
          color: 'var(--neon-cyan)', letterSpacing: '0.1em',
          marginBottom: '32px'
        }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--neon-green)', animation: 'blink 1.5s infinite' }} />
          OPEN SOURCE · CROWDSOURCED · AI-POWERED
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2.8rem, 7vw, 5.5rem)',
          fontWeight: 700,
          letterSpacing: '0.04em',
          lineHeight: 1.1,
          marginBottom: '24px',
          maxWidth: '900px',
        }}>
          <span style={{ color: 'var(--text-primary)' }}>Bridging the gap between </span>
          <span style={{
            background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-green))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>sign language</span>
          <span style={{ color: 'var(--text-primary)' }}> and the world</span>
        </h1>

        {/* Subheadline */}
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 'clamp(1rem, 2vw, 1.25rem)',
          color: 'var(--text-secondary)', lineHeight: 1.8,
          maxWidth: '640px', marginBottom: '48px'
        }}>
          SignBridge is a crowdsourced platform that uses smart gloves and AI to collect, 
          label, and learn from sign language gestures — making communication accessible for everyone.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '24px' }}>
          <button onClick={() => scrollTo('login')} style={{
            fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700,
            letterSpacing: '0.08em', padding: '16px 40px', borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(34,211,238,0.2), rgba(52,211,153,0.2))',
            border: '1.5px solid var(--neon-cyan)',
            color: 'var(--neon-cyan)', cursor: 'pointer', transition: 'all 0.2s'
          }}>
            Start Contributing →
          </button>
          <button onClick={() => scrollTo('how-it-works')} style={{
            fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600,
            letterSpacing: '0.06em', padding: '16px 40px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s'
          }}>
            Learn More
          </button>
        </div>

        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
          Free forever · No hardware required to explore · Open source on GitHub
        </p>
      </section>

      {/* ── Live Stats ── */}
      <section id="stats" style={{ padding: '80px 48px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--neon-cyan)', letterSpacing: '0.15em', marginBottom: '12px' }}>LIVE NUMBERS</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, color: 'var(--text-primary)' }}>
            Growing every day
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { label: 'Gesture Samples Collected', value: globalStats.totalSamples || 0, suffix: '+', color: 'var(--neon-cyan)' },
            { label: 'Unique Contributors', value: globalStats.uniqueContributors || 0, suffix: '', color: 'var(--neon-green)' },
            { label: 'Gesture Types', value: globalStats.uniqueGestures || 0, suffix: '', color: 'var(--neon-purple)' },
            { label: 'Countries', value: 12, suffix: '+', color: 'var(--neon-yellow)' },
          ].map((s, i) => (
            <div key={i} className="glass" style={{ flex: 1, minWidth: '200px', padding: '32px 24px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 700, color: s.color, lineHeight: 1, textShadow: `0 0 30px ${s.color}44`, marginBottom: '8px' }}>
                <AnimatedNumber target={s.value} suffix={s.suffix} />
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" style={{ padding: '80px 48px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--neon-cyan)', letterSpacing: '0.15em', marginBottom: '12px' }}>SIMPLE PROCESS</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, color: 'var(--text-primary)' }}>
            How it works
          </h2>
        </div>

        {/* Steps with connecting line */}
        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute', top: '32px', left: '15%', right: '15%', height: '2px',
            background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-green))',
            opacity: 0.2
          }} />
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', position: 'relative' }}>
            <StepCard num="01" icon="🧤" title="Wear the Glove" desc="Put on the SignBridge smart glove fitted with flex sensors and an MPU6050 motion sensor." />
            <StepCard num="02" icon="🌐" title="Connect & Select" desc="Plug into your computer via USB, connect to the web app, and choose a gesture to record." />
            <StepCard num="03" icon="⚡" title="Record & Contribute" desc="Hold your gesture for 3 seconds. Your sensor data is saved to our global dataset automatically." />
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ padding: '80px 48px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--neon-cyan)', letterSpacing: '0.15em', marginBottom: '12px' }}>WHAT WE OFFER</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, color: 'var(--text-primary)' }}>
            Built for researchers and contributors
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <FeatureCard icon="📡" title="Live Sensor Visualisation" desc="Watch your flex sensor data and IMU readings in real time — animated bar meters and scrolling graphs." />
          <FeatureCard icon="🌍" title="Crowdsourced Dataset" desc="Every contribution goes into a shared global database, building the world's largest open sign language dataset." />
          <FeatureCard icon="🔐" title="Secure Google Login" desc="Sign in with your Google account. Your contributions are tracked and tied to your profile securely." />
          <FeatureCard icon="🤖" title="AI-Ready Data Format" desc="All recordings are structured and labelled, ready to train machine learning models right out of the box." />
          <FeatureCard icon="🏆" title="Contributor Leaderboard" desc="See how you rank against other contributors. Compete to build the most comprehensive dataset." />
          <FeatureCard icon="⚡" title="Demo Mode" desc="No hardware? No problem. Try the full recording flow with simulated sensor data instantly." />
        </div>
      </section>

      {/* ── Team ── */}
      <section id="team" style={{ padding: '80px 48px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--neon-cyan)', letterSpacing: '0.15em', marginBottom: '12px' }}>THE PEOPLE</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, color: 'var(--text-primary)' }}>
            Meet the team
          </h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--text-muted)', marginTop: '12px' }}>
            A group of students passionate about making communication accessible.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <TeamCard name="Aryaman Pandey"   role="PROJECT LEAD · FULL STACK" emoji="👨‍💻" />
          <TeamCard name="Team Member 2"    role="HARDWARE · FIRMWARE"        emoji="🔧" />
          <TeamCard name="Team Member 3"    role="ML · DATA SCIENCE"          emoji="🤖" />
          <TeamCard name="Team Member 4"    role="BACKEND · DATABASE"         emoji="🗄️" />
        </div>
        <p style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '20px' }}>
          * Update team names in src/pages/LoginPage.jsx → TeamCard section
        </p>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{ padding: '80px 48px', maxWidth: '780px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--neon-cyan)', letterSpacing: '0.15em', marginBottom: '12px' }}>GOT QUESTIONS</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, color: 'var(--text-primary)' }}>
            Frequently asked
          </h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <FAQItem
            q="Do I need the hardware glove to contribute?"
            a="No! You can use Demo Mode to explore the full recording interface with simulated sensor data. However, to contribute real gesture data to the dataset you will need the ESP32 glove setup."
          />
          <FAQItem
            q="Is my data private?"
            a="Your gesture sensor data is stored with your email address so we can track contributions. The raw sensor data is used only for training our sign language recognition model and is not sold or shared with third parties."
          />
          <FAQItem
            q="What sign languages are supported?"
            a="Currently we are focusing on ASL (American Sign Language) letters and common words. We plan to expand to ISL, BSL, and other regional sign languages as the dataset grows."
          />
          <FAQItem
            q="How do I build the glove hardware?"
            a="The glove uses an ESP32 DevKit, 5 flex sensors with 47kΩ resistors, and an MPU6050 IMU. Full wiring diagrams and Arduino firmware will be available in our GitHub repository."
          />
          <FAQItem
            q="Can I use the dataset for my own research?"
            a="Yes! SignBridge is open source. The collected dataset will be made publicly available under an open license for researchers and developers to use freely."
          />
          <FAQItem
            q="How many gesture samples are needed to train a good model?"
            a="We aim for at least 50 samples per gesture per contributor for good model accuracy. The more diverse contributors we have, the more robust the model becomes."
          />
        </div>
      </section>

      {/* ── Login / CTA ── */}
      <section id="login" style={{ padding: '80px 24px', maxWidth: '520px', margin: '0 auto', textAlign: 'center' }}>
        <div className="glass" style={{ padding: '52px 44px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 700, letterSpacing: '0.12em', lineHeight: 1, marginBottom: '8px' }}>
            <span style={{ color: 'var(--neon-cyan)' }}>SIGN</span>
            <span style={{ color: 'var(--neon-green)' }}>BRIDGE</span>
          </div>
          <div style={{ width: '48px', height: '2px', background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-green))', borderRadius: '2px', margin: '16px auto 24px' }} />
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '32px' }}>
            Join our global community of contributors and help make sign language universally understood.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => setError('Google sign-in failed. Please try again.')}
              theme="filled_blue"
              size="large"
              shape="rectangular"
              text="continue_with"
              width="320"
            />
          </div>

          {error && (
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--neon-orange)', padding: '8px 14px', background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.3)', borderRadius: '8px', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
            We only store your email to track contributions. No personal data is shared.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid var(--glass-border)',
        padding: '48px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '40px',
        maxWidth: '1100px',
        margin: '0 auto'
      }}>
        {/* Brand */}
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.12em', marginBottom: '12px' }}>
            <span style={{ color: 'var(--neon-cyan)' }}>SIGN</span>
            <span style={{ color: 'var(--neon-green)' }}>BRIDGE</span>
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
            An open source crowdsourced sign language gesture dataset platform.
          </p>
        </div>

        {/* Links */}
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-secondary)', marginBottom: '14px', textTransform: 'uppercase' }}>Platform</div>
          {['Dashboard', 'My History', 'Leaderboard', 'Demo Mode'].map(l => (
            <div key={l} style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px', cursor: 'pointer' }}>{l}</div>
          ))}
        </div>

        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-secondary)', marginBottom: '14px', textTransform: 'uppercase' }}>Project</div>
          {[
            { label: 'GitHub', href: 'https://github.com/aryaman1656/signbridge' },
            { label: 'Documentation', href: '#' },
            { label: 'API Reference', href: 'http://localhost:8000/docs' },
            { label: 'Report Issue', href: 'https://github.com/aryaman1656/signbridge/issues' },
          ].map(l => (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer" style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px', textDecoration: 'none', transition: 'color 0.2s' }}>
              {l.label}
            </a>
          ))}
        </div>

        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-secondary)', marginBottom: '14px', textTransform: 'uppercase' }}>Hardware</div>
          {['ESP32 DevKit V1', 'Flex Sensors ×5', 'MPU6050 IMU', '47kΩ Resistors'].map(l => (
            <div key={l} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>{l}</div>
          ))}
        </div>
      </footer>

      <div style={{ textAlign: 'center', padding: '24px', borderTop: '1px solid var(--glass-border)', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
        © 2025 SIGNBRIDGE · OPEN SOURCE · BUILT WITH ❤️ FOR ACCESSIBILITY
      </div>
    </div>
  )
}
