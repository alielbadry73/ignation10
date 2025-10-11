const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

// Sanitize data against NoSQL injection attacks
const sanitizeData = mongoSanitize({
  replaceWith: '_'
});

// Rate limiting for different endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  sanitizeData,
  authLimiter,
  generalLimiter
};
