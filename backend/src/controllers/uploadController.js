const ImageService = require('../services/imageService');
const logger = require('../utils/logger');
const db = require('../config/database');

async function uploadImages(req, res, next) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images provided',
      });
    }

    logger.info('Uploading images', { count: req.files.length });

    // Process all uploaded images
    const processedImages = [];
    for (const file of req.files) {
      const result = await ImageService.processImage(file.buffer, file.originalname);
      processedImages.push({
        url: result.url,
        filename: result.filename,
        size: result.size,
        originalSize: result.originalSize,
        compression: result.compression,
      });
    }

    logger.info('Images uploaded successfully', { count: processedImages.length });

    res.json({
      success: true,
      message: `${processedImages.length} image(s) uploaded successfully`,
      images: processedImages,
    });
  } catch (error) {
    logger.error('Image upload error', { error: error.message });
    next(error);
  }
}

async function uploadPlaceImages(req, res, next) {
  try {
    const { placeId } = req.params;

    if (!placeId) {
      return res.status(400).json({
        success: false,
        message: 'Place ID is required',
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images provided',
      });
    }

    logger.info('Uploading place images', { placeId, count: req.files.length });

    // Process all uploaded images
    const processedImages = [];
    for (const file of req.files) {
      const result = await ImageService.processImage(file.buffer, file.originalname);
      processedImages.push(result.url);
    }

    // Save image URLs to the place's image_urls column
    await db.query(
      `UPDATE places 
       SET image_urls = COALESCE(image_urls, ARRAY[]::TEXT[]) || $1::TEXT[]
       WHERE id = $2`,
      [processedImages, placeId]
    );

    logger.info('Place images uploaded and saved', { placeId, count: processedImages.length });

    res.json({
      success: true,
      message: `${processedImages.length} image(s) uploaded for place ${placeId}`,
      imageUrls: processedImages,
    });
  } catch (error) {
    logger.error('Place image upload error', { error: error.message });
    next(error);
  }
}

module.exports = {
  uploadImages,
  uploadPlaceImages,
};
