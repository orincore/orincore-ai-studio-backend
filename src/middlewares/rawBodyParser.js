/**
 * Middleware to capture the raw request body for webhook signature verification
 * This is necessary because Express parses the body before our route handlers,
 * but we need the raw body to verify webhook signatures
 */
const rawBodyParser = (req, res, next) => {
  // Skip if not a webhook route
  if (!req.originalUrl.includes('/webhooks/')) {
    return next();
  }
  
  let data = '';
  
  // Collect data chunks
  req.on('data', chunk => {
    data += chunk;
  });
  
  // When all data is received
  req.on('end', () => {
    // Store raw body for signature verification
    req.rawBody = data;
    
    // If content-type is application/json, parse the body
    if (req.headers['content-type'] === 'application/json') {
      try {
        req.body = JSON.parse(data);
      } catch (e) {
        console.error('Error parsing JSON body:', e);
        // Keep the raw data in body if parsing fails
        req.body = data;
      }
    }
    
    next();
  });
  
  // Handle errors
  req.on('error', (err) => {
    console.error('Error reading request body:', err);
    next(err);
  });
};

module.exports = rawBodyParser; 