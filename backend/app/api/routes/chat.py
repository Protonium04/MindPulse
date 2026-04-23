from aiohttp import request
from fastapi import APIRouter, Depends, HTTPException
from app.models.user import User
from app.models.chat import ChatMessage, ChatRequest, ChatResponse
from app.models.session import EmotionSession
from app.core.security import get_current_user
from app.services.nlp_service import analyse_text
from app.services.spotify_service import fetch_recently_played
from app.services.youtube_service import fetch_watch_history
from app.services.fusion_service import fuse, should_escalate, detect_crisis
from app.chains.wellness_chain import generate_response
import logging

router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger(__name__)


@router.post("/message", response_model=ChatResponse)
async def send_message(request: ChatRequest, current_user: User = Depends(get_current_user)):
    """
    Main wellness endpoint:
    1. Analyse user text with NLP
    2. Fetch Spotify + YouTube signals (if connected + requested)
    3. Fuse all emotion signals
    4. Generate LLM response via LangChain
    5. Persist session + messages
    """
    user_id = str(current_user.id)

    # 1. NLP on text
    text_emotions = analyse_text(request.message)
    # Crisis override — if crisis keywords detected, force high distress
    crisis_detected = detect_crisis(request.message)
    if crisis_detected:
        text_emotions.dominant_emotion = "fear"
        text_emotions.distress_score = 0.95
        text_emotions.sadness = 0.85
        text_emotions.fear = 0.75
        text_emotions.joy = 0.0

    # 2. External signals
    spotify_signal = None
    youtube_signal = None

    if request.include_spotify and current_user.spotify_access_token:
        try:
            spotify_signal = await fetch_recently_played(current_user)
        except Exception as e:
            logger.warning(f"Spotify fetch skipped: {e}")

    if request.include_youtube and current_user.youtube_access_token:
        try:
            youtube_signal = await fetch_watch_history(current_user)
        except Exception as e:
            logger.warning(f"YouTube fetch skipped: {e}")

    # 3. Fuse emotions
    fused = fuse(text_emotions, spotify_signal, youtube_signal)

    # 4. Check escalation history
    recent_sessions = await EmotionSession.find(
        EmotionSession.user_id == user_id
    ).sort(-EmotionSession.created_at).limit(3).to_list()

    consecutive_high = sum(
        1 for s in recent_sessions
        if s.fused_emotions and s.fused_emotions.distress_score >= 0.60
    )
    escalate = should_escalate(fused.distress_score, consecutive_high) or crisis_detected
    # 5. Build context strings for LLM
    spotify_ctx = (
        f"Listening to {spotify_signal.dominant_mood} music "
        f"(valence: {spotify_signal.avg_valence:.2f}, energy: {spotify_signal.avg_energy:.2f}). "
        f"Recent tracks: {', '.join(spotify_signal.top_tracks[:3])}"
        if spotify_signal and spotify_signal.tracks_analysed > 0
        else "No Spotify data available"
    )
    youtube_ctx = (
        f"Recently watched {youtube_signal.dominant_theme}-themed content "
        f"(sentiment: {youtube_signal.sentiment_score:.2f})"
        if youtube_signal and youtube_signal.videos_analysed > 0
        else "No YouTube data available"
    )

    # 6. Generate LLM response
    reply, coping_steps, doctor_referral = await generate_response(
        user_id=user_id,
        user_message=request.message,
        emotion=fused,
        spotify_context=spotify_ctx,
        youtube_context=youtube_ctx,
        escalate=escalate,
    )

    # 7. Persist session
    session = EmotionSession(
        user_id=user_id,
        text_input=request.message,
        spotify_signal=spotify_signal,
        youtube_signal=youtube_signal,
        text_emotions=text_emotions,
        fused_emotions=fused,
        escalation_triggered=doctor_referral,
    )
    await session.insert()
    session_id = str(session.id)

    # 8. Persist messages
    await ChatMessage(
        user_id=user_id,
        session_id=session_id,
        role="user",
        content=request.message,
    ).insert()

    await ChatMessage(
        user_id=user_id,
        session_id=session_id,
        role="assistant",
        content=reply,
        detected_emotion=fused.dominant_emotion,
        distress_score=fused.distress_score,
        coping_steps=coping_steps,
        doctor_referral=doctor_referral,
    ).insert()

    return ChatResponse(
        reply=reply,
        detected_emotion=fused.dominant_emotion,
        distress_score=fused.distress_score,
        coping_steps=coping_steps,
        doctor_referral=doctor_referral,
        session_id=session_id,
    )


@router.get("/history")
async def get_chat_history(limit: int = 50, current_user: User = Depends(get_current_user)):
    """Return recent chat messages for the authenticated user."""
    messages = (
        await ChatMessage.find(ChatMessage.user_id == str(current_user.id))
        .sort(-ChatMessage.created_at)
        .limit(limit)
        .to_list()
    )
    messages.reverse()
    return [
        {
            "id": str(m.id),
            "role": m.role,
            "content": m.content,
            "created_at": m.created_at.isoformat(),
            "detected_emotion": m.detected_emotion,
            "distress_score": m.distress_score,
            "coping_steps": [s.dict() for s in m.coping_steps] if m.coping_steps else [],
            "doctor_referral": m.doctor_referral,
        }
        for m in messages
    ]
