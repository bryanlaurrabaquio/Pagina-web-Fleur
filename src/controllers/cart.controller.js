const cartService = require('../services/cart.service');
const asyncHandler = require('../utils/asyncHandler');

const getCart = asyncHandler(async (req, res) => {
  const cart = await cartService.getCart(req.user.id);
  res.json({ success: true, data: cart });
});

const addItem = asyncHandler(async (req, res) => {
  const cart = await cartService.addItem(req.user.id, req.body);
  res.status(201).json({ success: true, message: 'Producto añadido al carrito', data: cart });
});

const updateItem = asyncHandler(async (req, res) => {
  const cart = await cartService.updateItem(req.user.id, Number(req.params.productId), req.body.quantity);
  res.json({ success: true, message: 'Carrito actualizado', data: cart });
});

const removeItem = asyncHandler(async (req, res) => {
  const cart = await cartService.removeItem(req.user.id, Number(req.params.productId));
  res.json({ success: true, message: 'Producto eliminado del carrito', data: cart });
});

const clear = asyncHandler(async (req, res) => {
  const cart = await cartService.clearCart(req.user.id);
  res.json({ success: true, message: 'Carrito vaciado', data: cart });
});

module.exports = { getCart, addItem, updateItem, removeItem, clear };
