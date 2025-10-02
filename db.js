// db.js - PostgreSQL pool
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 10, // conexiones en el pool
  idleTimeoutMillis: 30000,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
