/**
 * useSensorBuffer.js
 * Maintains a rolling buffer of sensor readings for live graphing.
 * Also includes a mock data generator for demo mode.
 */

import { useState, useRef, useCallback, useEffect } from 'react'

const BUFFER_SIZE = 80

const emptyBuffer = () =>
  Array.from({ length: BUFFER_SIZE }, (_, i) => ({
    t: i,
    accelX: 0, accelY: 0, accelZ: 9.8,
    gyroX: 0, gyroY: 0, gyroZ: 0,
  }))

const defaultLatest = {
  flex: { f1: 0, f2: 0, f3: 0, f4: 0, f5: 0 },
  mpu:  { accelX: 0, accelY: 0, accelZ: 9.8, gyroX: 0, gyroY: 0, gyroZ: 0 }
}

// Generates realistic-looking fake sensor data
function generateMockSample(tick) {
  const t = tick * 0.15
  return {
    flex: {
      f1: Math.round(450 + Math.sin(t * 0.9) * 220 + Math.random() * 15),
      f2: Math.round(450 + Math.sin(t * 1.1 + 1) * 220 + Math.random() * 15),
      f3: Math.round(450 + Math.sin(t * 0.7 + 2) * 220 + Math.random() * 15),
      f4: Math.round(450 + Math.sin(t * 1.3 + 3) * 220 + Math.random() * 15),
      f5: Math.round(450 + Math.sin(t * 0.8 + 4) * 220 + Math.random() * 15),
    },
    mpu: {
      accelX: parseFloat((Math.sin(t * 0.5) * 3 + Math.random() * 0.3).toFixed(2)),
      accelY: parseFloat((Math.cos(t * 0.4) * 2 + Math.random() * 0.3).toFixed(2)),
      accelZ: parseFloat((9.8 + Math.sin(t * 0.3) * 0.5 + Math.random() * 0.1).toFixed(2)),
      gyroX:  parseFloat((Math.sin(t * 1.2) * 80 + Math.random() * 5).toFixed(2)),
      gyroY:  parseFloat((Math.cos(t * 0.9) * 60 + Math.random() * 5).toFixed(2)),
      gyroZ:  parseFloat((Math.sin(t * 0.6) * 40 + Math.random() * 5).toFixed(2)),
    },
    timestamp: Date.now()
  }
}

export function useSensorBuffer() {
  const [buffer,  setBuffer]  = useState(emptyBuffer)
  const [latest,  setLatest]  = useState(defaultLatest)
  const [isLive,  setIsLive]  = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(false)

  const tickRef      = useRef(0)
  const captureRef   = useRef([])
  const demoTimerRef = useRef(null)

  const push = useCallback((parsed) => {
    tickRef.current += 1
    const t = tickRef.current

    // Normalise flex: could be array, numeric-keyed obj, or named-key obj
    let flex = parsed.flex ?? {}
    if (Array.isArray(flex)) {
      flex = { f1: flex[0] ?? 0, f2: flex[1] ?? 0, f3: flex[2] ?? 0, f4: flex[3] ?? 0, f5: flex[4] ?? 0 }
    } else if ('0' in flex) {
      flex = { f1: flex[0] ?? 0, f2: flex[1] ?? 0, f3: flex[2] ?? 0, f4: flex[3] ?? 0, f5: flex[4] ?? 0 }
    }

    // Normalise mpu: could be nested { mpu: {...} } or flat { ax, ay, az, gx, gy, gz }
    const mpu = parsed.mpu ?? {
      accelX: parsed.ax ?? 0,
      accelY: parsed.ay ?? 0,
      accelZ: parsed.az ?? 9.8,
      gyroX:  parsed.gx ?? 0,
      gyroY:  parsed.gy ?? 0,
      gyroZ:  parsed.gz ?? 0,
    }

    setLatest({ flex: { ...flex }, mpu: { ...mpu } })
    setBuffer(prev => [...prev.slice(1), {
      t,
      accelX: mpu.accelX,
      accelY: mpu.accelY,
      accelZ: mpu.accelZ,
      gyroX:  mpu.gyroX,
      gyroY:  mpu.gyroY,
      gyroZ:  mpu.gyroZ,
    }])
    setIsLive(true)
    captureRef.current.push(parsed)
  }, [])

  // ── Demo mode ─────────────────────────────────────────────
  const startDemo = useCallback(() => {
    if (demoTimerRef.current) return
    setIsDemoMode(true)
    setIsLive(true)

    demoTimerRef.current = setInterval(() => {
      const sample = generateMockSample(tickRef.current)
      push(sample)
    }, 50) // 20Hz — same rate as real ESP32
  }, [push])

  const stopDemo = useCallback(() => {
    if (demoTimerRef.current) {
      clearInterval(demoTimerRef.current)
      demoTimerRef.current = null
    }
    setIsDemoMode(false)
    setIsLive(false)
  }, [])

  // Clean up demo on unmount
  useEffect(() => {
    return () => {
      if (demoTimerRef.current) clearInterval(demoTimerRef.current)
    }
  }, [])

  const startCapture = useCallback(() => {
    captureRef.current = []
  }, [])

  const stopCapture = useCallback(() => {
    return [...captureRef.current]
  }, [])

  const reset = useCallback(() => {
    setBuffer(emptyBuffer())
    setLatest(defaultLatest)
    setIsLive(false)
    tickRef.current = 0
    captureRef.current = []
  }, [])

  return {
    buffer, latest, isLive, isDemoMode,
    push, startCapture, stopCapture, reset,
    startDemo, stopDemo
  }
}
