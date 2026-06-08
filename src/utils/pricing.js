const env = require('../config/env');

// Calcula subtotal, envío y total a partir de items [{ price, quantity }].
// Envío gratis si el subtotal supera el umbral (default $500 MXN).
function calculateTotals(items) {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const shipping = subtotal >= env.freeShippingThreshold || subtotal === 0 ? 0 : env.shippingCost;
  const total = subtotal + shipping;
  return {
    subtotal: round(subtotal),
    shipping: round(shipping),
    total: round(total),
    freeShipping: shipping === 0 && subtotal > 0,
    freeShippingThreshold: env.freeShippingThreshold,
  };
}

const round = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

module.exports = { calculateTotals };
