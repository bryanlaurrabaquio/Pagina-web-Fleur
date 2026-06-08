const { z } = require('zod');

const contactSchema = z.object({
  name: z.string().trim().min(2, 'El nombre es requerido').max(80),
  email: z.string().trim().toLowerCase().email('Email inválido'),
  phone: z
    .string()
    .trim()
    .regex(/^[\d\s+\-()]{7,20}$/, 'Teléfono inválido')
    .optional()
    .or(z.literal('')),
  subject: z.string().trim().max(120).optional(),
  message: z.string().trim().min(10, 'El mensaje debe tener al menos 10 caracteres').max(2000),
});

module.exports = { contactSchema };
