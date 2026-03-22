from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class MessageBase(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class MessageCreate(MessageBase):
    pass

class MessageResponse(MessageBase):
    id: str
    thread_id: str
    created_at: datetime
    citations: Optional[List[dict]] = None

class ThreadBase(BaseModel):
    title: str

class ThreadCreate(ThreadBase):
    pass

class ThreadResponse(ThreadBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    messages: List[MessageResponse] = []

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    message: MessageResponse
    thread_id: str