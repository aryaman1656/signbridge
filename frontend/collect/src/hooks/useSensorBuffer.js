/**
 * useSensorBuffer.js
 * Maintains a rolling buffer of sensor readings for live graphing.
 * Also tracks latest snapshot for bar meters.
 */

import { useState, useRef, useCallback } from 'react'

const BUFFER_SIZE = 80 // number of data points shown on graphs

const emptyBuffer = () =>
  Array.from({ length: BUFFER_SIZE }, (_, i) => ({
    t: i,
    accelX: 0, accelY: 0, accelZ: 0,
    gyroX: 0, gyroY: 0, gyroZ: 0,
  }))

const defaultLatest = {
  flex: { f1: 0, f2: 0, f3: 0, f4: 0, f5: 0 },
  mpu: { accelX: 0, accelY: 0, accelZ: 0, gyroX: 0, gyroY: 0, gyroZ: 0 }
}

export function useSensorBuffer() {
  const [buffer, setBuffer] = useState(emptyBuffer)
  const [latest, setLatest] = useState(defaultLatest)
  const [isLive, setIsLive] = useState(false)
  const tickRef = useRef(0)
  const captureRef = useRef([])

  const push = useCallback((parsed) => {
    tickRef.current += 1
    const t = tickRef.current

    setLatest({
      flex: { ...parsed.flex },
      mpu: { ...parsed.mpu }
    })

    setBuffer(prev => {
      const next = [...prev.slice(1), {
        t,
        accelX: parsed.mpu.accelX,
        accelY: parsed.mpu.accelY,
        accelZ: parsed.mpu.accelZ,
        gyroX:  parsed.mpu.gyroX,
        gyroY:  parsed.mpu.gyroY,
        gyroZ:  parsed.mpu.gyroZ,
      }]
      return next
    })

    setIsLive(true)

    // Store for capture
    captureRef.current.push(parsed)
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

  return { buffer, latest, isLive, push, startCapture, stopCapture, reset }
}
