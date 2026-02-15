-- =============================================
-- GNews Database - Schema Complet
-- FUSION DE TOUS LES FICHIERS SQL
-- Executer dans MySQL Workbench ou en CLI
-- =============================================

CREATE DATABASE IF NOT EXISTS gnews_db;
USE gnews_db;

-- ============================================
-- Table des utilisateurs (avec photos de profil)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  age INT DEFAULT NULL,
  country VARCHAR(100) DEFAULT NULL,
  profile_picture LONGBLOB DEFAULT NULL,
  profile_picture_thumbnail LONGBLOB DEFAULT NULL,
  profile_picture_name VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_username (username)
);

-- ============================================
-- Table des favoris (jeux suivis)
-- ============================================
CREATE TABLE IF NOT EXISTS user_favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  game_id VARCHAR(255) NOT NULL,
  game_title VARCHAR(255),
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_game (user_id, game_id),
  INDEX idx_user_id (user_id),
  INDEX idx_game_id (game_id)
);

-- ============================================
-- Table des avis / reviews
-- ============================================
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  game_id VARCHAR(255) NOT NULL,
  comment_text TEXT NOT NULL,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_review (user_id, game_id),
  INDEX idx_user_id (user_id),
  INDEX idx_game_id (game_id),
  INDEX idx_created_at (created_at)
);

-- ============================================
-- [MERGED from add_profile_picture.sql]
-- Profile Picture Support
-- ============================================
-- ALTER TABLE gnews_db.users ADD COLUMN profile_picture LONGBLOB;
-- ALTER TABLE gnews_db.users ADD COLUMN profile_picture_name VARCHAR(255);
-- NOTE: These columns are already included in the CREATE TABLE above

-- ============================================
-- [MERGED from add_thumbnail.sql]
-- Profile Picture Thumbnail Support
-- ============================================
-- ALTER TABLE gnews_db.users ADD COLUMN profile_picture_thumbnail LONGBLOB;
-- NOTE: This column is already included in the CREATE TABLE above

-- ============================================
-- DATABASE VERIFICATION QUERIES
-- ============================================
-- Verify the tables were created:
-- SHOW TABLES;
-- 
-- Verify the users table columns:
-- DESCRIBE users;
--
-- Verify the user_favorites table:
-- DESCRIBE user_favorites;
--
-- Verify the reviews table:
-- DESCRIBE reviews;
