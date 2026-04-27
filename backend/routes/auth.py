"""
routes/auth.py
Google OAuth token verification, user management, and admin management.

POST /auth/google        — verify Google token, create/update user
GET  /auth/me            — get current user profile
GET  /auth/is-admin      — check if an email is admin
POST /auth/admin/add     — add an email as admin (super admin only)
POST /auth/admin/remove  — remove an email from admins (super admin only)
GET  /auth/admins        — list all admins (super admin only)
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from datetime import datetime, timezone
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import os

from db.database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_CLIENT_ID = os.getenv(
    "GOOGLE_CLIENT_ID",
    "912110345690-vlf5dnla52chvlrosr572d81n3snl3tj.apps.googleusercontent.com"
)

# Super admin — can never be removed, hardcoded for security
SUPER_ADMIN = "aryamanpandey.cd25@rvce.edu.in"


class GoogleTokenPayload(BaseModel):
    token: str

class AdminEmailPayload(BaseModel):
    requester_email: str   # must be super admin
    target_email:    str   # email to add/remove


# ── Helper: check if email is admin ──────────────────────────
async def is_admin_email(email: str, db) -> bool:
    if email == SUPER_ADMIN:
        return True
    doc = await db["admins"].find_one({"email": email})
    return doc is not None


# ── POST /auth/google ─────────────────────────────────────────
@router.post("/google")
async def google_login(payload: GoogleTokenPayload):
    try:
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

    # Ensure super admin is always in the admins collection
    existing_super = await db["admins"].find_one({"email": SUPER_ADMIN})
    if not existing_super:
        await db["admins"].insert_one({
            "email":     SUPER_ADMIN,
            "addedBy":   "system",
            "addedAt":   datetime.now(timezone.utc),
            "isSuperAdmin": True
        })

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
                "createdAt":          datetime.now(timezone.utc),
                "totalContributions": 0,
            }
        },
        upsert=True
    )

    user     = await db["users"].find_one({"email": email})
    is_admin = await is_admin_email(email, db)

    return {
        "email":              user["email"],
        "name":               user["name"],
        "photo":              user.get("photo"),
        "totalContributions": user.get("totalContributions", 0),
        "isAdmin":            is_admin,
        "isSuperAdmin":       email == SUPER_ADMIN,
    }


# ── GET /auth/me ──────────────────────────────────────────────
@router.get("/me")
async def get_me(email: str = Query(...)):
    db   = get_db()
    user = await db["users"].find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    is_admin = await is_admin_email(email, db)

    return {
        "email":        user["email"],
        "name":         user["name"],
        "photo":        user.get("photo"),
        "isAdmin":      is_admin,
        "isSuperAdmin": email == SUPER_ADMIN,
    }


# ── GET /auth/is-admin ────────────────────────────────────────
@router.get("/is-admin")
async def check_admin(email: str = Query(...)):
    db       = get_db()
    is_admin = await is_admin_email(email, db)
    return {"email": email, "isAdmin": is_admin, "isSuperAdmin": email == SUPER_ADMIN}


# ── GET /auth/admins ──────────────────────────────────────────
@router.get("/admins")
async def list_admins(requester_email: str = Query(...)):
    db = get_db()
    if not await is_admin_email(requester_email, db):
        raise HTTPException(status_code=403, detail="Admin access required")

    cursor = db["admins"].find({})
    admins = []
    async for doc in cursor:
        doc.pop("_id", None)
        if doc.get("addedAt"):
            doc["addedAt"] = doc["addedAt"].isoformat()
        # Enrich with user name
        user = await db["users"].find_one({"email": doc["email"]})
        doc["name"]  = user["name"]  if user else doc["email"].split("@")[0]
        doc["photo"] = user.get("photo") if user else None
        admins.append(doc)

    return {"admins": admins}


# ── POST /auth/admin/add ──────────────────────────────────────
@router.post("/admin/add")
async def add_admin(payload: AdminEmailPayload):
    db = get_db()

    # Only super admin can add new admins
    if payload.requester_email != SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only the super admin can add new admins")

    if payload.target_email == SUPER_ADMIN:
        raise HTTPException(status_code=400, detail="Super admin is already an admin")

    existing = await db["admins"].find_one({"email": payload.target_email})
    if existing:
        raise HTTPException(status_code=400, detail=f"{payload.target_email} is already an admin")

    await db["admins"].insert_one({
        "email":        payload.target_email,
        "addedBy":      payload.requester_email,
        "addedAt":      datetime.now(timezone.utc),
        "isSuperAdmin": False
    })

    return {"success": True, "message": f"{payload.target_email} is now an admin"}


# ── POST /auth/admin/remove ───────────────────────────────────
@router.post("/admin/remove")
async def remove_admin(payload: AdminEmailPayload):
    db = get_db()

    # Only super admin can remove admins
    if payload.requester_email != SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only the super admin can remove admins")

    # Cannot remove super admin
    if payload.target_email == SUPER_ADMIN:
        raise HTTPException(status_code=400, detail="Cannot remove the super admin")

    result = await db["admins"].delete_one({"email": payload.target_email})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=f"{payload.target_email} is not an admin")

    return {"success": True, "message": f"{payload.target_email} has been removed as admin"}
