const { z } = require('zod');

const addFavoriteSchema = z
  .object({
    productId: z.number().int().positive().optional(),
    sku: z.string().trim().optional(),
  })
  .refine((d) => d.productId || d.sku, { message: 'Debes enviar productId o sku' });

module.exports = { addFavoriteSchema };
