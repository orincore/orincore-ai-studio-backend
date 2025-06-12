const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { generateLogo, getLogoStyles, getColorThemes } = require('../controllers/logoController');

// Public routes
router.get('/styles', getLogoStyles);
router.get('/color-themes', getColorThemes);

// Protected routes
router.use(protect);
router.post('/generate', generateLogo);

module.exports = router; 