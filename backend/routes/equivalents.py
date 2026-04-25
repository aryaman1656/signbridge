"""
routes/equivalents.py
Cross-language gesture equivalents — trainer suggests, admin approves.

POST   /equivalents/suggest          — trainer suggests two gestures are equivalent
GET    /equivalents/pending          — list pending suggestions (admin only)
GET    /equivalents/all              — list all suggestions (admin only)
POST   /equivalents/review           — admin approves or rejects a suggestion
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId

from db.database import get_db

router = APIRouter(prefix="/equivalents", tags=["equivalents"])

SUPER_ADMIN = "aryamanpandey.cd25@rvce.edu.in"


async def is_admin_email(email: str, db) -> bool:
    if email == SUPER_ADMIN:
        return True
    doc = await db["admins"].find_one({"email": email})
    return doc is not None


def serialize(doc) -> dict:
    doc["id"] = str(doc.pop("_id"))
    for field in ["created_at", "reviewed_at"]:
        if field in doc and hasattr(doc[field], "isoformat"):
            doc[field] = doc[field].isoformat()
    return doc


class SuggestEquivalentPayload(BaseModel):
    suggested_by:  str
    gesture_id_a:  str
    lang_a:        str
    gesture_id_b:  str
    lang_b:        str
    note:          Optional[str] = ""


class ReviewEquivalentPayload(BaseModel):
    requester_email: str
    equivalent_id:   str
    action:          str   # "approve" or "reject"


# ── POST /equivalents/suggest ─────────────────────────────────
@router.post("/suggest")
async def suggest_equivalent(payload: SuggestEquivalentPayload):
    db = get_db()

    if payload.lang_a.upper() == payload.lang_b.upper():
        raise HTTPException(status_code=400, detail="Both gestures are in the same language")

    # Validate gesture IDs exist
    try:
        oid_a = ObjectId(payload.gesture_id_a)
        oid_b = ObjectId(payload.gesture_id_b)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid gesture ID format")

    g_a = await db["gestures"].find_one({"_id": oid_a})
    g_b = await db["gestures"].find_one({"_id": oid_b})
    if not g_a or not g_b:
        raise HTTPException(status_code=404, detail="One or both gestures not found")

    # Prevent duplicate suggestions
    existing = await db["gesture_equivalents"].find_one({
        "$or": [
            {"gesture_id_a": payload.gesture_id_a, "gesture_id_b": payload.gesture_id_b},
            {"gesture_id_a": payload.gesture_id_b, "gesture_id_b": payload.gesture_id_a},
        ]
    })
    if existing:
        raise HTTPException(status_code=400, detail="An equivalent suggestion already exists for these two gestures")

    doc = {
        "gesture_id_a":  payload.gesture_id_a,
        "lang_a":        payload.lang_a.upper(),
        "gesture_name_a": g_a.get("gesture", ""),
        "gesture_id_b":  payload.gesture_id_b,
        "lang_b":        payload.lang_b.upper(),
        "gesture_name_b": g_b.get("gesture", ""),
        "suggested_by":  payload.suggested_by,
        "note":          payload.note or "",
        "status":        "pending",
        "reviewed_by":   None,
        "reviewed_at":   None,
        "created_at":    datetime.now(timezone.utc),
    }
    result = await db["gesture_equivalents"].insert_one(doc)
    return {"success": True, "message": "Suggestion submitted for admin review", "id": str(result.inserted_id)}


# ── GET /equivalents/pending ──────────────────────────────────
@router.get("/pending")
async def get_pending(requester_email: str = Query(...)):
    db = get_db()
    if not await is_admin_email(requester_email, db):
        raise HTTPException(status_code=403, detail="Admin access required")
    cursor = db["gesture_equivalents"].find({"status": "pending"}).sort("created_at", -1)
    items = await cursor.to_list(200)
    return [serialize(i) for i in items]


# ── GET /equivalents/all ──────────────────────────────────────
@router.get("/all")
async def get_all_equivalents(requester_email: str = Query(...)):
    db = get_db()
    if not await is_admin_email(requester_email, db):
        raise HTTPException(status_code=403, detail="Admin access required")
    cursor = db["gesture_equivalents"].find({}).sort("created_at", -1)
    items = await cursor.to_list(500)
    return [serialize(i) for i in items]


# ── POST /equivalents/review ──────────────────────────────────
@router.post("/review")
async def review_equivalent(payload: ReviewEquivalentPayload):
    db = get_db()
    if not await is_admin_email(payload.requester_email, db):
        raise HTTPException(status_code=403, detail="Admin access required")

    if payload.action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")

    try:
        oid = ObjectId(payload.equivalent_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid equivalent ID")

    status = "approved" if payload.action == "approve" else "rejected"
    result = await db["gesture_equivalents"].update_one(
        {"_id": oid},
        {"$set": {
            "status":      status,
            "reviewed_by": payload.requester_email,
            "reviewed_at": datetime.now(timezone.utc),
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Equivalent suggestion not found")
    return {"success": True, "message": f"Suggestion {status}"}
