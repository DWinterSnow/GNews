// Authentication Middleware
// Checks if user is logged in

const authMiddleware = (req, res, next) => {
  try {
    // Check if user is in session
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - Please log in first',
        requiresLogin: true
      });
    }

    // Attach user info to request
    req.userId = req.session.userId;
    req.username = req.session.username;

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: error.message
    });
  }
};

// Optional middleware - doesn't throw error if not logged in
const optionalAuthMiddleware = (req, res, next) => {
  try {
    if (req.session && req.session.userId) {
      req.userId = req.session.userId;
      req.username = req.session.username;
      req.isAuthenticated = true;
    } else {
      req.isAuthenticated = false;
    }
    next();
  } catch (error) {
    req.isAuthenticated = false;
    next();
  }
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware
};
