"""
routes/stats.py
Endpoints for contribution statistics shown on the frontend.

GET /stats            — overall counts
GET /stats/breakdown  — sample count per gesture
"""

from fastapi import APIRouter
from db.database import get_db

router = APIRouter(prefix="/stats", tags=["stats"])


# ── GET /stats ────────────────────────────────────────────────
@router.get("/")
async def get_stats():
    """
    Return overall contribution stats:
    - total gesture records
    - total individual samples
    - unique gesture labels
    - unique contributors
    """
    db = get_db()

    total_records = await db["gestures"].count_documents({})

    # Aggregate to get total samples and unique gestures/contributors
    pipeline = [
        {
            "$group": {
                "_id": None,
                "totalSamples":      {"$sum": "$sampleCount"},
                "uniqueGestures":    {"$addToSet": "$gesture"},
                "uniqueContributors":{"$addToSet": "$contributor"},
            }
        }
    ]

    agg = await db["gestures"].aggregate(pipeline).to_list(1)

    if not agg:
        return {
            "totalRecords":       0,
            "totalSamples":       0,
            "uniqueGestures":     0,
            "uniqueContributors": 0,
        }

    result = agg[0]
    return {
        "totalRecords":       total_records,
        "totalSamples":       result.get("totalSamples", 0),
        "uniqueGestures":     len(result.get("uniqueGestures", [])),
        "uniqueContributors": len(result.get("uniqueContributors", [])),
    }


# ── GET /stats/breakdown ──────────────────────────────────────
@router.get("/breakdown")
async def get_breakdown():
    """
    Return per-gesture sample counts, sorted by count descending.
    Used to show which gestures need more data.
    """
    db = get_db()

    pipeline = [
        {
            "$group": {
                "_id":         "$gesture",
                "records":     {"$sum": 1},
                "totalSamples":{"$sum": "$sampleCount"},
            }
        },
        {"$sort": {"totalSamples": -1}},
        {
            "$project": {
                "_id":         0,
                "gesture":     "$_id",
                "records":     1,
                "totalSamples":1,
            }
        }
    ]

    results = await db["gestures"].aggregate(pipeline).to_list(200)
    return {"breakdown": results}
