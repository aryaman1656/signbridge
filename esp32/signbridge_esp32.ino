/*
 * SignBridge ESP32 Firmware
 * 
 * Reads 5 flex sensors + MPU6050 and outputs JSON over Serial at 115200 baud.
 * The frontend useSerial.js parser expects exactly this format:
 *   {"flex":[f1,f2,f3,f4,f5],"ax":0.00,"ay":0.00,"az":9.81,"gx":0.00,"gy":0.00,"gz":0.00}
 *
 * Wiring:
 *   GPIO 34 → Thumb  (f1)  — may be flaky
 *   GPIO 35 → Index  (f2)  — reliable
 *   GPIO 32 → Middle (f3)  — may be flaky
 *   GPIO 33 → Ring   (f4)  — reliable
 *   GPIO 25 → Pinky  (f5)  — reliable
 *   GPIO 21 → SDA (MPU6050)
 *   GPIO 22 → SCL (MPU6050)
 *
 * Each flex sensor uses a 10kΩ pull-down resistor to GND.
 * Sensor connected between 3.3V and ADC pin, resistor between ADC pin and GND.
 *
 * ADC range: 0–4095 (12-bit)
 * Send rate: every 20ms (50 Hz)
 * Baud rate: 115200
 */

#include <Wire.h>
#include <Arduino.h>

// ── Pin definitions ──────────────────────────────────────────────────────────
const int FLEX_PINS[5] = {34, 35, 32, 33, 25};  // thumb, index, middle, ring, pinky

// ── MPU6050 ──────────────────────────────────────────────────────────────────
#define MPU_ADDR       0x68
#define MPU_ACCEL_REG  0x3B
#define MPU_PWR_REG    0x6B

// Scale factors for MPU6050 default range
// Accel: ±2g  → 16384 LSB/g  → divide by 16384 * 9.81 to get m/s²
// Gyro:  ±250°/s → 131 LSB/°/s → divide by 131 to get °/s
const float ACCEL_SCALE = 16384.0 / 9.81;
const float GYRO_SCALE  = 131.0;

// ── Smoothing ────────────────────────────────────────────────────────────────
#define FLEX_SAMPLES 5   // readings averaged per flex sensor per loop

// ── Timing ───────────────────────────────────────────────────────────────────
#define SEND_INTERVAL_MS 20   // 50 Hz

// ── Helpers ──────────────────────────────────────────────────────────────────

int readFlex(int pin) {
  long sum = 0;
  for (int i = 0; i < FLEX_SAMPLES; i++) {
    sum += analogRead(pin);
    delayMicroseconds(500);
  }
  return (int)(sum / FLEX_SAMPLES);
}

bool readMPU(float &ax, float &ay, float &az,
             float &gx, float &gy, float &gz) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(MPU_ACCEL_REG);
  if (Wire.endTransmission(false) != 0) return false;

  Wire.requestFrom(MPU_ADDR, 14, true);
  if (Wire.available() < 14) return false;

  int16_t raw_ax = Wire.read() << 8 | Wire.read();
  int16_t raw_ay = Wire.read() << 8 | Wire.read();
  int16_t raw_az = Wire.read() << 8 | Wire.read();
  Wire.read(); Wire.read();  // skip temperature
  int16_t raw_gx = Wire.read() << 8 | Wire.read();
  int16_t raw_gy = Wire.read() << 8 | Wire.read();
  int16_t raw_gz = Wire.read() << 8 | Wire.read();

  // Convert to physical units
  ax = raw_ax / ACCEL_SCALE;
  ay = raw_ay / ACCEL_SCALE;
  az = raw_az / ACCEL_SCALE;
  gx = raw_gx / GYRO_SCALE;
  gy = raw_gy / GYRO_SCALE;
  gz = raw_gz / GYRO_SCALE;

  return true;
}

// ── Setup ────────────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  delay(500);

  // ESP32 ADC setup — 12-bit, 3.3V reference
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);  // full 0–3.3V range

  // I2C + MPU6050 wake
  Wire.begin(21, 22);
  Wire.setClock(400000);  // 400kHz fast mode

  Wire.beginTransmission(MPU_ADDR);
  Wire.write(MPU_PWR_REG);
  Wire.write(0x00);  // wake up
  Wire.endTransmission(true);
  delay(100);

  // Debug line — ignored by useSerial.js (doesn't start with '{')
  Serial.println("# SignBridge ESP32 ready — outputting JSON at 50Hz");
}

// ── Loop ─────────────────────────────────────────────────────────────────────

void loop() {
  static unsigned long lastSend = 0;
  unsigned long now = millis();

  if (now - lastSend < SEND_INTERVAL_MS) return;
  lastSend = now;

  // Read flex
  int flex[5];
  for (int i = 0; i < 5; i++) {
    flex[i] = readFlex(FLEX_PINS[i]);
  }

  // Read MPU
  float ax = 0, ay = 0, az = 9.81;
  float gx = 0, gy = 0, gz = 0;
  bool mpuOk = readMPU(ax, ay, az, gx, gy, gz);

  // Output JSON — exactly what useSerial.js expects
  // {"flex":[f1,f2,f3,f4,f5],"ax":0.00,"ay":0.00,"az":9.81,"gx":0.00,"gy":0.00,"gz":0.00}
  Serial.print("{\"flex\":[");
  Serial.print(flex[0]); Serial.print(",");  // thumb
  Serial.print(flex[1]); Serial.print(",");  // index
  Serial.print(flex[2]); Serial.print(",");  // middle
  Serial.print(flex[3]); Serial.print(",");  // ring
  Serial.print(flex[4]);                     // pinky
  Serial.print("],\"ax\":");
  Serial.print(ax, 3);
  Serial.print(",\"ay\":");
  Serial.print(ay, 3);
  Serial.print(",\"az\":");
  Serial.print(az, 3);
  Serial.print(",\"gx\":");
  Serial.print(gx, 3);
  Serial.print(",\"gy\":");
  Serial.print(gy, 3);
  Serial.print(",\"gz\":");
  Serial.print(gz, 3);
  Serial.println("}");

  // If MPU not responding, send debug line (ignored by parser)
  if (!mpuOk) {
    Serial.println("# WARNING: MPU6050 not responding — check wiring");
  }
}
