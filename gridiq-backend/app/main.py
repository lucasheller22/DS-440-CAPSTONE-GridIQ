from fastapi import FastAPI
from app.api.routes import health, auth, users, chat
from app.core.db import engine
from app.models import Base

app = FastAPI(title="GridIQ Backend", version="0.1.0")

# Create database tables
Base.metadata.create_all(bind=engine)

app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])


from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)