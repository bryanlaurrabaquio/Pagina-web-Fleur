const app = require('./app');
const env = require('./config/env');
const prisma = require('./config/prisma');

async function start() {
  try {
    // Verifica conexión a la base de datos antes de aceptar tráfico
    await prisma.$connect();
    // eslint-disable-next-line no-console
    console.log('🗄️  Conectado a PostgreSQL');

    const server = app.listen(env.port, () => {
      // eslint-disable-next-line no-console
      console.log(`🌸 Fleur API escuchando en http://localhost:${env.port}`);
      // eslint-disable-next-line no-console
      console.log(`   Entorno: ${env.nodeEnv}`);
    });

    const shutdown = async (signal) => {
      // eslint-disable-next-line no-console
      console.log(`\n${signal} recibido. Cerrando...`);
      server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('❌ No se pudo iniciar el servidor:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

start();
