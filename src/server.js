const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { errorHandler } = require('./middlewares/errorMiddleware');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const imageRoutes = require('./routes/imageRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const adminRoutes = require('./routes/adminRoutes');
const thumbnailRoutes = require('./routes/thumbnailRoutes');
const posterRoutes = require('./routes/posterRoutes');
const logoRoutes = require('./routes/logoRoutes');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173', 'https://studio.orincore.com'];
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cache-Control', 'X-Requested-With', 'X-Auth-Token', 'Origin', 'Accept-Language'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Development-only middleware to allow all origins as a fallback
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    next();
  });
  console.log('CORS fallback enabled for development - allowing all origins');
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/thumbnails', thumbnailRoutes);
app.use('/api/posters', posterRoutes);
app.use('/api/logos', logoRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'success', 
    message: 'Orincore AI Studio API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler middleware
app.use(errorHandler);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`Enhanced image generation features active - supports multiple aspect ratios and improved accuracy`);
  console.log(`Available endpoints: 
  - POST /api/images/generate - Generate images with enhanced accuracy
  - POST /api/images/analyze-prompt - Get prompt improvement suggestions
  - POST /api/images/suggest-styles - Get style suggestions for prompts
  - GET /api/images/options - Get all available models, resolutions and styles
  - POST /api/logos/generate - Generate logos with enhanced text handling
  - GET /api/logos/styles - Get available logo styles
  - GET /api/logos/color-themes - Get logo color theme suggestions`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

// Add the direct test endpoint (only in development mode)
if (process.env.NODE_ENV === 'development') {
  const multer = require('multer');
  const ThumbnailController = require('./controllers/thumbnailController');
  
  console.log('Setting up direct test endpoint for thumbnail generation');
  
  // Configure multer for test uploads
  const testUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }
  }).fields([
    { name: 'userImages', maxCount: 5 },
    { name: 'userAssets', maxCount: 5 },
    { name: 'userAsset', maxCount: 1 }
  ]);
  
  // Direct test endpoint that doesn't require auth
  app.post('/api/test-thumbnail', (req, res, next) => {
    console.log('Processing direct test thumbnail request...');
    
    testUpload(req, res, async (err) => {
      if (err) {
        console.error('Upload error:', err.message);
        return res.status(400).json({ error: err.message });
      }
      
      // Add a fake user for the controller
      req.user = { id: 'test-user-123' };
      
      // Call the controller
      try {
        await ThumbnailController.generateThumbnail(req, res, next);
      } catch (error) {
        next(error);
      }
    });
  });
}

module.exports = app; 