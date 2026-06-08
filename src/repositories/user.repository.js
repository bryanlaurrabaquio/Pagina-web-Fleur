const prisma = require('../config/prisma');

const publicSelect = { id: true, name: true, email: true, role: true, createdAt: true };

module.exports = {
  findByEmail: (email) => prisma.user.findUnique({ where: { email } }),
  findById: (id) => prisma.user.findUnique({ where: { id }, select: publicSelect }),
  create: (data) => prisma.user.create({ data, select: publicSelect }),
  list: () => prisma.user.findMany({ select: publicSelect, orderBy: { createdAt: 'desc' } }),
};
