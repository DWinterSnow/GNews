// Favorite Model - Database Queries for User Favorites
const pool = require('../config/db');

class FavoriteModel {
  // Add game to favorites
  static async addFavorite(userId, gameId, gameTitle) {
    try {
      const query = 'INSERT INTO user_favorites (user_id, game_id, game_title) VALUES (?, ?, ?)';
      const [result] = await pool.execute(query, [userId, gameId, gameTitle]);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Remove game from favorites
  static async removeFavorite(userId, gameId) {
    try {
      const query = 'DELETE FROM user_favorites WHERE user_id = ? AND game_id = ?';
      const [result] = await pool.execute(query, [userId, gameId]);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Get all favorites for a user
  static async getFavoritesByUser(userId) {
    try {
      const query = 'SELECT * FROM user_favorites WHERE user_id = ? ORDER BY added_at DESC';
      const [rows] = await pool.execute(query, [userId]);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Check if game is in user's favorites
  static async isFavorite(userId, gameId) {
    try {
      const query = 'SELECT id FROM user_favorites WHERE user_id = ? AND game_id = ?';
      const [rows] = await pool.execute(query, [userId, gameId]);
      return rows.length > 0;
    } catch (error) {
      throw error;
    }
  }

  // Get all users who favorited a game
  static async getFavoritersByGame(gameId) {
    try {
      const query = `
        SELECT u.id, u.username FROM user_favorites uf
        JOIN users u ON uf.user_id = u.id
        WHERE uf.game_id = ?
      `;
      const [rows] = await pool.execute(query, [gameId]);
      return rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = FavoriteModel;
