// ─── Device Profiles ─────────────────────────────────────────────────────────
// Both profiles are exported. The active one is chosen at runtime via the
// toggle button in the UI — no code changes needed.

export const DEVICE_PROFILES = {
  arduino: {
    label:     'Arduino',
    baudRate:  9600,
    flexMin:   0,
    flexMax:   1023,   // 10-bit ADC
    steps: [
      '1. Upload SignBridge sketch to Arduino',
      '2. Plug in via USB',
      '3. Click Connect Arduino',
      '4. Select a gesture',
      '5. Hit Record and hold steady',
    ],
    footerTag: 'ARDUINO UNO/NANO + FLEX SENSORS + MPU6050',
    dataKeys: { flex: 'flex', ax: 'ax', ay: 'ay', az: 'az', gx: 'gx', gy: 'gy', gz: 'gz' },
  },

  esp32: {
    label:     'ESP32',
    baudRate:  115200,
    flexMin:   0,
    flexMax:   4095,   // 12-bit ADC
    steps: [
      '1. Flash ESP32 with SignBridge firmware',
      '2. Plug in via USB',
      '3. Click Connect ESP32',
      '4. Select a gesture',
      '5. Hit Record and hold steady',
    ],
    footerTag: 'ESP32 + FLEX SENSORS + MPU6050',
    dataKeys: { flex: 'flex', ax: 'ax', ay: 'ay', az: 'az', gx: 'gx', gy: 'gy', gz: 'gz' },
  },
}

// Default device shown on first load (before the user picks one)
export const DEFAULT_DEVICE = 'arduino'
