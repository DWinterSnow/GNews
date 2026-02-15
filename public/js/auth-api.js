// Example Frontend Code for Users & Favorites System
// Add this to your js/ folder and use in HTML files

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

// Check if user is logged in
async function checkAuthStatus() {
  try {
    const response = await fetch('/api/users/auth-status', { credentials: 'same-origin' });
    const data = await response.json();
    
    if (data.isLoggedIn) {
      console.log('User logged in:', data.user.username);
      return {
        isLoggedIn: true,
        user: data.user
      };
    } else {
      console.log('User not logged in');
      return {
        isLoggedIn: false,
        user: null
      };
    }
  } catch (error) {
    console.error('Error checking auth status:', error);
    return { isLoggedIn: false, user: null };
  }
}

// Register new user
async function registerUser(username, email, password, confirmPassword, profilePictureData = null, profilePictureName = null, age = null, country = null) {
  try {
    const payload = {
      username,
      email,
      password,
      confirmPassword
    };

    // Add profile picture if provided
    if (profilePictureData) {
      payload.profilePictureData = profilePictureData;
      payload.profilePictureName = profilePictureName;
    }

    // Add optional fields
    if (age) payload.age = parseInt(age);
    if (country) payload.country = country;

    const response = await fetch('/api/users/register', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Registration successful!', data.data);
      return { success: true, data: data.data };
    } else {
      console.log('Registration failed:', data.message);
      return { success: false, message: data.message };
    }
  } catch (error) {
    console.error('Error registering:', error);
    return { success: false, message: error.message };
  }
}

// Login user
async function loginUser(email, password) {
  try {
    const response = await fetch('/api/users/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Login successful! Welcome', data.data.username);
      return { success: true, user: data.data };
    } else {
      console.log('Login failed:', data.message);
      return { success: false, message: data.message };
    }
  } catch (error) {
    console.error('Error logging in:', error);
    return { success: false, message: error.message };
  }
}

// Logout user
async function logoutUser() {
  try {
    const response = await fetch('/api/users/logout', {
      method: 'POST',
      credentials: 'same-origin'
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Logout successful');
      return { success: true };
    } else {
      console.log('Logout failed');
      return { success: false };
    }
  } catch (error) {
    console.error('Error logging out:', error);
    return { success: false };
  }
}

// ============================================
// FORGOT PASSWORD FUNCTIONS
// ============================================

// Verify that email + username match
async function verifyResetIdentity(email, username) {
  try {
    const response = await fetch('/api/users/verify-reset-identity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username })
    });
    
    const data = await response.json();
    
    if (data.success) {
      return { success: true };
    } else {
      return { success: false, message: data.message };
    }
  } catch (error) {
    console.error('Error verifying identity:', error);
    return { success: false, message: error.message };
  }
}

// Reset password
async function resetUserPassword(email, username, newPassword) {
  try {
    const response = await fetch('/api/users/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, newPassword })
    });
    
    const data = await response.json();
    
    if (data.success) {
      return { success: true };
    } else {
      return { success: false, message: data.message };
    }
  } catch (error) {
    console.error('Error resetting password:', error);
    return { success: false, message: error.message };
  }
}

// ============================================
// FAVORITES FUNCTIONS (Requires Login)
// ============================================

// Add game to favorites
async function addToFavorites(gameId, gameTitle) {
  try {
    const response = await fetch('/api/users/favorites/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: String(gameId),
        gameTitle: gameTitle
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Added to favorites:', gameTitle);
      return { success: true, message: 'Added to favorites' };
    } else {
      console.log('Error:', data.message);
      return { success: false, message: data.message };
    }
  } catch (error) {
    console.error('Error adding to favorites:', error);
    return { success: false, message: error.message };
  }
}

// Remove game from favorites
async function removeFromFavorites(gameId) {
  try {
    const response = await fetch('/api/users/favorites/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: String(gameId)
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Removed from favorites');
      return { success: true, message: 'Removed from favorites' };
    } else {
      console.log('Error:', data.message);
      return { success: false, message: data.message };
    }
  } catch (error) {
    console.error('Error removing from favorites:', error);
    return { success: false, message: error.message };
  }
}

// Check if game is in favorites
async function isFavorite(gameId) {
  try {
    const response = await fetch(`/api/users/favorites/check?gameId=${gameId}`);
    const data = await response.json();
    
    if (data.success) {
      return data.data.isFavorite;
    }
    return false;
  } catch (error) {
    console.error('Error checking favorite:', error);
    return false;
  }
}

// Get user's favorites
async function getUserFavorites() {
  try {
    const response = await fetch('/api/users/favorites');
    const data = await response.json();
    
    if (data.success) {
      console.log('Favorites:', data.data.favorites);
      return { success: true, favorites: data.data.favorites };
    } else {
      console.log('Error:', data.message);
      return { success: false, message: data.message };
    }
  } catch (error) {
    console.error('Error getting favorites:', error);
    return { success: false, message: error.message };
  }
}

// ============================================
// REVIEW FUNCTIONS (Requires Login)
// ============================================

// Post a review
async function postReview(gameId, commentText, rating) {
  try {
    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return { success: false, message: 'Rating must be 1-5' };
    }
    
    // Validate comment
    if (!commentText || commentText.trim().length < 5) {
      return { success: false, message: 'Comment must be at least 5 characters' };
    }
    
    const response = await fetch('/api/users/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: String(gameId),
        commentText: commentText.trim(),
        rating: parseInt(rating)
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Review posted!');
      return { success: true, message: 'Review posted successfully' };
    } else {
      console.log('Error:', data.message);
      return { success: false, message: data.message };
    }
  } catch (error) {
    console.error('Error posting review:', error);
    return { success: false, message: error.message };
  }
}

// Get reviews for a game
async function getGameReviews(gameId) {
  try {
    const response = await fetch(`/api/users/reviews/${gameId}`);
    const data = await response.json();
    
    if (data.success) {
      console.log(`Found ${data.data.count} reviews`);
      return {
        success: true,
        reviews: data.data.reviews,
        averageRating: data.data.averageRating,
        totalReviews: data.data.totalReviews
      };
    } else {
      console.log('Error:', data.message);
      return { success: false, message: data.message };
    }
  } catch (error) {
    console.error('Error getting reviews:', error);
    return { success: false, message: error.message };
  }
}

// Update a review
async function updateReview(reviewId, commentText, rating) {
  try {
    const response = await fetch(`/api/users/reviews/${reviewId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commentText: commentText.trim(),
        rating: parseInt(rating)
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Review updated!');
      return { success: true, message: 'Review updated successfully' };
    } else {
      console.log('Error:', data.message);
      return { success: false, message: data.message };
    }
  } catch (error) {
    console.error('Error updating review:', error);
    return { success: false, message: error.message };
  }
}

// Delete a review
async function deleteReview(reviewId) {
  try {
    const response = await fetch(`/api/users/reviews/${reviewId}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Review deleted!');
      return { success: true, message: 'Review deleted successfully' };
    } else {
      console.log('Error:', data.message);
      return { success: false, message: data.message };
    }
  } catch (error) {
    console.error('Error deleting review:', error);
    return { success: false, message: error.message };
  }
}

// ============================================
// UI HELPER FUNCTIONS
// ============================================

// Update UI based on login status
async function updateUIBasedOnLogin() {
  const auth = await checkAuthStatus();
  
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const userMenu = document.getElementById('user-menu');
  const username = document.getElementById('username-display');
  
  if (auth.isLoggedIn) {
    // User is logged in
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'block';
    if (userMenu) userMenu.style.display = 'block';
    if (username) username.textContent = auth.user.username;
    
    // Show follow/review buttons
    const followButtons = document.querySelectorAll('.follow-btn');
    followButtons.forEach(btn => btn.style.display = 'block');
  } else {
    // User is not logged in
    if (loginBtn) loginBtn.style.display = 'block';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (userMenu) userMenu.style.display = 'none';
    
    // Hide follow/review buttons
    const followButtons = document.querySelectorAll('.follow-btn');
    followButtons.forEach(btn => btn.style.display = 'none');
  }
}

// ============================================
// USAGE EXAMPLES IN HTML
// ============================================

/*

// In jeux.html - Add to game card:
<div class="game-card">
  <h3>Elden Ring</h3>
  <button class="follow-btn" onclick="addToFavorites(1234, 'Elden Ring')">
    Add to Favorites
  </button>
</div>

// In game-details.html - Add to page:
<div class="reviews-section">
  <h2>Reviews</h2>
  
  <form id="review-form">
    <textarea id="comment" placeholder="Share your thoughts..." required></textarea>
    <select id="rating" required>
      <option>1 - Bad</option>
      <option>2 - OK</option>
      <option>3 - Good</option>
      <option selected>4 - Great</option>
      <option>5 - Excellent</option>
    </select>
    <button type="submit">Post Review</button>
  </form>
  
  <div id="reviews-list"></div>
</div>

// JavaScript in game-details.js:
document.addEventListener('DOMContentLoaded', async () => {
  // Check login status
  await updateUIBasedOnLogin();
  
  // Load reviews
  const gameId = new URLSearchParams(window.location.search).get('id');
  const reviewsData = await getGameReviews(gameId);
  
// ============================================
// PROFILE PICTURE FUNCTIONS
// ============================================

// Get profile picture URL for a user
function getProfilePictureURL(userId) {
  return `/api/users/profile-picture/${userId}`;
}

// Update profile picture display
async function displayProfilePicture(userId, imgElement) {
  try {
    imgElement.src = getProfilePictureURL(userId);
    imgElement.onerror = () => {
      // Fallback to default avatar if image fails to load
      imgElement.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23fcc419"/%3E%3Ccircle cx="50" cy="30" r="15" fill="%231a1a2e"/%3E%3Cpath d="M 20 60 Q 50 50 80 60" fill="%231a1a2e"/%3E%3C/svg%3E';
    };
  } catch (error) {
    console.error('Error loading profile picture:', error);
  }
}

// ============================================
// UI UPDATE FUNCTIONS
// ============================================

  if (reviewsData.success) {
    const reviewsList = document.getElementById('reviews-list');
    reviewsData.reviews.forEach(review => {
      const reviewEl = document.createElement('div');
      reviewEl.className = 'review';
      reviewEl.innerHTML = `
        <h4>${review.username}</h4>
        <p>Rating: ${'*'.repeat(review.rating)}</p>
        <p>${review.comment_text}</p>
        <small>${new Date(review.created_at).toLocaleDateString()}</small>
      `;
      reviewsList.appendChild(reviewEl);
    });
  }
  
  // Handle review form submission
  document.getElementById('review-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const result = await postReview(
      gameId,
      document.getElementById('comment').value,
      document.getElementById('rating').value
    );
    if (result.success) {
      alert('Review posted!');
      document.getElementById('review-form').reset();
      location.reload(); // Reload to show new review
    } else {
      alert('Error: ' + result.message);
    }
  });
});

*/
