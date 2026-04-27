"""
backend/routes/predict.py  —  SignBridge live prediction endpoint

POST /predict
  Body : { "samples": [ {flex:{f1-f5}, mpu:{accelX/Y/Z, gyroX/Y/Z}}, ... ] }
  Returns: { "word": "HELLO", "confidence": 0.94, "all_scores": {...} }

The model, scaler and label_encoder are loaded ONCE at startup and reused.
If the model file doesn't exist yet the endpoint returns 503 with a clear message.
"""

import json, os, pickle
from typing import List, Optional

import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/predict", tags=["predict"])

ML_DIR     = os.path.join(os.path.dirname(__file__), "..", "..", "ml", "saved_model")
WINDOW     = 50
N_FEATS    = 11

# ── Lazy-load model artifacts ─────────────────────────────────────────────────
_model   = None
_scaler  = None
_le      = None
_meta    = None

def _load():
    global _model, _scaler, _le, _meta
    if _model is not None:
        return True

    model_path  = os.path.join(ML_DIR, "model.keras")
    scaler_path = os.path.join(os.path.dirname(ML_DIR), "scaler.pkl")
    le_path     = os.path.join(os.path.dirname(ML_DIR), "label_encoder.pkl")
    meta_path   = os.path.join(ML_DIR, "model_meta.json")

    # all four files must exist
    missing = [p for p in [model_path, scaler_path, le_path, meta_path]
               if not os.path.exists(p)]
    if missing:
        return False

    import tensorflow as tf
    _model  = tf.keras.models.load_model(model_path)
    with open(scaler_path, "rb") as f: _scaler = pickle.load(f)
    with open(le_path,     "rb") as f: _le     = pickle.load(f)
    with open(meta_path)         as f: _meta   = json.load(f)
    return True


# ── Request / response schemas ────────────────────────────────────────────────

class FlexIn(BaseModel):
    f1: float = 0; f2: float = 0; f3: float = 0; f4: float = 0; f5: float = 0

class MPUIn(BaseModel):
    accelX: float = 0; accelY: float = 0; accelZ: float = 9.81
    gyroX:  float = 0; gyroY:  float = 0; gyroZ:  float = 0

class SampleIn(BaseModel):
    flex: FlexIn
    mpu:  MPUIn
    timestamp: Optional[int] = None

class PredictRequest(BaseModel):
    samples: List[SampleIn]

class PredictResponse(BaseModel):
    word:       str
    confidence: float
    all_scores: dict


# ── Helpers ───────────────────────────────────────────────────────────────────

def _extract(sample: SampleIn):
    f = sample.flex; m = sample.mpu
    return [f.f1, f.f2, f.f3, f.f4, f.f5,
            m.accelX, m.accelY, m.accelZ,
            m.gyroX,  m.gyroY,  m.gyroZ]

def _pad_or_truncate(frames, window=WINDOW):
    arr = np.array(frames, dtype=np.float32)
    if arr.shape[0] >= window:
        return arr[:window]
    pad = np.zeros((window - arr.shape[0], N_FEATS), dtype=np.float32)
    return np.vstack([arr, pad])


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/", response_model=PredictResponse)
async def predict(req: PredictRequest):
    if not _load():
        raise HTTPException(
            status_code=503,
            detail="Model not trained yet. Run python ml/train.py first."
        )

    if len(req.samples) == 0:
        raise HTTPException(status_code=400, detail="No samples provided")

    frames  = [_extract(s) for s in req.samples]
    window  = _pad_or_truncate(frames)                     # (50, 11)
    flat    = window.reshape(1 * WINDOW, N_FEATS)
    normed  = _scaler.transform(flat).reshape(1, WINDOW, N_FEATS).astype(np.float32)

    probs   = _model.predict(normed, verbose=0)[0]         # (num_classes,)
    idx     = int(np.argmax(probs))
    word    = _le.classes_[idx]
    conf    = float(probs[idx])

    all_scores = {cls: round(float(p), 4)
                  for cls, p in zip(_le.classes_, probs)}

    return PredictResponse(word=word, confidence=round(conf, 4), all_scores=all_scores)


@router.get("/status")
async def model_status():
    """Returns whether the model is loaded and ready."""
    ready = _load()
    if not ready:
        return {"ready": False, "message": "Model files not found. Train the model first."}
    return {
        "ready":        True,
        "classes":      list(_le.classes_),
        "val_accuracy": _meta.get("val_accuracy"),
        "window":       _meta.get("window"),
    }
