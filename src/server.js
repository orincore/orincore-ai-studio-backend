const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');  
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
const planRoutes = require('./routes/planRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const paymentStatusRoutes = require('./routes/paymentStatusRoutes');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// Configure CORS
const corsOptions = {
  origin: function(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://studio.orincore.com',
      'https://studioapi.orincore.com'
    ];

    if (process.env.NODE_ENV === 'development' || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'Cache-Control',
    'X-Requested-With',
    'X-Auth-Token',
    'Origin',
    'Accept-Language',
    'x-api-version',
    'x-client-id',
    'x-client-secret',
    'x-cf-webhook-signature'  
  ],
  exposedHeaders: ['Content-Length', 'Content-Type', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  credentials: true,
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// IMPORTANT: Use the built-in body-parser for webhooks with raw body
// This captures the raw body for signature verification
app.use('/api/webhooks', bodyParser.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Apply JSON parser for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Handle OPTIONS requests
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// ✅ Correct way to mount routes:
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/thumbnails', thumbnailRoutes);
app.use('/api/posters', posterRoutes);
app.use('/api/logos', logoRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/payments', paymentRoutes);  // mount separately
app.use('/api/payment-status', paymentStatusRoutes); // mount separately

// CORS debug endpoint
app.get('/api/debug/cors', (req, res) => {
  res.json({
    origin: req.get('origin'),
    method: req.method,
    headers: req.headers
  });
});

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

// Global error handler
app.use(errorHandler);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`Enhanced image generation features active - supports multiple aspect ratios and improved accuracy`);
  console.log(`Available endpoints: 
  - POST /api/images/generate
  - POST /api/images/analyze-prompt
  - POST /api/images/suggest-styles
  - GET /api/images/options
  - POST /api/logos/generate
  - GET /api/logos/styles
  - GET /api/logos/color-themes`);
});

// Unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

// Direct test endpoint (only in development mode)
if (process.env.NODE_ENV === 'development') {
  const multer = require('multer');
  const ThumbnailController = require('./controllers/thumbnailController');
  console.log('Setting up direct test endpoint for thumbnail generation');
  const testUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }
  }).fields([
    { name: 'userImages', maxCount: 5 },
    { name: 'userAssets', maxCount: 5 },
    { name: 'userAsset', maxCount: 1 }
  ]);
  app.post('/api/test-thumbnail', (req, res, next) => {
    console.log('Processing direct test thumbnail request...');
    testUpload(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      req.user = { id: 'test-user-123' };
      try {
        await ThumbnailController.generateThumbnail(req, res, next);
      } catch (error) {
        next(error);
      }
    });
  });
}

module.exports = app;
