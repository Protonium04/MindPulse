from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.core.config import settings
from app.models.user import User
import logging

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


# =========================
# PASSWORD HASHING
# =========================
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


# =========================
# CREATE JWT TOKEN
# =========================
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()

    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),   # issued at (good practice)
    })

    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


# =========================
# GET CURRENT USER
# =========================
async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """
    Extract user from JWT token.
    This is CRITICAL for multi-user correctness.
    """

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Decode JWT
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )

        user_id: Optional[str] = payload.get("sub")

        if user_id is None:
            logger.warning("JWT missing 'sub' field")
            raise credentials_exception

        # 🔍 DEBUG (very important for your issue)
        logger.info(f"JWT decoded user_id: {user_id}")

    except JWTError as e:
        logger.error(f"JWT decode error: {e}")
        raise credentials_exception

    # Fetch user from DB
    user = await User.get(user_id)

    if user is None:
        logger.warning(f"User not found for id: {user_id}")
        raise credentials_exception

    return user