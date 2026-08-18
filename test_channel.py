import asyncio
import os
import sys
from dotenv import load_dotenv
from aiogram import Bot

sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()
BOT_TOKEN = os.getenv("BOT_TOKEN")
CHANNEL_ID = os.getenv("CHANNEL_ID")
ADMIN_ID = int(os.getenv("ADMIN_ID"))

async def test():
    bot = Bot(token=BOT_TOKEN)
    print(f"Testing bot with CHANNEL_ID: {CHANNEL_ID}")
    try:
        chat = await bot.get_chat(CHANNEL_ID)
        print(f"Chat found! Title: {chat.title}, Type: {chat.type}, ID: {chat.id}")
        
        member = await bot.get_chat_member(chat_id=chat.id, user_id=ADMIN_ID)
        print(f"Member status for Admin {ADMIN_ID}: {member.status}")
    except Exception as e:
        print(f"ERROR: {type(e).__name__} - {e}")
    finally:
        await bot.session.close()

if __name__ == "__main__":
    asyncio.run(test())
