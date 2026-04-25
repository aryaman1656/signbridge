"""
routes/words.py
Admin-managed word/gesture list per sign language.

GET    /words/      — get words for a language (base + language-specific)
GET    /words/all   — get all words (admin only)
POST   /words/add   — add a word (admin only)
DELETE /words/delete — delete a word (admin only)
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import List, Optional

from db.database import get_db

router = APIRouter(prefix="/words", tags=["words"])

SUPER_ADMIN = "aryamanpandey.cd25@rvce.edu.in"


async def is_admin_email(email: str, db) -> bool:
    if email == SUPER_ADMIN:
        return True
    doc = await db["admins"].find_one({"email": email})
    return doc is not None


class AddWordPayload(BaseModel):
    requester_email: str
    word: str
    is_base: bool = True        # True = available in all languages
    languages: List[str] = []   # only used when is_base=False


class DeleteWordPayload(BaseModel):
    requester_email: str
    word: str


# ── GET /words/ ───────────────────────────────────────────────
@router.get("/")
async def get_words(language: Optional[str] = Query(None)):
    """
    Returns base words + words specific to the given language.
    If no language given, returns only base words.
    """
    db = get_db()
    if language:
        lang_upper = language.strip().upper()
        query = {"$or": [{"is_base": True}, {"languages": lang_upper}]}
    else:
        query = {"is_base": True}

    cursor = db["gesture_words"].find(query, {"_id": 0}).sort("word", 1)
    return await cursor.to_list(1000)


# ── GET /words/all ────────────────────────────────────────────
@router.get("/all")
async def get_all_words(requester_email: str = Query(...)):
    db = get_db()
    if not await is_admin_email(requester_email, db):
        raise HTTPException(status_code=403, detail="Admin access required")
    cursor = db["gesture_words"].find({}, {"_id": 0}).sort("word", 1)
    return await cursor.to_list(2000)


# ── POST /words/add ───────────────────────────────────────────
@router.post("/add")
async def add_word(payload: AddWordPayload):
    db = get_db()
    if not await is_admin_email(payload.requester_email, db):
        raise HTTPException(status_code=403, detail="Admin access required")

    word = payload.word.strip()
    if not word:
        raise HTTPException(status_code=400, detail="Word cannot be empty")

    existing = await db["gesture_words"].find_one({"word": word})
    if existing:
        raise HTTPException(status_code=400, detail=f"Word '{word}' already exists")

    languages = [l.strip().upper() for l in payload.languages]

    doc = {
        "word":     word,
        "is_base":  payload.is_base,
        "languages": languages,
        "addedBy":  payload.requester_email,
        "addedAt":  datetime.now(timezone.utc),
    }
    await db["gesture_words"].insert_one(doc)
    scope = "all languages" if payload.is_base else f"{', '.join(languages)}"
    return {"success": True, "message": f"'{word}' added ({scope})"}


# ── DELETE /words/delete ──────────────────────────────────────
@router.delete("/delete")
async def delete_word(payload: DeleteWordPayload):
    db = get_db()
    if not await is_admin_email(payload.requester_email, db):
        raise HTTPException(status_code=403, detail="Admin access required")

    word = payload.word.strip()
    result = await db["gesture_words"].delete_one({"word": word})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=f"Word '{word}' not found")
    return {"success": True, "message": f"'{word}' deleted"}
