const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const env = require('./config/env');
const routes = require('./routes');
const { apiLimiter } = require('./middlewares/rateLimit.middleware');
const { sanitize } = require('./middlewares/sanitize.middleware');
const { notFound } = require('./middlewares/notFound.middleware');
const { errorHandler } = require('./middlewares/error.middleware');

const app = express();

// Confianza en proxy (necesario para rate-limit detrás de reverse proxy)
app.set('trust proxy', 1);

// --- Seguridad ---
// crossOriginResourcePolicy 'cross-origin' permite que el frontend (Live Server,
// otro origen) cargue los scripts públicos /fleur-api.js y /fleur-ui.js.
// Mantenemos el resto de protecciones de Helmet activas.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  })
);

// CORS — solo orígenes permitidos (o todos si la lista está vacía, útil en dev)
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.corsOrigins.length === 0 || env.corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origen no permitido por CORS'));
    },
    credentials: true,
  })
);

// --- Parsers ---
// Capturamos el cuerpo crudo (req.rawBody) para verificar firmas de webhooks (Stripe/MP).
app.use(
  express.json({
    limit: '1mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// --- Sanitización básica ---
app.use(sanitize);

// --- Logging ---
if (!env.isProd) app.use(morgan('dev'));

// --- Estáticos (sirve public/fleur-api.js para el frontend) ---
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- Rate limit general ---
app.use('/api', apiLimiter);

// --- Rutas ---
app.get('/', (_req, res) =>
  res.json({ success: true, message: '🌸 Fleur API — ver /api/health' })
);
app.use('/api', routes);

// --- 404 + manejo de errores (al final) ---
app.use(notFound);
app.use(errorHandler);

module.exports = app;
