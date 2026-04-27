"""
main.py
SignBridge Backend — FastAPI entry point.

Run locally:
    uvicorn main:app --reload --port 8000
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from db.database import connect_db, close_db
from routes.gestures    import router as gestures_router
from routes.stats       import router as stats_router
from routes.auth        import router as auth_router
from routes.languages   import router as languages_router
from routes.words       import router as words_router
from routes.equivalents import router as equivalents_router
from routes.predict     import router as predict_router

load_dotenv()

raw_origins  = os.getenv("CORS_ORIGINS", "http://localhost:3000")
CORS_ORIGINS = [o.strip() for o in raw_origins.split(",")]

app = FastAPI(
    title="SignBridge API",
    description="Crowdsourced sign language gesture data collection backend.",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await connect_db()

@app.on_event("shutdown")
async def shutdown():
    await close_db()

app.include_router(auth_router)
app.include_router(gestures_router)
app.include_router(stats_router)
app.include_router(languages_router)
app.include_router(words_router)
app.include_router(equivalents_router)
app.include_router(predict_router)

@app.get("/", tags=["health"])
async def root():
    return {"status": "online", "service": "SignBridge API", "version": "0.2.0", "docs": "/docs"}

@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}
