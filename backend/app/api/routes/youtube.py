from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from app.models.user import User
from app.core.security import get_current_user
from app.services.youtube_service import (
    get_youtube_auth_url, exchange_code_for_tokens, fetch_watch_history
)
import secrets

router = APIRouter(prefix="/youtube", tags=["youtube"])

_state_store: dict = {}


@router.get("/connect")
async def connect_youtube(current_user: User = Depends(get_current_user)):
    state = secrets.token_urlsafe(16)
    _state_store[state] = str(current_user.id)
    auth_url = get_youtube_auth_url(state)
    return {"auth_url": auth_url}


@router.get("/callback")
async def youtube_callback(code: str, state: str):
    user_id = _state_store.pop(state, None)
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    tokens = await exchange_code_for_tokens(code)
    user.youtube_access_token = tokens["access_token"]
    user.youtube_refresh_token = tokens.get("refresh_token")
    await user.save()

    from app.core.config import settings
    return RedirectResponse(url=f"{settings.FRONTEND_URL}/connect-accounts?youtube=connected")


@router.get("/status")
async def youtube_status(current_user: User = Depends(get_current_user)):
    return {"connected": bool(current_user.youtube_access_token)}


@router.get("/watch-history")
async def get_watch_history(current_user: User = Depends(get_current_user)):
    signal = await fetch_watch_history(current_user)
    return signal.dict()


@router.delete("/disconnect")
async def disconnect_youtube(current_user: User = Depends(get_current_user)):
    current_user.youtube_access_token = None
    current_user.youtube_refresh_token = None
    await current_user.save()
    return {"message": "YouTube disconnected"}
