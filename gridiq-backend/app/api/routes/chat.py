import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.conversation import Conversation, Message
from app.models.game import Play
from app.models.user import User
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


FOOTBALL_COACH_SYSTEM_PROMPT = """You are an expert AI football coach for GridIQ. You provide:
- Clear explanations of football concepts and strategies
- Analysis of game situations and play-calling decisions
- Data-driven insights based on NFL statistics when context is provided
- Coaching advice tailored to different skill levels
- References to real NFL plays and teams when relevant

When answering questions:
1. Provide accurate football knowledge
2. Reference statistics and data when available in the context below
3. Explain concepts clearly and concisely
4. Ask clarifying questions if needed
5. Consider different skill levels (player, coach, fan)

Use the provided NFL data context to enhance your responses when it is non-empty."""


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


def _build_user_content(user_message: str, conversation_context: str) -> str:
    parts = []
    if conversation_context.strip():
        parts.append(f"NFL Data Context:\n{conversation_context}")
    parts.append(f"User question:\n{user_message}")
    return "\n\n".join(parts)


def get_ai_response(user_message: str, conversation_context: str, db: Session) -> tuple[str, int, str]:
    """Return (assistant_text, token_count, model_id). Uses Gemini if configured, else OpenAI, else instructions."""
    user_content = _build_user_content(user_message, conversation_context)

    if settings.GEMINI_API_KEY.strip():
        try:
            import google.generativeai as genai

            genai.configure(api_key=settings.GEMINI_API_KEY)
            model_name = settings.GEMINI_MODEL
            model = genai.GenerativeModel(model_name)
            prompt = f"{FOOTBALL_COACH_SYSTEM_PROMPT}\n\n{user_content}"
            response = model.generate_content(prompt)
            assistant_message = response.text or ""
            tokens_used = response.usage_metadata.total_token_count if response.usage_metadata else 0
            return assistant_message, tokens_used, model_name
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Gemini error: {str(e)}") from e

    if settings.OPENAI_API_KEY.strip():
        try:
            from openai import OpenAI

            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            model_name = settings.OPENAI_CHAT_MODEL
            completion = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": FOOTBALL_COACH_SYSTEM_PROMPT},
                    {"role": "user", "content": user_content},
                ],
            )
            choice = completion.choices[0]
            assistant_message = (choice.message.content or "").strip()
            tokens_used = completion.usage.total_tokens if completion.usage else 0
            return assistant_message, tokens_used, model_name
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"OpenAI error: {str(e)}") from e

    fallback = (
        "No AI API key is configured. Add one of these to **gridiq-backend/.env** and restart the server:\n\n"
        "- **GEMINI_API_KEY** — get a key at https://aistudio.google.com/apikey\n"
        "- **OPENAI_API_KEY** — get a key at https://platform.openai.com/api-keys\n\n"
        "Optional: **OPENAI_CHAT_MODEL** (default `gpt-4o-mini`). **GEMINI_MODEL** defaults to `gemini-1.5-flash`."
    )
    return fallback, 0, "none"


@router.post("/conversations", response_model=ConversationSchema)
def create_conversation(
    payload: ConversationCreateSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new conversation."""
    conversation = Conversation(
        id=f"conv_{uuid.uuid4().hex}",
        user_id=current_user.id,
        title=payload.title,
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


@router.get("/conversations", response_model=list[ConversationSchema])
def list_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all conversations for the user."""
    conversations = (
        db.query(Conversation)
        .filter(Conversation.user_id == current_user.id)
        .order_by(Conversation.updated_at.desc())
        .all()
    )
    return conversations


@router.get("/conversations/{conversation_id}", response_model=ConversationSchema)
def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific conversation with all messages."""
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id,
    ).first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return conversation


@router.put("/conversations/{conversation_id}", response_model=ConversationSchema)
def update_conversation(
    conversation_id: str,
    payload: ConversationUpdateSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a conversation title."""
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id,
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a conversation and all its messages."""
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id,
    ).first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    db.delete(conversation)
    db.commit()
    
    return {"detail": "Conversation deleted"}


@router.post("/chat", response_model=ChatResponseSchema)
def chat(
    payload: ChatRequestSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a message and get AI coach response."""
    
    # Get or create conversation
    if payload.conversation_id:
        conversation = db.query(Conversation).filter(
            Conversation.id == payload.conversation_id,
            Conversation.user_id == current_user.id,
        ).first()
        if not conversation:
            # Client-supplied IDs can collide across users; issue a fresh server ID.
            conversation = Conversation(
                id=f"conv_{uuid.uuid4().hex}",
                user_id=current_user.id,
                title="New Conversation",
            )
            db.add(conversation)
            db.flush()
    else:
        conversation = Conversation(
            id=f"conv_{uuid.uuid4().hex}",
            user_id=current_user.id,
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
    assistant_message, tokens_used, model_used = get_ai_response(
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
        model=model_used,
        tokens_used=tokens_used,
    )
    db.add(assistant_message_obj)
    
    db.commit()
    
    return ChatResponseSchema(
        conversation_id=conversation.id,
        user_message=payload.message,
        assistant_message=assistant_message,
        model=model_used,
        tokens_used=tokens_used,
    )
