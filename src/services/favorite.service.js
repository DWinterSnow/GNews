// Favorite Service - Business Logic for Favorites
const FavoriteModel = require('../models/favorite.model');

class FavoriteService {
  // Add game to favorites
  static async addFavorite(userId, gameId, gameTitle) {
    try {
      if (!userId || !gameId) {
        throw new Error('User ID and Game ID are required');
      }

      // Check if already favorited
      const isFav = await FavoriteModel.isFavorite(userId, gameId);
      if (isFav) {
        throw new Error('Game already in favorites');
      }

      const result = await FavoriteModel.addFavorite(userId, gameId, gameTitle);
      return {
        message: 'Game added to favorites',
        favoriteId: result.insertId
      };
    } catch (error) {
      throw error;
    }
  }

  // Remove game from favorites
  static async removeFavorite(userId, gameId) {
    try {
      if (!userId || !gameId) {
        throw new Error('User ID and Game ID are required');
      }

      // Check if game is in favorites
      const isFav = await FavoriteModel.isFavorite(userId, gameId);
      if (!isFav) {
        throw new Error('Game not in favorites');
      }

      await FavoriteModel.removeFavorite(userId, gameId);
      return {
        message: 'Game removed from favorites'
      };
    } catch (error) {
      throw error;
    }
  }

  // Get user's favorites
  static async getUserFavorites(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const favorites = await FavoriteModel.getFavoritesByUser(userId);
      return {
        count: favorites.length,
        favorites
      };
    } catch (error) {
      throw error;
    }
  }

  // Check if game is favorited by user
  static async checkIsFavorite(userId, gameId) {
    try {
      const isFav = await FavoriteModel.isFavorite(userId, gameId);
      return { isFavorite: isFav };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = FavoriteService;
