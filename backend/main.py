"""
main.py
SignBridge Backend — FastAPI entry point.

Run locally:
    uvicorn main:app --reload --port 8000

API docs available at:
    http://localhost:8000/docs
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from db.database import connect_db, close_db
from routes.gestures import router as gestures_router
from routes.stats    import router as stats_router

load_dotenv()

# ── Parse allowed origins from .env ──────────────────────────
raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000")
CORS_ORIGINS = [o.strip() for o in raw_origins.split(",")]

# ── App ───────────────────────────────────────────────────────
app = FastAPI(
    title="SignBridge API",
    description="Crowdsourced sign language gesture data collection backend.",
    version="0.1.0",
)

# ── CORS — allows frontend at localhost:3000 to call this API ─
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Lifecycle ─────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    await connect_db()

@app.on_event("shutdown")
async def shutdown():
    await close_db()

# ── Routers ───────────────────────────────────────────────────
app.include_router(gestures_router)
app.include_router(stats_router)

# ── Health check ──────────────────────────────────────────────
@app.get("/", tags=["health"])
async def root():
    return {
        "status":  "online",
        "service": "SignBridge API",
        "version": "0.1.0",
        "docs":    "/docs"
    }

@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}
