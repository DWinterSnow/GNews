# 🚀 Quick Start Checklist

## ✅ To Get Started:

### 1️⃣ Install Dependencies
```bash
npm install
```

### 2️⃣ Create MySQL Database
- Open `database.sql` file
- Copy all SQL code
- Paste into MySQL Workbench and execute
- Or use: `mysql -u root -p < database.sql`

### 3️⃣ Update .env File
- Find `.env` in project root
- Update: `DB_PASSWORD=your_mysql_password`
- Update: `SESSION_SECRET=some_random_string`

### 4️⃣ Start Server
```bash
npm start
```

✅ You should see: **"✅ MySQL Connected Successfully!"**

---

## 📁 Files Created:

### Database
- 📄 `database.sql` - MySQL schema (run this first!)
- 🔐 `.env` - Environment variables

### Backend Code (MVC Structure)
```
src/
├── config/db.js                    # Database connection
├── models/
│   ├── user.model.js              # User queries
│   ├── favorite.model.js          # Favorite queries
│   └── review.model.js            # Review queries
├── services/
│   ├── user.service.js            # User logic
│   ├── favorite.service.js        # Favorite logic
│   └── review.service.js          # Review logic
├── controllers/
│   ├── user.controller.js         # User handlers
│   ├── favorite.controller.js     # Favorite handlers
│   └── review.controller.js       # Review handlers
├── routes/
│   └── user.routes.js             # All API routes
├── middlewares/
│   └── auth.js                    # Login check
└── app.js                         # App config
```

### Updated Files
- 📝 `server.js` - Added session + user routes
- 📦 `package.json` - Added mysql2, bcrypt, express-session

---

## 🎯 User Scenarios:

### Scenario 1: Guest User
```
✓ Can browse games & reviews
✗ Cannot follow games
✗ Cannot post reviews
→ Solution: Show "Login Required" message
```

### Scenario 2: Logged-In User
```
✓ Can see all features
✓ Can follow games
✓ Can post reviews
✓ Can edit/delete own reviews
```

---

## 🔗 Key API Endpoints:

| Method | Endpoint | Protected | Purpose |
|--------|----------|-----------|---------|
| POST | `/api/users/register` | ❌ | Create account |
| POST | `/api/users/login` | ❌ | Login to account |
| POST | `/api/users/logout` | ✅ | Logout |
| POST | `/api/users/favorites/add` | ✅ | Follow a game |
| POST | `/api/users/favorites/remove` | ✅ | Unfollow a game |
| GET | `/api/users/favorites` | ✅ | Get my favorites |
| POST | `/api/users/reviews` | ✅ | Post a review |
| GET | `/api/users/reviews/:gameId` | ❌ | See all reviews |
| PUT | `/api/users/reviews/:id` | ✅ | Edit my review |
| DELETE | `/api/users/reviews/:id` | ✅ | Delete my review |

---

## 💻 Frontend Next Steps:

Update your HTML files to add:
1. **Login/Register Modal** (`actu.html`, `jeux.html`, `Index.html`)
2. **"Follow Game" Button** - Call `POST /api/users/favorites/add`
3. **"Post Review" Form** - Call `POST /api/users/reviews`
4. **Reviews Display** - Fetch from `GET /api/users/reviews/:gameId`
5. **User Menu** - Show username if logged in

Example JavaScript:
```javascript
// Check if user is logged in
async function checkLogin() {
  const response = await fetch('/api/users/auth-status');
  const data = await response.json();
  if (data.isLoggedIn) {
    console.log('User:', data.user.username);
  }
}

// Add favorite
async function addFavorite(gameId, gameTitle) {
  const response = await fetch('/api/users/favorites/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameId, gameTitle })
  });
  const data = await response.json();
  if (data.success) {
    alert('Game added to favorites!');
  } else {
    alert(data.message); // "Please log in"
  }
}

// Post review
async function postReview(gameId, comment, rating) {
  const response = await fetch('/api/users/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameId, commentText: comment, rating })
  });
  const data = await response.json();
  if (data.success) {
    alert('Review posted!');
  }
}
```

---

## 🐛 Testing Tips:

1. Use **Postman** or **Insomnia** to test API endpoints
2. Check browser **DevTools > Application > Cookies** to see session
3. Check server console for errors
4. Use `.env` `NODE_ENV=development` for detailed error messages

---

## 📖 More Details:

See `SETUP.md` for complete documentation!
