// Sanitización básica: recorta espacios y neutraliza llaves peligrosas ($ y .)
// en claves de objetos (mitiga inyección NoSQL/operadores) y limpia strings.
function sanitizeValue(value) {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === 'object') {
    const clean = {};
    for (const [key, val] of Object.entries(value)) {
      // Elimina claves que empiecen con $ o contengan . (operadores)
      if (key.startsWith('$') || key.includes('.')) continue;
      clean[key] = sanitizeValue(val);
    }
    return clean;
  }
  return value;
}

function sanitize(req, _res, next) {
  if (req.body && typeof req.body === 'object') req.body = sanitizeValue(req.body);
  if (req.params && typeof req.params === 'object') req.params = sanitizeValue(req.params);
  // No reasignamos req.query (getter de solo lectura en Express 5); saneamos in-place.
  if (req.query && typeof req.query === 'object') {
    for (const k of Object.keys(req.query)) {
      if (typeof req.query[k] === 'string') req.query[k] = req.query[k].trim();
    }
  }
  next();
}

module.exports = { sanitize };
