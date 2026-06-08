const { z } = require('zod');

const createOrderSchema = z.object({
  address: z.string().trim().min(5, 'La dirección de entrega es requerida').max(300),
  deliveryName: z.string().trim().max(80).optional(),
  deliveryPhone: z
    .string()
    .trim()
    .regex(/^[\d\s+\-()]{7,20}$/, 'Teléfono inválido')
    .optional()
    .or(z.literal('')),
  deliveryDate: z.coerce.date().optional(),
  deliveryTime: z.string().trim().max(40).optional(), // ej: "10:00 - 14:00"
  cardMessage: z.string().trim().max(500).optional(), // mensaje para tarjeta floral
});

const ORDER_STATUSES = ['pendiente', 'pagado', 'preparando', 'enviado', 'entregado', 'cancelado'];

const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

module.exports = { createOrderSchema, updateOrderStatusSchema, ORDER_STATUSES };
