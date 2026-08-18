import os
import logging
import asyncio
from dotenv import load_dotenv

from aiogram import Bot, Dispatcher, F, types
from aiogram.filters import CommandStart, Command
from aiogram.types import (
    ReplyKeyboardMarkup, KeyboardButton, ReplyKeyboardRemove,
    InlineKeyboardMarkup, InlineKeyboardButton
)
from aiogram.exceptions import TelegramBadRequest

from database import Database

# Log va muhit sozlamalari
logging.basicConfig(level=logging.INFO)
load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
ADMIN_ID = int(os.getenv("ADMIN_ID", 0))
CHANNEL_ID_RAW = os.getenv("CHANNEL_ID", "")
CHANNEL_ID = int(CHANNEL_ID_RAW) if CHANNEL_ID_RAW.replace("-", "").isdigit() else CHANNEL_ID_RAW
MOVIE_CHANNEL_ID = int(os.getenv("MOVIE_CHANNEL_ID", 0))
CHANNEL_LINK = "https://t.me/adikcyber_channel"


bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()
db = Database()

# --- Klaviaturalar ---
def get_phone_keyboard():
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="📱 Telefon raqamni tasdiqlash", request_contact=True)]
        ],
        resize_keyboard=True,
        one_time_keyboard=True
    )

def get_sub_keyboard(channel_link):
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="📢 Kanalga obuna bo'lish", url=channel_link)],
            [InlineKeyboardButton(text="✅ Obunani tekshirish", callback_data="check_subscription")]
        ]
    )

# --- Obuna tekshirish funksiyasi ---
async def check_user_subscription(user_id: int) -> bool:
    if not CHANNEL_ID:
        return True
    try:
        member = await bot.get_chat_member(chat_id=CHANNEL_ID, user_id=user_id)
        return member.status in ["creator", "administrator", "member"]
    except Exception as e:
        logging.error(f"Obunani tekshirishda xatolik: {e}")
        if "member list is inaccessible" in str(e):
            logging.error(f"XATOLIK: Bot {CHANNEL_ID} kanalida ADMIN emas! Iltimos botni kanalga Admin qiling.")
        return False


# --- Handlers ---

@dp.message(CommandStart())
async def cmd_start(message: types.Message):
    user_id = message.from_user.id
    db.add_user(user_id)
    
    # 1. Telefon raqam tasdiqlanganmi?
    if not db.is_verified(user_id):
        await message.answer(
            "👋 Xush kelibsiz!\n\nBotdan foydalanish uchun iltimos, pastdagi tugma orqali telefon raqamingizni tasdiqlang:",
            reply_markup=get_phone_keyboard()
        )
        return

    # 2. Kanal obunasi tekshiriladi
    is_subbed = await check_user_subscription(user_id)
    if not is_subbed:
        await message.answer(
            "⚠️ Botdan foydalanish uchun rasmiy kanalimizga obuna bo'lishingiz kerak!",
            reply_markup=get_sub_keyboard(CHANNEL_LINK)
        )
        return


    await message.answer(
        "✅ Xush kelibsiz! Kino kodini kiriting:",
        reply_markup=ReplyKeyboardRemove()
    )

# Contact kelganda
@dp.message(F.contact)
async def handle_contact(message: types.Message):
    user_id = message.from_user.id
    phone = message.contact.phone_number
    db.set_phone(user_id, phone)
    
    await message.answer("✅ Telefon raqamingiz muvaffaqiyatli tasdiqlandi!", reply_markup=ReplyKeyboardRemove())
    
    # Obuna tekshirish
    is_subbed = await check_user_subscription(user_id)
    if not is_subbed:
        await message.answer(
            "⚠️ Endi davom etish uchun kanalimizga obuna bo'ling:",
            reply_markup=get_sub_keyboard(CHANNEL_LINK)
        )
    else:
        await message.answer("🎉 Kerakli kino kodini yuboring:")


# Callback: Obunani tekshirish
@dp.callback_query(F.data == "check_subscription")
async def cb_check_sub(callback: types.CallbackQuery):
    user_id = callback.from_user.id
    if not db.is_verified(user_id):
        await callback.message.answer("Avval telefon raqamingizni tasdiqlang!", reply_markup=get_phone_keyboard())
        await callback.answer()
        return
        
    is_subbed = await check_user_subscription(user_id)
    if is_subbed:
        await callback.message.edit_text("✅ Rahmat! Kanalga obuna bo'ldingiz.\n\nKino kodini yuboring:")
    else:
        await callback.answer("❌ Siz hali kanalga obuna bo'lmadingiz!", show_alert=True)

# Admin: Kino qo'shish buyrug'i: /add 101 45 Kino nomi
@dp.message(Command("add"))
async def cmd_add_movie(message: types.Message):
    if message.from_user.id != ADMIN_ID:
        return
        
    args = message.text.split(maxsplit=3)
    if len(args) < 3:
        await message.answer("⚠️ Format: `/add <kod> <yopiq_kanal_message_id> [nomi]`\nMasalan: `/add 101 45 O'rgimchak odam`", parse_mode="Markdown")
        return
        
    code = args[1]
    msg_id = int(args[2])
    title = args[3] if len(args) > 3 else "Kino"
    
    db.add_movie(code, msg_id, title)
    await message.answer(f"✅ Kino saqlandi!\nKod: `{code}`\nMessage ID: `{msg_id}`\nNomi: {title}", parse_mode="Markdown")

# Foydalanuvchi kino kodi yuborganda
@dp.message(F.text)
async def handle_movie_code(message: types.Message):
    user_id = message.from_user.id
    
    # Telefon raqam tekshiruvi
    if not db.is_verified(user_id):
        await message.answer("⚠️ Avval telefon raqamingizni tasdiqlang!", reply_markup=get_phone_keyboard())
        return
        
    # Kanal obunasi tekshiruvi
    if not await check_user_subscription(user_id):
        await message.answer("⚠️ Davom etish uchun kanalga obuna bo'ling!", reply_markup=get_sub_keyboard(CHANNEL_LINK))
        return

        
    code = message.text.strip()
    movie_info = db.get_movie(code)
    
    # Agar bazada kod topilsa
    if movie_info:
        msg_id, title, genre = movie_info
        try:
            caption_text = f"🎬 **{title}**\n"
            if genre:
                caption_text += f"🎭 Janr: {genre}\n"
            caption_text += "\n🍿 Yoqimli tomosha!"
            
            await bot.copy_message(
                chat_id=user_id,
                from_chat_id=MOVIE_CHANNEL_ID,
                message_id=msg_id,
                caption=caption_text,
                parse_mode="Markdown"
            )
            db.record_download(user_id, code)
        except TelegramBadRequest as e:
            await message.answer("❌ Kino fayli topilmadi yoki yopiq kanalda bot Admin emas!")
        except Exception as e:
            await message.answer(f"❌ Xatolik yuz berdi: {e}")
    else:
        # Agar bazada bo'lmasa, lekin kodingiz to'g'ridan-to'g'ri message_id bo'lsa
        if code.isdigit():
            try:
                await bot.copy_message(
                    chat_id=user_id,
                    from_chat_id=MOVIE_CHANNEL_ID,
                    message_id=int(code)
                )
                return
            except Exception:
                pass
        
        await message.answer("🔍 Kechirasiz, bunday kodli kino topilmadi. Kodni qayta tekshirib kiriting.")

async def main():
    print("Bot ishga tushdi...")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
