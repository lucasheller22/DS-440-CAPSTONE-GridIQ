from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Path to gridiq-backend/.env (always this folder, never cwd).
_BACKEND_ROOT = Path(__file__).resolve().parents[2]
_DEFAULT_ENV_FILE = _BACKEND_ROOT / ".env"


class Settings(BaseSettings):
    ENV: str = "dev"
    DATABASE_URL: str = "sqlite:///./gridiq.db"

    JWT_SECRET: str = "change-me"
    JWT_ALG: str = "HS256"
    ACCESS_TOKEN_MINUTES: int = 30

    #OPENAI_API_KEY: str = ""
    #OPENAI_CHAT_MODEL: str = "gpt-4o-mini"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"

    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @field_validator("GEMINI_API_KEY", "OPENAI_API_KEY", mode="before")
    @classmethod
    def strip_api_keys(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip()
        return v

    # Read only os.environ (populated by load_dotenv below). Avoid pydantic merging env_file
    # in a way that drops keys when cwd or precedence differs between machines.
    model_config = SettingsConfigDict(extra="ignore")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Load .env into os.environ, then build settings (single cached instance per process)."""
    # utf-8-sig strips UTF-8 BOM from files saved by some Windows editors.
    load_dotenv(_DEFAULT_ENV_FILE, override=True, encoding="utf-8-sig")
    return Settings()


settings = get_settings()
