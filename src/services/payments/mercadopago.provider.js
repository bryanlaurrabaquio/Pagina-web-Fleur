const crypto = require('crypto');
const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');
const paymentRepo = require('../../repositories/payment.repository');
const orderRepo = require('../../repositories/order.repository');

// SDK de Mercado Pago cargado de forma perezosa (no rompe la app si falta).
let _mp;
function sdk() {
  if (!env.mercadopagoAccessToken) {
    throw ApiError.badRequest('MERCADOPAGO_ACCESS_TOKEN no está configurada en .env');
  }
  if (!_mp) {
    let mp;
    try {
      mp = require('mercadopago');
    } catch {
      throw ApiError.badRequest('Falta instalar el paquete "mercadopago" (ejecuta: npm install mercadopago)');
    }
    const config = new mp.MercadoPagoConfig({ accessToken: env.mercadopagoAccessToken });
    _mp = { mp, config };
  }
  return _mp;
}

// Crea una preferencia de pago y devuelve el init_point para redirigir.
async function createCheckout(order) {
  const { mp, config } = sdk();
  const Preference = mp.Preference;

  const items = order.items.map((it) => ({
    title: it.name,
    quantity: it.quantity,
    unit_price: Number(it.price),
    currency_id: 'MXN',
    ...(it.image ? { picture_url: it.image } : {}),
  }));
  if (order.shippingCost > 0) {
    items.push({ title: 'Envío', quantity: 1, unit_price: Number(order.shippingCost), currency_id: 'MXN' });
  }

  const body = {
    items,
    external_reference: String(order.id),
    metadata: { order_id: order.id },
    back_urls: {
      success: `${env.frontendUrl}?payment=success&order=${order.id}`,
      failure: `${env.frontendUrl}?payment=cancel&order=${order.id}`,
      pending: `${env.frontendUrl}?payment=pending&order=${order.id}`,
    },
    auto_return: 'approved',
    // notification_url solo si hay URL pública (en local usa un túnel como ngrok)
    ...(env.backendUrl ? { notification_url: `${env.backendUrl}/api/payments/mercadopago/webhook` } : {}),
  };

  const pref = await new Preference(config).create({ body });

  await paymentRepo.upsert(order.id, {
    provider: 'mercadopago',
    status: 'pendiente',
    amount: order.total,
    currency: 'MXN',
    mercadoPagoPreferenceId: pref.id,
  });

  return {
    provider: 'mercadopago',
    redirect: true,
    checkoutUrl: pref.init_point,
    preferenceId: pref.id,
    orderId: order.id,
    amount: order.total,
    currency: 'MXN',
  };
}

// Verifica la firma del webhook (x-signature) si hay secreto configurado.
function verifySignature(req) {
  const secret = env.mercadopagoWebhookSecret;
  if (!secret) return; // sin secreto → omitir verificación (modo prueba)

  const signature = req.headers['x-signature'];
  const requestId = req.headers['x-request-id'];
  if (!signature) throw ApiError.badRequest('Falta el header x-signature');

  const parts = Object.fromEntries(
    signature.split(',').map((p) => p.split('=').map((s) => s.trim()))
  );
  const { ts, v1 } = parts;
  const dataId = String(req.query['data.id'] || req.query.id || '').toLowerCase();

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  if (hmac !== v1) throw ApiError.badRequest('Firma de webhook de Mercado Pago inválida');
}

// Procesa la notificación del webhook. MP avisa con type=payment y data.id.
async function handleWebhook(req) {
  verifySignature(req);
  const { mp, config } = sdk();

  const type = req.query.type || req.body?.type;
  const paymentId = req.query['data.id'] || req.body?.data?.id;

  // Solo nos interesan notificaciones de pago
  if (type !== 'payment' || !paymentId) {
    return { received: true, ignored: true };
  }

  // Consulta el pago real en Mercado Pago para conocer su estado verdadero
  const Payment = mp.Payment;
  const info = await new Payment(config).get({ id: paymentId });

  const orderId = Number(info.external_reference || info.metadata?.order_id);
  if (orderId && info.status === 'approved') {
    await orderRepo.markPaid(orderId, {
      provider: 'mercadopago',
      externalPaymentId: String(info.id),
      rawResponse: info,
    });
  }

  return { received: true, status: info.status, orderId };
}

module.exports = { createCheckout, handleWebhook };
