from fastapi import APIRouter, Depends
from app.models.user import User
from app.models.session import EmotionSession
from app.core.security import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/emotion-history")
async def emotion_history(days: int = 7, current_user: User = Depends(get_current_user)):
    """Return emotion session history for timeline chart."""
    from datetime import datetime, timedelta
    since = datetime.utcnow() - timedelta(days=days)

    sessions = (
        await EmotionSession.find(
            EmotionSession.user_id == str(current_user.id),
            EmotionSession.created_at >= since,
        )
        .sort(EmotionSession.created_at)
        .to_list()
    )

    return [
        {
            "id": str(s.id),
            "created_at": s.created_at.isoformat(),
            "dominant_emotion": s.fused_emotions.dominant_emotion if s.fused_emotions else "neutral",
            "distress_score": s.fused_emotions.distress_score if s.fused_emotions else 0.0,
            "joy": s.fused_emotions.joy if s.fused_emotions else 0.0,
            "sadness": s.fused_emotions.sadness if s.fused_emotions else 0.0,
            "anger": s.fused_emotions.anger if s.fused_emotions else 0.0,
            "fear": s.fused_emotions.fear if s.fused_emotions else 0.0,
            "spotify_mood": s.spotify_signal.dominant_mood if s.spotify_signal else None,
            "youtube_theme": s.youtube_signal.dominant_theme if s.youtube_signal else None,
            "escalation_triggered": s.escalation_triggered,
        }
        for s in sessions
    ]


@router.get("/summary")
async def emotion_summary(current_user: User = Depends(get_current_user)):
    """Overall wellness summary stats."""
    from datetime import datetime, timedelta
    since = datetime.utcnow() - timedelta(days=30)

    sessions = await EmotionSession.find(
        EmotionSession.user_id == str(current_user.id),
        EmotionSession.created_at >= since,
    ).to_list()

    if not sessions:
        return {"total_sessions": 0, "avg_distress": 0, "dominant_emotion": "neutral"}

    fused = [s.fused_emotions for s in sessions if s.fused_emotions]
    avg_distress = sum(f.distress_score for f in fused) / len(fused) if fused else 0
    emotion_counts: dict = {}
    for f in fused:
        e = f.dominant_emotion
        emotion_counts[e] = emotion_counts.get(e, 0) + 1

    dominant = max(emotion_counts, key=emotion_counts.get) if emotion_counts else "neutral"

    return {
        "total_sessions": len(sessions),
        "avg_distress": round(avg_distress, 3),
        "dominant_emotion": dominant,
        "emotion_distribution": emotion_counts,
        "escalations": sum(1 for s in sessions if s.escalation_triggered),
    }
