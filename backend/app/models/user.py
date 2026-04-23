from beanie import Document
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class User(Document):
    email: EmailStr
    username: str
    hashed_password: str
    full_name: Optional[str] = None
    is_active: bool = True
    created_at: datetime = datetime.utcnow()

    # OAuth tokens (stored encrypted in production)
    spotify_access_token: Optional[str] = None
    spotify_refresh_token: Optional[str] = None
    spotify_token_expires: Optional[datetime] = None

    youtube_access_token: Optional[str] = None
    youtube_refresh_token: Optional[str] = None

    class Settings:
        name = "users"


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    full_name: Optional[str]
    is_active: bool
    spotify_connected: bool = False
    youtube_connected: bool = False

    class Config:
        from_attributes = True
