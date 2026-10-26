import winston from 'winston';
import { env } from './env';

const sensitiveKeys = ['password', 'passwordHash', 'token', 'jwt', 'secret', 'authorization', 'privateKey'];

const redactSensitive = winston.format((info) => {
  const mask = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(mask);
    const result: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      if (sensitiveKeys.some(s => key.toLowerCase().includes(s.toLowerCase()))) {
        result[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        result[key] = mask(obj[key]);
      } else {
        result[key] = obj[key];
      }
    }
    return result;
  };

  return mask(info);
});

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    redactSensitive(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'securechainflow-backend' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, service, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `[${timestamp}] [${level}]: ${message}${metaStr}`;
        })
      )
    })
  ]
});
