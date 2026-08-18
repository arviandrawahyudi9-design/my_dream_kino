# Telegram Kino Bot (Python / aiogram 3)

Ushbu bot Telegram yopiq kanalidan kinolarni kodi orqali foydalanuvchilarga yuboradi.

## Imkoniyatlari:
1. **📱 Telefon raqam tasdiqlash:** Foydalanuvchi `/start` bosganda kontaktini ulashishi kerak.
2. **📢 Majburiy obuna:** Ko'rsatilgan kanalga obuna bo'lmaguncha bot ishlamaydi.
3. **🎬 Yopiq kanaldan kino yuborish:** Kinolar yopiq kanalda saqlanadi va bot `copy_message` orqali ularni foydalanuvchiga kod bo'yicha uzatadi.
4. **👑 Admin paneli (Kino qo'shish):** Admin `/add <kod> <message_id> [nomi]` orqali yangi kinolarni bazaga biriktirishi mumkin.

---

## 🛠 O'rnatish va Ishga tushirish

### 1. Kutubxonalarni o'rnatish:
```bash
pip install -r requirements.txt
```

### 2. `.env` faylini sozlash:
`.env.example` faylidan nusxa olib `.env` yaratasiz va o'z ma'lumotlaringizni kiritasiz:
```env
BOT_TOKEN=777777777:AAxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ADMIN_ID=123456789
CHANNEL_ID=@sizning_obuna_kanalingiz
MOVIE_CHANNEL_ID=-1009876543210
```

> **MUHIM:** 
> - `MOVIE_CHANNEL_ID` — bu kinolar saqlanadigan **Yopiq Kanal ID** si.
> - **Bot shu yopiq kanalda ham, majburiy obuna kanalida ham ADMIN bo'lishi va habarlarni yuborish huquqiga ega bo'lishi shart!**

### 3. Botni ishga tushirish:
```bash
python bot.py
```

---

## 🎬 Yopiq kanaldan kino kodi va Message ID olish:
1. Kinoni yopiq kanalga yuklaysiz.
2. Shu postning havolasini (linkini) nusxalaysiz. 
   - Masalan: `https://t.me/c/1987654321/45`
   - Oxiridagi `45` soni — bu `message_id` hisoblanadi.
3. Admin botga yozadi: `/add 101 45 Super Kino`
4. Endi foydalanuvchi botga `101` deb yuborsa, bot yopiq kanaldagi `45`-xabarni (videoni) foydalanuvchiga yuboradi!
