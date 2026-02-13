// Review Service - Business Logic for Reviews
const ReviewModel = require('../models/review.model');

class ReviewService {
  // Create review
  static async createReview(userId, gameId, commentText, rating) {
    try {
      // Validation
      if (!userId || !gameId || !commentText) {
        throw new Error('User ID, Game ID, and comment are required');
      }

      if (!rating || rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      if (commentText.trim().length < 5) {
        throw new Error('Comment must be at least 5 characters long');
      }

      const result = await ReviewModel.create(userId, gameId, commentText, rating);
      return {
        message: 'Review created successfully',
        reviewId: result.insertId
      };
    } catch (error) {
      throw error;
    }
  }

  // Get reviews for a game
  static async getGameReviews(gameId) {
    try {
      if (!gameId) {
        throw new Error('Game ID is required');
      }

      const reviews = await ReviewModel.getReviewsByGame(gameId);
      const stats = await ReviewModel.getAverageRating(gameId);

      return {
        count: reviews.length,
        averageRating: stats.average_rating ? parseFloat(stats.average_rating).toFixed(1) : 0,
        totalReviews: stats.total_reviews || 0,
        reviews
      };
    } catch (error) {
      throw error;
    }
  }

  // Update review
  static async updateReview(reviewId, userId, commentText, rating) {
    try {
      // Validation
      if (!reviewId || !commentText) {
        throw new Error('Review ID and comment are required');
      }

      if (!rating || rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      // Get review to verify ownership
      const review = await ReviewModel.getReviewById(reviewId);
      if (!review) {
        throw new Error('Review not found');
      }

      if (review.user_id !== userId) {
        throw new Error('You can only edit your own reviews');
      }

      await ReviewModel.update(reviewId, commentText, rating);
      return { message: 'Review updated successfully' };
    } catch (error) {
      throw error;
    }
  }

  // Delete review
  static async deleteReview(reviewId, userId) {
    try {
      if (!reviewId) {
        throw new Error('Review ID is required');
      }

      // Get review to verify ownership
      const review = await ReviewModel.getReviewById(reviewId);
      if (!review) {
        throw new Error('Review not found');
      }

      if (review.user_id !== userId) {
        throw new Error('You can only delete your own reviews');
      }

      await ReviewModel.delete(reviewId);
      return { message: 'Review deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  // Get user reviews
  static async getUserReviews(userId) {
    try {
      const reviews = await ReviewModel.getReviewsByUser(userId);
      return {
        count: reviews.length,
        reviews
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = ReviewService;
