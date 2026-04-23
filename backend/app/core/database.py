from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings
from app.models.user import User
from app.models.session import EmotionSession
from app.models.chat import ChatMessage


client: AsyncIOMotorClient = None


async def connect_db():
    global client
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[settings.DATABASE_NAME],
        document_models=[User, EmotionSession, ChatMessage],
    )
    print(f"✅ Connected to MongoDB: {settings.DATABASE_NAME}")


async def disconnect_db():
    global client
    if client:
        client.close()
        print("MongoDB disconnected")
