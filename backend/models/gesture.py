"""
models/gesture.py
Pydantic models for request validation and response serialization.
Updated to include signLanguage and word fields for multi-language support.
Old data without these fields defaults to signLanguage="ASL".
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class FlexData(BaseModel):
    f1: float  # Thumb
    f2: float  # Index
    f3: float  # Middle
    f4: float  # Ring
    f5: float  # Pinky


class MPUData(BaseModel):
    accelX: float
    accelY: float
    accelZ: float
    gyroX:  float
    gyroY:  float
    gyroZ:  float


class SensorSample(BaseModel):
    flex:      FlexData
    mpu:       MPUData
    timestamp: Optional[int] = None  # epoch ms from frontend


class GestureSubmission(BaseModel):
    """What the frontend sends when recording a gesture."""
    gesture:      str             = Field(..., min_length=1, max_length=64)
    word:         Optional[str]   = None   # preferred label going forward; falls back to gesture
    signLanguage: Optional[str]   = "ASL"  # which sign language this recording is for
    samples:      List[SensorSample]
    contributor:  Optional[str]   = "anonymous"
    region:       Optional[str]   = None
    device:       Optional[str]   = "esp32"   # "esp32" | "arduino"


class GestureRecord(BaseModel):
    """What gets stored in MongoDB."""
    gesture:      str
    word:         Optional[str]
    signLanguage: str
    samples:      List[SensorSample]
    sampleCount:  int
    contributor:  str
    region:       Optional[str]
    capturedAt:   datetime
    device:       Optional[str]   = "esp32"


class GestureResponse(BaseModel):
    """What the API returns after saving."""
    success:     bool
    id:          str
    gesture:     str
    signLanguage: str
    sampleCount: int
    message:     str
