/*
 * SignBridge — Arduino Uno Firmware
 * ─────────────────────────────────────────────────────────────────────────────
 * Hardware: Arduino Uno + 4 Flex Sensors + MPU6050
 *
 * ⚠️  IMPORTANT — Arduino Uno has only 6 analog pins (A0–A5).
 *     A4 and A5 are shared with the I2C bus (MPU6050 SDA/SCL).
 *     This means you can only use A0–A3 for flex sensors on a Uno.
 *     The 5th sensor (Pinky) outputs a fixed value of 512 as a placeholder.
 *     When you get an ESP32, all 5 sensors will work.
 *
 * WIRING:
 *   Flex Sensors — voltage divider circuit (47kΩ pull-down each):
 *     5V ──── [Flex Sensor] ──── Pin ──── [47kΩ] ──── GND
 *     Thumb  (Flex 1) → A0
 *     Index  (Flex 2) → A1
 *     Middle (Flex 3) → A2
 *     Ring   (Flex 4) → A3
 *     Pinky  (Flex 5) → NOT connected on Uno (outputs 512 placeholder)
 *
 *   MPU6050:
 *     VCC → 3.3V  (use 3.3V not 5V unless your module has a regulator)
 *     GND → GND
 *     SDA → A4    (shared I2C pin)
 *     SCL → A5    (shared I2C pin)
 *     AD0 → GND   (sets I2C address to 0x68)
 *
 * OUTPUT FORMAT (matches what SignBridge web app expects):
 *   F:<f0>,<f1>,<f2>,<f3>,<f4>|A:<ax>,<ay>,<az>|G:<gx>,<gy>,<gz>
 *   Example:
 *   F:512,489,601,477,512|A:-0.12,9.78,0.34|G:1.20,-0.45,0.10
 *
 *   - Flex values: raw ADC 0–1023
 *   - Accel: m/s²
 *   - Gyro:  degrees/second
 *
 * BAUD RATE: 9600 (matches Arduino setting in SignBridge deviceConfig.js)
 * SEND RATE: 50ms interval (~20 Hz)
 * ─────────────────────────────────────────────────────────────────────────────
 */

#include <Wire.h>

// ── Pin definitions ───────────────────────────────────────────────────────────
#define FLEX_PIN_THUMB   A0
#define FLEX_PIN_INDEX   A1
#define FLEX_PIN_MIDDLE  A2
#define FLEX_PIN_RING    A3
// Pinky not available on Uno — A4 = SDA, A5 = SCL
#define FLEX_PINKY_PLACEHOLDER 512

// ── MPU6050 ───────────────────────────────────────────────────────────────────
#define MPU6050_ADDR     0x68   // AD0 → GND = 0x68
#define MPU_PWR_MGMT_1   0x6B
#define MPU_ACCEL_XOUT_H 0x3B

// ── Timing ────────────────────────────────────────────────────────────────────
#define SEND_INTERVAL_MS 50     // 20 Hz — same as demo mode in the web app

// ── Calibration offsets ───────────────────────────────────────────────────────
// Leave as zero if you haven't calibrated yet — it still works fine.
// To calibrate: lay the glove flat on a table, open Serial Monitor,
// record a few readings and note the average offsets, then fill them in.
float accelOffsetX = 0.0;
float accelOffsetY = 0.0;
float accelOffsetZ = 0.0;
float gyroOffsetX  = 0.0;
float gyroOffsetY  = 0.0;
float gyroOffsetZ  = 0.0;

// ── Globals ───────────────────────────────────────────────────────────────────
unsigned long lastSend = 0;
bool mpuOk = false;

// ── MPU6050 functions ─────────────────────────────────────────────────────────

void mpuWriteReg(uint8_t reg, uint8_t val) {
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(reg);
  Wire.write(val);
  Wire.endTransmission(true);
}

bool mpuInit() {
  Wire.begin();
  delay(100);

  // Wake up MPU6050 — clears the sleep bit in PWR_MGMT_1
  mpuWriteReg(MPU_PWR_MGMT_1, 0x00);
  delay(100);

  // Check WHO_AM_I register — should return 0x68 (or 0x72 on some clones)
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(0x75);
  Wire.endTransmission(false);
  Wire.requestFrom((uint8_t)MPU6050_ADDR, (uint8_t)1, (uint8_t)true);
  if (!Wire.available()) return false;
  uint8_t id = Wire.read();
  return (id == 0x68 || id == 0x72);
}

struct ImuData {
  float ax, ay, az;
  float gx, gy, gz;
};

ImuData readMPU() {
  ImuData d = { 0.0, 0.0, 9.81, 0.0, 0.0, 0.0 };  // safe defaults
  if (!mpuOk) return d;

  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(MPU_ACCEL_XOUT_H);
  Wire.endTransmission(false);
  // Request 14 bytes: 6 accel + 2 temp + 6 gyro
  Wire.requestFrom((uint8_t)MPU6050_ADDR, (uint8_t)14, (uint8_t)true);

  if (Wire.available() < 14) return d;

  int16_t rawAx = ((int16_t)Wire.read() << 8) | Wire.read();
  int16_t rawAy = ((int16_t)Wire.read() << 8) | Wire.read();
  int16_t rawAz = ((int16_t)Wire.read() << 8) | Wire.read();
  Wire.read(); Wire.read();  // discard temperature
  int16_t rawGx = ((int16_t)Wire.read() << 8) | Wire.read();
  int16_t rawGy = ((int16_t)Wire.read() << 8) | Wire.read();
  int16_t rawGz = ((int16_t)Wire.read() << 8) | Wire.read();

  // ±2g range  → 16384 LSB/g → multiply by 9.81 for m/s²
  // ±250°/s    → 131.0 LSB/°/s
  d.ax = (rawAx / 16384.0f) * 9.81f - accelOffsetX;
  d.ay = (rawAy / 16384.0f) * 9.81f - accelOffsetY;
  d.az = (rawAz / 16384.0f) * 9.81f - accelOffsetZ;
  d.gx = (rawGx / 131.0f)            - gyroOffsetX;
  d.gy = (rawGy / 131.0f)            - gyroOffsetY;
  d.gz = (rawGz / 131.0f)            - gyroOffsetZ;

  return d;
}

// ── Setup ─────────────────────────────────────────────────────────────────────

void setup() {
  // 9600 baud — matches Arduino profile in SignBridge deviceConfig.js
  Serial.begin(9600);

  pinMode(FLEX_PIN_THUMB,  INPUT);
  pinMode(FLEX_PIN_INDEX,  INPUT);
  pinMode(FLEX_PIN_MIDDLE, INPUT);
  pinMode(FLEX_PIN_RING,   INPUT);

  mpuOk = mpuInit();

  // Debug messages start with '#' — the web app parser ignores these lines
  if (!mpuOk) {
    Serial.println(F("# MPU6050 not found — check SDA→A4, SCL→A5, VCC→3.3V, AD0→GND"));
  } else {
    Serial.println(F("# MPU6050 OK"));
  }
  Serial.println(F("# SignBridge Arduino Uno firmware ready"));
  Serial.println(F("# Pinky sensor outputs placeholder value 512 (no pin available on Uno)"));
}

// ── Loop ──────────────────────────────────────────────────────────────────────

void loop() {
  unsigned long now = millis();
  if (now - lastSend < SEND_INTERVAL_MS) return;
  lastSend = now;

  // Read 4 flex sensors
  int f0 = analogRead(FLEX_PIN_THUMB);
  int f1 = analogRead(FLEX_PIN_INDEX);
  int f2 = analogRead(FLEX_PIN_MIDDLE);
  int f3 = analogRead(FLEX_PIN_RING);
  int f4 = FLEX_PINKY_PLACEHOLDER;  // Pinky — no pin on Uno

  // Read IMU
  ImuData imu = readMPU();

  // Output format:
  // F:<f0>,<f1>,<f2>,<f3>,<f4>|A:<ax>,<ay>,<az>|G:<gx>,<gy>,<gz>
  Serial.print(F("F:"));
  Serial.print(f0); Serial.print(',');
  Serial.print(f1); Serial.print(',');
  Serial.print(f2); Serial.print(',');
  Serial.print(f3); Serial.print(',');
  Serial.print(f4);

  Serial.print(F("|A:"));
  Serial.print(imu.ax, 2); Serial.print(',');
  Serial.print(imu.ay, 2); Serial.print(',');
  Serial.print(imu.az, 2);

  Serial.print(F("|G:"));
  Serial.print(imu.gx, 2); Serial.print(',');
  Serial.print(imu.gy, 2); Serial.print(',');
  Serial.print(imu.gz, 2);

  Serial.println();
}
