/**
 * Middleware to capture the raw request body for webhook signature verification
 * This is needed because body-parser normally consumes the request body
 * but webhook signatures are calculated against the raw body
 */
const rawBodyMiddleware = (req, res, next) => {
  let rawBody = '';
  
  // Skip for empty body requests
  if (req.headers['content-length'] === '0') {
    return next();
  }
  
  req.on('data', chunk => {
    rawBody += chunk.toString();
  });
  
  req.on('end', () => {
    req.rawBody = rawBody;
    next();
  });
};

module.exports = rawBodyMiddleware; 