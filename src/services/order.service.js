const orderRepo = require('../repositories/order.repository');
const cartRepo = require('../repositories/cart.repository');
const ApiError = require('../utils/ApiError');
const { calculateTotals } = require('../utils/pricing');

// Crea un pedido a partir del carrito actual del usuario.
async function createFromCart(userId, data) {
  const cart = await cartRepo.findByUser(userId);
  if (!cart || cart.items.length === 0) {
    throw ApiError.badRequest('El carrito está vacío');
  }

  // Validar stock de cada item
  for (const it of cart.items) {
    if (it.product.stock < it.quantity) {
      throw ApiError.badRequest(`Stock insuficiente para "${it.product.name}"`);
    }
  }

  const items = cart.items.map((it) => ({
    productId: it.product.id,
    name: it.product.name,
    image: it.product.image,
    price: it.product.price,
    quantity: it.quantity,
  }));

  const totals = calculateTotals(items);

  const orderData = {
    userId,
    status: 'pendiente',
    paymentStatus: 'pendiente',
    deliveryName: data.deliveryName || null,
    deliveryPhone: data.deliveryPhone || null,
    deliveryAddress: data.address || data.deliveryAddress,
    deliveryDate: data.deliveryDate || null,
    deliveryTime: data.deliveryTime || null,
    cardMessage: data.cardMessage || null,
    subtotal: totals.subtotal,
    shippingCost: totals.shipping,
    total: totals.total,
  };

  const order = await orderRepo.createWithItems(orderData, items);

  // Vaciar carrito tras crear el pedido
  await cartRepo.clear(cart.id);

  return order;
}

async function getUserOrders(userId) {
  return orderRepo.listByUser(userId);
}

async function getOrderForUser(userId, orderId, isAdmin = false) {
  const order = await orderRepo.findById(orderId);
  if (!order) throw ApiError.notFound('Pedido no encontrado');
  if (!isAdmin && order.userId !== userId) throw ApiError.forbidden('Este pedido no te pertenece');
  return order;
}

async function listAll(query) {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const where = {};
  if (query.status) where.status = query.status;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    orderRepo.listAll({ where, skip, take: limit }),
    orderRepo.count(where),
  ]);
  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

async function updateStatus(orderId, status) {
  const order = await orderRepo.findById(orderId);
  if (!order) throw ApiError.notFound('Pedido no encontrado');
  return orderRepo.updateStatus(orderId, status);
}

module.exports = { createFromCart, getUserOrders, getOrderForUser, listAll, updateStatus };
