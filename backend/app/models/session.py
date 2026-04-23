from beanie import Document
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime


class EmotionScores(BaseModel):
    sadness: float = 0.0
    anger: float = 0.0
    fear: float = 0.0
    joy: float = 0.0
    disgust: float = 0.0
    surprise: float = 0.0
    neutral: float = 0.0

    # Derived
    dominant_emotion: str = "neutral"
    distress_score: float = 0.0   # 0-1 severity


class SpotifySignal(BaseModel):
    tracks_analysed: int = 0
    avg_valence: float = 0.5       # 0=sad, 1=happy
    avg_energy: float = 0.5
    avg_danceability: float = 0.5
    dominant_mood: str = "neutral"
    top_tracks: List[str] = []


class YouTubeSignal(BaseModel):
    videos_analysed: int = 0
    sentiment_score: float = 0.0   # -1 to 1
    categories: List[str] = []
    dominant_theme: str = "general"


class EmotionSession(Document):
    user_id: str
    created_at: datetime = datetime.utcnow()

    text_input: Optional[str] = None

    spotify_signal: Optional[SpotifySignal] = None
    youtube_signal: Optional[YouTubeSignal] = None

    text_emotions: Optional[EmotionScores] = None
    fused_emotions: Optional[EmotionScores] = None

    # Flags
    escalation_triggered: bool = False
    sessions_above_threshold: int = 0

    class Settings:
        name = "emotion_sessions"
