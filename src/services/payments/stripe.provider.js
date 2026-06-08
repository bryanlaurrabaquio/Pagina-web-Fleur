const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');
const paymentRepo = require('../../repositories/payment.repository');
const orderRepo = require('../../repositories/order.repository');

// Cliente Stripe cargado de forma perezosa: la app no se rompe si el paquete
// no está instalado o la llave no está configurada (solo falla al usarlo).
let _stripe;
function client() {
  if (!env.stripeSecretKey) {
    throw ApiError.badRequest('STRIPE_SECRET_KEY no está configurada en .env');
  }
  if (!_stripe) {
    let Stripe;
    try {
      Stripe = require('stripe');
    } catch {
      throw ApiError.badRequest('Falta instalar el paquete "stripe" (ejecuta: npm install stripe)');
    }
    _stripe = Stripe(env.stripeSecretKey);
  }
  return _stripe;
}

// Crea una Checkout Session de Stripe a partir del pedido.
async function createCheckout(order) {
  const stripe = client();

  const line_items = order.items.map((it) => ({
    price_data: {
      currency: 'mxn',
      product_data: {
        name: it.name,
        ...(it.image ? { images: [it.image] } : {}),
      },
      unit_amount: Math.round(it.price * 100), // Stripe usa centavos
    },
    quantity: it.quantity,
  }));

  // Envío como concepto aparte (si no es gratis)
  if (order.shippingCost > 0) {
    line_items.push({
      price_data: {
        currency: 'mxn',
        product_data: { name: 'Envío' },
        unit_amount: Math.round(order.shippingCost * 100),
      },
      quantity: 1,
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items,
    success_url: `${env.frontendUrl}?payment=success&order=${order.id}`,
    cancel_url: `${env.frontendUrl}?payment=cancel&order=${order.id}`,
    client_reference_id: String(order.id),
    metadata: { orderId: String(order.id) },
  });

  // Guarda el pago en estado pendiente con el id de sesión de Stripe
  await paymentRepo.upsert(order.id, {
    provider: 'stripe',
    status: 'pendiente',
    amount: order.total,
    currency: 'MXN',
    stripeSessionId: session.id,
  });

  return {
    provider: 'stripe',
    redirect: true, // el frontend debe redirigir a checkoutUrl
    checkoutUrl: session.url,
    sessionId: session.id,
    orderId: order.id,
    amount: order.total,
    currency: 'MXN',
  };
}

// Procesa el webhook de Stripe. Verifica la firma con STRIPE_WEBHOOK_SECRET.
async function handleWebhook(rawBody, signature) {
  const stripe = client();
  if (!env.stripeWebhookSecret) {
    throw ApiError.badRequest('STRIPE_WEBHOOK_SECRET no está configurada en .env');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.stripeWebhookSecret);
  } catch (err) {
    throw ApiError.badRequest(`Firma de webhook inválida: ${err.message}`);
  }

  // Pago completado → marcar pedido como pagado
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = Number(session.metadata?.orderId || session.client_reference_id);
    if (orderId) {
      await orderRepo.markPaid(orderId, {
        provider: 'stripe',
        stripeSessionId: session.id,
        externalPaymentId:
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id,
        rawResponse: event,
      });
    }
  }

  return { received: true, type: event.type };
}

module.exports = { createCheckout, handleWebhook };
