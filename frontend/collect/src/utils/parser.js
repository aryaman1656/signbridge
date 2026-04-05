/**
 * parser.js
 * Parses raw serial string from ESP32 into structured sensor object.
 *
 * Expected ESP32 serial format (CSV on one line):
 * F1,F2,F3,F4,F5,AX,AY,AZ,GX,GY,GZ\n
 *
 * Example:
 * 512,489,601,390,450,0.12,-0.05,9.81,0.01,-0.02,0.00
 */

export function parseSensorLine(raw) {
  if (!raw || typeof raw !== 'string') return null

  const trimmed = raw.trim()
  const parts = trimmed.split(',')

  if (parts.length !== 11) return null

  const values = parts.map(Number)
  if (values.some(isNaN)) return null

  return {
    flex: {
      f1: values[0],  // Thumb
      f2: values[1],  // Index
      f3: values[2],  // Middle
      f4: values[3],  // Ring
      f5: values[4],  // Pinky
    },
    mpu: {
      accelX: values[5],
      accelY: values[6],
      accelZ: values[7],
      gyroX:  values[8],
      gyroY:  values[9],
      gyroZ:  values[10],
    },
    timestamp: Date.now()
  }
}

/**
 * Normalize flex sensor value to 0–100 range.
 * Adjust MIN/MAX based on your actual sensor calibration.
 */
export const FLEX_MIN = 200
export const FLEX_MAX = 700

export function normalizeFlex(raw) {
  const clamped = Math.min(Math.max(raw, FLEX_MIN), FLEX_MAX)
  return Math.round(((clamped - FLEX_MIN) / (FLEX_MAX - FLEX_MIN)) * 100)
}
