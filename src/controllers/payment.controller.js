const paymentService = require('../services/payment.service');
const asyncHandler = require('../utils/asyncHandler');

const createCheckout = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const result = await paymentService.createCheckout(req.user.id, req.body.orderId, isAdmin);
  res.status(201).json({ success: true, message: 'Sesión de pago creada', data: result });
});

const confirm = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const orderId = Number(req.body.orderId || req.query.orderId);
  const sessionId = req.body.sessionId || req.query.session;
  const order = await paymentService.confirmPayment(req.user.id, orderId, sessionId, isAdmin);
  res.json({ success: true, message: 'Pago confirmado, pedido marcado como pagado', data: order });
});

const getByOrder = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const data = await paymentService.getPaymentByOrder(req.user.id, Number(req.params.orderId), isAdmin);
  res.json({ success: true, data });
});

// Webhook de Stripe — público. Usa el cuerpo crudo (req.rawBody) para verificar la firma.
const stripeWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const result = await paymentService.handleStripeWebhook(req.rawBody, signature);
  res.json(result);
});

// Webhook de Mercado Pago — público. Verifica firma y consulta el pago real.
const mercadopagoWebhook = asyncHandler(async (req, res) => {
  const result = await paymentService.handleMercadoPagoWebhook(req);
  res.json(result);
});

module.exports = { createCheckout, confirm, getByOrder, stripeWebhook, mercadopagoWebhook };
