"""
Emotion Fusion Service.
Combines text NLP, Spotify audio features, and YouTube sentiment
into a single fused EmotionScores object using weighted averaging.

Weights:
  Text input:  50%  (most direct signal)
  Spotify:     30%  (passive behaviour)
  YouTube:     20%  (passive behaviour)
"""
from app.models.session import EmotionScores, SpotifySignal, YouTubeSignal
from typing import Optional


TEXT_WEIGHT = 0.50
SPOTIFY_WEIGHT = 0.30
YOUTUBE_WEIGHT = 0.20

DISTRESS_THRESHOLD = 0.60     # single session
ESCALATION_SESSIONS = 3       # consecutive sessions above threshold

CRISIS_KEYWORDS = [
    "suicid", "kill myself", "end my life", "want to die",
    "self harm", "self-harm", "cutting myself", "overdose",
    "no reason to live", "better off dead", "can't go on",
    "don't want to be here", "end it all", "harm myself"
]

def detect_crisis(text: str) -> bool:
    """Detect crisis keywords regardless of NLP emotion score."""
    text_lower = text.lower()
    return any(keyword in text_lower for keyword in CRISIS_KEYWORDS)


def spotify_to_emotion_scores(signal: SpotifySignal) -> EmotionScores:
    """Map Spotify audio features → EmotionScores."""
    valence = signal.avg_valence
    energy = signal.avg_energy

    # Low valence = sad/depressed, high energy + low valence = angry
    sadness = round(max(0, (0.5 - valence) * 2), 3) if valence < 0.5 else 0.0
    joy = round(max(0, (valence - 0.5) * 2), 3) if valence > 0.5 else 0.0
    anger = round(max(0, energy * (1 - valence)), 3)
    fear = round(max(0, (1 - valence) * (1 - energy) * 0.5), 3)
    neutral = round(max(0, 1 - sadness - joy - anger - fear), 3)

    scores = EmotionScores(
        sadness=sadness,
        anger=anger,
        fear=fear,
        joy=joy,
        disgust=0.0,
        surprise=0.0,
        neutral=neutral,
    )
    scores.dominant_emotion = _dominant(scores)
    scores.distress_score = round(sadness * 0.35 + anger * 0.25 + fear * 0.25, 4)
    return scores


def youtube_to_emotion_scores(signal: YouTubeSignal) -> EmotionScores:
    """Map YouTube sentiment → EmotionScores."""
    s = signal.sentiment_score   # -1 to 1
    theme = signal.dominant_theme

    if s < -0.3 or theme == "sad":
        sadness = 0.6
        joy, anger, fear = 0.05, 0.15, 0.15
    elif theme == "angry":
        anger = 0.6
        sadness, joy, fear = 0.15, 0.05, 0.1
    elif s > 0.3 or theme == "happy":
        joy = 0.7
        sadness, anger, fear = 0.05, 0.05, 0.05
    else:
        sadness = anger = joy = fear = 0.15

    neutral = max(0.0, 1 - sadness - anger - joy - fear)
    scores = EmotionScores(
        sadness=round(sadness, 3),
        anger=round(anger, 3),
        fear=round(fear, 3),
        joy=round(joy, 3),
        disgust=0.0,
        surprise=0.0,
        neutral=round(neutral, 3),
    )
    scores.dominant_emotion = _dominant(scores)
    scores.distress_score = round(sadness * 0.35 + anger * 0.25 + fear * 0.25, 4)
    return scores


def fuse(
    text_scores: Optional[EmotionScores],
    spotify_signal: Optional[SpotifySignal],
    youtube_signal: Optional[YouTubeSignal],
) -> EmotionScores:
    """
    Fuse all signals into a single EmotionScores object.
    Handles missing signals gracefully by redistributing weights.
    """
    sources = []
    weights = []

    if text_scores:
        sources.append(text_scores)
        weights.append(TEXT_WEIGHT)

    if spotify_signal and spotify_signal.tracks_analysed > 0:
        sources.append(spotify_to_emotion_scores(spotify_signal))
        weights.append(SPOTIFY_WEIGHT)

    if youtube_signal and youtube_signal.videos_analysed > 0:
        sources.append(youtube_to_emotion_scores(youtube_signal))
        weights.append(YOUTUBE_WEIGHT)

    if not sources:
        return EmotionScores()

    # Normalise weights
    total_w = sum(weights)
    weights = [w / total_w for w in weights]

    def wavg(attr):
        return round(sum(getattr(s, attr) * w for s, w in zip(sources, weights)), 4)

    fused = EmotionScores(
        sadness=wavg("sadness"),
        anger=wavg("anger"),
        fear=wavg("fear"),
        joy=wavg("joy"),
        disgust=wavg("disgust"),
        surprise=wavg("surprise"),
        neutral=wavg("neutral"),
    )
    fused.dominant_emotion = _dominant(fused)
    fused.distress_score = round(
        fused.sadness * 0.35 + fused.anger * 0.25 + fused.fear * 0.25 + fused.disgust * 0.15,
        4,
    )
    return fused


def should_escalate(distress_score: float, consecutive_sessions: int) -> bool:
    """Return True if professional help should be recommended."""
    return distress_score >= DISTRESS_THRESHOLD or consecutive_sessions >= ESCALATION_SESSIONS


def _dominant(scores: EmotionScores) -> str:
    emotions = ["sadness", "anger", "fear", "joy", "disgust", "surprise", "neutral"]
    return max(emotions, key=lambda e: getattr(scores, e))
