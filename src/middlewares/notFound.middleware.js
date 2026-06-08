const ApiError = require('../utils/ApiError');

// 404 para rutas no definidas.
function notFound(req, _res, next) {
  next(ApiError.notFound(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

module.exports = { notFound };
