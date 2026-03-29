from pathlib import Path

from dotenv import load_dotenv
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Always load gridiq-backend/.env (not the process cwd). Avoids "no API key" when
# uvicorn is started from the monorepo root or another directory.
_BACKEND_ROOT = Path(__file__).resolve().parents[2]
_DEFAULT_ENV_FILE = _BACKEND_ROOT / ".env"

# Pre-load into os.environ so empty shell vars cannot mask values from the file.
load_dotenv(_DEFAULT_ENV_FILE, override=True)


class Settings(BaseSettings):
    ENV: str = "dev"
    DATABASE_URL: str = "sqlite:///./gridiq.db"

    JWT_SECRET: str = "change-me"
    JWT_ALG: str = "HS256"
    ACCESS_TOKEN_MINUTES: int = 30

    OPENAI_API_KEY: str = ""
    OPENAI_CHAT_MODEL: str = "gpt-4o-mini"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"

    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @field_validator("GEMINI_API_KEY", "OPENAI_API_KEY", mode="before")
    @classmethod
    def strip_api_keys(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip()
        return v

    model_config = SettingsConfigDict(env_file=str(_DEFAULT_ENV_FILE), env_file_encoding="utf-8")


settings = Settings()


def get_settings() -> Settings:
    return settings
