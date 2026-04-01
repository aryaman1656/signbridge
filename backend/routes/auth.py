"""
routes/auth.py
Google OAuth token verification and user profile management.

POST /auth/google  — verify Google token, create/update user, return profile
GET  /auth/me      — get current user profile (requires token header)
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from datetime import datetime, timezone
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import os

from db.database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_CLIENT_ID = os.getenv(
    "GOOGLE_CLIENT_ID",
    "912110345690-sjb2b0o6qu7j4pc63fi9abtcfca8ugqn.apps.googleusercontent.com"
)


class GoogleTokenPayload(BaseModel):
    token: str  # The credential string from Google


# ── POST /auth/google ─────────────────────────────────────────
@router.post("/google")
async def google_login(payload: GoogleTokenPayload):
    """
    Verify a Google ID token from the frontend.
    Creates a new user document or updates last login time.
    Returns the user profile.
    """
    try:
        # Verify token with Google
        info = id_token.verify_oauth2_token(
            payload.token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID
        )
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")

    email = info.get("email")
    name  = info.get("name")
    photo = info.get("picture")

    if not email:
        raise HTTPException(status_code=400, detail="Email not found in token")

    db = get_db()

    # Upsert user — create if new, update lastLogin if existing
    await db["users"].update_one(
        {"email": email},
        {
            "$set": {
                "email":     email,
                "name":      name,
                "photo":     photo,
                "lastLogin": datetime.now(timezone.utc),
            },
            "$setOnInsert": {
                "createdAt":        datetime.now(timezone.utc),
                "totalContributions": 0,
            }
        },
        upsert=True
    )

    user = await db["users"].find_one({"email": email})

    return {
        "email":              user["email"],
        "name":               user["name"],
        "photo":              user.get("photo"),
        "totalContributions": user.get("totalContributions", 0),
        "createdAt":          user.get("createdAt"),
    }


# ── GET /auth/me ──────────────────────────────────────────────
@router.get("/me")
async def get_me(authorization: str = Header(...)):
    """
    Get the current user's profile using their Google token.
    Frontend sends: Authorization: Bearer <google_token>
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.replace("Bearer ", "")

    try:
        info = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID
        )
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    email = info.get("email")
    db    = get_db()
    user  = await db["users"].find_one({"email": email})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "email":              user["email"],
        "name":               user["name"],
        "photo":              user.get("photo"),
        "totalContributions": user.get("totalContributions", 0),
    }
