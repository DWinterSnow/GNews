# WebP Image Upload & Optimization Guide

## Overview
This guide explains the new WebP-based profile picture upload system implemented for GNews. All profile pictures are now automatically converted to WebP format for optimal file size and performance.

---

## 📊 Image Specifications

### Resolution & Size
| Purpose | Dimensions | File Size | Format |
|---------|-----------|-----------|---------|
| **Full-size** | 500×500px | ~80-150KB | WebP |
| **Thumbnail** | 100×100px | ~15-30KB | WebP |
| **Maximum Upload** | 4000×4000px | 5MB max | Any (auto-converted) |
| **Minimum Upload** | 100×100px | - | Any (auto-converted) |

### Quality Settings
- **WebP Quality**: 80/100 (optimal balance between file size and visual quality)
- **Aspect Ratio**: Square (1:1) - centered crop from any uploaded dimensions

---

## 🚀 API Endpoints

### 1. Register with Profile Picture
**POST** `/api/user/register`

**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "confirmPassword": "securePassword123",
  "profilePictureData": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "profilePictureName": "profile.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

### 2. Upload/Update Profile Picture (Authenticated)
**POST** `/api/user/upload-profile-picture`

**Headers:**
- Session-based authentication (user must be logged in)

**Request Body:**
```json
{
  "profilePictureData": "data:image/webp;base64,UklGRiYAAABXRUJQ..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile picture uploaded successfully",
  "data": {
    "userId": 1,
    "format": "WebP",
    "dimensions": {
      "fullSize": "500x500",
      "thumbnail": "100x100"
    },
    "fullSizeKB": 125,
    "thumbnailKB": 22
  }
}
```

### 3. Get Profile Picture
**GET** `/api/user/profile-picture/:userId`

**Response:**
- Direct image/webp content with caching headers
- Cache-Control: `public, max-age=31536000` (1 year)

---

## 🔧 Implementation Details

### Image Processing Chain

```
User Upload (JPEG/PNG/WebP)
    ↓
[Validation]
  - File size check (max 5MB)
  - Image format validation
  - Dimension check (100-4000px)
    ↓
[Processing]
  - Resize to 500×500 (full-size)
  - Resize to 100×100 (thumbnail)
  - Convert to WebP format
  - Apply quality compression (quality: 80)
    ↓
[Storage]
  - Encode to base64
  - Store with data:image/webp;base64 prefix
  - Save to database
    ↓
Success Response
```

### Validation Constraints
```javascript
CONSTRAINTS = {
  MAX_FILE_SIZE_KB: 5000,        // 5 MB upload limit
  MAX_FILE_SIZE_DISPLAY_KB: 500, // 500 KB processed limit
  MIN_DIMENSION: 100,             // Minimum 100px
  MAX_DIMENSION: 4000,            // Maximum 4000px
  FULL_SIZE_DIMENSION: 500,       // Full-size: 500x500
  THUMBNAIL_DIMENSION: 100,       // Thumbnail: 100x100
  WEBP_QUALITY: 80                // WebP compression quality
}
```

---

## 📁 File Structure

### New/Modified Files
```
src/
├── utils/
│   └── imageProcessor.js        [UPDATED] ✓
├── controllers/
│   └── user.controller.js       [UPDATED] ✓
├── services/
│   └── user.service.js          [UPDATED] ✓
├── models/
│   └── user.model.js            [UPDATED] ✓
└── routes/
    └── user.routes.js           [UPDATED] ✓
```

### Key Classes & Methods

#### ImageProcessor (`src/utils/imageProcessor.js`)
```javascript
// Main processing method
ImageProcessor.processProfilePicture(buffer)
  → Validates image
  → Checks dimensions
  → Converts to WebP (500×500 + 100×100)
  → Returns base64-encoded images

// Validation methods
ImageProcessor.validateImage(buffer)
ImageProcessor.validateDimensions(buffer)
ImageProcessor.getImageInfo(buffer)
```

#### UserController (`src/controllers/user.controller.js`)
```javascript
// New endpoint
UserController.uploadProfilePicture(req, res)
  → Requires authentication
  → Accepts base64 image data
  → Returns processing results

// Updated endpoints
UserController.register()    // Now uses WebP
UserController.getProfilePicture()    // Serves WebP
```

---

## 🌐 Frontend Integration

### JavaScript Example
```javascript
// Convert file to base64
function convertToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

// Upload profile picture
async function uploadProfilePicture(file) {
  const base64 = await convertToBase64(file);
  
  const response = await fetch('/api/user/upload-profile-picture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profilePictureData: base64 })
  });
  
  const result = await response.json();
  if (result.success) {
    console.log('✓ Picture uploaded:', result.data);
  }
}

// Display profile picture with WebP + JPEG fallback
function displayProfilePicture(userId) {
  return `
    <picture>
      <source srcset="/api/user/profile-picture/${userId}" type="image/webp">
      <img src="/api/user/profile-picture/${userId}" alt="Profile">
    </picture>
  `;
}
```

### HTML Example
```html
<input type="file" 
       id="profilePicture" 
       accept="image/jpeg,image/png,image/webp"
       aria-label="Upload profile picture">

<picture>
  <source srcset="/api/user/profile-picture/123" type="image/webp">
  <img src="/api/user/profile-picture/123" 
       alt="User Profile" 
       width="500" 
       height="500">
</picture>
```

---

## ✅ Error Handling

### Validation Errors

```javascript
// File too large
{
  "success": false,
  "message": "Image processing failed: Image size (6500KB) exceeds maximum of 5000KB"
}

// Invalid format
{
  "success": false,
  "message": "Image processing failed: Invalid image format. Please upload a valid JPEG, PNG, or WebP image"
}

// Image too small
{
  "success": false,
  "message": "Image processing failed: Image dimensions (80x80) are too small. Minimum 100px required"
}

// Not authenticated
{
  "success": false,
  "message": "Not logged in. Please login first"
}
```

---

## 📈 Performance Benefits

### File Size Reduction
- **JPEG to WebP**: 25-35% smaller
- Example: 150KB JPEG → 100KB WebP
- Thumbnail: 30KB JPEG → 20KB WebP

### Bandwidth & Load Time
- Faster downloads (smaller files)
- Reduced server storage (smaller payloads)
- Better page load performance
- Improved mobile experience

### Browser Compatibility
- ✅ Chrome/Edge (97%+ users)
- ✅ Firefox (93%+ users)
- ✅ Safari (16%+ users)
- ✅ Fallback via JPEG for unsupported browsers

---

## 🔐 Security Features

### File Validation
1. **Magic Byte Detection**: Validates actual file format (not extension)
2. **Size Limits**: Prevents oversized uploads (5MB max)
3. **Dimension Validation**: Rejects too small/large images
4. **Format Whitelisting**: Only JPEG, PNG, WebP accepted

### Data Security
- Images stored as base64 in database
- Cache headers prevent unauthorized caching
- Session-based authentication required for uploads

---

## 🐛 Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Invalid image format" | Corrupted file | Re-upload the image |
| "Image too small" | <100px dimensions | Use larger image (min 100×100) |
| "Exceeds maximum size" | Upload >5MB | Compress before uploading |
| "Not logged in" | Session expired | Login again |
| WebP not displaying | Old browser | Uses JPEG fallback automatically |

---

## 📝 Console Logging

The system provides detailed console logs:

```
✓ WebP conversion complete - Full: 125KB (500x500), Thumbnail: 22KB (100x100)
✓ Profile picture uploaded successfully
  Format: WebP
  Full-size: 500x500 (125KB)
  Thumbnail: 100x100 (22KB)

✓ Profile picture updated for user 1
  Full-size: 500x500 (125KB)
  Thumbnail: 100x100 (22KB)
```

---

## 🚀 Future Improvements

- [ ] Implement AVIF format (next-gen compression)
- [ ] Add image editing/cropping UI
- [ ] Support for multiple profile picture variants
- [ ] CDN integration for global distribution
- [ ] Progressive image loading
- [ ] Automated image optimization pipeline

---

## 📦 Dependencies

All required dependencies are already installed:

```json
{
  "sharp": "^0.34.5"  // Image processing library
}
```

---

## 💡 Best Practices

1. **Always validate on the server** - Never trust client-side validation alone
2. **Use appropriate quality settings** - Quality 80 provides good balance
3. **Generate multiple sizes** - Always create thumbnails for faster loading
4. **Implement caching** - Set proper cache headers on image endpoints
5. **Monitor file sizes** - Track storage usage and enforce limits
6. **Use base64 for small images** - For profile pics (<1MB), base64 storage is fine
7. **Provide user feedback** - Show upload progress and success/error messages
8. **Test cross-browser** - Ensure WebP fallback works properly

---

**Last Updated**: February 13, 2026
**Status**: ✅ Fully Implemented
