"""
models/user.py
Pydantic models for user profiles.
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UserProfile(BaseModel):
    email:               str
    name:                str
    photo:               Optional[str] = None
    totalContributions:  int = 0
    createdAt:           Optional[datetime] = None
