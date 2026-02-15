// User Routes
const express = require('express');
const router = express.Router();
const UserController = require('../controllers/user.controller');
const FavoriteController = require('../controllers/favorite.controller');
const ReviewController = require('../controllers/review.controller');
const { authMiddleware, optionalAuthMiddleware } = require('../middlewares/auth');

// ============ USER ROUTES ============

// Public routes
router.post('/register', UserController.register);
router.post('/login', UserController.login);
router.get('/auth-status', UserController.checkAuthStatus);
router.post('/verify-reset-identity', UserController.verifyResetIdentity);
router.post('/reset-password', UserController.resetPassword);

// Protected routes
router.post('/logout', authMiddleware, UserController.logout);
router.get('/profile', authMiddleware, UserController.getCurrentUser);
router.get('/profile/:id', UserController.getUserProfile);
router.get('/profile-picture/:id', UserController.getProfilePicture);
router.post('/upload-profile-picture', authMiddleware, UserController.uploadProfilePicture);

// ============ FAVORITE ROUTES ============

// Protected - Only logged in users can manage favorites
router.post('/favorites/add', authMiddleware, FavoriteController.addFavorite);
router.post('/favorites/remove', authMiddleware, FavoriteController.removeFavorite);
router.get('/favorites', authMiddleware, FavoriteController.getUserFavorites);
router.get('/favorites/check', authMiddleware, FavoriteController.checkFavorite);

// ============ REVIEW ROUTES ============

// Public - Everyone can read reviews
router.get('/reviews/:gameId', optionalAuthMiddleware, ReviewController.getGameReviews);

// Protected - Only logged in users can create reviews
router.post('/reviews', authMiddleware, ReviewController.createReview);
router.get('/reviews/user', authMiddleware, ReviewController.getUserReviews);

// Protected - Users can only edit/delete their own reviews
router.put('/reviews/:id', authMiddleware, ReviewController.updateReview);
router.delete('/reviews/:id', authMiddleware, ReviewController.deleteReview);

module.exports = router;
