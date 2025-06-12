const express = require('express');
const { 
  generateImage,
  getImages,
  getImage,
  removeImage,
  getImageOptions
} = require('../controllers/imageController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// All routes are protected
router.use(protect);

router.post('/generate', generateImage);
router.get('/', getImages);
router.get('/options', getImageOptions);
router.get('/:id', getImage);
router.delete('/:id', removeImage);

module.exports = router; 