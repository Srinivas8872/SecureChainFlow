export type UserRole =
  | 'SUPPLIER'
  | 'PROCESSOR'
  | 'TRANSPORTER'
  | 'WAREHOUSE'
  | 'RETAILER'
  | 'REGULATOR'
  | 'ADMIN'
  | 'CUSTOMER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string;
  organizationName?: string;
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  type: 'SUPPLIER' | 'MANUFACTURER' | 'LOGISTICS' | 'WAREHOUSING' | 'RETAIL' | 'AUDIT';
  status: 'VERIFIED' | 'PENDING' | 'REJECTED';
  facilities: string[];
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  ownerOrganizationId: string;
  createdAt: string;
}

export type BatchStatus =
  | 'REGISTERED'
  | 'IN_PROCESSING'
  | 'QUALITY_APPROVED'
  | 'IN_TRANSIT'
  | 'STORED'
  | 'AVAILABLE_FOR_SALE'
  | 'DELIVERED'
  | 'RECALLED';

export interface Batch {
  id: string;
  batchCode: string;
  productId: string;
  productName?: string;
  source: string;
  quantity: number;
  unit: string;
  status: BatchStatus;
  organizationId: string;
  currentCustodianId?: string;
  manufactureDate: string;
  expiryDate?: string;
  verificationTokenId?: string;
  createdAt: string;
}

export type EventType =
  | 'REGISTERED'
  | 'PROCESSED'
  | 'QUALITY_CHECKED'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'RECEIVED'
  | 'STORED'
  | 'RETAILED'
  | 'RECALLED'
  | 'DELIVERED';

export type BlockchainStatus = 'PENDING' | 'COMMITTED' | 'FAILED' | 'LOCAL_DEMO';

export interface SupplyChainEvent {
  id: string;
  batchId: string;
  eventType: EventType;
  actorId: string;
  actorName?: string;
  organizationId: string;
  organizationName?: string;
  location?: string;
  notes?: string;
  occurredAt: string;
  payloadHash: string;
  blockchainStatus: BlockchainStatus;
  txId?: string;
  integrityVerified?: boolean;
}

export interface PublicVerificationResult {
  batchCode: string;
  productName: string;
  category: string;
  source: string;
  manufactureDate: string;
  status: string;
  eventsCount: number;
  lastEventDate: string;
  currentCustodian: string;
  integrityConfirmed: boolean;
  onChainDigest: string;
  blockchainStatus: BlockchainStatus;
}
