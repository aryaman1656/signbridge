/**
 * RecordPanel.jsx — SignBridge  (updated for ESP32 / Arduino toggle)
 *
 * Changes from previous version:
 *   1. Accepts `hardwareType` prop ("esp32" | "arduino")
 *   2. Shows a small hardware badge next to the panel title
 *   3. Includes hardwareType in the fallback JSON filename
 *   4. Everything else (language override, word list, recording logic) unchanged
 *
 * Props (additions only — all previous props still work):
 *   hardwareType   "esp32" | "arduino"   (default: "esp32")
 */

import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "../context/LanguageContext";
import { HW_ESP32, HW_ARDUINO } from "../hooks/useSerial";   // ← NEW import

// ── Fallback gesture list (shown when no words in DB yet) ─────────────────────
const FALLBACK_GESTURES = [
  "Hello", "Thank You", "Yes", "No", "Please",
  "Sorry", "Help", "Water", "Food", "Good",
];

// ── Hardware badge component ──────────────────────────────────────────────────
function HardwareBadge({ type }) {
  const isArduino = type === HW_ARDUINO;
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "0.25rem",
      padding: "0.15rem 0.45rem",
      borderRadius: "4px",
      fontSize: "0.65rem",
      fontFamily: "var(--font-mono)",
      border: `1px solid ${isArduino ? "var(--neon-purple)" : "var(--neon-yellow)"}`,
      color:  isArduino ? "var(--neon-purple)" : "var(--neon-yellow)",
      background: isArduino ? "rgba(160,80,255,0.08)" : "rgba(255,200,0,0.08)",
    }}>
      {isArduino ? "🔵 ARDUINO" : "🟡 ESP32"}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RecordPanel({
  connected,
  sensorBuffer,
  onSubmit,
  hardwareType = HW_ESP32,   // ← NEW prop with default
}) {
  const { languages, sessionLanguage } = useLanguage();

  // Language override (per-recording) — unchanged logic
  const [recordingLanguage, setRecordingLanguage] = useState(sessionLanguage);
  useEffect(() => { setRecordingLanguage(sessionLanguage); }, [sessionLanguage]);

  // Word list — unchanged logic
  const [words, setWords]       = useState(FALLBACK_GESTURES);
  const [selectedWord, setSelectedWord] = useState(FALLBACK_GESTURES[0]);

  useEffect(() => {
    if (!recordingLanguage) return;
    fetch(`http://localhost:8000/words/?language=${recordingLanguage}`)
      .then((r) => r.json())
      .then((data) => {
        const list = data.map((w) => w.word);
        if (list.length > 0) {
          setWords(list);
          setSelectedWord(list[0]);
        } else {
          setWords(FALLBACK_GESTURES);
          setSelectedWord(FALLBACK_GESTURES[0]);
        }
      })
      .catch(() => {
        setWords(FALLBACK_GESTURES);
        setSelectedWord(FALLBACK_GESTURES[0]);
      });
  }, [recordingLanguage]);

  // Recording state — unchanged
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [samples, setSamples]     = useState([]);
  const timerRef = useRef(null);

  function startRecording() {
    setSamples([]);
    setCountdown(3);
    let c = 3;
    timerRef.current = setInterval(() => {
      c -= 1;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(timerRef.current);
        setRecording(true);
      }
    }, 1000);
  }

  function stopRecording() {
    setRecording(false);
    const captured = [...samples];
    setSamples([]);

    // Build payload — same shape as before, hardwareType available for logging
    const payload = {
      gesture:      selectedWord,
      word:         selectedWord,
      signLanguage: recordingLanguage,
      samples:      captured,
    };

    if (onSubmit) {
      onSubmit(payload);
    } else {
      // Fallback JSON download — filename now includes hardware type
      const filename = `signbridge_${hardwareType}_${recordingLanguage}_${selectedWord}_${Date.now()}.json`;
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  // Capture samples while recording — unchanged
  useEffect(() => {
    if (!recording || !sensorBuffer) return;
    setSamples((prev) => [...prev, sensorBuffer]);
  }, [sensorBuffer, recording]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="glass" style={{ padding: "1.5rem" }}>

      {/* Panel title — now includes hardware badge */}
      <div className="panel-title" style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        <span>
          <span className="panel-title-dot">◆</span> Record Gesture
        </span>
        <HardwareBadge type={hardwareType} />   {/* ← NEW */}
      </div>

      {/* Language override selector — unchanged */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{
          fontSize: "0.72rem",
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          display: "block",
          marginBottom: "0.3rem",
        }}>
          Sign Language (this recording)
        </label>
        <select
          value={recordingLanguage}
          onChange={(e) => setRecordingLanguage(e.target.value)}
          disabled={recording || countdown > 0}
          style={{
            width: "100%",
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-primary)",
            borderRadius: "6px",
            padding: "0.4rem 0.6rem",
            fontFamily: "var(--font-mono)",
            fontSize: "0.8rem",
          }}
        >
          {languages.map((l) => (
            <option key={l.code} value={l.code}>{l.name}</option>
          ))}
        </select>
      </div>

      {/* Word selector — unchanged */}
      <div style={{ marginBottom: "1.2rem" }}>
        <label style={{
          fontSize: "0.72rem",
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          display: "block",
          marginBottom: "0.3rem",
        }}>
          Gesture / Word
        </label>
        <select
          value={selectedWord}
          onChange={(e) => setSelectedWord(e.target.value)}
          disabled={recording || countdown > 0}
          style={{
            width: "100%",
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-primary)",
            borderRadius: "6px",
            padding: "0.4rem 0.6rem",
            fontFamily: "var(--font-mono)",
            fontSize: "0.8rem",
          }}
        >
          {words.map((w) => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>
      </div>

      {/* Countdown display — unchanged */}
      {countdown > 0 && (
        <div style={{
          textAlign: "center",
          fontSize: "4rem",
          color: "var(--neon-cyan)",
          fontFamily: "var(--font-display)",
          marginBottom: "1rem",
        }}>
          {countdown}
        </div>
      )}

      {/* Samples captured counter — unchanged */}
      {recording && (
        <div style={{
          textAlign: "center",
          color: "var(--neon-green)",
          fontSize: "0.85rem",
          fontFamily: "var(--font-mono)",
          marginBottom: "0.8rem",
        }}>
          ● REC — {samples.length} samples captured
        </div>
      )}

      {/* Action buttons — unchanged */}
      <div style={{ display: "flex", gap: "0.6rem" }}>
        {!recording && countdown === 0 && (
          <button
            className="btn btn-record"
            onClick={startRecording}
            disabled={!connected}
            style={{ flex: 1 }}
          >
            ● Start Recording
          </button>
        )}
        {recording && (
          <button
            className="btn btn-danger"
            onClick={stopRecording}
            style={{ flex: 1 }}
          >
            ■ Stop & Submit
          </button>
        )}
      </div>

      {!connected && (
        <div style={{
          marginTop: "0.7rem",
          textAlign: "center",
          fontSize: "0.72rem",
          color: "var(--text-muted)",
        }}>
          Connect hardware or enable Demo Mode to record
        </div>
      )}
    </div>
  );
}
