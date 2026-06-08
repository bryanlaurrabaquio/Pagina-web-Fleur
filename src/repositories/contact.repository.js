const prisma = require('../config/prisma');

module.exports = {
  create: (data) => prisma.contactMessage.create({ data }),
  list: () => prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' } }),
};
