/**
 * Error handling middleware
 * Handles all errors in the application and sends appropriate responses
 */

// Custom error handler for more detailed responses
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  
  // Format the error response
  const errorResponse = {
    error: {
      message: err.message || 'Server Error',
      status: statusCode,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        details: err.details || null
      })
    }
  };
  
  // Log errors in development/staging environment
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[ERROR] ${err.name || 'Error'}: ${err.message}`);
    if (err.stack) console.error(err.stack);
  }
  
  // Send error response
  res.status(statusCode).json(errorResponse);
};

// Custom API error class
class ApiError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  errorHandler,
  ApiError
}; 