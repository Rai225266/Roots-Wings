const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'roots_wings',

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  dateStrings: true,

  ssl: process.env.DB_SSL === 'true'
    ? {
        rejectUnauthorized: false
      }
    : undefined,

  // Enable SQL debugging
  debug: true
});

(async () => {
  try {
    const conn = await pool.getConnection();

    console.log('===================================');
    console.log('✅ MySQL connected successfully');
    console.log('Host      :', process.env.DB_HOST);
    console.log('Database  :', process.env.DB_NAME);
    console.log('User      :', process.env.DB_USER);
    console.log('Port      :', process.env.DB_PORT);
    console.log('===================================');

    conn.release();
  } catch (err) {
    console.error('❌ MySQL connection failed');
    console.error(err);
  }
})();

module.exports = pool;
