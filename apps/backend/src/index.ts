import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import sql from './db'
import wallets from './routes/wallets'
import emulator from './routes/emulator'
import testnet from './routes/testnet'
import loan from './routes/loan'
import test from './routes/test'
import { initContractsTable } from './services/contract.service'
import { initTestRunsTable } from './services/test.service'

const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', cors({
    origin: ['http://localhost:3001', 'http://localhost:5173'],
    credentials: true
}))

// Health check
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

// API routes
app.route('/api/wallets', wallets)
app.route('/api/emulator', emulator)
app.route('/api/testnet', testnet)
app.route('/api/loan', loan)
app.route('/api/test', test)

// Initialize database tables
async function initTables() {
  try {
    await initContractsTable()
    await initTestRunsTable()
    console.log('📦 Database tables initialized')
  } catch (err) {
    console.error('Failed to initialize tables:', err)
  }
}
initTables()

// 404 handler
app.notFound((c) => {
    return c.json({ error: 'Not found' }, 404)
})

const port = Number(process.env.PORT) || 3005

// Bun uses the default export, Node uses explicit serve
console.log(`🚀 MintMatrix API running on http://localhost:${port}`)

// Export for Bun
export default {
    port,
    fetch: app.fetch
}
