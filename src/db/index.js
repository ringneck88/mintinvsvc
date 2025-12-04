const { Pool } = require('pg');

// Check for database URL from various sources (Railway uses different names)
const DATABASE_URL = process.env.DATABASE_URL
  || process.env.DATABASE_PUBLIC_URL
  || process.env.POSTGRES_URL
  || process.env.POSTGRES_PUBLIC_URL;

if (!DATABASE_URL) {
  console.error('ERROR: No database URL found!');
  console.error('Set one of: DATABASE_URL, DATABASE_PUBLIC_URL, POSTGRES_URL, or POSTGRES_PUBLIC_URL');
  process.exit(1);
}

console.log('Database URL configured:', DATABASE_URL.replace(/:[^:@]+@/, ':****@'));

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool
};
