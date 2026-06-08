const { PrismaClient } = require('@prisma/client');
const env = require('./env');

// Singleton de PrismaClient (evita múltiples conexiones en dev/hot-reload)
const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: env.isProd ? ['error'] : ['warn', 'error'],
  });

if (!env.isProd) globalForPrisma.prisma = prisma;

module.exports = prisma;
