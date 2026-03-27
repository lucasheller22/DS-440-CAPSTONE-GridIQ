from fastapi import FastAPI
from app.api.routes import health, auth, users, chat, games, cache
from app.core.db import engine, Base
import app.models  # register models for metadata

app = FastAPI(title="GridIQ Backend", version="0.1.0")


@app.on_event("startup")
def create_db_tables() -> None:
    Base.metadata.create_all(bind=engine)


app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(games.router, prefix="/api/games", tags=["games"])
app.include_router(cache.router, prefix="/api/cache", tags=["cache"])


from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)