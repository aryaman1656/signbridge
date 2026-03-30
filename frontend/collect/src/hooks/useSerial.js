/**
 * useSerial.js
 * Manages Web Serial API connection to ESP32.
 * Handles connect, disconnect, and line-by-line reading.
 */

import { useState, useRef, useCallback } from 'react'
import { parseSensorLine } from '../utils/parser'

export function useSerial(onData) {
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState(null)
  const [portInfo, setPortInfo] = useState(null)

  const portRef = useRef(null)
  const readerRef = useRef(null)
  const readingRef = useRef(false)

  const connect = useCallback(async () => {
    if (!('serial' in navigator)) {
      setError('Web Serial API not supported. Use Chrome or Edge.')
      return
    }

    try {
      const port = await navigator.serial.requestPort()
      await port.open({ baudRate: 115200 })

      portRef.current = port
      readingRef.current = true

      const info = port.getInfo()
      setPortInfo(`USB ${info.usbVendorId ?? ''}:${info.usbProductId ?? ''}`)
      setConnected(true)
      setError(null)

      // Start reading loop
      readLoop(port)
    } catch (err) {
      if (err.name !== 'NotSelectedError') {
        setError(`Connection failed: ${err.message}`)
      }
    }
  }, [])

  const readLoop = async (port) => {
    const decoder = new TextDecoderStream()
    port.readable.pipeTo(decoder.writable)
    const reader = decoder.readable.getReader()
    readerRef.current = reader

    let buffer = ''

    try {
      while (readingRef.current) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += value
        const lines = buffer.split('\n')
        buffer = lines.pop() // keep incomplete line in buffer

        for (const line of lines) {
          const parsed = parseSensorLine(line)
          if (parsed) {
            onData(parsed)
          }
        }
      }
    } catch (err) {
      if (readingRef.current) {
        setError(`Read error: ${err.message}`)
      }
    } finally {
      reader.releaseLock()
      setConnected(false)
    }
  }

  const disconnect = useCallback(async () => {
    readingRef.current = false
    try {
      if (readerRef.current) await readerRef.current.cancel()
      if (portRef.current) await portRef.current.close()
    } catch (_) {}
    setConnected(false)
    setPortInfo(null)
  }, [])

  return { connected, error, portInfo, connect, disconnect }
}
