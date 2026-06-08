const favoriteService = require('../services/favorite.service');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const favorites = await favoriteService.list(req.user.id);
  res.json({ success: true, data: favorites });
});

const add = asyncHandler(async (req, res) => {
  const favorites = await favoriteService.add(req.user.id, req.body);
  res.status(201).json({ success: true, message: 'Añadido a favoritos', data: favorites });
});

const remove = asyncHandler(async (req, res) => {
  const favorites = await favoriteService.remove(req.user.id, Number(req.params.productId));
  res.json({ success: true, message: 'Eliminado de favoritos', data: favorites });
});

module.exports = { list, add, remove };
