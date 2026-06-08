const { z } = require('zod');

const subscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email inválido'),
});

module.exports = { subscribeSchema };
