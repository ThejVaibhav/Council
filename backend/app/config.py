from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All runtime configuration comes from the environment (or backend/.env).

    The Gemini key is server side only and is never sent to the frontend.
    """

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    gemini_api_key: str = ""
    specialist_model: str = "gemini-3.5-flash"
    moderator_model: str = "gemini-3.7-flash"
    agent_timeout_seconds: float = 45.0
    # Each debate makes 7 model calls; cap parallel debates so a public demo stays inside free-tier quota.
    max_concurrent_debates: int = 2

    database_url: str = "postgresql://council:council@localhost:55432/council"
    cors_origins: str = "http://localhost:5288"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
