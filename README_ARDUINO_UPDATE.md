# SignBridge — Arduino Support Update

## What changed

### New file
| File | What it is |
|------|-----------|
| `arduino/signbridge_arduino.ino` | Arduino firmware — drop-in replacement for ESP32; same serial protocol |

### Updated files
| File | What changed |
|------|-------------|
| `frontend/src/hooks/useSerial.js` | Added `hardwareType` / `setHardwareType` state; exports `HW_ESP32` and `HW_ARDUINO` constants |
| `frontend/src/components/SerialConnect.jsx` | ESP32 / Arduino toggle buttons; per-board setup instructions |
| `frontend/src/components/RecordPanel.jsx` | Accepts `hardwareType` prop; shows badge; uses it in fallback filename |
| `frontend/src/App.jsx` | Wires `hardwareType` + `setHardwareType` from `useSerial` through to child components |

---

## Serial protocol (identical for both boards)

```
F:<f0>,<f1>,<f2>,<f3>,<f4>|A:<ax>,<ay>,<az>|G:<gx>,<gy>,<gz>
```

- Flex values: raw ADC counts 0–1023
- Accel values: m/s²
- Gyro values: °/s
- Baud: 115200
- Rate: ~50 Hz (every 20 ms)
- Lines starting with `#` are info/log lines and are ignored by the parser

Because the protocol is identical, **existing gesture data is fully compatible**.
Old ESP32 submissions and new Arduino submissions look exactly the same in MongoDB.

---

## Wiring — Arduino

### Flex Sensors (×5, voltage divider)
Each flex sensor needs a **47 kΩ pull-down resistor** to GND.

```
5V ──── [flex sensor] ──── analog pin ──── [47 kΩ] ──── GND
```

| Sensor | Arduino Pin |
|--------|-------------|
| Flex 0 | A0 |
| Flex 1 | A1 |
| Flex 2 | A2 |
| Flex 3 | A3 |
| Flex 4 | A4 ⚠️ (see Uno note below) |

### MPU6050
| MPU6050 | Arduino |
|---------|---------|
| VCC | 3.3 V (or 5 V if module has regulator) |
| GND | GND |
| SDA | A4 (Uno) / pin 20 (Mega) |
| SCL | A5 (Uno) / pin 21 (Mega) |
| AD0 | GND → address 0x68 |

### ⚠️ Arduino Uno pin conflict
Uno has only 6 analog pins and **A4 + A5 are shared with I²C**.  
You cannot use A4 as a flex sensor input AND A4/A5 for the MPU6050 at the same time.

**Solutions:**
| Option | How |
|--------|-----|
| **Use a Mega** ✅ (recommended) | Mega has A0–A15 for flex + dedicated SDA/SCL (pins 20/21) |
| **4-sensor mode** | Set `UNO_FOUR_FLEX_MODE true` in the .ino — 5th value is padded with 512 (midpoint) |
| **Multiplexer** | Add a CD4051 8-channel analog mux; more complex wiring |

---

## How to flash

1. Open `arduino/signbridge_arduino.ino` in **Arduino IDE 2.x**
2. Select your board under **Tools → Board**  
   - Uno: `Arduino Uno`  
   - Nano: `Arduino Nano` (set old bootloader if needed)  
   - Mega: `Arduino Mega or Mega 2560`
3. Select the correct **COM port**
4. Click **Upload** (Ctrl+U)
5. Open **Serial Monitor** at 115200 baud — you should see lines like:  
   `F:512,489,601,477,523|A:-0.12,9.78,0.34|G:1.20,-0.45,0.10`

---

## Frontend integration

### Switching boards in the UI
1. Make sure you are **disconnected** (hardware or demo mode)
2. In the **Hardware Connection** panel, click **ESP32** or **Arduino**
3. Click **Connect** and pick the port
4. The RecordPanel title badge will update to show the active board type

### No backend changes needed
The Arduino sends the same data format as the ESP32.  
`useSerial.js` → `parser.js` pipeline is unchanged.  
All existing API endpoints, MongoDB schema, and gesture data are fully compatible.

---

## Calibration (optional but recommended)

If your MPU6050 readings are offset, add calibration values in the `.ino`:

```cpp
float accelOffsetX = 0.12;   // measure average when flat, negate it
float accelOffsetY = -0.05;
float accelOffsetZ = 0.20;
float gyroOffsetX  = 1.30;   // measure average at rest, negate it
float gyroOffsetY  = -0.45;
float gyroOffsetZ  = 0.10;
```

A simple way to measure: open Serial Monitor, hold the glove completely still for
10 seconds, average the A: and G: values — those are your offsets.
