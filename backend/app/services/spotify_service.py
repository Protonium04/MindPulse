"""
Spotify Web API integration.
Fetches recently played tracks + audio features (valence, energy, danceability).
Maps audio features to emotional signals.
"""

import httpx
from typing import Optional
from datetime import datetime, timedelta
from app.core.config import settings
from app.models.session import SpotifySignal
from app.models.user import User
import logging

logger = logging.getLogger(__name__)

SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_API_BASE = "https://api.spotify.com/v1"

SPOTIFY_SCOPES = " ".join([
    "user-read-recently-played",
    "user-top-read",
    "user-read-currently-playing",
])


# =========================
# AUTH URL
# =========================
def get_spotify_auth_url(state: str) -> str:
    """Generate Spotify OAuth URL."""
    params = {
        "client_id": settings.SPOTIFY_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": settings.SPOTIFY_REDIRECT_URI,
        "scope": SPOTIFY_SCOPES,
        "state": state,
        "show_dialog": "true",  # Forces account selection
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return f"https://accounts.spotify.com/authorize?{query}"


# =========================
# EXCHANGE CODE
# =========================
async def exchange_code_for_tokens(code: str) -> dict:
    """Exchange auth code for access + refresh tokens."""
    import base64

    credentials = base64.b64encode(
        f"{settings.SPOTIFY_CLIENT_ID}:{settings.SPOTIFY_CLIENT_SECRET}".encode()
    ).decode()

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            SPOTIFY_TOKEN_URL,
            headers={
                "Authorization": f"Basic {credentials}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.SPOTIFY_REDIRECT_URI,
            },
        )
        resp.raise_for_status()
        return resp.json()


# =========================
# REFRESH TOKEN
# =========================
async def refresh_spotify_token(user: User) -> Optional[str]:
    """Refresh expired Spotify token and update user in DB."""
    if not user.spotify_refresh_token:
        logger.warning("No Spotify refresh token found for user")
        return None

    import base64

    credentials = base64.b64encode(
        f"{settings.SPOTIFY_CLIENT_ID}:{settings.SPOTIFY_CLIENT_SECRET}".encode()
    ).decode()

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                SPOTIFY_TOKEN_URL,
                headers={
                    "Authorization": f"Basic {credentials}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": user.spotify_refresh_token,
                },
            )

            if resp.status_code != 200:
                logger.error(f"Spotify refresh failed: {resp.text}")
                return None

            data = resp.json()

            # ✅ ALWAYS update access token
            user.spotify_access_token = data["access_token"]

            # ⚠️ IMPORTANT: Only update refresh token if provided
            if "refresh_token" in data:
                user.spotify_refresh_token = data["refresh_token"]

            user.spotify_token_expires = datetime.utcnow() + timedelta(
                seconds=data.get("expires_in", 3600)
            )

            await user.save()

            logger.info("Spotify token refreshed successfully")
            return user.spotify_access_token

    except Exception as e:
        logger.error(f"Spotify refresh error: {e}")
        return None


# =========================
# GET VALID TOKEN
# =========================
async def get_valid_token(user: User) -> Optional[str]:
    """Return valid token, refreshing if needed."""

    if not user.spotify_access_token:
        logger.warning("User has no Spotify access token")
        return None

    # Refresh if expired or expiring soon
    if user.spotify_token_expires:
        if datetime.utcnow() >= (user.spotify_token_expires - timedelta(minutes=5)):
            logger.info("Spotify token expired or expiring soon, refreshing...")
            return await refresh_spotify_token(user)

    return user.spotify_access_token


# =========================
# FETCH RECENTLY PLAYED
# =========================
async def fetch_recently_played(user: User, limit: int = 20) -> SpotifySignal:
    """
    Fetch recent tracks + audio features, return SpotifySignal.
    """

    token = await get_valid_token(user)

    if not token:
        logger.warning("No valid Spotify token available")
        return SpotifySignal()

    try:
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {token}"}

            # 🔍 DEBUG: Helps verify multi-user tokens
            logger.info(f"Spotify token (first 10 chars): {token[:10]}")

            # =========================
            # 1. RECENTLY PLAYED
            # =========================
            resp = await client.get(
                f"{SPOTIFY_API_BASE}/me/player/recently-played",
                headers=headers,
                params={"limit": limit},
            )

            logger.info(f"Spotify API status: {resp.status_code}")

            # Retry after refresh if unauthorized
            if resp.status_code == 401:
                logger.info("401 received → refreshing token...")
                token = await refresh_spotify_token(user)

                if not token:
                    return SpotifySignal()

                headers = {"Authorization": f"Bearer {token}"}

                resp = await client.get(
                    f"{SPOTIFY_API_BASE}/me/player/recently-played",
                    headers=headers,
                    params={"limit": limit},
                )

            if resp.status_code != 200:
                logger.error(f"Spotify API error {resp.status_code}: {resp.text}")
                return SpotifySignal()

            items = resp.json().get("items", [])

            if not items:
                return SpotifySignal()

            track_ids = [item["track"]["id"] for item in items if item.get("track")]

            top_tracks = [
                f"{item['track']['name']} — {item['track']['artists'][0]['name']}"
                for item in items[:5]
                if item.get("track")
            ]

            # =========================
            # 2. AUDIO FEATURES
            # =========================
            feat_resp = await client.get(
                f"{SPOTIFY_API_BASE}/audio-features",
                headers=headers,
                params={"ids": ",".join(track_ids[:50])},
            )

            features = (
                feat_resp.json().get("audio_features", [])
                if feat_resp.status_code == 200
                else []
            )

            valid = [f for f in features if f]

            if not valid:
                return SpotifySignal(
                    tracks_analysed=len(track_ids),
                    top_tracks=top_tracks,
                    dominant_mood="neutral",
                )

            avg_valence = sum(f["valence"] for f in valid) / len(valid)
            avg_energy = sum(f["energy"] for f in valid) / len(valid)
            avg_dance = sum(f["danceability"] for f in valid) / len(valid)

            dominant_mood = _map_to_mood(avg_valence, avg_energy)

            return SpotifySignal(
                tracks_analysed=len(valid),
                avg_valence=round(avg_valence, 3),
                avg_energy=round(avg_energy, 3),
                avg_danceability=round(avg_dance, 3),
                dominant_mood=dominant_mood,
                top_tracks=top_tracks,
            )

    except Exception as e:
        logger.error(f"Spotify fetch error: {e}")
        return SpotifySignal()


# =========================
# MOOD MAPPING
# =========================
def _map_to_mood(valence: float, energy: float) -> str:
    if valence >= 0.6 and energy >= 0.6:
        return "happy"
    elif valence >= 0.6 and energy < 0.6:
        return "calm"
    elif valence < 0.4 and energy >= 0.6:
        return "angry"
    elif valence < 0.4 and energy < 0.4:
        return "sad"
    elif valence < 0.5 and energy < 0.6:
        return "depressed"
    else:
        return "neutral"


# =========================
# MOOD → EMOTION WEIGHTS
# =========================
def spotify_mood_to_emotion_weights(signal: SpotifySignal) -> dict:
    mood_map = {
        "happy": {"joy": 0.6, "sadness": 0.05},
        "calm": {"neutral": 0.5, "joy": 0.3},
        "angry": {"anger": 0.6, "fear": 0.2},
        "sad": {"sadness": 0.6, "neutral": 0.2},
        "depressed": {"sadness": 0.5, "fear": 0.2},
        "neutral": {"neutral": 0.6},
    }
    return mood_map.get(signal.dominant_mood, {"neutral": 0.5})