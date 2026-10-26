import crypto from 'crypto';

/**
 * Deterministically sort object keys for canonical JSON serialization
 * Ensures consistent SHA-256 hash calculation regardless of key insertion order.
 */
export function canonicalizeJson(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map(item => canonicalizeJson(item)).join(',') + ']';
  }

  const sortedKeys = Object.keys(obj).sort();
  const parts = sortedKeys.map(key => {
    return JSON.stringify(key) + ':' + canonicalizeJson(obj[key]);
  });

  return '{' + parts.join(',') + '}';
}

/**
 * Computes a SHA-256 cryptographic digest of a payload
 */
export function computeSha256(content: string | Buffer | Record<string, any>): string {
  const data = typeof content === 'string' 
    ? content 
    : Buffer.isBuffer(content) 
      ? content 
      : canonicalizeJson(content);

  return crypto.createHash('sha256').update(data).digest('hex');
}
