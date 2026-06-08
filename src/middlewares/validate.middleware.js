const { ZodError } = require('zod');
const ApiError = require('../utils/ApiError');

// Valida req.body / req.query / req.params contra un esquema Zod.
// Uso: validate(schema, 'body')
const validate = (schema, source = 'body') => (req, _res, next) => {
  try {
    req[source] = schema.parse(req[source]);
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const details = err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return next(ApiError.badRequest('Datos de entrada inválidos', details));
    }
    next(err);
  }
};

module.exports = { validate };
