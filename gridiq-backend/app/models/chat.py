from sqlalchemy import String, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.db import Base

class Thread(Base):
    __tablename__ = "threads"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(50), ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    created_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship
    user: Mapped["User"] = relationship("User")
    messages: Mapped[list["Message"]] = relationship("Message", back_populates="thread", order_by="Message.created_at")

class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    thread_id: Mapped[str] = mapped_column(String(50), ForeignKey("threads.id"), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # "user" or "assistant"
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Citations (optional, for Gemini responses)
    citations: Mapped[str] = mapped_column(Text, nullable=True)  # JSON string of citations

    # Relationship
    thread: Mapped["Thread"] = relationship("Thread", back_populates="messages")