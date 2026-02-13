// Favorite Controller - Handle Favorite Requests
const FavoriteService = require('../services/favorite.service');

class FavoriteController {
  // Add to favorites
  static async addFavorite(req, res) {
    try {
      const userId = req.userId;
      const { gameId, gameTitle } = req.body;

      if (!gameId) {
        return res.status(400).json({
          success: false,
          message: 'Game ID is required'
        });
      }

      const result = await FavoriteService.addFavorite(userId, gameId, gameTitle);

      res.status(201).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Remove from favorites
  static async removeFavorite(req, res) {
    try {
      const userId = req.userId;
      const { gameId } = req.body;

      if (!gameId) {
        return res.status(400).json({
          success: false,
          message: 'Game ID is required'
        });
      }

      const result = await FavoriteService.removeFavorite(userId, gameId);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get user favorites
  static async getUserFavorites(req, res) {
    try {
      const userId = req.userId;

      const result = await FavoriteService.getUserFavorites(userId);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Check if game is in favorites
  static async checkFavorite(req, res) {
    try {
      const userId = req.userId;
      const { gameId } = req.query;

      if (!gameId) {
        return res.status(400).json({
          success: false,
          message: 'Game ID is required'
        });
      }

      const result = await FavoriteService.checkIsFavorite(userId, gameId);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = FavoriteController;
