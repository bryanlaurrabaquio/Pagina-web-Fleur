const categoryService = require('../services/category.service');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (_req, res) => {
  const categories = await categoryService.list();
  res.json({ success: true, data: categories });
});

const getOne = asyncHandler(async (req, res) => {
  const category = await categoryService.getBySlug(req.params.slug);
  res.json({ success: true, data: category });
});

const create = asyncHandler(async (req, res) => {
  const category = await categoryService.create(req.body);
  res.status(201).json({ success: true, message: 'Categoría creada', data: category });
});

const update = asyncHandler(async (req, res) => {
  const category = await categoryService.update(Number(req.params.id), req.body);
  res.json({ success: true, message: 'Categoría actualizada', data: category });
});

const remove = asyncHandler(async (req, res) => {
  await categoryService.remove(Number(req.params.id));
  res.json({ success: true, message: 'Categoría eliminada' });
});

module.exports = { list, getOne, create, update, remove };
