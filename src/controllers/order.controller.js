const orderService = require('../services/order.service');
const asyncHandler = require('../utils/asyncHandler');

// --- Cliente ---
const create = asyncHandler(async (req, res) => {
  const order = await orderService.createFromCart(req.user.id, req.body);
  res.status(201).json({ success: true, message: 'Pedido creado', data: order });
});

const myOrders = asyncHandler(async (req, res) => {
  const orders = await orderService.getUserOrders(req.user.id);
  res.json({ success: true, data: orders });
});

const getOne = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const order = await orderService.getOrderForUser(req.user.id, Number(req.params.id), isAdmin);
  res.json({ success: true, data: order });
});

// --- Admin ---
const listAll = asyncHandler(async (req, res) => {
  const result = await orderService.listAll(req.query);
  res.json({ success: true, data: result.items, pagination: result.pagination });
});

const updateStatus = asyncHandler(async (req, res) => {
  const order = await orderService.updateStatus(Number(req.params.id), req.body.status);
  res.json({ success: true, message: 'Estado actualizado', data: order });
});

module.exports = { create, myOrders, getOne, listAll, updateStatus };
