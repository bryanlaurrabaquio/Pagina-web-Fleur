const { Router } = require('express');
const paymentController = require('../controllers/payment.controller');
const { validate } = require('../middlewares/validate.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const { createCheckoutSchema } = require('../validators/payment.validator');

const router = Router();

// ---- Webhooks PÚBLICOS (sin auth) — deben ir ANTES de router.use(authenticate) ----
// El cuerpo crudo lo captura express.json({ verify }) en app.js → req.rawBody
router.post('/stripe/webhook', paymentController.stripeWebhook);
router.post('/mercadopago/webhook', paymentController.mercadopagoWebhook);

// ---- A partir de aquí, todo requiere sesión ----
router.use(authenticate);

// Checkout según PAYMENT_PROVIDER (mock | stripe | mercadopago)
router.post('/create-checkout', validate(createCheckoutSchema), paymentController.createCheckout);

// Confirmación del pago (en producción: webhook del proveedor)
router.post('/confirm', paymentController.confirm);
router.get('/confirm', paymentController.confirm); // permite confirmar desde la checkoutUrl mock

// Consultar el estado de pago de un pedido
router.get('/:orderId', paymentController.getByOrder);

module.exports = router;
