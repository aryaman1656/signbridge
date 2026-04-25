import { useState, useRef, useCallback } from 'react'
import { DEVICE_PROFILES, DEFAULT_DEVICE } from '../config/deviceConfig'

// ─── Hardware-type constants ──────────────────────────────────────────────────
// Exported so any component (e.g. RecordPanel) can import them without
// needing to know about deviceConfig directly.
export const HW_ARDUINO = 'arduino'
export const HW_ESP32   = 'esp32'

// ─── Serial data parser ───────────────────────────────────────────────────────
// Handles BOTH output formats so switching device in the UI just works.
//
// Arduino firmware outputs:
//   F:512,489,601,477,523|A:-0.12,9.78,0.34|G:1.20,-0.45,0.10
//
// ESP32 firmware outputs (JSON):
//   {"flex":[512,489,601,477,523],"ax":-0.12,"ay":9.78,"az":0.34,...}
//
// Both are normalised into the same object shape:
//   { flex: [n,n,n,n,n], ax, ay, az, gx, gy, gz }

// Converts a flat flex array [f1,f2,f3,f4,f5] → object { f1, f2, f3, f4, f5 }
function flexArrayToObj(arr) {
  const a = Array.isArray(arr) ? arr : [0, 0, 0, 0, 0]
  return { f1: a[0] ?? 0, f2: a[1] ?? 0, f3: a[2] ?? 0, f4: a[3] ?? 0, f5: a[4] ?? 0 }
}

function parseLine(line) {
  if (!line) return null

  // ── JSON first (ESP32) ──────────────────────────────────────────────────────
  if (line.startsWith('{')) {
    try {
      const d = JSON.parse(line)
      return {
        flex: flexArrayToObj(d.flex),
        mpu: {
          accelX: d.ax ?? 0,
          accelY: d.ay ?? 0,
          accelZ: d.az ?? 9.81,
          gyroX:  d.gx ?? 0,
          gyroY:  d.gy ?? 0,
          gyroZ:  d.gz ?? 0,
        },
      }
    } catch { return null }
  }

  // ── F:|A:|G: format (Arduino) ───────────────────────────────────────────────
  // F:512,489,601,477,523|A:-0.12,9.78,0.34|G:1.20,-0.45,0.10
  if (line.startsWith('F:')) {
    try {
      const parts = {}
      for (const segment of line.split('|')) {
        const colon = segment.indexOf(':')
        if (colon === -1) continue
        parts[segment.slice(0, colon)] = segment.slice(colon + 1).split(',').map(Number)
      }
      if (!parts.F) return null
      return {
        flex: flexArrayToObj(parts.F),
        mpu: {
          accelX: parts.A?.[0] ?? 0,
          accelY: parts.A?.[1] ?? 0,
          accelZ: parts.A?.[2] ?? 9.81,
          gyroX:  parts.G?.[0] ?? 0,
          gyroY:  parts.G?.[1] ?? 0,
          gyroZ:  parts.G?.[2] ?? 0,
        },
      }
    } catch { return null }
  }

  // Lines starting with '#' are debug messages — ignore silently
  return null
}

// ─── useSerial hook ───────────────────────────────────────────────────────────
export function useSerial(onData, deviceConfig) {
  const cfg = deviceConfig ?? DEVICE_PROFILES[DEFAULT_DEVICE]

  const [connected, setConnected] = useState(false)
  const [error,     setError]     = useState(null)
  const [portInfo,  setPortInfo]  = useState(null)

  const portRef   = useRef(null)
  const readerRef = useRef(null)
  const stopRef   = useRef(false)

  const connect = useCallback(async () => {
    setError(null)

    if (!('serial' in navigator)) {
      setError('Web Serial API not supported. Use Chrome or Edge.')
      return
    }

    try {
      const port = await navigator.serial.requestPort()
      await port.open({ baudRate: cfg.baudRate })

      portRef.current = port
      stopRef.current = false

      const info = port.getInfo()
      setPortInfo({
        usbVendorId:  info.usbVendorId,
        usbProductId: info.usbProductId,
        baudRate:     cfg.baudRate,
        device:       cfg.label,
      })
      setConnected(true)

      const decoder        = new TextDecoderStream()
      const readableStream = port.readable.pipeThrough(decoder)
      const reader         = readableStream.getReader()
      readerRef.current    = reader

      let lineBuffer = ''

      const readLoop = async () => {
        try {
          while (!stopRef.current) {
            const { value, done } = await reader.read()
            if (done) break
            lineBuffer += value
            const lines = lineBuffer.split('\n')
            lineBuffer  = lines.pop()
            for (const raw of lines) {
              const frame = parseLine(raw.trim())
              if (frame) onData(frame)
            }
          }
        } catch (err) {
          if (!stopRef.current) setError(`Read error: ${err.message}`)
        } finally {
          setConnected(false)
          setPortInfo(null)
        }
      }

      readLoop()
    } catch (err) {
      if (err.name !== 'NotFoundError') setError(err.message)
    }
  }, [onData, cfg])

  const disconnect = useCallback(async () => {
    stopRef.current = true
    try { await readerRef.current?.cancel() } catch {}
    try { await portRef.current?.close()    } catch {}
    readerRef.current = null
    portRef.current   = null
    setConnected(false)
    setPortInfo(null)
    setError(null)
  }, [])

  return { connected, error, portInfo, connect, disconnect }
}
