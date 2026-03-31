"""
routes/gestures.py
Endpoints for submitting and retrieving gesture data.

POST /gestures       — save a recorded gesture sample
GET  /gestures       — list all gestures (with optional filters)
GET  /gestures/{id}  — get a single gesture record by ID
"""

from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId

from models.gesture import GestureSubmission, GestureResponse
from db.database import get_db

router = APIRouter(prefix="/gestures", tags=["gestures"])


def serialize(doc) -> dict:
    """Convert MongoDB document to JSON-serializable dict."""
    doc["id"] = str(doc.pop("_id"))
    return doc


# ── POST /gestures ────────────────────────────────────────────
@router.post("/", response_model=GestureResponse)
async def submit_gesture(payload: GestureSubmission):
    """
    Receive a recorded gesture from the frontend and store it in MongoDB.
    """
    db = get_db()

    if len(payload.samples) == 0:
        raise HTTPException(status_code=400, detail="No sensor samples provided")

    record = {
        "gesture":     payload.gesture.strip().upper(),
        "samples":     [s.model_dump() for s in payload.samples],
        "sampleCount": len(payload.samples),
        "contributor": payload.contributor or "anonymous",
        "region":      payload.region,
        "capturedAt":  datetime.now(timezone.utc),
    }

    result = await db["gestures"].insert_one(record)

    return GestureResponse(
        success=True,
        id=str(result.inserted_id),
        gesture=record["gesture"],
        sampleCount=record["sampleCount"],
        message=f"Saved {record['sampleCount']} samples for gesture '{record['gesture']}'"
    )


# ── GET /gestures ─────────────────────────────────────────────
@router.get("/")
async def list_gestures(
    gesture:  Optional[str] = Query(None, description="Filter by gesture name"),
    limit:    int           = Query(50,   ge=1, le=500),
    skip:     int           = Query(0,    ge=0),
):
    """
    List gesture records. Optionally filter by gesture name.
    Returns records without the full sample arrays (for performance).
    """
    db = get_db()

    query = {}
    if gesture:
        query["gesture"] = gesture.strip().upper()

    cursor = db["gestures"].find(
        query,
        {"samples": 0}   # exclude samples array for listing
    ).sort("capturedAt", -1).skip(skip).limit(limit)

    results = []
    async for doc in cursor:
        results.append(serialize(doc))

    return {"count": len(results), "data": results}


# ── GET /gestures/{id} ────────────────────────────────────────
@router.get("/{gesture_id}")
async def get_gesture(gesture_id: str):
    """
    Get a single gesture record by its MongoDB ID, including all samples.
    Used for ML training data export.
    """
    db = get_db()

    try:
        oid = ObjectId(gesture_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    doc = await db["gestures"].find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Gesture record not found")

    return serialize(doc)
