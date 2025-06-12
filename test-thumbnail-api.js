/**
 * Standalone test server for thumbnail functionality
 * This file runs a separate express server on port 3001 for testing
 * without requiring authentication
 */

const express = require('express');
const multer = require('multer');
const ThumbnailController = require('./src/controllers/thumbnailController');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max file size
    files: 5 // Allow up to 5 files
  },
  fileFilter: (req, file, cb) => {
    // Log the incoming file information
    console.log(`Received file upload: ${file.fieldname}, ${file.originalname}, ${file.mimetype}`);
    
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      console.log(`Rejected file: ${file.originalname} - not an image (${file.mimetype})`);
      cb(new Error('Only image files are allowed'), false);
    }
  }
}).fields([
  { name: 'userAssets', maxCount: 4 },
  { name: 'userAsset', maxCount: 1 },
  { name: 'userImages', maxCount: 4 }
]);

// Test thumbnail generation endpoint
app.post('/api/test-thumbnail', (req, res, next) => {
  console.log('Processing test thumbnail generation request...');
  
  // Add a mock user to the request
  req.user = { id: 'test-user-id' };
  
  upload(req, res, (err) => {
    if (err) {
      console.error(`Upload middleware error: ${err.message}`);
      return res.status(400).json({ 
        success: false, 
        message: `File upload error: ${err.message}` 
      });
    }
    
    // Call the thumbnail controller
    ThumbnailController.generateThumbnail(req, res, (error) => {
      if (error) {
        console.error('Thumbnail generation error:', error);
        return res.status(error.statusCode || 500).json({
          success: false,
          message: error.message || 'An error occurred during thumbnail generation'
        });
      }
    });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Something went wrong',
    error: process.env.NODE_ENV === 'development' ? err : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`Test thumbnail endpoint available at: http://localhost:${PORT}/api/test-thumbnail`);
}); 