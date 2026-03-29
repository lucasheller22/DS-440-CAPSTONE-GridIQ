from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Always load gridiq-backend/.env (not the process cwd). Avoids "no API key" when
# uvicorn is started from the monorepo root or another directory.
_BACKEND_ROOT = Path(__file__).resolve().parents[2]
_DEFAULT_ENV_FILE = _BACKEND_ROOT / ".env"


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

    model_config = SettingsConfigDict(env_file=str(_DEFAULT_ENV_FILE), env_file_encoding="utf-8")


settings = Settings()


def get_settings() -> Settings:
    return settings
