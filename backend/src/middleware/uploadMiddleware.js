const multer = require('multer');
const path = require('path');

// Configure multer for image uploads
const storage = multer.memoryStorage(); // Keep in memory before Sharp processing

const fileFilter = (req, file, cb) => {
  // Accept all image types - Sharp will handle conversion
  // Also accept application/octet-stream since mobile apps often send this
  const allowedMimes = [
    'image/jpeg', 
    'image/png', 
    'image/webp', 
    'image/heic', 
    'image/heif',
    'image/gif',
    'image/bmp',
    'image/tiff',
    'application/octet-stream' // Mobile apps often send this
  ];

  // Check by extension as fallback
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.gif', '.bmp', '.tiff'];

  if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Received: ${file.mimetype}, Extension: ${ext}`));
  }
};

// Create upload middleware
const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    files: 10, // Maximum 10 files per request
    // File size limit removed - allow large uploads
  },
});

module.exports = uploadMiddleware;
