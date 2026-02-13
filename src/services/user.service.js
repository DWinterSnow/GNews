// User Service - Business Logic
const bcrypt = require('bcrypt');
const UserModel = require('../models/user.model');

class UserService {
  // Register new user
  static async register(username, email, password, confirmPassword, profilePicture = null, profilePictureThumbnail = null, profilePictureName = null) {
    try {
      // Validation
      if (!username || !email || !password) {
        throw new Error('All fields are required');
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      if (username.length < 3) {
        throw new Error('Username must be at least 3 characters long');
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
      const result = await UserModel.create(username, email, hashedPassword, profilePicture, profilePictureThumbnail, profilePictureName);
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
}

module.exports = UserService;
