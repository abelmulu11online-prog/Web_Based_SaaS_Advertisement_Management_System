// utils/jwt.js — JWT generation and verification utilities
// Uses jsonwebtoken and central config for secret and expiration.

import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

/**
 * Generate a signed JWT for the given payload.
 * @param {object} payload - The payload to embed in the token.
 * @returns {string} Signed JWT.
 */
export function generateToken(payload) {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

/**
 * Verify a JWT and return the decoded payload.
 * Throws an Error with appropriate code and statusCode if verification fails.
 * @param {string} token - JWT string.
 * @returns {object} Decoded token payload.
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      const error = new Error('Token expired');
      error.code = 'TOKEN_EXPIRED';
      error.statusCode = 401;
      throw error;
    }
    if (err.name === 'JsonWebTokenError') {
      const error = new Error('Invalid token');
      error.code = 'INVALID_TOKEN';
      error.statusCode = 401;
      throw error;
    }
    if (err.name === 'NotBeforeError') {
      const error = new Error('Token not yet valid');
      error.code = 'TOKEN_NOT_YET_VALID';
      error.statusCode = 401;
      throw error;
    }
    // Fallback for any other JWT errors
    const error = new Error('Invalid token');
    error.code = 'INVALID_TOKEN';
    error.statusCode = 401;
    throw error;
  }
}
