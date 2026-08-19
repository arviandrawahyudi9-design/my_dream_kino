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

app.use('/api/*', cors())

// --- API Endpoints ---
app.get('/', (c) => c.json({ status: 'ok', service: 'kino-api-cloudflare' }))

app.get('/api/dashboard', async (c) => {
  const genre = c.req.query('genre')
  
  // Example queries (we will expand this later)
  const users = await c.env.DB.prepare('SELECT count(*) as count FROM users').first('count')
  const movies = await c.env.DB.prepare('SELECT count(*) as count FROM movies').first('count')
  
  return c.json({
    success: true,
    stats: { total_users: users, total_movies: movies },
    movies: [],
    users: [],
    genres: []
  })
})

// --- Telegram Webhook Endpoint ---
app.post('/webhook', async (c) => {
  try {
    const update = await c.req.json()
    // Handle message
    if (update.message) {
      const chatId = update.message.chat.id
      const text = update.message.text
      
      if (text === '/start') {
        const url = `https://api.telegram.org/bot${c.env.BOT_TOKEN}/sendMessage`
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: '👋 Xush kelibsiz! Cloudflare versiyasiga otdingiz.'
          })
        })
      }
    }
    return c.text('OK')
  } catch (err) {
    console.error(err)
    return c.text('Error', 500)
  }
})

export default app
