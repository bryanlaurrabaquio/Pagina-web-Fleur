const ApiError = require('../utils/ApiError');

// Guard genérico de roles. Usar DESPUÉS de authenticate.
// Ej: requireRole('admin') o requireRole('admin', 'vendedor')
function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('No tienes permisos para esta acción'));
    }
    next();
  };
}

// Atajo: requiere rol admin.
const requireAdmin = requireRole('admin');

module.exports = { requireAdmin, requireRole };
