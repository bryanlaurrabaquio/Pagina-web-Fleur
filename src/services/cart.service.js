const cartRepo = require('../repositories/cart.repository');
const productRepo = require('../repositories/product.repository');
const ApiError = require('../utils/ApiError');
const { calculateTotals } = require('../utils/pricing');

// Resuelve un producto por productId o sku (compatibilidad con el frontend).
async function resolveProduct({ productId, sku }) {
  let product = null;
  if (productId) product = await productRepo.findById(productId);
  else if (sku) product = await productRepo.findBySku(sku);
  if (!product) throw ApiError.notFound('Producto no encontrado');
  if (!product.active) throw ApiError.badRequest('El producto no está disponible');
  return product;
}

// Da formato al carrito con totales calculados.
function formatCart(cart) {
  const items = (cart.items || []).map((it) => ({
    id: it.id,
    productId: it.productId,
    sku: it.product.sku,
    name: it.product.name,
    image: it.product.image,
    price: it.product.price,
    quantity: it.quantity,
    lineTotal: Math.round(it.product.price * it.quantity * 100) / 100,
    stock: it.product.stock,
  }));
  const totals = calculateTotals(items);
  const count = items.reduce((s, i) => s + i.quantity, 0);
  return { id: cart.id, items, count, ...totals };
}

async function getCart(userId) {
  const cart = await cartRepo.getOrCreateByUser(userId);
  return formatCart(cart);
}

async function addItem(userId, payload) {
  const product = await resolveProduct(payload);
  const quantity = payload.quantity || 1;

  if (product.stock < quantity) throw ApiError.badRequest('Stock insuficiente');

  const cart = await cartRepo.getOrCreateByUser(userId);
  await cartRepo.upsertItem(cart.id, product.id, quantity);

  return getCart(userId);
}

async function updateItem(userId, productId, quantity) {
  const cart = await cartRepo.getOrCreateByUser(userId);
  const item = await cartRepo.findItem(cart.id, productId);
  if (!item) throw ApiError.notFound('El producto no está en el carrito');

  if (quantity <= 0) {
    await cartRepo.removeItem(cart.id, productId);
  } else {
    const product = await productRepo.findById(productId);
    if (product && product.stock < quantity) throw ApiError.badRequest('Stock insuficiente');
    await cartRepo.setItemQuantity(cart.id, productId, quantity);
  }
  return getCart(userId);
}

async function removeItem(userId, productId) {
  const cart = await cartRepo.getOrCreateByUser(userId);
  const item = await cartRepo.findItem(cart.id, productId);
  if (!item) throw ApiError.notFound('El producto no está en el carrito');
  await cartRepo.removeItem(cart.id, productId);
  return getCart(userId);
}

async function clearCart(userId) {
  const cart = await cartRepo.getOrCreateByUser(userId);
  await cartRepo.clear(cart.id);
  return getCart(userId);
}

module.exports = { getCart, addItem, updateItem, removeItem, clearCart, formatCart };
