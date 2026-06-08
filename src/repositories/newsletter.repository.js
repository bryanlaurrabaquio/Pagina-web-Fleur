const prisma = require('../config/prisma');

module.exports = {
  findByEmail: (email) => prisma.newsletterSubscriber.findUnique({ where: { email } }),
  create: (email) => prisma.newsletterSubscriber.create({ data: { email } }),
  list: () => prisma.newsletterSubscriber.findMany({ orderBy: { createdAt: 'desc' } }),
};
