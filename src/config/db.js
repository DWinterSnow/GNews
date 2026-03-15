// Database Configuration - MySQL Connection Pool (optimized for Railway)
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gnews_db',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  enableKeepAlive: true,
  connectionTimeZone: 'Z'
});

// Handle pool errors
pool.on('connection', (connection) => {
  connection.on('error', (err) => {
    console.error('Connection error:', err.message);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('Database connection was closed.');
    }
    if (err.code === 'PROTOCOL_SEQUENCE_TIMEOUT') {
      console.error('Database connection timeout.');
    }
  });
});

// Test connection
pool.getConnection((err, connection) => {
  if (err) {
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('Database connection was closed.');
    }
    if (err.code === 'ER_CON_COUNT_ERROR') {
      console.error('Database has too many connections.');
    }
    if (err.code === 'ECONNREFUSED') {
      console.error('Database connection was refused.');
    }
    console.error('Erreur connexion MySQL:', err.message);
  } else {
    console.log('✅ MySQL connecté - Base:', process.env.DB_NAME || 'gnews_db');
    connection.release();
  }
});

module.exports = pool;
