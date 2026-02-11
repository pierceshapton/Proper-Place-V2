const express = require('express');
const uploadMiddleware = require('../middleware/uploadMiddleware');
const { uploadImages, uploadPlaceImages } = require('../controllers/uploadController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /upload
 * Upload generic images (for avatars, etc)
 */
router.post(
  '/',
  authMiddleware,
  uploadMiddleware.array('images', 10),
  uploadImages
);

/**
 * POST /upload/place/:placeId
 * Upload images for a specific place
 */
router.post(
  '/place/:placeId',
  authMiddleware,
  uploadMiddleware.array('images', 10),
  uploadPlaceImages
);

module.exports = router;
