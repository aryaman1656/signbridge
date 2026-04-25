"""
routes/languages.py
Admin-controlled sign language management.

GET    /languages/             — list published languages (public, for trainers)
GET    /languages/all          — list all languages including drafts (admin only)
POST   /languages/add          — add new language as draft (admin only)
POST   /languages/publish      — publish a language (admin only)
POST   /languages/unpublish    — unpublish a language (admin only)
DELETE /languages/delete       — delete a language (admin only)
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional

from db.database import get_db

router = APIRouter(prefix="/languages", tags=["languages"])

SUPER_ADMIN = "aryamanpandey.cd25@rvce.edu.in"


async def is_admin_email(email: str, db) -> bool:
    if email == SUPER_ADMIN:
        return True
    doc = await db["admins"].find_one({"email": email})
    return doc is not None


class AddLanguagePayload(BaseModel):
    requester_email: str
    code: str          # e.g. "ASL"
    name: str          # e.g. "American Sign Language"
    description: Optional[str] = ""


class LanguageActionPayload(BaseModel):
    requester_email: str
    code: str


# ── GET /languages/ ───────────────────────────────────────────
@router.get("/")
async def get_published_languages():
    """Public endpoint — returns only published languages for trainers."""
    db = get_db()
    cursor = db["sign_languages"].find({"status": "published"}, {"_id": 0})
    return await cursor.to_list(100)


# ── GET /languages/all ────────────────────────────────────────
@router.get("/all")
async def get_all_languages(requester_email: str = Query(...)):
    db = get_db()
    if not await is_admin_email(requester_email, db):
        raise HTTPException(status_code=403, detail="Admin access required")
    cursor = db["sign_languages"].find({}, {"_id": 0})
    return await cursor.to_list(200)


# ── POST /languages/add ───────────────────────────────────────
@router.post("/add")
async def add_language(payload: AddLanguagePayload):
    db = get_db()
    if not await is_admin_email(payload.requester_email, db):
        raise HTTPException(status_code=403, detail="Admin access required")

    code = payload.code.strip().upper()
    existing = await db["sign_languages"].find_one({"code": code})
    if existing:
        raise HTTPException(status_code=400, detail=f"Language '{code}' already exists")

    doc = {
        "code":        code,
        "name":        payload.name.strip(),
        "description": payload.description or "",
        "status":      "draft",
        "addedBy":     payload.requester_email,
        "addedAt":     datetime.now(timezone.utc),
        "publishedAt": None,
    }
    await db["sign_languages"].insert_one(doc)
    return {"success": True, "message": f"'{payload.name}' added as draft", "code": code}


# ── POST /languages/publish ───────────────────────────────────
@router.post("/publish")
async def publish_language(payload: LanguageActionPayload):
    db = get_db()
    if not await is_admin_email(payload.requester_email, db):
        raise HTTPException(status_code=403, detail="Admin access required")

    code = payload.code.strip().upper()
    result = await db["sign_languages"].update_one(
        {"code": code},
        {"$set": {"status": "published", "publishedAt": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"Language '{code}' not found")
    return {"success": True, "message": f"'{code}' is now published and visible to trainers"}


# ── POST /languages/unpublish ─────────────────────────────────
@router.post("/unpublish")
async def unpublish_language(payload: LanguageActionPayload):
    db = get_db()
    if not await is_admin_email(payload.requester_email, db):
        raise HTTPException(status_code=403, detail="Admin access required")

    code = payload.code.strip().upper()
    result = await db["sign_languages"].update_one(
        {"code": code},
        {"$set": {"status": "draft", "publishedAt": None}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"Language '{code}' not found")
    return {"success": True, "message": f"'{code}' has been unpublished"}


# ── DELETE /languages/delete ──────────────────────────────────
@router.delete("/delete")
async def delete_language(payload: LanguageActionPayload):
    db = get_db()
    if not await is_admin_email(payload.requester_email, db):
        raise HTTPException(status_code=403, detail="Admin access required")

    code = payload.code.strip().upper()
    result = await db["sign_languages"].delete_one({"code": code})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=f"Language '{code}' not found")
    return {"success": True, "message": f"'{code}' deleted (existing gesture data is preserved)"}
