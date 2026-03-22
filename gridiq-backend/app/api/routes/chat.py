import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.conversation import Conversation, Message
from app.models.game import Play
from app.schemas.conversation import (
    ConversationSchema,
    ConversationCreateSchema,
    ConversationUpdateSchema,
    ChatRequestSchema,
    ChatResponseSchema,
    MessageCreateSchema,
)
from app.core.config import get_settings

router = APIRouter()
settings = get_settings()


def build_football_context(db: Session, team: str = None, season: int = None, week: int = None) -> str:
    """Build football data context for AI from database."""
    context = ""
    
    # Get recent plays for context
    query = db.query(Play)
    if team:
        query = query.filter((Play.posteam == team) | (Play.defteam == team))
    if season:
        query = query.filter(Play.id.contains(f"_{season}_"))
    if week:
        query = query.filter(Play.id.contains(f"_W{week}"))
    
    plays = query.order_by(Play.created_at.desc()).limit(20).all()
    
    if plays:
        context += "\n## Recent NFL Plays for Context:\n"
        for play in plays:
            if play.epa is not None:
                context += f"- {play.play_description} (EPA: {play.epa:.2f}, WPA: {play.wpa})\n"
    
    return context


def get_ai_response(user_message: str, conversation_context: str, db: Session) -> tuple[str, int]:
    """Get response from Google Gemini with football context."""
    try:
        import google.generativeai as genai
        
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Build system prompt with football expertise
        system_prompt = """You are an expert AI football coach for GridIQ. You provide:
- Clear explanations of football concepts and strategies
- Analysis of game situations and play-calling decisions
- Data-driven insights based on NFL statistics
- Coaching advice tailored to different skill levels
- References to real NFL plays and teams when relevant

When answering questions:
1. Provide accurate football knowledge
2. Reference statistics and data when available
3. Explain concepts clearly and concisely
4. Ask clarifying questions if needed
5. Consider different skill levels (player, coach, fan)

Use the provided NFL data context to enhance your responses."""
        
        # Build the full prompt
        prompt = system_prompt
        if conversation_context:
            prompt += f"\n\nNFL Data Context:\n{conversation_context}"
        prompt += f"\n\nUser: {user_message}"
        
        response = model.generate_content(prompt)
        
        assistant_message = response.text
        tokens_used = response.usage_metadata.total_token_count if response.usage_metadata else 0
        
        return assistant_message, tokens_used
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


@router.post("/conversations", response_model=ConversationSchema)
def create_conversation(
    payload: ConversationCreateSchema,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new conversation."""
    conversation = Conversation(
        id=f"conv_{uuid.uuid4().hex}",
        user_id=user_id,
        title=payload.title,
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


@router.get("/conversations", response_model=list[ConversationSchema])
def list_conversations(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all conversations for the user."""
    conversations = (
        db.query(Conversation)
        .filter(Conversation.user_id == user_id)
        .order_by(Conversation.updated_at.desc())
        .all()
    )
    return conversations


@router.get("/conversations/{conversation_id}", response_model=ConversationSchema)
def get_conversation(
    conversation_id: str,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific conversation with all messages."""
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == user_id,
    ).first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return conversation


@router.put("/conversations/{conversation_id}", response_model=ConversationSchema)
def update_conversation(
    conversation_id: str,
    payload: ConversationUpdateSchema,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a conversation title."""
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == user_id,
    ).first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    if payload.title:
        conversation.title = payload.title
    
    db.commit()
    db.refresh(conversation)
    return conversation


@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a conversation and all its messages."""
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == user_id,
    ).first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    db.delete(conversation)
    db.commit()
    
    return {"detail": "Conversation deleted"}


@router.post("/chat", response_model=ChatResponseSchema)
def chat(
    payload: ChatRequestSchema,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a message and get AI coach response."""
    
    # Get or create conversation
    if payload.conversation_id:
        conversation = db.query(Conversation).filter(
            Conversation.id == payload.conversation_id,
            Conversation.user_id == user_id,
        ).first()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conversation = Conversation(
            id=f"conv_{uuid.uuid4().hex}",
            user_id=user_id,
            title="New Conversation",
        )
        db.add(conversation)
        db.flush()
    
    # Save user message
    user_message_obj = Message(
        id=f"msg_{uuid.uuid4().hex}",
        conversation_id=conversation.id,
        role="user",
        content=payload.message,
    )
    db.add(user_message_obj)
    db.flush()
    
    # Build football context from recent plays
    football_context = build_football_context(db)
    
    # Get AI response
    assistant_message, tokens_used = get_ai_response(
        payload.message,
        football_context,
        db,
    )
    
    # Save assistant message
    assistant_message_obj = Message(
        id=f"msg_{uuid.uuid4().hex}",
        conversation_id=conversation.id,
        role="assistant",
        content=assistant_message,
        model="gemini-1.5-flash",
        tokens_used=tokens_used,
    )
    db.add(assistant_message_obj)
    
    db.commit()
    
    return ChatResponseSchema(
        conversation_id=conversation.id,
        user_message=payload.message,
        assistant_message=assistant_message,
        tokens_used=tokens_used,
    )
