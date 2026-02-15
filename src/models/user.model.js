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
      const query = 'SELECT id, username, email, age, country, profile_picture_name, created_at FROM users WHERE id = ?';
      const [rows] = await pool.execute(query, [id]);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get user's profile picture
  static async getProfilePicture(id) {
    try {
      const query = 'SELECT profile_picture, profile_picture_name FROM users WHERE id = ?';
      const [rows] = await pool.execute(query, [id]);
      if (!rows[0]) return null;
      return { data: rows[0].profile_picture || null, name: rows[0].profile_picture_name || null };
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
      const query = 'UPDATE users SET profile_picture = ?, profile_picture_thumbnail = ?, profile_picture_name = ? WHERE id = ?';
      // profilePictureThumbnail may be same as profilePicture; profile_picture_name will be filled by caller via params if available
      // We intentionally set profile_picture_name to NULL here; callers that need to set a name should use updateProfile which supports an object
      const name = null;
      const [result] = await pool.execute(query, [profilePicture, profilePictureThumbnail, name, userId]);
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

  // Update user's profile information
  static async updateProfile(userId, username, age, country, profilePicture = null) {
    try {
      let query = 'UPDATE users SET username = ?, age = ?, country = ?';
      const params = [username, age, country];

      if (profilePicture) {
        query += ', profile_picture = ?, profile_picture_thumbnail = ?, profile_picture_name = ?';
        // If profilePicture is an object with {data, name}, support that
        if (profilePicture && typeof profilePicture === 'object' && profilePicture.data) {
          params.push(profilePicture.data, profilePicture.data, profilePicture.name || null);
        } else {
          params.push(profilePicture, profilePicture, null);
        }
      }

      query += ' WHERE id = ?';
      params.push(userId);

      const [result] = await pool.execute(query, params);
      return result;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = UserModel;
