"""
LangChain Wellness Chain.
Builds an emotion-aware prompt and calls the LLM to generate:
  1. Empathetic conversational response
  2. 3 actionable coping steps
  3. Doctor referral flag + message (when distress is high)

Uses ConversationBufferMemory to maintain multi-turn context.
"""
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_community.chat_message_histories import ChatMessageHistory
from app.core.config import settings
from app.models.session import EmotionScores
from app.models.chat import CopingStep
import json
import re
import logging

logger = logging.getLogger(__name__)

# In-memory store: user_id → memory (replace with Redis for production)
_memory_store: dict = {}


def get_memory(user_id: str) -> ChatMessageHistory:
    if user_id not in _memory_store:
        _memory_store[user_id] = ChatMessageHistory()
    return _memory_store[user_id]


def clear_memory(user_id: str):
    _memory_store.pop(user_id, None)


def build_system_prompt(emotion: EmotionScores, spotify_context: str, youtube_context: str, escalate: bool) -> str:
    escalation_note = ""
    if escalate:
        escalation_note = """
            If the person seems really struggling, naturally weave in that speaking to someone professional 
            could really help — like a friend would say it, not like a warning message. Mention iCall 
            (9152987821) casually and warmly, not as a disclaimer.
            """

    return f"""You are a close, caring friend who genuinely listens and understands people deeply. 
            You're warm, real, and conversational — like a best friend who happens to understand emotions really well.

            IMPORTANT RULES:
            - Talk like a real friend, NOT like a therapist or AI assistant
            - NEVER mention percentages, scores, distress levels, or numbers
            - NEVER say things like "your distress level is at X%" — that's robotic and weird
            - NEVER start with "I" — vary how you begin each response
            - Keep responses SHORT — 2 to 4 sentences max for the main reply
            - Sound natural, warm and human — use casual language
            - Don't be overly positive or use hollow phrases like "That's great!" or "I understand how you feel"
            - Actually engage with what they said — ask a follow up question sometimes
            - Sometimes just validate without giving advice — not everything needs a solution
            - Use "you" a lot — make it personal to them

            WHAT YOU KNOW ABOUT THEM RIGHT NOW:
            - They seem to be feeling: {emotion.dominant_emotion}
            - Their music lately: {spotify_context}
            - Their video watching lately: {youtube_context}

            Use this context subtly — don't announce it. Just let it naturally shape how you respond.

            WHEN TO INCLUDE COPING STEPS:
            Only include the <<<STEPS>>> block when:
            - The person is clearly struggling emotionally (sad, angry, anxious, depressed, guilty, heartbroken)
            - They are asking for help or advice
            - They express feeling stuck or not knowing what to do
            - The distress is: {emotion.dominant_emotion} with score {round(emotion.distress_score, 2)}

            Do NOT include steps when:
            - They are just casually chatting
            - They said something positive or neutral
            - They are just venting and need to be heard, not advised
            - You just gave steps in the previous message
            - They are responding to your question

            If steps ARE needed, put them after your reply in this exact format:
            <<<STEPS>>>
            [
            {{"step": 1, "title": "Short title", "description": "One practical friendly sentence"}},
            {{"step": 2, "title": "Short title", "description": "One practical friendly sentence"}},
            {{"step": 3, "title": "Short title", "description": "One practical friendly sentence"}}
            ]
            <<<END>>>

            If steps are NOT needed, just reply conversationally with NO <<<STEPS>>> block at all.

            Make coping steps feel like advice from a friend, not a medical pamphlet.
            Instead of "Practice deep breathing exercises" say "Put your phone down and just breathe for a minute — seriously it helps"
            {escalation_note}"""


async def generate_response(
    user_id: str,
    user_message: str,
    emotion: EmotionScores,
    spotify_context: str = "No Spotify data",
    youtube_context: str = "No YouTube data",
    escalate: bool = False,
) -> tuple[str, list[CopingStep], bool]:
    """
    Generate empathetic response + coping steps using LangChain + OpenAI.

    Returns:
        (reply_text, coping_steps, doctor_referral)
    """
    try:
        llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0.75,
            api_key=settings.GROQ_API_KEY,
            max_tokens=600,
)

        memory = get_memory(user_id)
        system_prompt = build_system_prompt(emotion, spotify_context, youtube_context, escalate)

        # Build messages
        messages = [SystemMessage(content=system_prompt)]
        messages += memory.messages
        messages.append(HumanMessage(content=user_message))

        response = await llm.ainvoke(messages)
        raw = response.content

        # Save to memory
        memory.add_user_message(user_message)
        memory.add_ai_message(raw)

        # Parse coping steps from the <<<STEPS>>> block
        reply, coping_steps = _parse_response(raw)
        doctor_referral = escalate

        return reply, coping_steps, doctor_referral

    except Exception as e:
        logger.error(f"LLM generation error: {e}")
        return _fallback_response(emotion), _fallback_steps(emotion), escalate


def _parse_response(raw: str) -> tuple[str, list[CopingStep]]:
    """Extract reply text and parse JSON coping steps."""
    steps_pattern = r"<<<STEPS>>>(.*?)<<<END>>>"
    match = re.search(steps_pattern, raw, re.DOTALL)

    if match:
        reply = raw[:raw.index("<<<STEPS>>>")].strip()
        try:
            steps_data = json.loads(match.group(1).strip())
            steps = [CopingStep(**s) for s in steps_data]
        except Exception:
            steps = _fallback_steps_list()
    else:
        reply = raw.strip()
        steps = _fallback_steps_list()

    return reply, steps


def _fallback_response(emotion: EmotionScores) -> str:
    responses = {
        "sadness": "I can sense you're going through something difficult right now. You're not alone in this, and it's okay to feel sad. I'm here with you.",
        "anger": "I hear you — it sounds like something's really frustrated you. Your feelings are completely valid.",
        "fear": "It sounds like you're feeling anxious or scared about something. That takes courage to acknowledge.",
        "joy": "It's wonderful to hear some happiness from you! Let's hold onto that positive energy.",
        "neutral": "Thank you for sharing with me. I'm here to listen and support you.",
    }
    return responses.get(emotion.dominant_emotion, responses["neutral"])


def _fallback_steps(emotion: EmotionScores) -> list[CopingStep]:
    return _fallback_steps_list()


def _fallback_steps_list() -> list[CopingStep]:
    return [
        CopingStep(step=1, title="Deep Breathing", description="Take 5 slow deep breaths — inhale for 4 counts, hold for 4, exhale for 6."),
        CopingStep(step=2, title="Ground Yourself", description="Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste."),
        CopingStep(step=3, title="Gentle Movement", description="Step outside for a 10-minute walk — fresh air and movement reset your nervous system."),
    ]
