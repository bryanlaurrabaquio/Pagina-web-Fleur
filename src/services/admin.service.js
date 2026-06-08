const orderRepo = require('../repositories/order.repository');
const paymentRepo = require('../repositories/payment.repository');

// Estados que cuentan como "venta concretada" (pedido pagado en adelante).
const PAID_STATUSES = ['pagado', 'preparando', 'enviado', 'entregado'];
// Pedidos pagados que aún no salen a entrega.
const PENDING_SHIPMENT_STATUSES = ['pagado', 'preparando'];
const ALL_STATUSES = ['pendiente', 'pagado', 'preparando', 'enviado', 'entregado', 'cancelado'];

// Da formato completo a un pedido para la vista admin (todo lo que el vendedor necesita ver).
function formatOrderAdmin(o) {
  return {
    id: o.id,
    createdAt: o.createdAt,
    status: o.status,
    paymentStatus: o.paymentStatus,
    customer: {
      id: o.user?.id,
      name: o.user?.name,
      email: o.user?.email,
      phone: o.deliveryPhone || null,
    },
    delivery: {
      name: o.deliveryName || o.user?.name || null,
      phone: o.deliveryPhone || null,
      address: o.deliveryAddress,
      date: o.deliveryDate,
      time: o.deliveryTime || null,
      cardMessage: o.cardMessage || null,
    },
    items: (o.items || []).map((i) => ({
      productId: i.productId,
      name: i.name,
      image: i.image,
      price: i.price,
      quantity: i.quantity,
      lineTotal: Math.round(i.price * i.quantity * 100) / 100,
    })),
    subtotal: o.subtotal,
    shippingCost: o.shippingCost,
    total: o.total,
    payment: o.payment
      ? {
          provider: o.payment.provider, // stripe | mercadopago | mock
          status: o.payment.status,
          amount: o.payment.amount,
          currency: o.payment.currency,
          externalPaymentId: o.payment.externalPaymentId || null,
          stripeSessionId: o.payment.stripeSessionId || null,
          mercadoPagoPreferenceId: o.payment.mercadoPagoPreferenceId || null,
        }
      : null,
  };
}

// Convierte el resultado de groupBy en un objeto { estado: conteo } con todos los estados.
function countsByStatus(groups) {
  const base = Object.fromEntries(ALL_STATUSES.map((s) => [s, 0]));
  for (const g of groups) base[g.status] = g._count._all;
  return base;
}

// GET /api/admin/dashboard  y  GET /api/admin/sales-summary (resumen general)
async function dashboard() {
  const [statusGroups, paidAgg, totalOrders, recent, byProvider] = await Promise.all([
    orderRepo.groupByStatus(),
    orderRepo.sumTotals({ status: { in: PAID_STATUSES } }),
    orderRepo.count({}),
    orderRepo.recent(10),
    paymentRepo.groupByProvider(),
  ]);

  const byStatus = countsByStatus(statusGroups);

  return {
    sales: {
      totalSold: paidAgg._sum.total || 0, // total vendido (pedidos pagados+)
      paidOrders: paidAgg._count._all || 0,
      totalOrders,
    },
    orders: {
      pendiente: byStatus.pendiente,
      pagado: byStatus.pagado,
      preparando: byStatus.preparando,
      enviado: byStatus.enviado,
      entregado: byStatus.entregado,
      cancelado: byStatus.cancelado,
    },
    byPaymentProvider: byProvider.map((p) => ({
      provider: p.provider,
      count: p._count._all,
      total: p._sum.amount || 0,
    })),
    recentOrders: recent.map(formatOrderAdmin),
  };
}

// GET /api/admin/sales-summary — resumen de ventas (totales y por pasarela)
async function salesSummary() {
  const [paidAgg, byProvider] = await Promise.all([
    orderRepo.sumTotals({ status: { in: PAID_STATUSES } }),
    paymentRepo.groupByProvider(),
  ]);
  return {
    totalSold: paidAgg._sum.total || 0,
    subtotalSold: paidAgg._sum.subtotal || 0,
    shippingCollected: paidAgg._sum.shippingCost || 0,
    paidOrders: paidAgg._count._all || 0,
    byProvider: byProvider.map((p) => ({
      provider: p.provider,
      count: p._count._all,
      total: p._sum.amount || 0,
    })),
  };
}

// GET /api/admin/orders/summary — conteo por estado de pedido y de pago
async function ordersSummary() {
  const [statusGroups, payGroups] = await Promise.all([
    orderRepo.groupByStatus(),
    orderRepo.groupByPaymentStatus(),
  ]);
  const byPaymentStatus = {};
  for (const g of payGroups) byPaymentStatus[g.paymentStatus] = g._count._all;
  return { byStatus: countsByStatus(statusGroups), byPaymentStatus };
}

// GET /api/admin/orders — todos los pedidos con filtros
async function listOrders(query) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const where = {};
  if (query.status && ALL_STATUSES.includes(query.status)) where.status = query.status;
  if (query.paymentStatus) where.paymentStatus = query.paymentStatus;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    orderRepo.listAll({ where, skip, take: limit }),
    orderRepo.count(where),
  ]);
  return {
    items: items.map(formatOrderAdmin),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// GET /api/admin/orders/pending-shipments — pagados pendientes de envío
async function pendingShipments() {
  const items = await orderRepo.listAll({
    where: { status: { in: PENDING_SHIPMENT_STATUSES } },
    skip: 0,
    take: 100,
  });
  return items.map(formatOrderAdmin);
}

module.exports = {
  dashboard,
  salesSummary,
  ordersSummary,
  listOrders,
  pendingShipments,
  formatOrderAdmin,
  ALL_STATUSES,
};
