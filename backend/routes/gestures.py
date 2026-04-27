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
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
from typing import Optional
import csv
import io
import json

from bson import ObjectId

from models.gesture import GestureSubmission, GestureResponse
from db.database import get_db

SUPER_ADMIN = "aryamanpandey.cd25@rvce.edu.in"

async def is_admin_email(email: str, db) -> bool:
    if email == SUPER_ADMIN:
        return True
    doc = await db["admins"].find_one({"email": email})
    return doc is not None

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


# ── GET /gestures/export ──────────────────────────────────────
@router.get("/export")
async def export_gestures(
    email:    str           = Query(..., description="Admin email requesting export"),
    format:   str           = Query("json", description="json or csv"),
    language: Optional[str] = Query(None,   description="Filter by sign language code"),
    gesture:  Optional[str] = Query(None,   description="Filter by gesture label"),
):
    """
    Export the full gesture dataset including raw sensor samples.
    Admin-only. Returns JSON (default) or CSV.

    JSON shape per record:
      { id, gesture, word, signLanguage, contributor, capturedAt,
        sampleCount, samples: [{flex:{f1-f5}, mpu:{accelX,Y,Z,gyroX,Y,Z}, timestamp}] }

    CSV shape — one row per *sample* (flat):
      id, gesture, word, signLanguage, contributor, capturedAt,
      sample_index, f1, f2, f3, f4, f5,
      accelX, accelY, accelZ, gyroX, gyroY, gyroZ, timestamp
    """
    db = get_db()

    if not await is_admin_email(email, db):
        raise HTTPException(status_code=403, detail="Admin access required")

    query = {}
    if language:
        query["signLanguage"] = language.strip().upper()
    if gesture:
        query["gesture"] = gesture.strip().upper()

    cursor = db["gestures"].find(query).sort("capturedAt", 1)
    records = []
    async for doc in cursor:
        rec = {
            "id":           str(doc["_id"]),
            "gesture":      doc.get("gesture", ""),
            "word":         doc.get("word", doc.get("gesture", "")),
            "signLanguage": doc.get("signLanguage", "ASL"),
            "contributor":  doc.get("contributor", "anonymous"),
            "capturedAt":   doc["capturedAt"].isoformat() if doc.get("capturedAt") else None,
            "sampleCount":  doc.get("sampleCount", 0),
            "samples":      doc.get("samples", []),
        }
        records.append(rec)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

    # ── JSON export ──────────────────────────────────────────
    if format.lower() != "csv":
        payload = json.dumps({
            "exportedAt":   datetime.now(timezone.utc).isoformat(),
            "totalRecords": len(records),
            "records":      records,
        }, indent=2)
        return StreamingResponse(
            iter([payload]),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=signbridge_dataset_{timestamp}.json"},
        )

    # ── CSV export — one row per sample ─────────────────────
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id", "gesture", "word", "signLanguage", "contributor", "capturedAt",
        "sample_index",
        "f1", "f2", "f3", "f4", "f5",
        "accelX", "accelY", "accelZ",
        "gyroX",  "gyroY",  "gyroZ",
        "sample_timestamp",
    ])
    for rec in records:
        for i, s in enumerate(rec["samples"]):
            flex = s.get("flex", {})
            mpu  = s.get("mpu", {})
            writer.writerow([
                rec["id"],
                rec["gesture"],
                rec["word"],
                rec["signLanguage"],
                rec["contributor"],
                rec["capturedAt"],
                i,
                flex.get("f1", ""), flex.get("f2", ""), flex.get("f3", ""),
                flex.get("f4", ""), flex.get("f5", ""),
                mpu.get("accelX", ""), mpu.get("accelY", ""), mpu.get("accelZ", ""),
                mpu.get("gyroX",  ""), mpu.get("gyroY",  ""), mpu.get("gyroZ",  ""),
                s.get("timestamp", ""),
            ])

    csv_bytes = output.getvalue().encode("utf-8")
    return StreamingResponse(
        iter([csv_bytes]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=signbridge_dataset_{timestamp}.csv"},
    )
