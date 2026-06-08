const productService = require('../services/product.service');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const result = await productService.list(req.query);
  res.json({ success: true, data: result.items, pagination: result.pagination });
});

const getOne = asyncHandler(async (req, res) => {
  const product = await productService.getByIdentifier(req.params.identifier);
  res.json({ success: true, data: product });
});

const featured = asyncHandler(async (_req, res) => {
  const items = await productService.featured();
  res.json({ success: true, data: items });
});

const discounted = asyncHandler(async (_req, res) => {
  const items = await productService.discounted();
  res.json({ success: true, data: items });
});

// --- Admin ---
const create = asyncHandler(async (req, res) => {
  const product = await productService.create(req.body);
  res.status(201).json({ success: true, message: 'Producto creado', data: product });
});

const update = asyncHandler(async (req, res) => {
  const product = await productService.update(Number(req.params.id), req.body);
  res.json({ success: true, message: 'Producto actualizado', data: product });
});

const remove = asyncHandler(async (req, res) => {
  await productService.remove(Number(req.params.id));
  res.json({ success: true, message: 'Producto eliminado' });
});

module.exports = { list, getOne, featured, discounted, create, update, remove };
