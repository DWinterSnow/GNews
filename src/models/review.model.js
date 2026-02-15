// Review Model - Database Queries for Reviews
const pool = require('../config/db');

class ReviewModel {
  // Create new review
  static async create(userId, gameId, commentText, rating) {
    try {
      const query = 'INSERT INTO reviews (user_id, game_id, comment_text, rating) VALUES (?, ?, ?, ?)';
      const [result] = await pool.execute(query, [userId, gameId, commentText, rating]);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Get all reviews for a game
  static async getReviewsByGame(gameId) {
    try {
      const query = `
        SELECT r.id, r.user_id, r.comment_text, r.rating, r.created_at, u.username, u.profile_picture_thumbnail
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        WHERE r.game_id = ?
        ORDER BY r.created_at DESC
      `;
      const [rows] = await pool.execute(query, [gameId]);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Get all reviews by a user
  static async getReviewsByUser(userId) {
    try {
      const query = 'SELECT * FROM reviews WHERE user_id = ? ORDER BY created_at DESC';
      const [rows] = await pool.execute(query, [userId]);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Get single review by ID
  static async getReviewById(id) {
    try {
      const query = `
        SELECT r.*, u.username
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        WHERE r.id = ?
      `;
      const [rows] = await pool.execute(query, [id]);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Update review
  static async update(id, commentText, rating) {
    try {
      const query = 'UPDATE reviews SET comment_text = ?, rating = ? WHERE id = ?';
      const [result] = await pool.execute(query, [commentText, rating, id]);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Delete review
  static async delete(id) {
    try {
      const query = 'DELETE FROM reviews WHERE id = ?';
      const [result] = await pool.execute(query, [id]);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Get average rating for a game
  static async getAverageRating(gameId) {
    try {
      const query = 'SELECT AVG(rating) as average_rating, COUNT(*) as total_reviews FROM reviews WHERE game_id = ?';
      const [rows] = await pool.execute(query, [gameId]);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = ReviewModel;
