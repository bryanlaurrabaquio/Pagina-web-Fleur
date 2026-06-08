const prisma = require('../config/prisma');

module.exports = {
  list: () =>
    prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    }),
  findById: (id) => prisma.category.findUnique({ where: { id } }),
  findBySlug: (slug) => prisma.category.findUnique({ where: { slug } }),
  create: (data) => prisma.category.create({ data }),
  update: (id, data) => prisma.category.update({ where: { id }, data }),
  remove: (id) => prisma.category.delete({ where: { id } }),
};
