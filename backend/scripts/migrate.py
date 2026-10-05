"""Apply backend/migrations/*.sql in order, recording each in schema_migrations.

Run from backend/:  python -m scripts.migrate
"""
import asyncio
from pathlib import Path

import asyncpg

from app.config import get_settings

MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "migrations"


async def main() -> None:
    conn = await asyncpg.connect(get_settings().database_url)
    try:
        await conn.execute(
            "CREATE TABLE IF NOT EXISTS schema_migrations ("
            " name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())"
        )
        applied = {r["name"] for r in await conn.fetch("SELECT name FROM schema_migrations")}
        for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
            if path.name in applied:
                continue
            async with conn.transaction():
                await conn.execute(path.read_text())
                await conn.execute("INSERT INTO schema_migrations (name) VALUES ($1)", path.name)
            print(f"applied {path.name}")
        print("migrations up to date")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
