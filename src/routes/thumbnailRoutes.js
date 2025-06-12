const express = require('express');
const router = express.Router();
const ThumbnailController = require('../controllers/thumbnailController');
const { protect } = require('../middlewares/authMiddleware');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 1 // Maximum 1 file
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Get content categories (public endpoint)
router.get('/categories', ThumbnailController.getContentCategories);

// Get style preferences (public endpoint)
router.get('/styles', ThumbnailController.getStylePreferences);

// Protected routes
router.use(protect);

// Generate a YouTube thumbnail
router.post(
  '/generate',
  upload.fields([{ name: 'userAsset', maxCount: 1 }]),
  ThumbnailController.generateThumbnail
);

// Get all thumbnails for the user
router.get('/', ThumbnailController.getThumbnails);

// Get a specific thumbnail
router.get('/:thumbnailId', ThumbnailController.getThumbnail);

// Delete a thumbnail
router.delete('/:thumbnailId', ThumbnailController.deleteThumbnail);

module.exports = router; 