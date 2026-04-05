"""
routes/stats.py
Statistics endpoints — admin check now uses MongoDB admins collection.
"""

from fastapi import APIRouter, Query, HTTPException
from db.database import get_db

router = APIRouter(prefix="/stats", tags=["stats"])

SUPER_ADMIN = "aryamanpandey.cd25@rvce.edu.in"


async def is_admin_email(email: str, db) -> bool:
    if email == SUPER_ADMIN:
        return True
    doc = await db["admins"].find_one({"email": email})
    return doc is not None


# ── GET /stats ────────────────────────────────────────────────
@router.get("/")
async def get_stats():
    db            = get_db()
    total_records = await db["gestures"].count_documents({})
    pipeline = [{"$group": {
        "_id": None,
        "totalSamples":       {"$sum": "$sampleCount"},
        "uniqueGestures":     {"$addToSet": "$gesture"},
        "uniqueContributors": {"$addToSet": "$contributor"},
    }}]
    agg = await db["gestures"].aggregate(pipeline).to_list(1)
    if not agg:
        return {"totalRecords": 0, "totalSamples": 0, "uniqueGestures": 0, "uniqueContributors": 0}
    result = agg[0]
    return {
        "totalRecords":       total_records,
        "totalSamples":       result.get("totalSamples", 0),
        "uniqueGestures":     len(result.get("uniqueGestures", [])),
        "uniqueContributors": len(result.get("uniqueContributors", [])),
    }


# ── GET /stats/me ─────────────────────────────────────────────
@router.get("/me")
async def get_my_stats(email: str = Query(...)):
    db    = get_db()
    total = await db["gestures"].count_documents({"contributor": email})
    pipeline = [
        {"$match": {"contributor": email}},
        {"$group": {
            "_id":          "$gesture",
            "count":        {"$sum": 1},
            "totalSamples": {"$sum": "$sampleCount"},
            "lastRecorded": {"$max": "$capturedAt"},
        }},
        {"$sort": {"lastRecorded": -1}},
        {"$project": {"_id": 0, "gesture": "$_id", "count": 1, "totalSamples": 1, "lastRecorded": 1}}
    ]
    breakdown = await db["gestures"].aggregate(pipeline).to_list(200)
    first     = await db["gestures"].find_one({"contributor": email}, sort=[("capturedAt", 1)])
    return {
        "email":         email,
        "totalGestures": total,
        "breakdown":     breakdown,
        "memberSince":   first["capturedAt"].isoformat() if first else None,
    }


# ── GET /stats/breakdown ──────────────────────────────────────
@router.get("/breakdown")
async def get_breakdown():
    db = get_db()
    pipeline = [
        {"$group": {"_id": "$gesture", "records": {"$sum": 1}, "totalSamples": {"$sum": "$sampleCount"}}},
        {"$sort": {"totalSamples": -1}},
        {"$project": {"_id": 0, "gesture": "$_id", "records": 1, "totalSamples": 1}}
    ]
    results = await db["gestures"].aggregate(pipeline).to_list(200)
    return {"breakdown": results}


# ── GET /stats/admin ──────────────────────────────────────────
@router.get("/admin")
async def get_admin_stats(email: str = Query(...)):
    db = get_db()
    if not await is_admin_email(email, db):
        raise HTTPException(status_code=403, detail="Admin access required")

    total_records    = await db["gestures"].count_documents({})
    overview_pipeline = [{"$group": {
        "_id": None,
        "totalSamples":       {"$sum": "$sampleCount"},
        "uniqueGestures":     {"$addToSet": "$gesture"},
        "uniqueContributors": {"$addToSet": "$contributor"},
    }}]
    overview_agg = await db["gestures"].aggregate(overview_pipeline).to_list(1)
    overview     = overview_agg[0] if overview_agg else {}

    gesture_pipeline = [
        {"$group": {"_id": "$gesture", "records": {"$sum": 1}, "totalSamples": {"$sum": "$sampleCount"}}},
        {"$sort": {"totalSamples": -1}},
        {"$project": {"_id": 0, "gesture": "$_id", "records": 1, "totalSamples": 1}}
    ]
    gesture_breakdown = await db["gestures"].aggregate(gesture_pipeline).to_list(200)

    leaderboard_pipeline = [
        {"$group": {
            "_id":          "$contributor",
            "totalGestures":{"$sum": 1},
            "totalSamples": {"$sum": "$sampleCount"},
            "lastActive":   {"$max": "$capturedAt"},
        }},
        {"$sort": {"totalGestures": -1}},
        {"$limit": 20},
        {"$project": {"_id": 0, "email": "$_id", "totalGestures": 1, "totalSamples": 1, "lastActive": 1}}
    ]
    leaderboard = await db["gestures"].aggregate(leaderboard_pipeline).to_list(20)
    for entry in leaderboard:
        if entry.get("lastActive"):
            entry["lastActive"] = entry["lastActive"].isoformat()
        user_doc       = await db["users"].find_one({"email": entry["email"]})
        entry["name"]  = user_doc["name"]      if user_doc else entry["email"].split("@")[0]
        entry["photo"] = user_doc.get("photo") if user_doc else None

    recent_cursor = db["gestures"].find({}, {"samples": 0}).sort("capturedAt", -1).limit(20)
    recent = []
    async for doc in recent_cursor:
        doc["id"] = str(doc.pop("_id"))
        if doc.get("capturedAt"):
            doc["capturedAt"] = doc["capturedAt"].isoformat()
        recent.append(doc)

    timeline_pipeline = [
        {"$group": {
            "_id":   {"year": {"$year": "$capturedAt"}, "month": {"$month": "$capturedAt"}, "day": {"$dayOfMonth": "$capturedAt"}},
            "count": {"$sum": 1},
        }},
        {"$sort": {"_id.year": 1, "_id.month": 1, "_id.day": 1}},
        {"$limit": 60},
        {"$project": {
            "_id": 0,
            "date": {"$dateToString": {"format": "%Y-%m-%d", "date": {"$dateFromParts": {"year": "$_id.year", "month": "$_id.month", "day": "$_id.day"}}}},
            "count": 1,
        }}
    ]
    timeline = await db["gestures"].aggregate(timeline_pipeline).to_list(60)

    return {
        "overview":        {"totalRecords": total_records, "totalSamples": overview.get("totalSamples", 0), "uniqueGestures": len(overview.get("uniqueGestures", [])), "uniqueContributors": len(overview.get("uniqueContributors", []))},
        "gestureBreakdown": gesture_breakdown,
        "leaderboard":      leaderboard,
        "recentFeed":       recent,
        "timeline":         timeline,
    }
