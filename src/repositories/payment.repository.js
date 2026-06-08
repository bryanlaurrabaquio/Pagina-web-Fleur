const prisma = require('../config/prisma');

module.exports = {
  findByOrder: (orderId) => prisma.payment.findUnique({ where: { orderId } }),
  upsert: (orderId, data) =>
    prisma.payment.upsert({
      where: { orderId },
      update: data,
      create: { orderId, ...data },
    }),

  // Total cobrado agrupado por pasarela (solo pagos aprobados).
  groupByProvider: () =>
    prisma.payment.groupBy({
      by: ['provider'],
      where: { status: 'aprobado' },
      _sum: { amount: true },
      _count: { _all: true },
    }),
};
