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

export interface CanonicalEventInput {
  batchId: string;
  batchCode?: string | null;
  eventType: string;
  actorId?: string | null;
  organizationId?: string | null;
  location?: string | null;
  facility?: string | null;
  temperature?: number | null;
  humidity?: number | null;
  notes?: string | null;
  occurredAt: string | Date;
}

/**
 * Builds a deterministic canonical representation of a supply chain event for hashing
 */
export function buildCanonicalEventPayload(input: CanonicalEventInput): Record<string, any> {
  const occurredAtIso =
    input.occurredAt instanceof Date
      ? input.occurredAt.toISOString()
      : typeof input.occurredAt === 'string'
      ? new Date(input.occurredAt).toISOString()
      : new Date().toISOString();

  return {
    batchId: input.batchId.toString(),
    batchCode: input.batchCode ?? null,
    eventType: input.eventType,
    actorId: input.actorId ? input.actorId.toString() : null,
    organizationId: input.organizationId ? input.organizationId.toString() : null,
    location: input.location ?? null,
    facility: input.facility ?? null,
    temperature: input.temperature !== undefined && input.temperature !== null ? input.temperature : null,
    humidity: input.humidity !== undefined && input.humidity !== null ? input.humidity : null,
    notes: input.notes ?? null,
    occurredAt: occurredAtIso,
  };
}

/**
 * Computes the canonical SHA-256 digest of a supply chain event
 */
export function computeEventPayloadHash(input: CanonicalEventInput): string {
  return computeSha256(buildCanonicalEventPayload(input));
}

