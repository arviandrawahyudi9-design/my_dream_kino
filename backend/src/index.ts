import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database
  BOT_TOKEN: string
  ADMIN_ID: string
  CHANNEL_ID: string
  MOVIE_CHANNEL_ID: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/*', cors())

// ==========================
// API ENDPOINTS (Frontend)
// ==========================

app.get('/', (c) => c.json({ status: 'ok', service: 'kino-api-cloudflare' }))

app.get('/api/dashboard', async (c) => {
  const genre = c.req.query('genre')
  
  const usersReq = await c.env.DB.prepare('SELECT count(*) as count FROM users').first('count') || 0
  const verifiedUsersReq = await c.env.DB.prepare('SELECT count(*) as count FROM users WHERE verified = 1').first('count') || 0
  const moviesReq = await c.env.DB.prepare('SELECT count(*) as count FROM movies').first('count') || 0
  
  let moviesQuery = 'SELECT code, message_id, title, genre, created_at FROM movies ORDER BY created_at DESC'
  let movies = []
  if (genre) {
    movies = (await c.env.DB.prepare('SELECT code, message_id, title, genre, created_at FROM movies WHERE genre = ? ORDER BY created_at DESC').bind(genre).all()).results
  } else {
    movies = (await c.env.DB.prepare(moviesQuery).all()).results
  }

  const allUsersRes = await c.env.DB.prepare(`
    SELECT u.user_id, u.phone, u.verified, COUNT(d.id) as downloads_count
    FROM users u
    LEFT JOIN downloads d ON u.user_id = d.user_id
    GROUP BY u.user_id
    ORDER BY downloads_count DESC
  `).all()
  const allUsers = allUsersRes.results
  const allGenres = (await c.env.DB.prepare('SELECT id, name FROM genres ORDER BY name').all()).results

  return c.json({
    success: true,
    stats: { total_users: usersReq, verified_users: verifiedUsersReq, total_movies: moviesReq },
    movies: movies,
    users: allUsers,
    genres: allGenres
  })
})

app.post('/api/add-movie', async (c) => {
  const data = await c.req.json()
  const url_or_id = data.url_or_id || ""
  const code = data.code || ""
  if (!url_or_id || !code) return c.json({ success: false, message: "Majburiy maydonlar yo'q!" }, 400)
  
  let message_id = parseInt(String(url_or_id).split('/').pop() || String(url_or_id))
  if (isNaN(message_id)) return c.json({ success: false, message: "Message ID xato." }, 400)

  await c.env.DB.prepare(`
    INSERT INTO movies (code, message_id, title, genre) VALUES (?, ?, ?, ?)
    ON CONFLICT(code) DO UPDATE SET message_id=excluded.message_id, title=excluded.title, genre=excluded.genre
  `).bind(code, message_id, data.title || "", data.genre || "").run()

  return c.json({ success: true, message: "Kino saqlandi!" })
})

app.post('/api/delete-movie/:code', async (c) => {
  const code = c.req.param('code')
  await c.env.DB.prepare('DELETE FROM movies WHERE code = ?').bind(code).run()
  return c.json({ success: true, message: "O'chirildi" })
})

app.post('/api/add-genre', async (c) => {
  const data = await c.req.json()
  if (!data.name) return c.json({ success: false, message: "Nomi yo'q" }, 400)
  await c.env.DB.prepare('INSERT INTO genres (name) VALUES (?) ON CONFLICT(name) DO NOTHING').bind(data.name).run()
  return c.json({ success: true, message: "Qo'shildi" })
})

app.post('/api/delete-genre/:id', async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM genres WHERE id = ?').bind(id).run()
  return c.json({ success: true, message: "O'chirildi" })
})

app.get('/api/user/:id/movies', async (c) => {
  const userId = c.req.param('id')
  const res = await c.env.DB.prepare(`
    SELECT m.code, m.title, m.genre, d.downloaded_at
    FROM downloads d
    JOIN movies m ON d.movie_code = m.code
    WHERE d.user_id = ?
    ORDER BY d.downloaded_at DESC
  `).bind(userId).all()
  return c.json({ success: true, movies: res.results || [] })
})

// ==========================
// TELEGRAM BOT WEBHOOK
// ==========================

const sendRequest = async (token: string, method: string, body: object) => {
  const url = `https://api.telegram.org/bot${token}/${method}`
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

const checkSub = async (token: string, channel: string, userId: number) => {
  if (!channel) return true;
  try {
    const res = await sendRequest(token, 'getChatMember', { chat_id: channel, user_id: userId })
    const data: any = await res.json()
    if (data.ok && ['creator', 'administrator', 'member'].includes(data.result.status)) return true
    return false
  } catch (e) {
    return false
  }
}

app.post('/webhook', async (c) => {
  try {
    const update: any = await c.req.json()
    const TOKEN = c.env.BOT_TOKEN
    const CHANNEL_ID = c.env.CHANNEL_ID
    const MOVIE_CHANNEL_ID = c.env.MOVIE_CHANNEL_ID

    if (update.message) {
      const msg = update.message
      const chatId = msg.chat.id
      const userId = msg.from.id
      const text = msg.text || ""

      // Ensure user exists
      await c.env.DB.prepare('INSERT OR IGNORE INTO users (user_id) VALUES (?)').bind(userId).run()
      
      const userRes = await c.env.DB.prepare('SELECT verified FROM users WHERE user_id = ?').bind(userId).first()
      const isVerified = userRes ? userRes.verified : 0

      // Request Contact
      if (text === '/start' && !isVerified) {
        await sendRequest(TOKEN, 'sendMessage', {
          chat_id: chatId,
          text: "👋 Xush kelibsiz!\n\nBotdan foydalanish uchun iltimos telefon raqamingizni tasdiqlang:",
          reply_markup: {
            keyboard: [[{ text: "📱 Telefon raqamni tasdiqlash", request_contact: true }]],
            resize_keyboard: true,
            one_time_keyboard: true
          }
        })
        return c.text('OK')
      }

      // Handle Contact
      if (msg.contact) {
        await c.env.DB.prepare('UPDATE users SET phone = ?, verified = 1 WHERE user_id = ?')
               .bind(msg.contact.phone_number, userId).run()
        
        await sendRequest(TOKEN, 'sendMessage', {
          chat_id: chatId,
          text: "✅ Raqam tasdiqlandi!",
          reply_markup: { remove_keyboard: true }
        })
        
        const subbed = await checkSub(TOKEN, CHANNEL_ID, userId)
        if (!subbed) {
          await sendRequest(TOKEN, 'sendMessage', {
            chat_id: chatId,
            text: "⚠️ Kanalimizga obuna bo'ling:",
            reply_markup: {
              inline_keyboard: [
                [{ text: "📢 Kanalga obuna bo'lish", url: "https://t.me/adikcyber_channel" }],
                [{ text: "✅ Obunani tekshirish", callback_data: "check_subscription" }]
              ]
            }
          })
        } else {
          await sendRequest(TOKEN, 'sendMessage', { chat_id: chatId, text: "🎉 Kerakli kino kodini yuboring:" })
        }
        return c.text('OK')
      }

      // Must be verified
      if (!isVerified) return c.text('OK')

      // Check Sub
      const subbed = await checkSub(TOKEN, CHANNEL_ID, userId)
      if (!subbed) {
        await sendRequest(TOKEN, 'sendMessage', {
          chat_id: chatId,
          text: "⚠️ Kanalimizga obuna bo'ling:",
          reply_markup: {
            inline_keyboard: [
              [{ text: "📢 Kanalga obuna bo'lish", url: "https://t.me/adikcyber_channel" }],
              [{ text: "✅ Obunani tekshirish", callback_data: "check_subscription" }]
            ]
          }
        })
        return c.text('OK')
      }

      // Handle Admin /add
      if (text.startsWith('/add ') && userId.toString() === c.env.ADMIN_ID) {
        const parts = text.split(' ')
        if (parts.length >= 3) {
          const code = parts[1]
          const msgId = parseInt(parts[2])
          const title = parts.slice(3).join(' ') || "Kino"
          await c.env.DB.prepare('INSERT INTO movies (code, message_id, title) VALUES (?, ?, ?) ON CONFLICT(code) DO UPDATE SET message_id=excluded.message_id, title=excluded.title').bind(code, msgId, title).run()
          await sendRequest(TOKEN, 'sendMessage', { chat_id: chatId, text: `✅ Saqlandi: ${code}` })
        }
        return c.text('OK')
      }

      // Handle Movie Code
      if (text && text !== '/start') {
        const code = text.trim()
        const movie = await c.env.DB.prepare('SELECT * FROM movies WHERE code = ?').bind(code).first()
        
        if (movie) {
          let caption = `🎬 **${movie.title}**\n`
          if (movie.genre) caption += `🎭 Janr: ${movie.genre}\n`
          caption += `\n🍿 Yoqimli tomosha!`
          
          await sendRequest(TOKEN, 'copyMessage', {
            chat_id: chatId,
            from_chat_id: MOVIE_CHANNEL_ID,
            message_id: movie.message_id,
            caption: caption,
            parse_mode: 'Markdown'
          })
          
          // record download
          await c.env.DB.prepare('INSERT INTO downloads (user_id, movie_code) VALUES (?, ?)').bind(userId, code).run()
        } else {
          await sendRequest(TOKEN, 'sendMessage', { chat_id: chatId, text: "🔍 Bunday kodli kino topilmadi." })
        }
      }
    }

    if (update.callback_query) {
      const cb = update.callback_query
      const userId = cb.from.id
      
      if (cb.data === 'check_subscription') {
        const subbed = await checkSub(TOKEN, CHANNEL_ID, userId)
        if (subbed) {
          await sendRequest(TOKEN, 'sendMessage', { chat_id: cb.message.chat.id, text: "✅ Rahmat! Kino kodini yuboring:" })
        } else {
          await sendRequest(TOKEN, 'answerCallbackQuery', { callback_query_id: cb.id, text: "❌ Hali obuna bo'lmadingiz!", show_alert: true })
        }
      }
    }

    return c.text('OK')
  } catch (err) {
    console.error(err)
    return c.text('Error', 500)
  }
})

export default app
