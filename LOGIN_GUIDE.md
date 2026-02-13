# Login & Registration System Guide

## Overview

The authentication system is now complete with:
- ✅ MySQL database with user profiles and profile pictures
- ✅ Backend API for registration, login, and session management
- ✅ Frontend login/register page with profile picture upload
- ✅ Password hashing with bcrypt
- ✅ Session-based authentication
- ✅ Profile picture storage and retrieval

---

## File Structure

```
project/
├── public/
│   ├── login.html              ← Login/Register page
│   ├── js/
│   │   ├── auth-api.js         ← API wrapper functions
│   │   └── login.js            ← Handle login/register logic
│   ├── css/
│   │   └── (existing styles)
│   └── (existing pages)
└── src/
    ├── controllers/
    │   └── user.controller.js  ← Updated with profile picture handler
    ├── services/
    │   └── user.service.js     ← Updated with profile picture service
    ├── models/
    │   └── user.model.js       ← Database queries with profile picture support
    ├── routes/
    │   └── user.routes.js      ← Updated with profile picture route
    └── config/
        └── db.js               ← MySQL connection
```

---

## Quick Start

### 1. Access the Login Page

Navigate to: `http://localhost:3000/login.html`

You'll see:
- **Login Tab**: Email + Password
- **Register Tab**: Username + Email + Password + Profile Picture

### 2. Registration Flow

```
1. Click "S'inscrire" (Register)
2. Fill in:
   - Username (min 3 characters)
   - Email (must be valid)
   - Password (min 6 characters)
   - Profile Picture (optional, max 5MB)
3. Click "Créer mon compte"
4. Auto-login and redirect to index.html
```

### 3. Login Flow

```
1. Click "Connexion" (Login)
2. Enter email and password
3. Click "Se connecter"
4. Session established, redirect to index.html
```

---

## API Endpoints

### Authentication

**Register User** (PUBLIC)
```
POST /api/users/register
Content-Type: application/json

{
  "username": "gamer123",
  "email": "gamer@example.com",
  "password": "password123",
  "confirmPassword": "password123",
  "profilePictureData": "data:image/jpeg;base64,...",  // Optional, base64 encoded
  "profilePictureName": "avatar.jpg"                    // Optional
}

Response:
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": 1,
    "username": "gamer123",
    "email": "gamer@example.com",
    "message": "User registered successfully"
  }
}
```

**Login User** (PUBLIC)
```
POST /api/users/login
Content-Type: application/json

{
  "email": "gamer@example.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "id": 1,
    "username": "gamer123",
    "email": "gamer@example.com"
  }
}
```

**Check Auth Status** (PUBLIC)
```
GET /api/users/auth-status

Response if logged in:
{
  "success": true,
  "isLoggedIn": true,
  "user": {
    "id": 1,
    "username": "gamer123",
    "email": "gamer@example.com"
  }
}

Response if not logged in:
{
  "success": true,
  "isLoggedIn": false
}
```

**Logout** (PROTECTED)
```
POST /api/users/logout

Response:
{
  "success": true,
  "message": "Logout successful"
}
```

### Profile

**Get Current User Profile** (PROTECTED)
```
GET /api/users/profile

Response:
{
  "success": true,
  "data": {
    "id": 1,
    "username": "gamer123",
    "email": "gamer@example.com",
    "profile_picture_name": "avatar.jpg",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

**Get Any User Profile** (PUBLIC)
```
GET /api/users/profile/:id

Response:
{
  "success": true,
  "data": {
    "id": 1,
    "username": "gamer123",
    "email": "gamer@example.com",
    "profile_picture_name": "avatar.jpg",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

**Get Profile Picture** (PUBLIC)
```
GET /api/users/profile-picture/:id

Response: Binary image data (JPEG/PNG)

Usage in HTML:
<img src="/api/users/profile-picture/1" alt="User Avatar" style="width: 50px; border-radius: 50%;">
```

---

## Frontend Integration

### 1. Add Login Button to Navigation

Update [Index.html](Index.html) header:

```html
<nav>
  <a href="index.html">🏠 Accueil</a>
  <a href="actu.html">📰 Actualités</a>
  <a href="jeux.html">🎮 Jeux</a>
  
  <!-- Auth Section -->
  <div id="auth-section">
    <span id="user-greeting" style="display: none;">
      👤 <strong id="username"></strong>
    </span>
    <a href="login.html" id="login-link">🔓 Connexion</a>
    <button id="logout-btn" style="display: none;" onclick="handleLogout()">🔓 Déconnexion</button>
  </div>
</nav>
```

### 2. Update Navigation Script

Add to [Index.html](Index.html) in `<script>` tag:

```javascript
// Initialize auth on page load
document.addEventListener('DOMContentLoaded', async () => {
  const auth = await checkAuthStatus();
  updateAuthUI(auth);
});

async function updateAuthUI(auth) {
  const loginLink = document.getElementById('login-link');
  const logoutBtn = document.getElementById('logout-btn');
  const userGreeting = document.getElementById('user-greeting');
  const username = document.getElementById('username');

  if (auth.isLoggedIn) {
    loginLink.style.display = 'none';
    logoutBtn.style.display = 'inline';
    userGreeting.style.display = 'inline';
    username.textContent = auth.user.username;

    // Display profile picture if exists
    if (auth.user.id) {
      const img = document.createElement('img');
      img.src = `/api/users/profile-picture/${auth.user.id}`;
      img.style.cssText = 'width: 30px; height: 30px; border-radius: 50%; margin-right: 5px; vertical-align: middle;';
      img.onerror = () => img.style.display = 'none';
      userGreeting.insertBefore(img, userGreeting.firstChild);
    }
  } else {
    loginLink.style.display = 'inline';
    logoutBtn.style.display = 'none';
    userGreeting.style.display = 'none';
  }
}

async function handleLogout() {
  await logoutUser();
  alert('You have been logged out');
  window.location.reload();
}
```

### 3. Using Auth-API Functions

```javascript
// Check if user is logged in
const auth = await checkAuthStatus();
if (auth.isLoggedIn) {
  console.log('Welcome', auth.user.username);
}

// Register new user
const result = await registerUser(username, email, password, confirmPassword, profilePicture, profilePictureName);

// Login user
const loginResult = await loginUser(email, password);

// Logout
await logoutUser();

// Get user profile
const profile = await getUserProfile(userId);

// Display profile picture
const img = document.getElementById('profile-pic');
displayProfilePicture(userId, img);

// Get profile picture URL for img src
const url = getProfilePictureURL(userId);
```

---

## Frontend Protection (Show/Hide by Auth Status)

### Hide Content for Guests

```html
<div id="protected-content" style="display: none;">
  <!-- This only shows for logged-in users -->
  <button onclick="addToFavorites(123, 'Game Name')">❤️ Add to Favorites</button>
</div>

<script>
document.addEventListener('DOMContentLoaded', async () => {
  const auth = await checkAuthStatus();
  const protected = document.getElementById('protected-content');
  
  if (auth.isLoggedIn) {
    protected.style.display = 'block';
  } else {
    protected.style.display = 'none';
  }
});
</script>
```

### Show Login Prompt to Guests

```javascript
// When user tries to use protected feature
async function tryProtectedAction() {
  const auth = await checkAuthStatus();
  
  if (!auth.isLoggedIn) {
    alert('Please login to use this feature');
    window.location.href = 'login.html';
    return;
  }
  
  // Proceed with action
}
```

---

## Session Management

### How Sessions Work

1. **Login**: User credentials verified → Session created on server → Session ID stored in browser cookie
2. **Authenticated Requests**: Browser sends session ID in cookie → Server validates → Request allowed
3. **Logout**: Session destroyed on server → Cookie deleted → User redirected to login

### Checking Session Status

```javascript
// Always check on page load
const auth = await checkAuthStatus();

// If not logged in
if (!auth.isLoggedIn) {
  console.log('User is a guest');
  // Hide protected features
}
```

### Automatic Logout

Sessions expire after 24 hours of inactivity. User will need to login again.

Update session duration in [server.js](server.js):

```javascript
// Current: 24 hours
maxAge: 24 * 60 * 60 * 1000

// Change to 1 week:
maxAge: 7 * 24 * 60 * 60 * 1000
```

---

## Database Schema

### Users Table

```sql
CREATE TABLE gnews_db.users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  profile_picture LONGBLOB,
  profile_picture_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Troubleshooting

### "Email already registered"
The email is already in use. Try another email or login with that email.

### "Username already taken"
Choose a different username.

### "Passwords do not match"
Make sure confirm password exactly matches password field.

### "Username must be at least 3 characters"
Username too short. Use 3+ characters.

### Profile picture not showing
- Check file size (max 5MB)
- Try another image format (JPG, PNG)
- Check browser console for errors

### Cannot login after registration
Verify email and password are correct. Passwords are case-sensitive.

### Session expires too quickly
Update SESSION_SECRET or maxAge in [server.js](server.js)

---

## Security Features

✅ **Passwords**: Hashed with bcrypt (10 salt rounds)  
✅ **Sessions**: Server-side session storage with secure httpOnly cookies  
✅ **HTTPS Ready**: Use with HTTPS in production (set `secure: true` in session)  
✅ **User Isolation**: Users can only see public profiles, own profil
✅ **Database**: Prepared statements prevent SQL injection  

---

## Next Steps

1. ✅ **Update navigation headers** on all pages to show auth status
2. ✅ **Add favorites UI** on game pages (❤️ button)
3. ✅ **Add reviews section** on game detail pages
4. ✅ **Create user profile page** at `/profile.html`
5. ✅ **Add profile picture update** endpoint (PUT /api/users/profile)

---

## Testing the System

### Manual Testing Steps

1. Open [http://localhost:3000/login.html](http://localhost:3000/login.html)
2. Register new account with profile picture
3. Should auto-login and redirect to home
4. User greeting and profile picture should appear in header
5. Click logout
6. Logout button should disappear
7. Login with same email/password
8. Session should restore

---

## Files Created/Updated

**New Files:**
- ✅ `/public/login.html` - Login/register page
- ✅ `/public/js/login.js` - Login page logic
- ✅ `/add_profile_picture.sql` - Database migration

**Modified Files:**
- ✅ `/src/controllers/user.controller.js` - Added profile picture handler
- ✅ `/src/services/user.service.js` - Added profile picture service
- ✅ `/src/models/user.model.js` - Profile picture model methods
- ✅ `/src/routes/user.routes.js` - Added profile picture route
- ✅ `/public/js/auth-api.js` - Profile picture functions
