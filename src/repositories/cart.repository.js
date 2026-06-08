const prisma = require('../config/prisma');

const itemInclude = {
  items: {
    orderBy: { createdAt: 'asc' },
    include: { product: { include: { category: { select: { slug: true, name: true } } } } },
  },
};

module.exports = {
  // Obtiene el carrito del usuario, creándolo si no existe.
  getOrCreateByUser: async (userId) => {
    let cart = await prisma.cart.findUnique({ where: { userId }, include: itemInclude });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId }, include: itemInclude });
    }
    return cart;
  },

  findByUser: (userId) => prisma.cart.findUnique({ where: { userId }, include: itemInclude }),

  upsertItem: (cartId, productId, quantity) =>
    prisma.cartItem.upsert({
      where: { cartId_productId: { cartId, productId } },
      update: { quantity: { increment: quantity } },
      create: { cartId, productId, quantity },
    }),

  setItemQuantity: (cartId, productId, quantity) =>
    prisma.cartItem.update({
      where: { cartId_productId: { cartId, productId } },
      data: { quantity },
    }),

  findItem: (cartId, productId) =>
    prisma.cartItem.findUnique({ where: { cartId_productId: { cartId, productId } } }),

  removeItem: (cartId, productId) =>
    prisma.cartItem.delete({ where: { cartId_productId: { cartId, productId } } }),

  clear: (cartId) => prisma.cartItem.deleteMany({ where: { cartId } }),
};
