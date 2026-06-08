const crypto = require('crypto');
const orderRepo = require('../repositories/order.repository');
const paymentRepo = require('../repositories/payment.repository');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const stripeProvider = require('./payments/stripe.provider');
const mercadopagoProvider = require('./payments/mercadopago.provider');

// ---- Helpers ----

// Carga un pedido validando propiedad (el dueño o un admin).
async function loadOwnedOrder(userId, orderId, isAdmin) {
  const order = await orderRepo.findById(orderId);
  if (!order) throw ApiError.notFound('Pedido no encontrado');
  if (!isAdmin && order.userId !== userId) throw ApiError.forbidden('Este pedido no te pertenece');
  return order;
}

// ---- MOCK ----

// Crea una "sesión" de pago ficticia para pruebas locales.
async function createMockCheckout(order) {
  const sessionId = `mock_sess_${crypto.randomBytes(8).toString('hex')}`;
  const payment = await paymentRepo.upsert(order.id, {
    provider: 'mock',
    status: 'pendiente',
    amount: order.total,
    currency: 'MXN',
    sessionId,
  });
  return {
    provider: 'mock',
    sessionId,
    // El frontend confirma llamando a este endpoint (con Stripe/MP sería la URL del proveedor).
    checkoutUrl: `/api/payments/confirm?orderId=${order.id}&session=${sessionId}`,
    redirect: false, // el mock no redirige a un sitio externo
    amount: order.total,
    currency: 'MXN',
    orderId: order.id,
    payment,
  };
}

// ---- API pública del servicio ----

/**
 * Genera el checkout según PAYMENT_PROVIDER.
 *  - mock        → sesión local de prueba (implementado)
 *  - stripe      → se implementa en el Módulo 6
 *  - mercadopago → se implementa en el Módulo 7
 */
async function createCheckout(userId, orderId, isAdmin = false) {
  const order = await loadOwnedOrder(userId, orderId, isAdmin);
  if (order.status !== 'pendiente') {
    throw ApiError.badRequest(`El pedido no está pendiente de pago (estado: ${order.status})`);
  }

  switch (env.paymentProvider) {
    case 'mock':
      return createMockCheckout(order);
    case 'stripe':
      return stripeProvider.createCheckout(order);
    case 'mercadopago':
      return mercadopagoProvider.createCheckout(order);
    default:
      throw ApiError.badRequest(`PAYMENT_PROVIDER inválido: "${env.paymentProvider}"`);
  }
}

// Webhook de Stripe (público, verificado por firma). No requiere sesión.
async function handleStripeWebhook(rawBody, signature) {
  return stripeProvider.handleWebhook(rawBody, signature);
}

// Webhook de Mercado Pago (público, verificado por firma). No requiere sesión.
async function handleMercadoPagoWebhook(req) {
  return mercadopagoProvider.handleWebhook(req);
}

/**
 * Confirma el pago (en mock lo dispara el frontend; con Stripe/MP lo hará el webhook).
 * Efecto: payment.status = aprobado, order.paymentStatus = aprobado, order.status = pagado.
 */
async function confirmPayment(userId, orderId, sessionId, isAdmin = false) {
  const order = await loadOwnedOrder(userId, orderId, isAdmin);
  if (order.status === 'pagado') return order; // idempotente

  await orderRepo.markPaid(orderId, {
    provider: env.paymentProvider,
    sessionId: sessionId || undefined,
    reference: `mock_ref_${crypto.randomBytes(6).toString('hex')}`,
    externalPaymentId: `mock_pay_${crypto.randomBytes(6).toString('hex')}`,
  });

  return orderRepo.findById(orderId);
}

// GET /api/payments/:orderId — consultar el estado del pago de un pedido.
async function getPaymentByOrder(userId, orderId, isAdmin = false) {
  const order = await loadOwnedOrder(userId, orderId, isAdmin);
  const payment = await paymentRepo.findByOrder(order.id);
  return {
    orderId: order.id,
    orderStatus: order.status,
    paymentStatus: order.paymentStatus,
    payment: payment || null,
  };
}

module.exports = {
  createCheckout,
  confirmPayment,
  getPaymentByOrder,
  handleStripeWebhook,
  handleMercadoPagoWebhook,
};
