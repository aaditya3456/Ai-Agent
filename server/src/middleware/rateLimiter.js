import rateLimit from 'express-rate-limit';
import { errorResponse } from '../utils/apiResponse.js';

// Standard rate limiter for general API routes
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return errorResponse(res, 429, 'Too many requests, please try again later.', 'RATE_LIMIT_EXCEEDED');
  },
});

// Stricter rate limiter for sensitive authentication & AI routes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // Limit each IP to 30 auth requests per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return errorResponse(res, 429, 'Too many login/registration attempts. Please wait 15 minutes.', 'AUTH_RATE_LIMIT_EXCEEDED');
  },
});

// Rate limiter for AI and Agent operations to prevent abuse & cost spikes
export const aiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return errorResponse(res, 429, 'AI request limit reached. Please wait a few minutes.', 'AI_RATE_LIMIT_EXCEEDED');
  },
});
