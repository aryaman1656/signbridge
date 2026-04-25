from pydantic import BaseModel
from typing import Optional, List


class SensorSample(BaseModel):
    flex: List[float]
    accel: List[float]
    gyro: List[float]


class GestureCreate(BaseModel):
    gesture: str                          # kept for backward compat
    word: Optional[str] = None            # preferred going forward
    signLanguage: Optional[str] = "ASL"   # defaults to ASL for old data
    samples: List[SensorSample]
    sampleCount: int
    contributor: str
    capturedAt: str


class GestureOut(BaseModel):
    id: str
    gesture: str
    word: Optional[str] = None
    signLanguage: Optional[str] = "ASL"
    sampleCount: int
    contributor: str
    capturedAt: str
