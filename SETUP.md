# 🎮 GNews - User Authentication & Favorites System Setup

## 📋 Overview

This guide will help you set up the user authentication, favorites, and reviews system for GNews.

---

## 🔧 Step 1: Install New Dependencies

Run this command in your project root:

```bash
npm install
```

This will install:
- `mysql2` - MySQL database driver
- `bcrypt` - Password hashing
- `express-session` - Session management

---

## 🗄️ Step 2: Create MySQL Database

### Option A: Using MySQL Workbench (GUI)

1. Open **MySQL Workbench**
2. Connect to your MySQL server
3. Open the SQL script: `database.sql` from your project root
4. Copy all the SQL code
5. Paste it into a new query tab in Workbench
6. Execute it (Ctrl + Enter)

### Option B: Using Command Line

1. Open Command Prompt or PowerShell
2. Connect to MySQL:
   ```bash
   mysql -u root -p
   ```
3. Enter your MySQL password
4. Run:
   ```bash
   source database.sql;
   ```
   Or on Windows:
   ```bash
   mysql -u root -p < database.sql
   ```

✅ **Database created successfully!**

---

## ⚙️ Step 3: Configure .env File

The `.env` file is already created in your project root. Update it with your MySQL credentials:

```env
# =========== MYSQL DATABASE ===========
DB_HOST=localhost           # Your MySQL host
DB_PORT=3306                # MySQL port (default: 3306)
DB_USER=root                # Your MySQL username
DB_PASSWORD=your_password   # Your MySQL password
DB_NAME=gnews_db            # Database name (keep as gnews_db)

# =========== SERVER ===========
PORT=3000                   # Express server port
NODE_ENV=development        # development or production

# =========== APIs ===========
RAWG_API_KEY=2e68fa4d897b420682efc40faa9fbb6d
GUARDIAN_API_KEY=2fc2e627-7965-45df-ac62-c6e2259ce2e7

# =========== SESSION ===========
SESSION_SECRET=your_super_secret_key_change_this_in_production
```

**Change these values:**
- `DB_USER` - Your MySQL username
- `DB_PASSWORD` - Your MySQL password
- `SESSION_SECRET` - A random string for session encryption

---

## 🚀 Step 4: Start the Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

You should see:
```
✅ MySQL Connected Successfully!
✅ Server running on http://localhost:3000
```

---

## 📚 API Routes Reference

### 🔐 **Authentication Routes** (`/api/users`)

#### Register User
```
POST /api/users/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123",
  "confirmPassword": "password123"
}
```

#### Login
```
POST /api/users/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Logout
```
POST /api/users/logout
```

#### Check Auth Status
```
GET /api/users/auth-status
```

---

### ⭐ **Favorites Routes** (Requires Login)

#### Add Game to Favorites
```
POST /api/users/favorites/add
Authorization: User must be logged in

{
  "gameId": "123456",
  "gameTitle": "Elden Ring"
}
```

#### Remove from Favorites
```
POST /api/users/favorites/remove
Authorization: User must be logged in

{
  "gameId": "123456"
}
```

#### Get User's Favorites
```
GET /api/users/favorites
Authorization: User must be logged in
```

#### Check if Game is Favorited
```
GET /api/users/favorites/check?gameId=123456
Authorization: User must be logged in
```

---

### 💬 **Reviews Routes**

#### Add Review (Requires Login)
```
POST /api/users/reviews
Authorization: User must be logged in

{
  "gameId": "123456",
  "commentText": "Great game!",
  "rating": 5
}
```

#### Get Game Reviews (Public)
```
GET /api/users/reviews/123456
```

#### Get User's Reviews (Requires Login)
```
GET /api/users/reviews/user
Authorization: User must be logged in
```

#### Update Review (Requires Login)
```
PUT /api/users/reviews/:reviewId
Authorization: User must be logged in & Review owner

{
  "commentText": "Updated comment",
  "rating": 4
}
```

#### Delete Review (Requires Login)
```
DELETE /api/users/reviews/:reviewId
Authorization: User must be logged in & Review owner
```

---

## 🏗️ Project Structure

```
GNews/
├── src/
│   ├── config/
│   │   └── db.js              # Database connection
│   ├── models/
│   │   ├── user.model.js      # User database queries
│   │   ├── favorite.model.js  # Favorites database queries
│   │   └── review.model.js    # Reviews database queries
│   ├── services/
│   │   ├── user.service.js    # User business logic
│   │   ├── favorite.service.js # Favorites business logic
│   │   └── review.service.js   # Reviews business logic
│   ├── controllers/
│   │   ├── user.controller.js      # User request handlers
│   │   ├── favorite.controller.js  # Favorites request handlers
│   │   └── review.controller.js    # Reviews request handlers
│   ├── routes/
│   │   └── user.routes.js     # API routes
│   ├── middlewares/
│   │   └── auth.js            # Authentication middleware
│   └── app.js                 # Express app config
├── public/                    # Frontend files
├── server.js                  # Server entry point
├── database.sql               # Database schema
├── .env                       # Environment variables
└── package.json               # Dependencies
```

---

## 🔒 How Authentication Works

### Flow Diagram:
```
1. User registers/logs in
   ↓
2. Express creates a session
   ↓
3. Session ID stored in browser cookie
   ↓
4. For protected routes: middleware checks session
   ↓
5. If valid: allow operation (add favorite, post review)
   ↓
6. If not valid: return 401 error "Please log in"
```

### Protected Routes:
Routes that require user to be logged in:
- ✅ `POST /api/users/login`
- ✅ `POST /api/users/logout`
- ✅ `POST /api/users/favorites/add`
- ✅ `POST /api/users/favorites/remove`
- ✅ `GET /api/users/favorites`
- ✅ `POST /api/users/reviews`
- ✅ `PUT /api/users/reviews/:id`
- ✅ `DELETE /api/users/reviews/:id`

### Public Routes:
Routes anyone can access:
- 🔓 `POST /api/users/register`
- 🔓 `GET /api/users/auth-status`
- 🔓 `GET /api/users/reviews/:gameId`

---

## 🧪 Testing with Postman

1. **Register a user:**
   - POST to `http://localhost:3000/api/users/register`
   - Body: `{ "username": "test", "email": "test@example.com", "password": "pass123", "confirmPassword": "pass123" }`

2. **Login:**
   - POST to `http://localhost:3000/api/users/login`
   - Body: `{ "email": "test@example.com", "password": "pass123" }`
   - ✅ Session is now created

3. **Add Favorite:**
   - POST to `http://localhost:3000/api/users/favorites/add`
   - Body: `{ "gameId": "123", "gameTitle": "Elden Ring" }`
   - ✅ Game added to favorites

4. **Post Review:**
   - POST to `http://localhost:3000/api/users/reviews`
   - Body: `{ "gameId": "123", "commentText": "Amazing game!", "rating": 5 }`
   - ✅ Review created

---

## ❌ Common Issues & Solutions

### Issue: "MySQL Connection Error"
**Solution:** 
- Check `.env` file has correct DB credentials
- Ensure MySQL server is running
- Verify database was created with `database.sql`

### Issue: "Session not working"
**Solution:**
- Check browser is accepting cookies
- Restart the server
- Clear browser cookies and try again

### Issue: "Cannot POST /api/users/..."
**Solution:**
- Double-check endpoint spelling
- Verify server is running on port 3000
- Check Content-Type header is `application/json`

---

## 📖 Next Steps

1. ✅ Create MySQL database
2. ✅ Configure .env file
3. ✅ Install dependencies
4. ✅ Start server
5. 🔄 **Update Frontend** to use these API routes
   - Add login/register forms
   - Add "Follow Game" button (favorites)
   - Add "Post Review" feature

---

## 💡 Tips

- **Passwords:** Always hashed with bcrypt for security
- **Sessions:** Stored in memory (for production, use database session store)
- **CORS:** May need to configure if frontend is on different port
- **Validation:** All inputs validated on server-side

---

**Questions? Check the code comments in `/src/` folder!**
