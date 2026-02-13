// User Controller - Handle User Requests
const UserService = require('../services/user.service');
const ImageProcessor = require('../utils/imageProcessor');

class UserController {
  // Register
  static async register(req, res) {
    try {
      const { username, email, password, confirmPassword, profilePictureData, profilePictureName } = req.body;

      // Convert base64 to buffer and process image if provided
      let profilePictureBuffer = null;
      let profilePictureThumbnail = null;

      if (profilePictureData) {
        try {
          // Extract base64 data after comma (data:image/webp;base64,...) if present
          const base64String = profilePictureData.includes(',') 
            ? profilePictureData.split(',')[1] 
            : profilePictureData;
          const buffer = Buffer.from(base64String, 'base64');

          // Process image: validate, optimize, and convert to WebP (500x500 and 100x100 thumbnail)
          const processedImages = await ImageProcessor.processProfilePicture(buffer);
          profilePictureBuffer = processedImages.fullSize;
          profilePictureThumbnail = processedImages.thumbnail;

          console.log(
            `✓ Profile picture uploaded successfully\n` +
            `  Format: ${processedImages.format}\n` +
            `  Full-size: ${processedImages.dimensions.fullSize} (${processedImages.fullSizeKB}KB)\n` +
            `  Thumbnail: ${processedImages.dimensions.thumbnail} (${processedImages.thumbnailKB}KB)`
          );
        } catch (imageError) {
          console.error('❌ Image processing error:', imageError.message);
          return res.status(400).json({
            success: false,
            message: `Image processing failed: ${imageError.message}`
          });
        }
      }

      const result = await UserService.register(
        username, 
        email, 
        password, 
        confirmPassword,
        profilePictureBuffer,
        profilePictureThumbnail,
        profilePictureName
      );

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Login
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      const user = await UserService.login(email, password);

      // Store user in session
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.email = user.email;

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }

  // Logout
  static async logout(req, res) {
    try {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Logout failed'
          });
        }
        res.status(200).json({
          success: true,
          message: 'Logout successful'
        });
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get current user
  static async getCurrentUser(req, res) {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({
          success: false,
          message: 'Not logged in'
        });
      }

      const user = await UserService.getUserProfile(req.session.userId);

      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get user profile
  static async getUserProfile(req, res) {
    try {
      const userId = req.params.id;
      const user = await UserService.getUserProfile(userId);

      res.status(200).json({
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

  // Check if user is logged in
  static async checkAuthStatus(req, res) {
    try {
      if (req.session && req.session.userId) {
        res.status(200).json({
          success: true,
          isLoggedIn: true,
          user: {
            id: req.session.userId,
            username: req.session.username,
            email: req.session.email
          }
        });
      } else {
        res.status(200).json({
          success: true,
          isLoggedIn: false
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get profile picture
  static async getProfilePicture(req, res) {
    try {
      const userId = req.params.id;
      const profilePicture = await UserService.getProfilePicture(userId);

      if (!profilePicture) {
        return res.status(404).json({
          success: false,
          message: 'No profile picture found'
        });
      }

      // Set response headers for WebP image
      res.setHeader('Content-Type', 'image/webp');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      
      // Send buffer as image
      res.send(profilePicture);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get user profile picture thumbnail (for header display)
  static async getProfilePictureThumbnail(req, res) {
    try {
      const userId = req.params.id;
      const thumbnail = await UserService.getProfilePictureThumbnail(userId);

      if (!thumbnail) {
        return res.status(404).json({
          success: false,
          message: 'No profile picture thumbnail found'
        });
      }

      // Set response headers for WebP image
      res.setHeader('Content-Type', 'image/webp');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      
      // Send buffer as image
      res.send(thumbnail);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Upload/Update profile picture (authenticated users only)
  static async uploadProfilePicture(req, res) {
    try {
      // Ensure user is logged in
      if (!req.session || !req.session.userId) {
        return res.status(401).json({
          success: false,
          message: 'Not logged in. Please login first'
        });
      }

      const { profilePictureData } = req.body;

      if (!profilePictureData) {
        return res.status(400).json({
          success: false,
          message: 'No image provided'
        });
      }

      try {
        // Extract base64 data after comma (data:image/webp;base64,...) if present
        const base64String = profilePictureData.includes(',') 
          ? profilePictureData.split(',')[1] 
          : profilePictureData;
        const buffer = Buffer.from(base64String, 'base64');

        // Process image: validate, optimize, and convert to WebP
        const processedImages = await ImageProcessor.processProfilePicture(buffer);

        // Update user's profile picture in database
        const result = await UserService.updateProfilePicture(
          req.session.userId,
          processedImages.fullSize,
          processedImages.thumbnail
        );

        console.log(
          `✓ Profile picture updated for user ${req.session.userId}\n` +
          `  Full-size: ${processedImages.dimensions.fullSize} (${processedImages.fullSizeKB}KB)\n` +
          `  Thumbnail: ${processedImages.dimensions.thumbnail} (${processedImages.thumbnailKB}KB)`
        );

        res.status(200).json({
          success: true,
          message: 'Profile picture uploaded successfully',
          data: {
            userId: req.session.userId,
            format: processedImages.format,
            dimensions: processedImages.dimensions,
            fullSizeKB: processedImages.fullSizeKB,
            thumbnailKB: processedImages.thumbnailKB
          }
        });
      } catch (imageError) {
        console.error('❌ Image processing error:', imageError.message);
        return res.status(400).json({
          success: false,
          message: `Image processing failed: ${imageError.message}`
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

}

module.exports = UserController;
