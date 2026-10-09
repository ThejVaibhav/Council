# Council backend

FastAPI service that runs the debate and stores accounts, plans and events in PostgreSQL.

| Path | Purpose |
| --- | --- |
| `app/main.py` | App setup, health check, anonymous `/sessions` endpoints |
| `app/orchestrator.py` | The two-round debate loop and the Moderator step |
| `app/agents.py`, `app/llm.py` | Agent prompts and the Gemini client (structured output, retries, timeouts) |
| `app/schemas.py` | Pydantic schemas for specialist turns and the final plan |
| `app/plans.py`, `app/broker.py` | Shared plans, live event fan-out, share codes and public recaps |
| `app/users.py`, `app/security.py` | Accounts, tokens, friends |
| `migrations/` | SQL, applied by `python -m scripts.migrate` |
| `tests/` | `python -m pytest` (needs Postgres; model calls are stubbed) |

Run locally: see the root README.
