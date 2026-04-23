from beanie import Document
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CopingStep(BaseModel):
    step: int
    title: str
    description: str


class ChatMessage(Document):
    user_id: str
    session_id: Optional[str] = None
    role: str                          # "user" | "assistant"
    content: str
    created_at: datetime = datetime.utcnow()

    # Only on assistant messages
    detected_emotion: Optional[str] = None
    distress_score: Optional[float] = None
    coping_steps: Optional[List[CopingStep]] = None
    doctor_referral: bool = False

    class Settings:
        name = "chat_messages"


class ChatRequest(BaseModel):
    message: str
    include_spotify: bool = True
    include_youtube: bool = True


class ChatResponse(BaseModel):
    reply: str
    detected_emotion: str
    distress_score: float
    coping_steps: List[CopingStep]
    doctor_referral: bool
    session_id: str
