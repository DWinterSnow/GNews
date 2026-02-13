-- ============================================
-- GNews Database Schema
-- Create this in MySQL Workbench
-- ============================================

-- Create Database
CREATE DATABASE IF NOT EXISTS gnews_db;

-- ============================================
-- Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS gnews_db.users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_username (username)
);

-- ============================================
-- User Favorites Table
-- ============================================
CREATE TABLE IF NOT EXISTS gnews_db.user_favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  game_id VARCHAR(255) NOT NULL,
  game_title VARCHAR(255),
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES gnews_db.users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_game (user_id, game_id),
  INDEX idx_user_id (user_id),
  INDEX idx_game_id (game_id)
);

-- ============================================
-- Reviews Table
-- ============================================
CREATE TABLE IF NOT EXISTS gnews_db.reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  game_id VARCHAR(255) NOT NULL,
  comment_text TEXT NOT NULL,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES gnews_db.users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_game_id (game_id),
  INDEX idx_created_at (created_at)
);

-- ============================================
-- Sample Queries (for testing)
-- ============================================

-- View all users
-- SELECT * FROM users;

-- View all reviews for a game
-- SELECT r.id, r.comment_text, r.rating, r.created_at, u.username 
-- FROM reviews r
-- JOIN users u ON r.user_id = u.id
-- WHERE r.game_id = 'some_game_id'
-- ORDER BY r.created_at DESC;

-- View user favorites
-- SELECT * FROM user_favorites WHERE user_id = 1;

-- Get average rating for a game
-- SELECT AVG(rating) as average_rating, COUNT(*) as total_reviews 
-- FROM reviews WHERE game_id = 'some_game_id';
