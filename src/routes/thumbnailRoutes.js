const express = require('express');
const router = express.Router();
const ThumbnailController = require('../controllers/thumbnailController');
const { protect, authenticateJWT } = require('../middlewares/authMiddleware');
const multer = require('multer');

// Configure multer storage
const storage = multer.memoryStorage();

// Set up multer for file uploads
const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max file size 
    files: 5 // Allow up to 5 files
  },
  fileFilter: (req, file, cb) => {
    // Check file types
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
}).fields([
  { name: 'userAssets', maxCount: 5 },
  { name: 'userAsset', maxCount: 1 },
  { name: 'userImages', maxCount: 5 }
]);

// Custom error handler for multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ 
      success: false, 
      message: `File upload error: ${err.message}` 
    });
  }
  next(err);
};

// Get content categories (public endpoint)
router.get('/categories', ThumbnailController.getContentCategories);

// Get style preferences (public endpoint)
router.get('/styles', ThumbnailController.getStylePreferences);

// Protected routes
router.use(protect);

// Generate a YouTube thumbnail
router.post(
  '/generate',
  (req, res, next) => {
    console.log('Processing thumbnail generation request...');
    upload(req, res, (err) => {
      if (err) {
        console.error(`Upload middleware error: ${err.message}`);
        return res.status(400).json({ 
          success: false, 
          message: `File upload error: ${err.message}` 
        });
      }
      next();
    });
  },
  ThumbnailController.generateThumbnail
);

// Get all thumbnails for the user
router.get('/', ThumbnailController.getThumbnails);

// Get a specific thumbnail
router.get('/:thumbnailId', ThumbnailController.getThumbnail);

// Delete a thumbnail
router.delete('/:thumbnailId', ThumbnailController.deleteThumbnail);

module.exports = router; 