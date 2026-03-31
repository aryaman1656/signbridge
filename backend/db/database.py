"""
db/database.py
Handles MongoDB connection using Motor (async MongoDB driver).
Call connect_db() on startup and close_db() on shutdown.
"""

import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME   = os.getenv("DB_NAME", "signbridge")

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_instance = Database()

async def connect_db():
    """Create MongoDB connection on app startup."""
    db_instance.client = AsyncIOMotorClient(MONGO_URL)
    db_instance.db     = db_instance.client[DB_NAME]
    print(f"✅ Connected to MongoDB: {DB_NAME}")

async def close_db():
    """Close MongoDB connection on app shutdown."""
    if db_instance.client:
        db_instance.client.close()
        print("🔌 MongoDB connection closed")

def get_db():
    """Return the database instance for use in routes."""
    return db_instance.db
