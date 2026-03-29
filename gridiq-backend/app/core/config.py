from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ENV: str = "dev"
    DATABASE_URL: str = "sqlite:///./gridiq.db"

    JWT_SECRET: str = "change-me"
    JWT_ALG: str = "HS256"
    ACCESS_TOKEN_MINUTES: int = 30

    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"

    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"


settings = Settings()


def get_settings() -> Settings:
    return settings
