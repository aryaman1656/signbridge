/*
 * SignBridge — Arduino Firmware
 * ─────────────────────────────────────────────────────────────────────────────
 * Hardware:
 *   - Arduino Uno / Nano / Mega  (tested on Uno R3)
 *   - 5× Flex Sensors            (analog pins A0–A4)
 *   - MPU6050                    (I2C: SDA=A4/SDA pin, SCL=A5/SCL pin)
 *                                 NOTE: On Uno, A4/A5 are shared with I2C.
 *                                 If you need 5 flex sensors use a Mega
 *                                 (dedicated SDA=20, SCL=21 pins).
 *
 * Serial output format  (identical to ESP32 version so the web app works
 * with both without any changes to the parser):
 *
 *   F:<f0>,<f1>,<f2>,<f3>,<f4>|A:<ax>,<ay>,<az>|G:<gx>,<gy>,<gz>
 *
 *   Example:
 *   F:512,489,601,477,523|A:-0.12,9.78,0.34|G:1.20,-0.45,0.10
 *
 *   - Flex values are raw ADC counts (0–1023)
 *   - Accel values are in m/s²   (divided by 16384.0 × 9.81)
 *   - Gyro  values are in °/s    (divided by 131.0)
 *
 * Baud rate: 115200
 * Send interval: every 20 ms  (~50 Hz, same as ESP32 firmware)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WIRING GUIDE
 *
 *  Flex Sensors (voltage divider — each sensor needs a 47kΩ pull-down):
 *    Flex 0  → A0      Flex 1  → A1      Flex 2  → A2
 *    Flex 3  → A3      Flex 4  → A4  ← (use Mega A4, not Uno A4 = SDA!)
 *    VCC (one leg of each divider) → 5V
 *    GND (other leg via 47kΩ)     → GND
 *
 *  MPU6050:
 *    VCC → 3.3V  (or 5V if your module has a regulator)
 *    GND → GND
 *    SDA → A4  (Uno) or pin 20 (Mega)
 *    SCL → A5  (Uno) or pin 21 (Mega)
 *    AD0 → GND  (I2C address 0x68; tie to 3.3V for 0x69)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Arduino Uno note on 5 flex sensors + I2C:
 *   Uno only has 6 analog pins; A4 and A5 are the I2C bus.
 *   Solution A: Use a Mega (recommended — plenty of pins).
 *   Solution B: Use a 4051 analog multiplexer to share pins.
 *   Solution C: Use only 4 flex sensors on a Uno (set UNO_FOUR_FLEX_MODE
 *               to 1 below and leave the 5th value as 512 in the output).
 * ─────────────────────────────────────────────────────────────────────────────
 */

#include <Wire.h>

// ── Configuration ─────────────────────────────────────────────────────────────

// Set to 1 if you are on a Uno with only 4 flex sensors
// (A4 = SDA, cannot be used as analog input at the same time as I2C)
// Set to 0 to use all 5 flex sensors (requires Mega or Nano with free A4)
#define UNO_FOUR_FLEX_MODE 0

#define NUM_FLEX         5
#define FLEX_PIN_0       A0
#define FLEX_PIN_1       A1
#define FLEX_PIN_2       A2
#define FLEX_PIN_3       A3
#define FLEX_PIN_4       A4        // ← NOT available on Uno when using I2C!

#define MPU6050_ADDR     0x68      // I2C address (AD0 → GND = 0x68)
#define SEND_INTERVAL_MS 20        // 50 Hz

// ── MPU6050 register addresses ────────────────────────────────────────────────
#define MPU_PWR_MGMT_1   0x6B
#define MPU_ACCEL_XOUT_H 0x3B

// ── Calibration offsets (run calibration sketch once and paste here) ──────────
// If you haven't calibrated yet, leave all zeros — it still works fine.
float accelOffsetX = 0.0, accelOffsetY = 0.0, accelOffsetZ = 0.0;
float gyroOffsetX  = 0.0, gyroOffsetY  = 0.0, gyroOffsetZ  = 0.0;

// ── Structs ───────────────────────────────────────────────────────────────────
// Defined here at the top so every function below can use them.

struct ImuData {
  float ax, ay, az;  // m/s²
  float gx, gy, gz;  // °/s
};

// ── Globals ───────────────────────────────────────────────────────────────────
const int flexPins[NUM_FLEX] = {
  FLEX_PIN_0, FLEX_PIN_1, FLEX_PIN_2, FLEX_PIN_3, FLEX_PIN_4
};

unsigned long lastSend = 0;
bool mpuOk = false;

// ── MPU6050 helpers ───────────────────────────────────────────────────────────

void mpuWriteReg(uint8_t reg, uint8_t value) {
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(reg);
  Wire.write(value);
  Wire.endTransmission(true);
}

bool mpuInit() {
  Wire.begin();
  // Wake up MPU6050 (clears sleep bit)
  mpuWriteReg(MPU_PWR_MGMT_1, 0x00);
  delay(100);

  // Check if device is alive by reading WHO_AM_I (0x75)
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(0x75);
  Wire.endTransmission(false);
  Wire.requestFrom((uint8_t)MPU6050_ADDR, (uint8_t)1, (uint8_t)true);
  if (!Wire.available()) return false;
  uint8_t whoAmI = Wire.read();
  // WHO_AM_I should return 0x68 (or 0x72 on some clones)
  return (whoAmI == 0x68 || whoAmI == 0x72);
}

ImuData readMPU() {
  ImuData d;
  d.ax = 0.0; d.ay = 0.0; d.az = 9.81;  // safe default (z = gravity)
  d.gx = 0.0; d.gy = 0.0; d.gz = 0.0;
  if (!mpuOk) return d;

  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(MPU_ACCEL_XOUT_H);
  Wire.endTransmission(false);
  Wire.requestFrom((uint8_t)MPU6050_ADDR, (uint8_t)14, (uint8_t)true); // 6 accel + 2 temp + 6 gyro

  if (Wire.available() < 14) return d;

  int16_t rawAx = ((int16_t)Wire.read() << 8) | Wire.read();
  int16_t rawAy = ((int16_t)Wire.read() << 8) | Wire.read();
  int16_t rawAz = ((int16_t)Wire.read() << 8) | Wire.read();
  Wire.read(); Wire.read(); // discard temperature bytes
  int16_t rawGx = ((int16_t)Wire.read() << 8) | Wire.read();
  int16_t rawGy = ((int16_t)Wire.read() << 8) | Wire.read();
  int16_t rawGz = ((int16_t)Wire.read() << 8) | Wire.read();

  // Sensitivity: ±2g → 16384 LSB/g;  ±250°/s → 131 LSB/°/s
  d.ax = (rawAx / 16384.0f) * 9.81f - accelOffsetX;
  d.ay = (rawAy / 16384.0f) * 9.81f - accelOffsetY;
  d.az = (rawAz / 16384.0f) * 9.81f - accelOffsetZ;
  d.gx = (rawGx / 131.0f)   - gyroOffsetX;
  d.gy = (rawGy / 131.0f)   - gyroOffsetY;
  d.gz = (rawGz / 131.0f)   - gyroOffsetZ;
  return d;
}

// ── Setup ─────────────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  // NOTE: Remove the while(!Serial) line if using Uno/Nano — it is only
  // needed on Leonardo/Micro which have native USB. On Uno it will hang
  // forever if no Serial Monitor is open.
  // while (!Serial) {}

  for (int i = 0; i < NUM_FLEX; i++) {
    pinMode(flexPins[i], INPUT);
  }

  mpuOk = mpuInit();
  if (!mpuOk) {
    Serial.println("# MPU6050 not found — check wiring. Sending zeros for IMU.");
  } else {
    Serial.println("# MPU6050 OK");
  }
  Serial.println("# SignBridge Arduino firmware ready");
}

// ── Loop ──────────────────────────────────────────────────────────────────────

void loop() {
  unsigned long now = millis();
  if (now - lastSend < SEND_INTERVAL_MS) return;
  lastSend = now;

  // Read flex sensors
  int flexVals[NUM_FLEX];
  for (int i = 0; i < NUM_FLEX; i++) {
#if UNO_FOUR_FLEX_MODE
    flexVals[i] = (i < 4) ? analogRead(flexPins[i]) : 512;
#else
    flexVals[i] = analogRead(flexPins[i]);
#endif
  }

  // Read IMU
  ImuData imu = readMPU();

  // Output:  F:<f0>,<f1>,<f2>,<f3>,<f4>|A:<ax>,<ay>,<az>|G:<gx>,<gy>,<gz>
  Serial.print("F:");
  for (int i = 0; i < NUM_FLEX; i++) {
    Serial.print(flexVals[i]);
    if (i < NUM_FLEX - 1) Serial.print(",");
  }
  Serial.print("|A:");
  Serial.print(imu.ax, 2); Serial.print(",");
  Serial.print(imu.ay, 2); Serial.print(",");
  Serial.print(imu.az, 2);
  Serial.print("|G:");
  Serial.print(imu.gx, 2); Serial.print(",");
  Serial.print(imu.gy, 2); Serial.print(",");
  Serial.print(imu.gz, 2);
  Serial.println();
}
