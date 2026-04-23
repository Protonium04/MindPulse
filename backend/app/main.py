from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import connect_db, disconnect_db
from app.api.routes import auth, chat, spotify, youtube, analytics


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await disconnect_db()


app = FastAPI(
    title=settings.APP_NAME,
    description="Mental Wellness Companion API — Emotion Understanding & Support",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api/v1"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(chat.router, prefix=API_PREFIX)
app.include_router(spotify.router, prefix=API_PREFIX)
app.include_router(youtube.router, prefix=API_PREFIX)
app.include_router(analytics.router, prefix=API_PREFIX)


@app.get("/")
async def root():
    return {"message": f"Welcome to {settings.APP_NAME} API", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "ok"}
