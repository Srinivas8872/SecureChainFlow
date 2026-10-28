import { EventType } from '../../models/SupplyChainEvent';
import { BatchStatus } from '../../models/Batch';
import { UserRole } from '../../models/User';

/**
 * Permitted next event transitions based on the current batch status
 */
export const PERMITTED_TRANSITIONS: Record<BatchStatus, EventType[]> = {
  REGISTERED: ['REGISTERED', 'PROCESSED', 'QUALITY_CHECKED', 'DISPATCHED', 'RECALLED'],
  IN_PROCESSING: ['QUALITY_CHECKED', 'DISPATCHED', 'RECALLED'],
  QUALITY_APPROVED: ['DISPATCHED', 'STORED', 'IN_TRANSIT', 'RECALLED'],
  IN_TRANSIT: ['IN_TRANSIT', 'RECEIVED', 'RECALLED'],
  STORED: ['STORED', 'DISPATCHED', 'QUALITY_CHECKED', 'RETAILED', 'DELIVERED', 'RECALLED'],
  AVAILABLE_FOR_SALE: ['DELIVERED', 'RECALLED'],
  DELIVERED: ['RECALLED'], // Terminal custody state unless emergency recall occurs
  RECALLED: [] // Terminal state
};

/**
 * Roles authorized to record specific event types
 */
export const EVENT_ROLE_PERMISSIONS: Record<EventType, UserRole[]> = {
  REGISTERED: ['SUPPLIER', 'PROCESSOR', 'ADMIN'],
  PROCESSED: ['PROCESSOR', 'ADMIN'],
  QUALITY_CHECKED: ['PROCESSOR', 'REGULATOR', 'ADMIN'],
  DISPATCHED: ['SUPPLIER', 'PROCESSOR', 'WAREHOUSE', 'ADMIN'],
  IN_TRANSIT: ['TRANSPORTER', 'ADMIN'],
  RECEIVED: ['TRANSPORTER', 'WAREHOUSE', 'RETAILER', 'ADMIN'],
  STORED: ['WAREHOUSE', 'ADMIN'],
  RETAILED: ['RETAILER', 'ADMIN'],
  DELIVERED: ['TRANSPORTER', 'RETAILER', 'ADMIN'],
  RECALLED: ['ADMIN', 'REGULATOR', 'SUPPLIER']
};

/**
 * Maps event type to the corresponding updated batch status
 */
export const EVENT_TO_BATCH_STATUS_MAP: Record<EventType, BatchStatus> = {
  REGISTERED: 'REGISTERED',
  PROCESSED: 'IN_PROCESSING',
  QUALITY_CHECKED: 'QUALITY_APPROVED',
  DISPATCHED: 'IN_TRANSIT',
  IN_TRANSIT: 'IN_TRANSIT',
  RECEIVED: 'STORED',
  STORED: 'STORED',
  RETAILED: 'AVAILABLE_FOR_SALE',
  DELIVERED: 'DELIVERED',
  RECALLED: 'RECALLED'
};

export function isValidTransition(currentStatus: BatchStatus, targetEventType: EventType): boolean {
  const allowed = PERMITTED_TRANSITIONS[currentStatus];
  if (!allowed) return false;
  return allowed.includes(targetEventType);
}

export function isRoleAuthorizedForEvent(role: UserRole, eventType: EventType): boolean {
  if (role === 'ADMIN') return true;
  const allowedRoles = EVENT_ROLE_PERMISSIONS[eventType];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role);
}
