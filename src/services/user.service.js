// User Service - Business Logic
const bcrypt = require('bcrypt');
const UserModel = require('../models/user.model');

class UserService {
  // Register new user
  static async register(username, email, password, confirmPassword, profilePicture = null, profilePictureThumbnail = null, profilePictureName = null, age = null, country = null) {
    try {
      // Validation
      if (!username || !email || !password) {
        throw new Error('All fields are required');
      }

      // Validate username format: only alphanumeric and underscore
      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!usernameRegex.test(username)) {
        throw new Error('Username can only contain letters, numbers and underscores (_)');
      }

      if (username.length < 3) {
        throw new Error('Username must be at least 3 characters long');
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Check if user already exists
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        throw new Error('Email already registered');
      }

      const existingUsername = await UserModel.findByUsername(username);
      if (existingUsername) {
        throw new Error('Username already taken');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const result = await UserModel.create(username, email, hashedPassword, profilePicture, profilePictureThumbnail, profilePictureName, age, country);
      return {
        id: result.insertId,
        username,
        email,
        message: 'User registered successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  // Login user
  static async login(email, password) {
    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      // Find user by email
      const user = await UserModel.findByEmail(email);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Compare passwords
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Return user data (without password)
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        message: 'Login successful'
      };
    } catch (error) {
      throw error;
    }
  }

  // Get user profile
  static async getUserProfile(userId) {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      throw error;
    }
  }

  // Get profile picture
  static async getProfilePicture(userId) {
    try {
      const profilePicture = await UserModel.getProfilePicture(userId);
      if (!profilePicture) {
        throw new Error('Profile picture not found');
      }
      return profilePicture;
    } catch (error) {
      throw error;
    }
  }

  // Get profile picture thumbnail
  static async getProfilePictureThumbnail(userId) {
    try {
      const thumbnail = await UserModel.getProfilePictureThumbnail(userId);
      if (!thumbnail) {
        throw new Error('Profile picture thumbnail not found');
      }
      return thumbnail;
    } catch (error) {
      throw error;
    }
  }

  // Update profile picture
  static async updateProfilePicture(userId, profilePicture, profilePictureThumbnail) {
    try {
      if (!userId || !profilePicture || !profilePictureThumbnail) {
        throw new Error('Missing required parameters for profile picture update');
      }

      const result = await UserModel.updateProfilePicture(userId, profilePicture, profilePictureThumbnail);
      
      if (result.affectedRows === 0) {
        throw new Error('Failed to update profile picture. User not found');
      }

      return {
        success: true,
        userId: userId,
        message: 'Profile picture updated successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  // Verify reset identity (email + username match)
  static async verifyResetIdentity(email, username) {
    try {
      if (!email || !username) {
        throw new Error('Email et nom d\'utilisateur sont requis');
      }

      const user = await UserModel.findByEmail(email);
      if (!user) {
        throw new Error('Aucun compte trouv\u00e9 avec cet email');
      }

      if (user.username.toLowerCase() !== username.toLowerCase()) {
        throw new Error('Le nom d\'utilisateur ne correspond pas \u00e0 cet email');
      }

      return { success: true, userId: user.id };
    } catch (error) {
      throw error;
    }
  }

  // Reset password
  static async resetPassword(email, username, newPassword) {
    try {
      if (!email || !username || !newPassword) {
        throw new Error('Tous les champs sont requis');
      }

      if (newPassword.length < 6) {
        throw new Error('Le mot de passe doit faire au moins 6 caract\u00e8res');
      }

      // Verify identity first
      const user = await UserModel.findByEmail(email);
      if (!user) {
        throw new Error('Aucun compte trouv\u00e9 avec cet email');
      }

      if (user.username.toLowerCase() !== username.toLowerCase()) {
        throw new Error('Le nom d\'utilisateur ne correspond pas');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      const result = await UserModel.updatePassword(user.id, hashedPassword);
      if (result.affectedRows === 0) {
        throw new Error('Erreur lors de la r\u00e9initialisation du mot de passe');
      }

      return {
        success: true,
        message: 'Mot de passe r\u00e9initialis\u00e9 avec succ\u00e8s'
      };
    } catch (error) {
      throw error;
    }
  }
  // Verify current password
  static async verifyPassword(userId, currentPassword) {
    try {
      if (!userId || !currentPassword) {
        throw new Error('User ID and password are required');
      }

      // Get user with password hash
      const pool = require('../config/db');
      const query = 'SELECT password FROM users WHERE id = ?';
      const [rows] = await pool.execute(query, [userId]);
      const user = rows[0];

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      return {
        success: true,
        message: 'Password verified successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  // Update user profile
  static async updateProfile(userId, username, age, country, password, profilePictureData, currentPassword = null) {
    try {
      // Get current user with password
      const userQuery = await UserModel.findById(userId);
      if (!userQuery) {
        throw new Error('User not found');
      }

      // If password change is requested, verify current password
      if (password && currentPassword) {
        // Get full user with password hash
        const pool = require('../config/db');
        const query = 'SELECT password FROM users WHERE id = ?';
        const [rows] = await pool.execute(query, [userId]);
        const user = rows[0];

        if (!user) {
          throw new Error('User not found');
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
          throw new Error('Current password is incorrect');
        }
      }

      // Validate username format: only alphanumeric and underscore
      if (username) {
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!usernameRegex.test(username)) {
          throw new Error('Username can only contain letters, numbers and underscores (_)');
        }

        if (username.length < 3) {
          throw new Error('Username must be at least 3 characters long');
        }

        // Check if username already taken (by another user)
        if (username !== userQuery.username) {
          const existingUsername = await UserModel.findByUsername(username);
          if (existingUsername) {
            throw new Error('Username already taken');
          }
        }
      }

      // Validate age: optional but must be valid if provided
      if (age && (age < 13 || age > 120)) {
        throw new Error('Age must be between 13 and 120');
      }

      // Update password if provided
      if (password) {
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await UserModel.updatePassword(userId, hashedPassword);
      }

      // Update profile information
      await UserModel.updateProfile(
        userId,
        username || userQuery.username,
        age || null,
        country || null,
        profilePictureData || null
      );

      // Get updated user data
      const updatedUser = await UserModel.findById(userId);

      return {
        id: updatedUser.id,
        username: updatedUser.username,
        message: 'Profile updated successfully'
      };
    } catch (error) {
      throw error;
    }
  }}

module.exports = UserService;
