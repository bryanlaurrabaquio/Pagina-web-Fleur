const categoryRepo = require('../repositories/category.repository');
const ApiError = require('../utils/ApiError');

const slugify = (str) =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const list = () => categoryRepo.list();

async function getBySlug(slug) {
  const cat = await categoryRepo.findBySlug(slug);
  if (!cat) throw ApiError.notFound('Categoría no encontrada');
  return cat;
}

async function create(data) {
  const slug = data.slug || slugify(data.name);
  const existing = await categoryRepo.findBySlug(slug);
  if (existing) throw ApiError.conflict('Ya existe una categoría con ese slug');
  return categoryRepo.create({ ...data, slug });
}

async function update(id, data) {
  const existing = await categoryRepo.findById(id);
  if (!existing) throw ApiError.notFound('Categoría no encontrada');
  const patch = { ...data };
  if (data.name && !data.slug) patch.slug = slugify(data.name);
  return categoryRepo.update(id, patch);
}

async function remove(id) {
  const existing = await categoryRepo.findById(id);
  if (!existing) throw ApiError.notFound('Categoría no encontrada');
  await categoryRepo.remove(id);
}

module.exports = { list, getBySlug, create, update, remove };
