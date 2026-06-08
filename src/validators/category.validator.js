const { z } = require('zod');

const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'El slug solo admite minúsculas, números y guiones')
    .optional(),
  description: z.string().trim().max(500).optional(),
  image: z.string().url().optional(),
});

const updateCategorySchema = createCategorySchema.partial();

module.exports = { createCategorySchema, updateCategorySchema };
