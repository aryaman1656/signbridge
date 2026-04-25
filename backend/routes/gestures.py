"""
routes/gestures.py
Endpoints for submitting and retrieving gesture data.

POST   /gestures/        — save a recorded gesture sample
GET    /gestures/        — list all gestures (with optional filters)
GET    /gestures/mine    — list gestures for a specific user
GET    /gestures/{id}    — get a single gesture record by ID
DELETE /gestures/{id}    — delete a gesture (only if owned by requester)
"""

from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId

from models.gesture import GestureSubmission, GestureResponse
from db.database import get_db

router = APIRouter(prefix="/gestures", tags=["gestures"])


def serialize(doc) -> dict:
    doc["id"] = str(doc.pop("_id"))
    if "capturedAt" in doc and hasattr(doc["capturedAt"], "isoformat"):
        doc["capturedAt"] = doc["capturedAt"].isoformat()
    return doc


# ── POST /gestures ────────────────────────────────────────────
@router.post("/", response_model=GestureResponse)
async def submit_gesture(payload: GestureSubmission):
    db = get_db()

    if len(payload.samples) == 0:
        raise HTTPException(status_code=400, detail="No sensor samples provided")

    gesture_label = payload.gesture.strip().upper()
    # word falls back to gesture if not provided
    word_label    = (payload.word or payload.gesture).strip()
    lang          = (payload.signLanguage or "ASL").strip().upper()

    record = {
        "gesture":      gesture_label,
        "word":         word_label,
        "signLanguage": lang,
        "samples":      [s.model_dump() for s in payload.samples],
        "sampleCount":  len(payload.samples),
        "contributor":  payload.contributor or "anonymous",
        "region":       payload.region,
        "capturedAt":   datetime.now(timezone.utc),
    }

    result = await db["gestures"].insert_one(record)

    return GestureResponse(
        success=True,
        id=str(result.inserted_id),
        gesture=record["gesture"],
        signLanguage=record["signLanguage"],
        sampleCount=record["sampleCount"],
        message=f"Saved {record['sampleCount']} samples for '{record['word']}' ({record['signLanguage']})"
    )


# ── GET /gestures/mine ────────────────────────────────────────
@router.get("/mine")
async def get_my_gestures(
    email:    str = Query(..., description="User email"),
    limit:    int = Query(100, ge=1, le=500),
    skip:     int = Query(0,   ge=0),
    language: Optional[str] = Query(None, description="Filter by sign language code"),
):
    db = get_db()
    query = {"contributor": email}
    if language:
        query["signLanguage"] = language.strip().upper()

    cursor = db["gestures"].find(query, {"samples": 0}).sort("capturedAt", -1).skip(skip).limit(limit)
    results = []
    async for doc in cursor:
        results.append(serialize(doc))

    return {"count": len(results), "data": results}


# ── GET /gestures ─────────────────────────────────────────────
@router.get("/")
async def list_gestures(
    gesture:  Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    limit:    int           = Query(50, ge=1, le=500),
    skip:     int           = Query(0,  ge=0),
):
    db = get_db()
    query = {}
    if gesture:
        query["gesture"] = gesture.strip().upper()
    if language:
        query["signLanguage"] = language.strip().upper()

    cursor = db["gestures"].find(query, {"samples": 0}).sort("capturedAt", -1).skip(skip).limit(limit)
    results = []
    async for doc in cursor:
        results.append(serialize(doc))

    return {"count": len(results), "data": results}


# ── GET /gestures/{id} ────────────────────────────────────────
@router.get("/{gesture_id}")
async def get_gesture(gesture_id: str):
    db = get_db()
    try:
        oid = ObjectId(gesture_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    doc = await db["gestures"].find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Gesture record not found")

    return serialize(doc)


# ── DELETE /gestures/{id} ─────────────────────────────────────
@router.delete("/{gesture_id}")
async def delete_gesture(
    gesture_id: str,
    email: str = Query(..., description="Email of the user requesting deletion")
):
    db = get_db()

    try:
        oid = ObjectId(gesture_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    doc = await db["gestures"].find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Gesture record not found")

    if doc.get("contributor") != email:
        raise HTTPException(status_code=403, detail="You can only delete your own gestures")

    await db["gestures"].delete_one({"_id": oid})

    return {"success": True, "message": f"Deleted gesture '{doc['gesture']}'"}
