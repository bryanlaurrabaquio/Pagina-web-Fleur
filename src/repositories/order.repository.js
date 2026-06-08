const prisma = require('../config/prisma');

const fullInclude = {
  items: true,
  payment: true,
  user: { select: { id: true, name: true, email: true } },
};

module.exports = {
  // Crea la orden con sus items en una sola transacción atómica.
  createWithItems: (orderData, items) =>
    prisma.order.create({
      data: { ...orderData, items: { create: items } },
      include: fullInclude,
    }),

  findById: (id) => prisma.order.findUnique({ where: { id }, include: fullInclude }),

  listByUser: (userId) =>
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { items: true, payment: true },
    }),

  listAll: ({ where, skip, take }) =>
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: fullInclude,
    }),

  count: (where) => prisma.order.count({ where }),

  // --- Agregaciones para el dashboard admin ---
  groupByStatus: () => prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
  groupByPaymentStatus: () =>
    prisma.order.groupBy({ by: ['paymentStatus'], _count: { _all: true } }),
  sumTotals: (where) =>
    prisma.order.aggregate({
      where,
      _sum: { total: true, subtotal: true, shippingCost: true },
      _count: { _all: true },
    }),
  recent: (take = 10) =>
    prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take, include: fullInclude }),

  updateStatus: (id, status) =>
    prisma.order.update({ where: { id }, data: { status }, include: fullInclude }),

  // Transacción: marca la orden como pagada (estado + estado de pago) y
  // crea/actualiza el registro de Payment como aprobado.
  markPaid: (orderId, paymentData) =>
    prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: orderId },
        data: { status: 'pagado', paymentStatus: 'aprobado' },
      });
      const payment = await tx.payment.upsert({
        where: { orderId },
        update: { status: 'aprobado', ...paymentData },
        create: { orderId, status: 'aprobado', amount: order.total, ...paymentData },
      });
      return { order, payment };
    }),
};
