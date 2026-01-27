import postgres from 'postgres'

const sql = postgres({
    host: 'localhost',
    port: 5435,
    database: 'mintmatrix',
    username: 'mintmatrix',
    password: 'mintmatrix_dev',
})

export default sql
