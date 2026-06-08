const jwt = require('jsonwebtoken');
const env = require('../config/env');

// Firma un token con los claims del usuario.
// claims esperados: { userId, email, role }
function signToken(claims) {
  return jwt.sign(claims, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

// Verifica y decodifica. Lanza TokenExpiredError o JsonWebTokenError (con .name).
function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

module.exports = { signToken, verifyToken };
