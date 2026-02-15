// Database Configuration - MySQL Connection Pool
const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gnews_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Erreur connexion MySQL:', err.message);
    console.error('Verifiez que MySQL est demarre et que les identifiants .env sont corrects');
  } else {
    console.log('MySQL connecte - Base:', process.env.DB_NAME || 'gnews_db');
    connection.release();
  }
});

module.exports = pool.promise();
