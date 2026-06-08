const { z } = require('zod');

const createCheckoutSchema = z.object({
  orderId: z.number().int().positive('orderId es requerido'),
});

const confirmPaymentSchema = z.object({
  orderId: z.number().int().positive(),
  sessionId: z.string().trim().optional(),
});

module.exports = { createCheckoutSchema, confirmPaymentSchema };
