const prisma = require('../config/prisma');

const withCategory = { category: { select: { id: true, name: true, slug: true } } };

module.exports = {
  findById: (id) => prisma.product.findUnique({ where: { id }, include: withCategory }),
  findBySku: (sku) => prisma.product.findUnique({ where: { sku }, include: withCategory }),
  findBySlug: (slug) => prisma.product.findUnique({ where: { slug }, include: withCategory }),

  findMany: ({ where, orderBy, skip, take }) =>
    prisma.product.findMany({ where, orderBy, skip, take, include: withCategory }),

  count: (where) => prisma.product.count({ where }),

  create: (data) => prisma.product.create({ data, include: withCategory }),
  update: (id, data) => prisma.product.update({ where: { id }, data, include: withCategory }),
  remove: (id) => prisma.product.delete({ where: { id } }),
};
