// Review Controller - Handle Review Requests
const ReviewService = require('../services/review.service');

class ReviewController {
  // Create review
  static async createReview(req, res) {
    try {
      const userId = req.userId;
      const { gameId, commentText, rating } = req.body;

      const result = await ReviewService.createReview(userId, gameId, commentText, rating);

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

  // Get reviews for a game
  static async getGameReviews(req, res) {
    try {
      const { gameId } = req.params;

      const result = await ReviewService.getGameReviews(gameId);

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

  // Update review
  static async updateReview(req, res) {
    try {
      const userId = req.userId;
      const { id } = req.params;
      const { commentText, rating } = req.body;

      const result = await ReviewService.updateReview(id, userId, commentText, rating);

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

  // Delete review
  static async deleteReview(req, res) {
    try {
      const userId = req.userId;
      const { id } = req.params;

      const result = await ReviewService.deleteReview(id, userId);

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

  // Get user reviews
  static async getUserReviews(req, res) {
    try {
      const userId = req.userId;

      const result = await ReviewService.getUserReviews(userId);

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

module.exports = ReviewController;
