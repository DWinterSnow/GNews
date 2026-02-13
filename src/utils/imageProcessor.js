// Image Processor Utility - Handle image resizing and optimization with WebP format
const sharp = require('sharp');

class ImageProcessor {
  // Validation constants
  static CONSTRAINTS = {
    MAX_FILE_SIZE_KB: 5000,      // 5MB max upload size
    MAX_FILE_SIZE_DISPLAY_KB: 500, // 500KB max after processing
    MIN_DIMENSION: 100,            // Minimum 100px
    MAX_DIMENSION: 4000,           // Maximum 4000px
    FULL_SIZE_DIMENSION: 500,      // Full size: 500x500px
    THUMBNAIL_DIMENSION: 100,      // Thumbnail: 100x100px
    WEBP_QUALITY: 80              // WebP quality (1-100)
  };

  // Comprehensive image validation before processing
  static validateImage(buffer) {
    if (!buffer) {
      throw new Error('No image provided');
    }

    const sizeKB = Math.round(buffer.length / 1024);
    
    // Validate file size
    if (sizeKB > this.CONSTRAINTS.MAX_FILE_SIZE_KB) {
      throw new Error(
        `Image size (${sizeKB}KB) exceeds maximum of ${this.CONSTRAINTS.MAX_FILE_SIZE_KB}KB`
      );
    }

    // Additional check: ensure it's a valid image format
    if (!this._isValidImageBuffer(buffer)) {
      throw new Error('Invalid image format. Please upload a valid JPEG, PNG, or WebP image');
    }

    return {
      valid: true,
      sizeKB: sizeKB,
      message: 'Image validation passed'
    };
  }

  // Check if buffer is a valid image
  static _isValidImageBuffer(buffer) {
    // Check for common image magic bytes
    const validSignatures = [
      [0xFF, 0xD8, 0xFF], // JPEG
      [0x89, 0x50, 0x4E, 0x47], // PNG
      [0x52, 0x49, 0x46, 0x46]  // WebP (RIFF)
    ];

    return validSignatures.some(sig => 
      sig.every((byte, i) => buffer[i] === byte)
    );
  }

  // Validate image dimensions
  static async validateDimensions(buffer) {
    try {
      const metadata = await sharp(buffer).metadata();
      const { width, height } = metadata;

      if (width < this.CONSTRAINTS.MIN_DIMENSION || height < this.CONSTRAINTS.MIN_DIMENSION) {
        throw new Error(
          `Image dimensions (${width}x${height}) are too small. Minimum ${this.CONSTRAINTS.MIN_DIMENSION}px required`
        );
      }

      if (width > this.CONSTRAINTS.MAX_DIMENSION || height > this.CONSTRAINTS.MAX_DIMENSION) {
        throw new Error(
          `Image dimensions (${width}x${height}) are too large. Maximum ${this.CONSTRAINTS.MAX_DIMENSION}px allowed`
        );
      }

      return { width, height, valid: true };
    } catch (error) {
      if (error.message.includes('too small') || error.message.includes('too large')) {
        throw error;
      }
      throw new Error(`Could not read image dimensions: ${error.message}`);
    }
  }

  // Process uploaded image: create full-size (500x500) and thumbnail (100x100) in WebP format
  static async processProfilePicture(buffer) {
    try {
      if (!buffer) {
        return { fullSize: null, thumbnail: null };
      }

      // Validate image first
      this.validateImage(buffer);

      // Validate dimensions
      await this.validateDimensions(buffer);

      console.log('Image validation passed. Starting WebP conversion...');

      // Process full-size image (500x500, centered, optimized WebP)
      const fullSizeBuffer = await sharp(buffer)
        .resize(this.CONSTRAINTS.FULL_SIZE_DIMENSION, this.CONSTRAINTS.FULL_SIZE_DIMENSION, {
          fit: 'cover',
          position: 'center',
          withoutEnlargement: false
        })
        .webp({ quality: this.CONSTRAINTS.WEBP_QUALITY })
        .toBuffer();

      // Process thumbnail (100x100, for header display)
      const thumbnailBuffer = await sharp(buffer)
        .resize(this.CONSTRAINTS.THUMBNAIL_DIMENSION, this.CONSTRAINTS.THUMBNAIL_DIMENSION, {
          fit: 'cover',
          position: 'center'
        })
        .webp({ quality: this.CONSTRAINTS.WEBP_QUALITY })
        .toBuffer();

      // Check if processed images exceed size limits
      const fullSizeKB = Math.round(fullSizeBuffer.length / 1024);
      const thumbKB = Math.round(thumbnailBuffer.length / 1024);

      if (fullSizeKB > this.CONSTRAINTS.MAX_FILE_SIZE_DISPLAY_KB) {
        console.warn(`Full-size image (${fullSizeKB}KB) exceeds recommended size`);
      }

      // Convert to base64 for storage (includes data URI scheme)
      const fullSizeBase64 = `data:image/webp;base64,${fullSizeBuffer.toString('base64')}`;
      const thumbnailBase64 = `data:image/webp;base64,${thumbnailBuffer.toString('base64')}`;

      console.log(
        `✓ WebP conversion complete - Full: ${fullSizeKB}KB (${this.CONSTRAINTS.FULL_SIZE_DIMENSION}x${this.CONSTRAINTS.FULL_SIZE_DIMENSION}), ` +
        `Thumbnail: ${thumbKB}KB (${this.CONSTRAINTS.THUMBNAIL_DIMENSION}x${this.CONSTRAINTS.THUMBNAIL_DIMENSION})`
      );

      return {
        fullSize: fullSizeBase64,
        thumbnail: thumbnailBase64,
        fullSizeSize: fullSizeBuffer.length,
        thumbnailSize: thumbnailBuffer.length,
        fullSizeKB: fullSizeKB,
        thumbnailKB: thumbKB,
        format: 'WebP',
        dimensions: {
          fullSize: `${this.CONSTRAINTS.FULL_SIZE_DIMENSION}x${this.CONSTRAINTS.FULL_SIZE_DIMENSION}`,
          thumbnail: `${this.CONSTRAINTS.THUMBNAIL_DIMENSION}x${this.CONSTRAINTS.THUMBNAIL_DIMENSION}`
        }
      };
    } catch (error) {
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  // Get file size from base64 string (in KB)
  static getBase64Size(base64String) {
    if (!base64String) return 0;
    // Remove data URI prefix if present
    const data = base64String.includes(',') ? base64String.split(',')[1] : base64String;
    // Base64 encoding increases size by ~33%, so multiply by 3/4
    return Math.round((data.length * 3 / 4) / 1024);
  }

  // Helper: Get image info from buffer
  static async getImageInfo(buffer) {
    try {
      const metadata = await sharp(buffer).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        space: metadata.space,
        channels: metadata.channels,
        depth: metadata.depth,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        sizeKB: Math.round(buffer.length / 1024)
      };
    } catch (error) {
      throw new Error(`Could not read image info: ${error.message}`);
    }
  }
}

module.exports = ImageProcessor;
