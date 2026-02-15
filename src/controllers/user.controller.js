// User Controller - Handles HTTP requests and responses
const UserService = require('../services/user.service');

class UserController {
  // Register new user
  static async register(req, res) {
    try {
      const { username, email, password, confirmPassword, profilePictureData, profilePictureName, age, country } = req.body;

      let profilePicture = null;
      let profilePictureThumbnail = null;

      // Process profile picture if provided
      if (profilePictureData) {
        profilePicture = profilePictureData;
        profilePictureThumbnail = profilePictureData; // Use same data as thumbnail
      }

      const result = await UserService.register(
        username, email, password, confirmPassword,
        profilePicture, profilePictureThumbnail, profilePictureName,
        age || null, country || null
      );

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Login user
  static async login(req, res) {
    try {
      const { email, password } = req.body;
      const result = await UserService.login(email, password);

      // Store user info in session
      req.session.userId = result.id;
      req.session.username = result.username;

      res.json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }

  // Check auth status
  static async checkAuthStatus(req, res) {
    try {
      if (req.session && req.session.userId) {
        // Get complete user data from database
        const user = await UserService.getUserProfile(req.session.userId);
        res.json({
          isLoggedIn: true,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            age: user.age,
            country: user.country,
            profilePictureName: user.profile_picture_name
          }
        });
      } else {
        res.json({
          isLoggedIn: false,
          user: null
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Logout user
  static async logout(req, res) {
    try {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Error logging out'
          });
        }
        res.json({
          success: true,
          message: 'Logged out successfully'
        });
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get current user profile
  static async getCurrentUser(req, res) {
    try {
      const user = await UserService.getUserProfile(req.userId);
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get user profile by ID
  static async getUserProfile(req, res) {
    try {
      const user = await UserService.getUserProfile(req.params.id);
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get profile picture
  static async getProfilePicture(req, res) {
    try {
      let profilePicture = await UserService.getProfilePicture(req.params.id);

      // Convert Buffer to string if needed (LONGBLOB returns Buffer)
      if (Buffer.isBuffer(profilePicture)) {
        profilePicture = profilePicture.toString('utf8');
      }

      if (profilePicture && profilePicture.startsWith('data:image')) {
        // Base64 image - extract and send as image
        const matches = profilePicture.match(/^data:image\/(\w+);base64,(.+)$/);
        if (matches) {
          const imageBuffer = Buffer.from(matches[2], 'base64');
          res.set('Content-Type', `image/${matches[1]}`);
          res.set('Cache-Control', 'public, max-age=3600');
          res.send(imageBuffer);
          return;
        }
      }

      res.status(404).json({
        success: false,
        message: 'Profile picture not found'
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  // Upload profile picture
  static async uploadProfilePicture(req, res) {
    try {
      const { profilePictureData } = req.body;

      if (!profilePictureData) {
        return res.status(400).json({
          success: false,
          message: 'No profile picture data provided'
        });
      }

      const result = await UserService.updateProfilePicture(
        req.userId,
        profilePictureData,
        profilePictureData // Use same as thumbnail
      );

      res.json({
        success: true,
        message: 'Profile picture updated',
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Verify reset identity (email + username)
  static async verifyResetIdentity(req, res) {
    try {
      const { email, username } = req.body;
      const result = await UserService.verifyResetIdentity(email, username);

      res.json({
        success: true,
        message: 'Identity verified'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Reset password
  static async resetPassword(req, res) {
    try {
      const { email, username, newPassword } = req.body;
      const result = await UserService.resetPassword(email, username, newPassword);

      res.json({
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

  // Verify current password
  static async verifyPassword(req, res) {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
      }

      const { currentPassword } = req.body;

      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required'
        });
      }

      const result = await UserService.verifyPassword(userId, currentPassword);

      res.json({
        success: true,
        message: 'Password verified successfully'
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }

  // Update user profile
  static async updateProfile(req, res) {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
      }

      const { username, age, country, password, currentPassword, profilePictureData } = req.body;

      const result = await UserService.updateProfile(
        userId,
        username,
        age,
        country,
        password,
        profilePictureData,
        currentPassword
      );

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = UserController;
