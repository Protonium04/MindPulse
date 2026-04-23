from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from app.models.user import User
from app.core.security import get_current_user
from app.services.spotify_service import (
    get_spotify_auth_url,
    exchange_code_for_tokens,
    fetch_recently_played
)
from datetime import datetime, timedelta
import base64

router = APIRouter(prefix="/spotify", tags=["spotify"])


# =========================
# CONNECT SPOTIFY
# =========================
@router.get("/connect")
async def connect_spotify(current_user: User = Depends(get_current_user)):
    """Generate Spotify OAuth URL for the current user."""

    # 🔥 Encode user_id into state (fixes multi-user issue)
    state = base64.urlsafe_b64encode(str(current_user.id).encode()).decode()

    auth_url = get_spotify_auth_url(state)

    return {"auth_url": auth_url}


# =========================
# CALLBACK
# =========================
@router.get("/callback")
async def spotify_callback(code: str, state: str):
    """Handle Spotify OAuth callback."""

    # 🔥 Decode user_id from state
    try:
        user_id = base64.urlsafe_b64decode(state.encode()).decode()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Exchange code for tokens
    tokens = await exchange_code_for_tokens(code)

    # Save tokens correctly
    user.spotify_access_token = tokens["access_token"]

    # 🔥 IMPORTANT: only overwrite refresh token if provided
    if tokens.get("refresh_token"):
        user.spotify_refresh_token = tokens["refresh_token"]

    user.spotify_token_expires = datetime.utcnow() + timedelta(
        seconds=tokens.get("expires_in", 3600)
    )

    await user.save()

    # Redirect back to frontend
    from app.core.config import settings
    return RedirectResponse(
        url=f"{settings.FRONTEND_URL}/connect-accounts?spotify=connected"
    )


# =========================
# STATUS
# =========================
@router.get("/status")
async def spotify_status(current_user: User = Depends(get_current_user)):
    return {"connected": bool(current_user.spotify_access_token)}


# =========================
# RECENT TRACKS
# =========================
@router.get("/recent-tracks")
async def get_recent_tracks(current_user: User = Depends(get_current_user)):
    signal = await fetch_recently_played(current_user)
    return signal.dict()


# =========================
# DISCONNECT
# =========================
@router.delete("/disconnect")
async def disconnect_spotify(current_user: User = Depends(get_current_user)):
    current_user.spotify_access_token = None
    current_user.spotify_refresh_token = None
    current_user.spotify_token_expires = None
    await current_user.save()
    return {"message": "Spotify disconnected"}