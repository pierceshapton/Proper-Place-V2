const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

const UPLOAD_DIR = path.join(__dirname, '../../uploads');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FORMATS = ['jpeg', 'png', 'webp'];

class ImageService {
  /**
   * Ensure upload directory exists
   */
  static async ensureUploadDir() {
    try {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directory:', error);
      throw error;
    }
  }

  /**
   * Process and save image with compression and optimization
   * @param {Buffer} fileBuffer - Image file buffer
   * @param {string} fileName - Original file name
   * @returns {Object} - { filename, path, url, size }
   */
  static async processImage(fileBuffer, fileName) {
    try {
      // Validate file size
      if (fileBuffer.length > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds maximum of 5MB (received ${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB)`);
      }

      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const extension = path.extname(fileName).toLowerCase();
      const nameWithoutExt = path.basename(fileName, extension);
      const optimizedFileName = `${nameWithoutExt}-${timestamp}-${random}.webp`;

      // Ensure upload directory exists
      await this.ensureUploadDir();

      const filePath = path.join(UPLOAD_DIR, optimizedFileName);

      // Process image with Sharp
      // Convert to WebP for better compression while maintaining quality
      const processedBuffer = await sharp(fileBuffer)
        .resize(1920, 1080, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer();

      // Save optimized image
      await fs.writeFile(filePath, processedBuffer);

      // Get file size
      const stats = await fs.stat(filePath);

      return {
        filename: optimizedFileName,
        path: filePath,
        url: `/uploads/${optimizedFileName}`,
        size: stats.size,
        originalSize: fileBuffer.length,
        compression: `${((1 - stats.size / fileBuffer.length) * 100).toFixed(2)}%`,
      };
    } catch (error) {
      console.error('Image processing error:', error);
      throw error;
    }
  }

  /**
   * Process multiple images
   * @param {Array<Buffer>} fileBuffers - Array of image buffers
   * @param {Array<string>} fileNames - Array of file names
   * @returns {Array} - Array of processed image info
   */
  static async processMultipleImages(fileBuffers, fileNames) {
    try {
      const results = [];
      for (let i = 0; i < fileBuffers.length; i++) {
        const result = await this.processImage(fileBuffers[i], fileNames[i]);
        results.push(result);
      }
      return results;
    } catch (error) {
      console.error('Error processing multiple images:', error);
      throw error;
    }
  }

  /**
   * Delete image file
   * @param {string} fileName - File name to delete
   */
  static async deleteImage(fileName) {
    try {
      const filePath = path.join(UPLOAD_DIR, fileName);
      await fs.unlink(filePath);
      return { success: true, message: 'Image deleted successfully' };
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  }

  /**
   * Delete multiple images
   * @param {Array<string>} fileNames - Array of file names to delete
   */
  static async deleteMultipleImages(fileNames) {
    try {
      for (const fileName of fileNames) {
        await this.deleteImage(fileName);
      }
      return { success: true, message: 'Images deleted successfully' };
    } catch (error) {
      console.error('Error deleting images:', error);
      throw error;
    }
  }
}

module.exports = ImageService;
