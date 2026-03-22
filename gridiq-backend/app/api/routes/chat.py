from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid
from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.chat import Thread, Message
from app.schemas.chat import ThreadCreate, ThreadResponse, MessageResponse, ChatRequest, ChatResponse
from app.services.gemini import gemini_service

router = APIRouter()

@router.get("/threads", response_model=List[ThreadResponse])
def list_threads(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all threads for the current user"""
    threads = db.query(Thread).filter(Thread.user_id == current_user.id).all()
    return threads

@router.post("/threads", response_model=ThreadResponse)
def create_thread(
    thread: ThreadCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new chat thread"""
    thread_id = str(uuid.uuid4())
    db_thread = Thread(
        id=thread_id,
        user_id=current_user.id,
        title=thread.title
    )
    db.add(db_thread)
    db.commit()
    db.refresh(db_thread)
    return db_thread

@router.get("/threads/{thread_id}", response_model=ThreadResponse)
def get_thread(
    thread_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific thread with all messages"""
    thread = db.query(Thread).filter(
        Thread.id == thread_id,
        Thread.user_id == current_user.id
    ).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Parse citations for messages
    messages = []
    for msg in thread.messages:
        messages.append(MessageResponse(
            id=msg.id,
            thread_id=msg.thread_id,
            role=msg.role,
            content=msg.content,
            created_at=msg.created_at,
            citations=json.loads(msg.citations) if msg.citations else None
        ))
    
    return ThreadResponse(
        id=thread.id,
        user_id=thread.user_id,
        title=thread.title,
        created_at=thread.created_at,
        updated_at=thread.updated_at,
        messages=messages
    )

@router.post("/threads/{thread_id}/messages", response_model=ChatResponse)
def send_message(
    thread_id: str,
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a message to a thread and get AI response"""
    # Verify thread ownership
    thread = db.query(Thread).filter(
        Thread.id == thread_id,
        Thread.user_id == current_user.id
    ).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    # Save user message
    user_message_id = str(uuid.uuid4())
    user_message = Message(
        id=user_message_id,
        thread_id=thread_id,
        role="user",
        content=request.message
    )
    db.add(user_message)

    # Get conversation history for Gemini
    messages = db.query(Message).filter(Message.thread_id == thread_id).order_by(Message.created_at).all()
    conversation = [{"role": msg.role, "content": msg.content} for msg in messages]
    conversation.append({"role": "user", "content": request.message})

    # Get Gemini response
    try:
        gemini_response = gemini_service.generate_response(conversation)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

    # Save AI response
    ai_message_id = str(uuid.uuid4())
    ai_message = Message(
        id=ai_message_id,
        thread_id=thread_id,
        role="assistant",
        content=gemini_response["content"],
        citations=json.dumps(gemini_response["citations"]) if gemini_response["citations"] else None
    )
    db.add(ai_message)

    # Update thread updated_at
    thread.updated_at = user_message.created_at

    db.commit()

    # Return the AI message
    return ChatResponse(
        message=MessageResponse(
            id=ai_message.id,
            thread_id=ai_message.thread_id,
            role=ai_message.role,
            content=ai_message.content,
            created_at=ai_message.created_at,
            citations=json.loads(ai_message.citations) if ai_message.citations else None
        ),
        thread_id=thread_id
    )