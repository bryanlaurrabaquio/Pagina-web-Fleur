const productRepo = require('../repositories/product.repository');
const categoryRepo = require('../repositories/category.repository');
const ApiError = require('../utils/ApiError');

const slugify = (str) =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

// Construye el filtro Prisma a partir del query validado.
async function list(query) {
  const { q, category, featured, discount, inStock, minPrice, maxPrice, page, limit, sort } = query;

  const where = { active: true };

  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { tag: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (category) where.category = { slug: category };
  if (featured) where.featured = featured === 'true';
  if (discount) where.discount = discount === 'true';
  if (inStock === 'true') where.stock = { gt: 0 };

  if (minPrice != null || maxPrice != null) {
    where.price = {};
    if (minPrice != null) where.price.gte = minPrice;
    if (maxPrice != null) where.price.lte = maxPrice;
  }

  const orderByMap = {
    recent: { createdAt: 'desc' },
    price_asc: { price: 'asc' },
    price_desc: { price: 'desc' },
    rating: { rating: 'desc' },
  };

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    productRepo.findMany({ where, orderBy: orderByMap[sort], skip, take: limit }),
    productRepo.count(where),
  ]);

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getByIdentifier(identifier) {
  // Permite buscar por id numérico, sku o slug.
  let product = null;
  if (/^\d+$/.test(identifier)) product = await productRepo.findById(Number(identifier));
  if (!product) product = await productRepo.findBySku(identifier);
  if (!product) product = await productRepo.findBySlug(identifier);
  if (!product) throw ApiError.notFound('Producto no encontrado');
  return product;
}

async function featured() {
  const { items } = await list({ featured: 'true', page: 1, limit: 12, sort: 'recent' });
  return items;
}

async function discounted() {
  const { items } = await list({ discount: 'true', page: 1, limit: 12, sort: 'recent' });
  return items;
}

async function validateCategory(categoryId) {
  if (categoryId == null) return;
  const cat = await categoryRepo.findById(categoryId);
  if (!cat) throw ApiError.badRequest('La categoría indicada no existe');
}

async function create(data) {
  await validateCategory(data.categoryId);
  const slug = slugify(data.name);
  return productRepo.create({ ...data, slug });
}

async function update(id, data) {
  const existing = await productRepo.findById(id);
  if (!existing) throw ApiError.notFound('Producto no encontrado');
  await validateCategory(data.categoryId);

  const patch = { ...data };
  if (data.name) patch.slug = slugify(data.name);
  return productRepo.update(id, patch);
}

async function remove(id) {
  const existing = await productRepo.findById(id);
  if (!existing) throw ApiError.notFound('Producto no encontrado');
  await productRepo.remove(id);
}

module.exports = { list, getByIdentifier, featured, discounted, create, update, remove };
