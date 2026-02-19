const sharp = require('sharp');
const path = require('path');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FORMATS = ['jpeg', 'png', 'webp'];

// DigitalOcean Spaces configuration (S3-compatible)
const SPACES_ENDPOINT = process.env.DO_SPACES_ENDPOINT || 'https://lon1.digitaloceanspaces.com';
const SPACES_BUCKET = process.env.DO_SPACES_BUCKET || 'proper-place-images';
const SPACES_REGION = process.env.DO_SPACES_REGION || 'lon1';
const SPACES_CDN_URL = process.env.DO_SPACES_CDN_URL || `https://${SPACES_BUCKET}.${SPACES_REGION}.cdn.digitaloceanspaces.com`;

// Initialize S3 client for DigitalOcean Spaces
const s3Client = new S3Client({
  endpoint: SPACES_ENDPOINT,
  region: SPACES_REGION,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY || '',
    secretAccessKey: process.env.DO_SPACES_SECRET || '',
  },
  forcePathStyle: false,
});

class ImageService {
  /**
   * Process and upload image to DigitalOcean Spaces
   * @param {Buffer} fileBuffer - Image file buffer
   * @param {string} fileName - Original file name
   * @returns {Object} - { filename, url, size }
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
      const optimizedFileName = `uploads/${nameWithoutExt}-${timestamp}-${random}.webp`;

      // Process image with Sharp
      // Auto-rotate based on EXIF orientation, then convert to WebP
      const processedBuffer = await sharp(fileBuffer)
        .rotate() // Auto-rotate based on EXIF orientation
        .resize(1920, 1080, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer();

      // Upload to DigitalOcean Spaces
      const uploadParams = {
        Bucket: SPACES_BUCKET,
        Key: optimizedFileName,
        Body: processedBuffer,
        ContentType: 'image/webp',
        ACL: 'public-read',
      };

      await s3Client.send(new PutObjectCommand(uploadParams));

      // Return CDN URL for the image
      const imageUrl = `${SPACES_CDN_URL}/${optimizedFileName}`;

      console.log('Image uploaded to Spaces:', imageUrl);

      return {
        filename: optimizedFileName,
        url: imageUrl,
        size: processedBuffer.length,
        originalSize: fileBuffer.length,
        compression: `${((1 - processedBuffer.length / fileBuffer.length) * 100).toFixed(2)}%`,
      };
    } catch (error) {
      console.error('Image processing/upload error:', error);
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
   * Delete image from DigitalOcean Spaces
   * @param {string} imageUrl - Full URL or key of image to delete
   */
  static async deleteImage(imageUrl) {
    try {
      // Extract the key from URL if full URL provided
      let key = imageUrl;
      if (imageUrl.includes(SPACES_CDN_URL)) {
        key = imageUrl.replace(`${SPACES_CDN_URL}/`, '');
      } else if (imageUrl.startsWith('/uploads/')) {
        key = `uploads${imageUrl.substring(8)}`; // Convert /uploads/x to uploads/x
      }

      const deleteParams = {
        Bucket: SPACES_BUCKET,
        Key: key,
      };

      await s3Client.send(new DeleteObjectCommand(deleteParams));
      console.log('Image deleted from Spaces:', key);
      return { success: true, message: 'Image deleted successfully' };
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  }

  /**
   * Delete multiple images
   * @param {Array<string>} imageUrls - Array of image URLs to delete
   */
  static async deleteMultipleImages(imageUrls) {
    try {
      for (const url of imageUrls) {
        await this.deleteImage(url);
      }
      return { success: true, message: 'Images deleted successfully' };
    } catch (error) {
      console.error('Error deleting images:', error);
      throw error;
    }
  }
}

module.exports = ImageService;
