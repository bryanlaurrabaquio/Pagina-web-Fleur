const favoriteRepo = require('../repositories/favorite.repository');
const productRepo = require('../repositories/product.repository');
const ApiError = require('../utils/ApiError');

async function resolveProduct({ productId, sku }) {
  let product = null;
  if (productId) product = await productRepo.findById(productId);
  else if (sku) product = await productRepo.findBySku(sku);
  if (!product) throw ApiError.notFound('Producto no encontrado');
  return product;
}

function format(fav) {
  return {
    id: fav.id,
    productId: fav.productId,
    sku: fav.product.sku,
    name: fav.product.name,
    image: fav.product.image,
    price: fav.product.price,
    createdAt: fav.createdAt,
  };
}

async function list(userId) {
  const favs = await favoriteRepo.listByUser(userId);
  return favs.map(format);
}

async function add(userId, payload) {
  const product = await resolveProduct(payload);
  const existing = await favoriteRepo.find(userId, product.id);
  if (existing) throw ApiError.conflict('El producto ya está en favoritos');
  await favoriteRepo.create(userId, product.id);
  return list(userId);
}

async function remove(userId, productId) {
  const existing = await favoriteRepo.find(userId, productId);
  if (!existing) throw ApiError.notFound('El producto no está en favoritos');
  await favoriteRepo.remove(userId, productId);
  return list(userId);
}

module.exports = { list, add, remove };
