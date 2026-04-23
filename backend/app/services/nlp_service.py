"""
Emotion detection using HuggingFace transformers.
Model: j-hartmann/emotion-english-distilroberta-base
Detects: sadness, anger, fear, joy, disgust, surprise, neutral
"""
from transformers import pipeline
from app.models.session import EmotionScores
import logging

logger = logging.getLogger(__name__)

_emotion_pipeline = None


def get_emotion_pipeline():
    global _emotion_pipeline
    if _emotion_pipeline is None:
        logger.info("Loading emotion model (first run — may take a moment)...")
        _emotion_pipeline = pipeline(
            "text-classification",
            model="j-hartmann/emotion-english-distilroberta-base",
            top_k=None,           # return all labels
            device=-1,            # CPU; change to 0 for GPU
        )
        logger.info("Emotion model loaded ✅")
    return _emotion_pipeline


def analyse_text(text: str) -> EmotionScores:
    """
    Run emotion classification on a piece of text.
    Returns EmotionScores with probabilities for each emotion.
    """
    if not text or not text.strip():
        return EmotionScores()

    try:
        pipe = get_emotion_pipeline()
        # Truncate to 512 tokens max
        text = text[:1500]
        results = pipe(text)[0]   # list of {label, score}

        scores = {r["label"].lower(): r["score"] for r in results}

        emotion_scores = EmotionScores(
            sadness=scores.get("sadness", 0.0),
            anger=scores.get("anger", 0.0),
            fear=scores.get("fear", 0.0),
            joy=scores.get("joy", 0.0),
            disgust=scores.get("disgust", 0.0),
            surprise=scores.get("surprise", 0.0),
            neutral=scores.get("neutral", 0.0),
        )

        # Dominant emotion
        emotion_scores.dominant_emotion = max(
            ["sadness", "anger", "fear", "joy", "disgust", "surprise", "neutral"],
            key=lambda e: getattr(emotion_scores, e),
        )

        # Distress = weighted sum of negative emotions
        emotion_scores.distress_score = round(
            emotion_scores.sadness * 0.35
            + emotion_scores.anger * 0.25
            + emotion_scores.fear * 0.25
            + emotion_scores.disgust * 0.15,
            4,
        )

        return emotion_scores

    except Exception as e:
        logger.error(f"NLP analysis error: {e}")
        return EmotionScores()


def analyse_multiple_texts(texts: list[str]) -> EmotionScores:
    """Average emotion scores across a list of texts (e.g. video titles)."""
    if not texts:
        return EmotionScores()

    all_scores = [analyse_text(t) for t in texts]
    n = len(all_scores)

    avg = EmotionScores(
        sadness=sum(s.sadness for s in all_scores) / n,
        anger=sum(s.anger for s in all_scores) / n,
        fear=sum(s.fear for s in all_scores) / n,
        joy=sum(s.joy for s in all_scores) / n,
        disgust=sum(s.disgust for s in all_scores) / n,
        surprise=sum(s.surprise for s in all_scores) / n,
        neutral=sum(s.neutral for s in all_scores) / n,
    )
    avg.dominant_emotion = max(
        ["sadness", "anger", "fear", "joy", "disgust", "surprise", "neutral"],
        key=lambda e: getattr(avg, e),
    )
    avg.distress_score = round(
        avg.sadness * 0.35 + avg.anger * 0.25 + avg.fear * 0.25 + avg.disgust * 0.15,
        4,
    )
    return avg
