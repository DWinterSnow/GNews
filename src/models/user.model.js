// User Model - Database Queries
const pool = require('../config/db');

class UserModel {
  // Create new user
  static async create(username, email, hashedPassword, profilePicture = null, profilePictureThumbnail = null, profilePictureName = null, age = null, country = null) {
    try {
      const query = 'INSERT INTO users (username, email, password, profile_picture, profile_picture_thumbnail, profile_picture_name, age, country) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
      const [result] = await pool.execute(query, [username, email, hashedPassword, profilePicture, profilePictureThumbnail, profilePictureName, age, country]);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Find user by email
  static async findByEmail(email) {
    try {
      const query = 'SELECT * FROM users WHERE email = ?';
      const [rows] = await pool.execute(query, [email]);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Find user by username
  static async findByUsername(username) {
    try {
      const query = 'SELECT * FROM users WHERE username = ?';
      const [rows] = await pool.execute(query, [username]);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Find user by ID
  static async findById(id) {
    try {
      const query = 'SELECT id, username, email, profile_picture_name, created_at FROM users WHERE id = ?';
      const [rows] = await pool.execute(query, [id]);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get user's profile picture
  static async getProfilePicture(id) {
    try {
      const query = 'SELECT profile_picture FROM users WHERE id = ?';
      const [rows] = await pool.execute(query, [id]);
      return rows[0]?.profile_picture || null;
    } catch (error) {
      throw error;
    }
  }

  // Get user's profile picture thumbnail
  static async getProfilePictureThumbnail(id) {
    try {
      const query = 'SELECT profile_picture_thumbnail FROM users WHERE id = ?';
      const [rows] = await pool.execute(query, [id]);
      return rows[0]?.profile_picture_thumbnail || null;
    } catch (error) {
      throw error;
    }
  }

  // Get all users
  static async getAll() {
    try {
      const query = 'SELECT id, username, email, created_at FROM users';
      const [rows] = await pool.execute(query);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Delete user by ID
  static async delete(id) {
    try {
      const query = 'DELETE FROM users WHERE id = ?';
      const [result] = await pool.execute(query, [id]);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Update user's profile picture
  static async updateProfilePicture(userId, profilePicture, profilePictureThumbnail) {
    try {
      const query = 'UPDATE users SET profile_picture = ?, profile_picture_thumbnail = ? WHERE id = ?';
      const [result] = await pool.execute(query, [profilePicture, profilePictureThumbnail, userId]);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Update user's password
  static async updatePassword(userId, hashedPassword) {
    try {
      const query = 'UPDATE users SET password = ? WHERE id = ?';
      const [result] = await pool.execute(query, [hashedPassword, userId]);
      return result;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = UserModel;
