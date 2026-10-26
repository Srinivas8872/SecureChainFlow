import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from './env';
import { logger } from './logger';

let mongod: MongoMemoryServer | null = null;

export async function connectDatabase(): Promise<void> {
  try {
    let uri = env.MONGODB_URI;

    // Use in-memory database if configured or if in test mode
    if (env.USE_IN_MEMORY_DB || env.NODE_ENV === 'test') {
      try {
        mongod = await MongoMemoryServer.create();
        uri = mongod.getUri();
        logger.info(`Starting in-memory MongoDB instance for development/testing: ${uri}`);
      } catch (err) {
        logger.warn('Could not launch MongoMemoryServer, falling back to configured MONGODB_URI', { err });
      }
    }

    mongoose.set('strictQuery', true);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    logger.info('Connected to MongoDB database successfully');
  } catch (error) {
    logger.error('Failed to connect to MongoDB database:', { error });
    // In production or when DB is mandatory, we might exit, but we log explicitly
    if (env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
    }
    logger.info('Disconnected from MongoDB database');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', { error });
  }
}
