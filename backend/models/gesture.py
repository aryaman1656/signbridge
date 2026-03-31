"""
models/gesture.py
Pydantic models for request validation and response serialization.
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
    gesture:     str            = Field(..., min_length=1, max_length=64)
    samples:     List[SensorSample]
    contributor: Optional[str] = "anonymous"
    region:      Optional[str] = None


class GestureRecord(BaseModel):
    """What gets stored in MongoDB."""
    gesture:     str
    samples:     List[SensorSample]
    sampleCount: int
    contributor: str
    region:      Optional[str]
    capturedAt:  datetime


class GestureResponse(BaseModel):
    """What the API returns after saving."""
    success:    bool
    id:         str
    gesture:    str
    sampleCount: int
    message:    str
