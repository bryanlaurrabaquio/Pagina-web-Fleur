const prisma = require('../config/prisma');

module.exports = {
  listByUser: (userId) =>
    prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { product: { include: { category: { select: { slug: true, name: true } } } } },
    }),

  find: (userId, productId) =>
    prisma.favorite.findUnique({ where: { userId_productId: { userId, productId } } }),

  create: (userId, productId) => prisma.favorite.create({ data: { userId, productId } }),

  remove: (userId, productId) =>
    prisma.favorite.delete({ where: { userId_productId: { userId, productId } } }),
};
