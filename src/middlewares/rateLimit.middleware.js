const rateLimit = require('express-rate-limit');

// Límite general para toda la API.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas solicitudes, intenta más tarde.' },
});

// Límite estricto para autenticación (anti fuerza bruta).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiados intentos de autenticación, espera unos minutos.' },
});

module.exports = { apiLimiter, authLimiter };
