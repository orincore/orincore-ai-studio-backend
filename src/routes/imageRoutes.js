const express = require('express');
const router = express.Router();
const { 
  generateImage,
  getImages,
  getImage,
  removeImage,
  getImageOptions,
  suggestStyles,
  analyzePrompt
} = require('../controllers/imageController');
const { protect } = require('../middlewares/authMiddleware');

// Apply auth middleware to all routes
router.use(protect);

// Image generation routes
router.post('/generate', generateImage);
router.get('/', getImages);
router.get('/options', getImageOptions);
router.get('/:id', getImage);
router.delete('/:id', removeImage);
router.post('/suggest-styles', suggestStyles);
router.post('/analyze-prompt', analyzePrompt);

module.exports = router; 