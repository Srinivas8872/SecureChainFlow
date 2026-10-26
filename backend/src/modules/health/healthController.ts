import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { env } from '../../config/env';
import { sendSuccess } from '../../utils/response';

export async function getHealthStatus(_req: Request, res: Response): Promise<void> {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const dbStatus = dbStatusMap[dbState] || 'unknown';
  const isHealthy = dbState === 1 || env.USE_IN_MEMORY_DB;

  const healthData = {
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'securechainflow-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    integrations: {
      database: {
        status: dbStatus,
        inMemoryMode: env.USE_IN_MEMORY_DB
      },
      blockchain: {
        configuredNetwork: env.FABRIC_CHANNEL_NAME,
        chaincode: env.FABRIC_CHAINCODE_NAME,
        mode: env.FABRIC_USE_MOCK_GATEWAY ? 'local_simulation_adapter' : 'live_fabric_gateway'
      },
      aiService: {
        configuredUrl: env.AI_SERVICE_URL,
        status: 'configured'
      },
      objectStorage: {
        provider: env.OBJECT_STORAGE_PROVIDER,
        bucket: env.OBJECT_STORAGE_BUCKET
      }
    }
  };

  sendSuccess(res, healthData, isHealthy ? 200 : 503);
}
