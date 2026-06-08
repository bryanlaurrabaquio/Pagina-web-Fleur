const { z } = require('zod');

const createProductSchema = z.object({
  sku: z.string().trim().min(1).max(40),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
  price: z.number().positive('El precio debe ser mayor a 0'),
  oldPrice: z.number().positive().nullable().optional(),
  image: z.string().url('La imagen debe ser una URL válida').optional(),
  tag: z.string().trim().max(40).optional(),
  stock: z.number().int().min(0).default(0),
  rating: z.number().min(0).max(5).optional(),
  reviews: z.number().int().min(0).optional(),
  featured: z.boolean().optional(),
  discount: z.boolean().optional(),
  active: z.boolean().optional(),
  categoryId: z.number().int().positive().nullable().optional(),
});

// En update todos los campos son opcionales
const updateProductSchema = createProductSchema.partial();

const listProductsQuerySchema = z.object({
  q: z.string().trim().optional(),
  category: z.string().trim().optional(), // slug
  featured: z.enum(['true', 'false']).optional(),
  discount: z.enum(['true', 'false']).optional(),
  inStock: z.enum(['true', 'false']).optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  sort: z.enum(['recent', 'price_asc', 'price_desc', 'rating']).default('recent'),
});

module.exports = { createProductSchema, updateProductSchema, listProductsQuerySchema };
