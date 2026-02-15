# Settings Page - Tab Section Implementation

## 📋 Overview
The parametres.html page now has two organized tabs for managing user settings:
1. **Profil** (👤) - Profile information and photo management
2. **Informations confidentielles** (🔐) - Sensitive data and security settings

---

## 🎯 Tab 1: Profil

### Contents:
- **Photo de profil section**
  - Current profile picture display
  - Photo upload button
  - Image cropper modal with square crop
  - Preview of cropped image

- **Informations personnelles section**
  - Username field (editable, 3+ chars)
  - Age field (optional, 13-120 range)
  - Country field (optional, any text)
  - Save/Cancel buttons

### Features:
✅ Image uploading with validation (5MB max, image/* type)
✅ Square image cropper (center crop from image)
✅ Real-time photo preview
✅ Form validation before submission
✅ API integration to save profile changes
✅ Session auto-update after successful save

---

## 🔐 Tab 2: Informations confidentielles

### Contents:
- **Email Display Section**
  - Masked email for security (shows: `a••••@••••l.com` format)
  - Info text explaining masking
  - Non-editable (read-only)

- **Password Security Section**
  - Red "Créer un nouveau mot de passe" button
  - Opens modal requiring:
    - Current password confirmation
    - New password (6+ chars)
    - Confirmation of new password
  - Server validates current password before allowing change
  - Redirects to login after successful password change

### Features:
✅ Masked email display for privacy
✅ Password change requires current password verification
✅ Separate modal dialog for password changes
✅ Backend validation of current password
✅ Password hashing with bcrypt
✅ Session termination after password change (user must re-login)

---

## 🔄 Tab Navigation

### Tab Switching:
- Click any tab button to switch tabs
- Active tab is indicated by:
  - Cyan text color
  - Cyan bottom border under button
- Smooth fade-in animation (0.3s) when switching tabs
- Tab state persists during page session

### Styling:
- Icons (👤 🔐) for visual identification
- Flexible layout with horizontal scroll on mobile
- Modern design matching app theme (purple/cyan)
- Clear visual hierarchy

---

## 🛠️ File Changes

### Frontend
**[parametres.html](public/parametres.html)**
- Added `.tabs-navigation` with two tab buttons
- Created two `.tab-content` divs: `profil-tab` and `confidential-tab`
- Moved photo + personal form to profil tab
- Added email display and password button to confidential tab
- Added password change modal with confirmation fields

**[css/parametres.css](public/css/parametres.css)**
- Added `.tabs-navigation` styling (flex, cyan borders, icons)
- Added `.tab-button` styles (active state, hover effects)
- Added `.tab-content` styling (hidden by default, fade animation)
- Added `.modal` and `.modal-content` styles
- Added `.email-display` section styling
- Added `.password-section` styling with red accent
- Added `.masked-email` display style
- Added `.password-form` and `.password-requirements` styles
- Added `.btn-danger` button style (red gradient)
- Added responsive styles for tabs on mobile (overflow-x auto)

**[js/parametres.js](public/js/parametres.js)**
- Added `currentUser` variable to track logged-in user
- Added `initTabNavigation()` function for tab switching
- Added `switchTab(tabName)` function to handle tab clicks
- Added `displayMaskedEmail(email)` function to mask email addresses
- Split form submission into:
  - `handleProfileFormSubmit()` - handles profile + photo changes
  - `handlePasswordFormSubmit()` - handles password changes
- Added `openPasswordModal()` to show password change modal
- Added `closePasswordChangeModal()` to close password modal
- Fixed image cropper with better error handling
- Added modal click-outside detection to close modals
- Improved photo upload and crop workflow

### Backend
**[src/models/user.model.js](src/models/user.model.js)**
- Updated `findById()` to include `age` and `country` fields
- Added `updateProfile()` method for updating user settings

**[src/services/user.service.js](src/services/user.service.js)**
- Enhanced `updateProfile()` method with:
  - Current password verification for password changes
  - Username uniqueness check (excluding current user)
  - Age range validation (13-120)
  - Password strength validation (6+ chars)
  - Profile picture update support

**[src/controllers/user.controller.js](src/controllers/user.controller.js)**
- Updated `checkAuthStatus()` to return full user data (age, country)
- Updated `updateProfile()` to handle `currentPassword` parameter

**[src/routes/user.routes.js](src/routes/user.routes.js)**
- Added `/api/users/update-profile` POST route (protected)

---

## 🔐 Security Features

### Email Masking:
- First character of local part visible
- Last character of local part visible
- Middle characters replaced with dots (●●●)
- Domain: first char + dots + TLD visible
- Example: `john.doe@example.com` → `j•••d@e••••••.com`

### Password Security:
- Current password must match before change allowed
- New password hashed with bcrypt before storage
- Minimum 6 character requirement
- Confirmation field must match new password
- User must re-login after password change

### API Protection:
- All updates require authentication (`authMiddleware`)
- Session-based user identification
- Server-side validation of all inputs
- Proper error messages without exposing sensitive info

---

## 📱 Responsive Design

### Desktop (1024px+):
- Tabs displayed horizontally
- Full-width form fields
- Modal centered with max-width 600px

### Tablet (768px - 1023px):
- Tabs with adjustable padding
- Compact form layout
- Modal responsive sizing

### Mobile (< 768px):
- Tab buttons with horizontal scroll if needed
- Single-column layout
- Buttons full-width
- Modal uses 95vw width
- Reduced padding and font sizes

---

## 🎨 Color Scheme

| Element | Color | Purpose |
|---------|-------|---------|
| Primary Button (.btn-primary) | Purple/Cyan gradient | Main actions |
| Danger Button (.btn-danger) | Red (#ff4757) | Password change |
| Secondary Button (.btn-secondary) | Transparent cyan border | Cancel/Secondary |
| Email Display (.masked-email) | Cyan | Highlight info |
| Tab Active | Cyan | Visual focus |
| Modal | Dark with blur | Focus user attention |

---

## ✋ User Experience Flow

### Profile Tab:
1. User sees current profile photo, username, age, country
2. Click "📤 Télécharger une photo" to select image
3. Select image → modal shows cropper
4. Click "Appliquer" to crop to square
5. Photo preview updates
6. Modify username/age/country fields
7. Click "Enregistrer" to save all changes

### Confidential Tab:
1. User sees masked email (read-only)
2. Click "🔐 Créer un nouveau mot de passe" button
3. Modal appears with three fields:
   - Current password (for verification)
   - New password
   - Confirm new password
4. Enter values and click "Modifier"
5. Backend validates current password
6. If valid, password updated and user logged out
7. User need to login again with new password

---

## 🚀 API Endpoints Used

### POST /api/users/update-profile
Updates user profile (requires authentication)

**Request:**
```json
{
  "username": "new_username",
  "age": 25,
  "country": "France",
  "password": "newPassword123",
  "currentPassword": "currentPassword",
  "profilePictureData": "data:image/jpeg;base64,..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": 123,
    "username": "new_username",
    "message": "Profile updated successfully"
  }
}
```

---

## ⚙️ Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Responsive design

---

## 📝 Notes

- Image cropper uses canvas API for square center crop
- Email masking is done client-side for display (not stored masked)
- Password changes require re-authentication
- All form submissions redirect on success
- Modal close buttons (X) and outside-click detection both work
- Tab state not persistent across page reloads (as intended)
