/**
 * Middleware to capture the raw request body for webhook signature verification
 * This is necessary because Express parses the body before our route handlers,
 * but we need the raw body to verify webhook signatures
 */
const rawBodyParser = (req, res, next) => {
  // Skip if not a webhook route or if body has already been parsed/consumed
  if (!req.originalUrl.includes('/webhooks/') || req.body || !req.readable) {
    return next();
  }
  
  // Create a buffer to store chunks
  const chunks = [];
  
  // Collect data chunks
  req.on('data', chunk => {
    chunks.push(chunk);
  });
  
  // When all data is received
  req.on('end', () => {
    // Combine chunks into a single buffer
    const buffer = Buffer.concat(chunks);
    
    // Store raw body as buffer for signature verification
    req.rawBody = buffer;
    
    // If content-type is application/json, parse the body
    if (req.headers['content-type'] === 'application/json') {
      try {
        const data = buffer.toString('utf8');
        req.body = JSON.parse(data);
      } catch (e) {
        console.error('Error parsing JSON body:', e);
        // Keep the raw data in body if parsing fails
        req.body = buffer;
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