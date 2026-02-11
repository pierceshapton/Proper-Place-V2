const multer = require('multer');
const path = require('path');

// Configure multer for image uploads
const storage = multer.memoryStorage(); // Keep in memory before Sharp processing

const fileFilter = (req, file, cb) => {
  // Allowed MIME types
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Only JPEG, PNG, and WebP are allowed. Received: ${file.mimetype}`));
  }
};

// Create upload middleware
const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10, // Maximum 10 files per request
  },
});

module.exports = uploadMiddleware;
