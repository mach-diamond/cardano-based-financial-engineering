import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import sql from './db'

const app = new Hono()

app.get('/health', async (c) => {
    try {
        const [result] = await sql`SELECT 1 as res`
        return c.json({
            status: 'ok',
            db: result.res === 1 ? 'connected' : 'error',
            service: 'mintmatrix-backend'
        })
    } catch (err) {
        return c.json({ status: 'error', message: String(err) }, 500)
    }
})

const port = Number(process.env.PORT) || 3005
console.log(`Server is running on port ${port}`)

serve({
    fetch: app.fetch,
    port
})

export default app
