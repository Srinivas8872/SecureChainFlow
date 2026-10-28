import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase, disconnectDatabase } from './config/database';

async function bootstrap() {
  await connectDatabase();

  if (env.NODE_ENV !== 'production' && env.USE_IN_MEMORY_DB) {
    try {
      const { seedDatabase } = await import('./scripts/seed');
      await seedDatabase();
    } catch (seedErr) {
      logger.warn('Auto-seeding notice:', seedErr);
    }
  }

  const server = app.listen(env.PORT, () => {
    logger.info(`SecureChainFlow Backend API running on port ${env.PORT} in [${env.NODE_ENV}] mode`);
    logger.info(`Health check available at http://localhost:${env.PORT}/api/v1/health`);
  });

  const handleTermination = async (signal: string) => {
    logger.info(`Received ${signal}. Gracefully shutting down server...`);
    server.close(async () => {
      await disconnectDatabase();
      logger.info('HTTP server closed, database connection terminated. Exiting process.');
      process.exit(0);
    });

    // Force shutdown if taking longer than 10s
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => handleTermination('SIGTERM'));
  process.on('SIGINT', () => handleTermination('SIGINT'));
}

bootstrap().catch(err => {
  logger.error('Fatal bootstrap failure:', err);
  process.exit(1);
});
