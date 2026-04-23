"""
YouTube Data API v3 integration.
Fetches watch history via OAuth and analyses video titles/categories for sentiment.
"""
import httpx
from typing import Optional, List
from app.core.config import settings
from app.models.session import YouTubeSignal
from app.models.user import User
from app.services.nlp_service import analyse_multiple_texts
import logging

logger = logging.getLogger(__name__)

YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"

GOOGLE_SCOPES = " ".join([
    "https://www.googleapis.com/auth/youtube.readonly",
    "openid",
    "email",
])

# YouTube categories considered distress signals
DISTRESS_CATEGORIES = {
    "22",   # People & Blogs (venting, personal)
    "25",   # News & Politics (doom-scrolling)
    "24",   # Entertainment (excessive escapism)
}

# Mood-bearing keywords in video titles
SAD_KEYWORDS = ["sad", "crying", "depressed", "alone", "alone", "heartbreak",
                 "anxiety", "pain", "suffering", "hopeless", "dark", "numb"]
ANGER_KEYWORDS = ["angry", "rage", "furious", "hate", "rant", "triggered"]
HAPPY_KEYWORDS = ["happy", "joy", "celebration", "success", "motivation", "wins"]


def get_youtube_auth_url(state: str) -> str:
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": GOOGLE_SCOPES,
        "access_type": "offline",
        "state": state,
        "prompt": "consent",
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return f"https://accounts.google.com/o/oauth2/v2/auth?{query}"


async def exchange_code_for_tokens(code: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            },
        )
        resp.raise_for_status()
        return resp.json()


async def fetch_watch_history(user: User, max_results: int = 25) -> YouTubeSignal:
    """
    Fetch videos from multiple YouTube endpoints for better coverage.
    Tries: liked videos → subscriptions → playlists
    """
    if not user.youtube_access_token:
        return YouTubeSignal()

    try:
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {user.youtube_access_token}"}

            titles = []
            categories = []

            # Method 1 — Liked videos
            resp = await client.get(
                f"{YOUTUBE_API_BASE}/videos",
                headers=headers,
                params={
                    "part": "snippet",
                    "myRating": "like",
                    "maxResults": max_results,
                },
            )

            logger.info(f"YouTube liked videos status: {resp.status_code}")

            # Handle 401 — refresh token
            if resp.status_code == 401:
                refreshed = await _refresh_google_token(user)
                if refreshed:
                    headers = {"Authorization": f"Bearer {user.youtube_access_token}"}
                    resp = await client.get(
                        f"{YOUTUBE_API_BASE}/videos",
                        headers=headers,
                        params={"part": "snippet", "myRating": "like", "maxResults": max_results},
                    )

            if resp.status_code == 200:
                items = resp.json().get("items", [])
                logger.info(f"YouTube liked videos: {len(items)} items")
                titles += [item["snippet"]["title"] for item in items if item.get("snippet")]
                categories += [item["snippet"].get("categoryId", "") for item in items if item.get("snippet")]

            # Method 2 — Subscriptions (channel names as context)
            if len(titles) < 5:
                sub_resp = await client.get(
                    f"{YOUTUBE_API_BASE}/subscriptions",
                    headers=headers,
                    params={
                        "part": "snippet",
                        "mine": "true",
                        "maxResults": 25,
                    },
                )
                if sub_resp.status_code == 200:
                    subs = sub_resp.json().get("items", [])
                    logger.info(f"YouTube subscriptions: {len(subs)} items")
                    titles += [s["snippet"]["title"] for s in subs if s.get("snippet")]

            # Method 3 — User playlists
            if len(titles) < 5:
                pl_resp = await client.get(
                    f"{YOUTUBE_API_BASE}/playlists",
                    headers=headers,
                    params={
                        "part": "snippet",
                        "mine": "true",
                        "maxResults": 10,
                    },
                )
                if pl_resp.status_code == 200:
                    pls = pl_resp.json().get("items", [])
                    logger.info(f"YouTube playlists: {len(pls)} items")
                    titles += [p["snippet"]["title"] for p in pls if p.get("snippet")]

            logger.info(f"YouTube total titles collected: {len(titles)}")

            if not titles:
                return YouTubeSignal()

            # Keyword scan on all titles
            all_text = " ".join(titles).lower()
            sad_hits = sum(1 for k in SAD_KEYWORDS if k in all_text)
            angry_hits = sum(1 for k in ANGER_KEYWORDS if k in all_text)
            happy_hits = sum(1 for k in HAPPY_KEYWORDS if k in all_text)

            logger.info(f"YouTube keyword hits - sad:{sad_hits} angry:{angry_hits} happy:{happy_hits}")

            total = sad_hits + angry_hits + happy_hits + 1
            sentiment_score = round((happy_hits - sad_hits - angry_hits * 0.5) / total, 3)
            dominant_theme = _dominant_from_keywords(sad_hits, angry_hits, happy_hits)

            return YouTubeSignal(
                videos_analysed=len(titles),
                sentiment_score=sentiment_score,
                categories=list(set(categories)),
                dominant_theme=dominant_theme,
            )

    except Exception as e:
        logger.error(f"YouTube fetch error: {e}")
        return YouTubeSignal()


def _dominant_from_keywords(sad: int, angry: int, happy: int) -> str:
    if sad == 0 and angry == 0 and happy == 0:
        return "general"
    scores = {"sad": sad, "angry": angry, "happy": happy}
    return max(scores, key=scores.get)


async def _refresh_google_token(user: User) -> bool:
    if not user.youtube_refresh_token:
        return False
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "refresh_token": user.youtube_refresh_token,
                    "grant_type": "refresh_token",
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                user.youtube_access_token = data["access_token"]
                await user.save()
                return True
    except Exception:
        pass
    return False
