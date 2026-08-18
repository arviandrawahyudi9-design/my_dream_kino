# Telegram Kino Bot

Telegram yopiq kanalidagi kinolarni kod orqali yuboradigan bot va admin panel.

## Arxitektura

- **Supabase** — foydalanuvchilar, kinolar, janrlar va yuklab olishlar bazasi.
- **Render Web Service** — Flask REST API (`web_app.py`).
- **Render Background Worker** — doimiy ishlovchi Telegram bot (`bot.py`).
- **Vercel** — admin panelning statik frontend'i (`frontend/`).

## Lokal sozlash

```bash
pip install -r requirements.txt
```

`.env.example` faylidan `.env` yarating va Telegram hamda Supabase qiymatlarini kiriting. `SUPABASE_SERVICE_ROLE_KEY` maxfiy kalit bo'lib, hech qachon frontendga joylanmaydi.

## Production deployment

### 1. Supabase

1. Supabase'da yangi loyiha yarating.
2. SQL Editor oynasida [`supabase/schema.sql`](supabase/schema.sql) kodini bir marta ishga tushiring.
3. Project Settings → API bo'limidan `SUPABASE_URL` va **service_role** kalitini oling.
4. Avvalgi lokal bazani saqlash uchun `.env` ga Supabase kalitlarini qo'shing va bir marta ishga tushiring:

```bash
python migrate_sqlite_to_supabase.py
```

### 2. Render

Render'da **New → Blueprint** orqali GitHub repozitoriyini ulang. `render.yaml` avtomatik ikkita servis yaratadi:

- `my-dream-kino-api` — Web Service
- `my-dream-kino-bot` — Background Worker

Ikkala servisga `SUPABASE_URL` va `SUPABASE_SERVICE_ROLE_KEY` qo'shing. Bot servisiga `BOT_TOKEN`, `ADMIN_ID`, `CHANNEL_ID`, `MOVIE_CHANNEL_ID` ham qo'shiladi. API servisiga Vercel manzilingizni `FRONTEND_URL` sifatida kiriting.

### 3. Vercel

1. Repozitoriyni Vercel'ga import qiling.
2. **Root Directory** sifatida `frontend` ni belgilang va deploy qiling.
3. `frontend/config.js` ichidagi `API_BASE_URL` ga Render API manzilini yozing, masalan `https://my-dream-kino-api.onrender.com`, so'ng GitHub'ga push qiling.

API manzili maxfiy ma'lumot emas; u frontend uchun Git'da saqlanadi. Service role kalitini esa faqat Render environment variables orqali qo'shing.
