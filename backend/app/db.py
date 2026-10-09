import json

import asyncpg

from app.config import get_settings

_pool: asyncpg.Pool | None = None


async def _init_conn(conn: asyncpg.Connection) -> None:
    await conn.set_type_codec("jsonb", encoder=json.dumps, decoder=json.loads, schema="pg_catalog")


async def init_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        url = get_settings().database_url
        # Hosted Postgres (Supabase, Neon) needs TLS; its poolers also reject prepared-statement caching.
        hosted = any(h in url for h in ("supabase", "neon.tech", "pooler"))
        ssl = "require" if hosted and "sslmode" not in url else None
        _pool = await asyncpg.create_pool(url, min_size=1, max_size=10, init=_init_conn, ssl=ssl, statement_cache_size=0)
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Database pool not initialised")
    return _pool
