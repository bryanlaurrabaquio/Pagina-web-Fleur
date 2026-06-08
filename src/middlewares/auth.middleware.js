const { verifyToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');

// Extrae el Bearer token del header Authorization.
function extractToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null;
}

// Verifica el token y devuelve el usuario de la BD, o lanza ApiError.
async function resolveUser(token) {
  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Token expirado, inicia sesión de nuevo');
    }
    throw ApiError.unauthorized('Token inválido');
  }

  // Soporta el claim nuevo (userId) y el antiguo (sub) por compatibilidad.
  const userId = payload.userId || payload.sub;
  if (!userId) throw ApiError.unauthorized('Token sin identidad de usuario');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) throw ApiError.unauthorized('Usuario no encontrado');
  return user;
}

// Protege rutas: requiere un Bearer token válido. Inyecta req.user.
const authenticate = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized('Token no proporcionado');
  req.user = await resolveUser(token);
  next();
});

// Autenticación opcional: si hay token válido inyecta req.user; si no, continúa sin error.
// Útil para que el frontend muestre estado de sesión en rutas públicas.
const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    req.user = await resolveUser(token);
  } catch {
    /* token inválido/expirado: se trata como invitado */
  }
  next();
});

module.exports = { authenticate, optionalAuth };
