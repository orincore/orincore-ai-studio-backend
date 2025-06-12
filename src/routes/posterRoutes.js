const express = require('express');
const router = express.Router();
const PosterController = require('../controllers/posterController');
const { protect } = require('../middlewares/authMiddleware');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 2 // Maximum 2 files (logo + product image)
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

// Get poster types (public endpoint)
router.get('/types', PosterController.getPosterTypes);

// Get style preferences (public endpoint)
router.get('/styles', PosterController.getStylePreferences);

// Get aspect ratios (public endpoint)
router.get('/aspect-ratios', PosterController.getAspectRatios);

// Protected routes
router.use(protect);

// Generate a poster
router.post(
  '/generate',
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'productImage', maxCount: 1 }
  ]),
  PosterController.generatePoster
);

// Get all posters for the user
router.get('/', PosterController.getPosters);

// Get a specific poster
router.get('/:posterId', PosterController.getPoster);

// Delete a poster
router.delete('/:posterId', PosterController.deletePoster);

module.exports = router; 