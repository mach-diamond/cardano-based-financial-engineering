import postgres from 'postgres'

// Connects to the machdiamond_postgres container (shared with E-Commerce-Store-2)
const sql = postgres({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'fintech-test-suite',
    username: process.env.DB_USER || 'machdiamond',
    password: process.env.DB_PASSWORD || 'machdiamond_dev',
})

export default sql
