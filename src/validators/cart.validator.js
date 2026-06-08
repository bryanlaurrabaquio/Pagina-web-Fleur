const { z } = require('zod');

// Acepta productId (int) o sku (string como 'p1') para compatibilidad con el frontend.
const addItemSchema = z
  .object({
    productId: z.number().int().positive().optional(),
    sku: z.string().trim().optional(),
    quantity: z.number().int().positive().max(99).default(1),
  })
  .refine((d) => d.productId || d.sku, {
    message: 'Debes enviar productId o sku',
  });

const updateItemSchema = z.object({
  quantity: z.number().int().min(0).max(99),
});

module.exports = { addItemSchema, updateItemSchema };
