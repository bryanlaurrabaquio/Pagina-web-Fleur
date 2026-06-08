const { Prisma } = require('@prisma/client');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

// Manejo centralizado de errores. Debe ir al final de la cadena de middlewares.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Error interno del servidor';
  let details = err.details || null;

  // Errores conocidos de Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = 409;
      const field = err.meta?.target?.join?.(', ') || 'campo único';
      message = `Ya existe un registro con ese valor (${field})`;
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Registro no encontrado';
    } else {
      statusCode = 400;
      message = 'Error en la base de datos';
    }
  }

  // No exponer detalles internos en errores 500
  if (statusCode >= 500 && !err.isOperational) {
    if (!env.isProd) {
      // En desarrollo sí mostramos el stack para depurar
      console.error('💥', err);
    } else {
      message = 'Error interno del servidor';
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { errors: details } : {}),
    ...(!env.isProd && statusCode >= 500 ? { stack: err.stack } : {}),
  });
}

module.exports = { errorHandler };
