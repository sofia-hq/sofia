
import os
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio.engine import create_async_engine
from loguru import logger

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_async_engine(DATABASE_URL) if DATABASE_URL else None

async def init_db():
    if not engine:
        logger.warning("No database URL provided. Skipping database initialization.")
        return
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

async def get_session():
    return AsyncSession(bind=engine, expire_on_commit=False)

__all__ = ["init_db", "get_session"]