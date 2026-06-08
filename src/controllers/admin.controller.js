const adminService = require('../services/admin.service');
const orderService = require('../services/order.service');
const asyncHandler = require('../utils/asyncHandler');

const dashboard = asyncHandler(async (_req, res) => {
  const data = await adminService.dashboard();
  res.json({ success: true, data });
});

const salesSummary = asyncHandler(async (_req, res) => {
  const data = await adminService.salesSummary();
  res.json({ success: true, data });
});

const ordersSummary = asyncHandler(async (_req, res) => {
  const data = await adminService.ordersSummary();
  res.json({ success: true, data });
});

const listOrders = asyncHandler(async (req, res) => {
  const result = await adminService.listOrders(req.query);
  res.json({ success: true, data: result.items, pagination: result.pagination });
});

const pendingShipments = asyncHandler(async (_req, res) => {
  const data = await adminService.pendingShipments();
  res.json({ success: true, data });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await orderService.updateStatus(Number(req.params.id), req.body.status);
  res.json({
    success: true,
    message: 'Estado del pedido actualizado',
    data: adminService.formatOrderAdmin(order),
  });
});

module.exports = {
  dashboard,
  salesSummary,
  ordersSummary,
  listOrders,
  pendingShipments,
  updateOrderStatus,
};
