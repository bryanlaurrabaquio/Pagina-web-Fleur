require('dotenv').config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`❌ Falta la variable de entorno requerida: ${name}`);
  }
  return value;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),

  databaseUrl: required('DATABASE_URL'),

  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  corsOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  // URL del frontend (para success_url / cancel_url de las pasarelas)
  frontendUrl:
    process.env.FRONTEND_URL ||
    (process.env.CORS_ORIGINS || '').split(',')[0].trim() ||
    'http://localhost:5500',

  // URL pública del backend (para notification_url de Mercado Pago).
  // Vacía en local; en pruebas usa un túnel (ngrok) o tu dominio.
  backendUrl: process.env.BACKEND_URL || '',

  freeShippingThreshold: parseFloat(process.env.FREE_SHIPPING_THRESHOLD || '500'),
  shippingCost: parseFloat(process.env.SHIPPING_COST || '80'),

  paymentProvider: process.env.PAYMENT_PROVIDER || 'mock',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  mercadopagoAccessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
  mercadopagoWebhookSecret: process.env.MERCADOPAGO_WEBHOOK_SECRET || '',

  get isProd() {
    return this.nodeEnv === 'production';
  },
};

module.exports = env;
