import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response';

interface AssistantQueryResult {
  query: string;
  role: string;
  response: string;
  suggestedActions: Array<{ label: string; route: string }>;
  suggestedQuestions: string[];
}

const ROLE_SUMMARIES: Record<string, {
  title: string;
  summary: string;
  actions: Array<{ label: string; route: string }>;
  suggestedQuestions: string[];
}> = {
  SUPPLIER: {
    title: 'Supplier & Origin Producer',
    summary: 'Define product master templates (/products), register genesis batches (/batches/new), commit genesis hashes to Hyperledger Fabric, generate QR codes, and dispatch cargo.',
    actions: [
      { label: 'Product Templates', route: '/products' },
      { label: 'Register Batch', route: '/batches/new' }
    ],
    suggestedQuestions: [
      'How do I register a genesis batch?',
      'How does QR token generation work?',
      'How do I set safe temperature thresholds?'
    ]
  },
  PROCESSOR: {
    title: 'Processor / Manufacturer',
    summary: 'Receive raw consignments, perform quality compliance testing, and log QUALITY_CHECKED events with sensor telemetry.',
    actions: [
      { label: 'View Batches', route: '/batches' }
    ],
    suggestedQuestions: [
      'How do I log a QUALITY_CHECKED event?',
      'What inspection data should I record?'
    ]
  },
  TRANSPORTER: {
    title: 'Transporter / Logistics Carrier',
    summary: 'Accept freight, log IN_TRANSIT custody handovers, monitor cold-chain reefer telemetry (temperature & humidity), and deliver to warehouse receiving docks.',
    actions: [
      { label: 'View Shipments', route: '/shipments' }
    ],
    suggestedQuestions: [
      'How do I log container temperature and humidity?',
      'How does AI detect cold-chain anomalies?'
    ]
  },
  WAREHOUSE: {
    title: 'Warehouse / Storage Operator',
    summary: 'Receive incoming goods (RECEIVED), place pallets into climate-regulated storage (STORED), and monitor inventory health.',
    actions: [
      { label: 'View Batches', route: '/batches' },
      { label: 'View Analytics', route: '/analytics' }
    ],
    suggestedQuestions: [
      'How do I intake an incoming shipment?',
      'What is the difference between RECEIVED and STORED?'
    ]
  },
  RETAILER: {
    title: 'Retailer / Store Operator',
    summary: 'Receive deliveries (DELIVERED), confirm 100% blockchain integrity, place items on retail display shelves, and enable consumer QR verification.',
    actions: [
      { label: 'View Shipments', route: '/shipments' },
      { label: 'Verify QR Code', route: '/verify' }
    ],
    suggestedQuestions: [
      'How do I log a DELIVERED event?',
      'How does a consumer verify the product QR code?'
    ]
  },
  REGULATOR: {
    title: 'Regulator / Compliance Auditor',
    summary: 'Audit immutable blockchain logs (/audit-logs), examine predictive cold-chain AI risk assessments (/analytics), and export compliance records to CSV.',
    actions: [
      { label: 'Audit Logs', route: '/audit-logs' },
      { label: 'Risk Analytics', route: '/analytics' },
      { label: 'System Health', route: '/system-health' }
    ],
    suggestedQuestions: [
      'How do I audit immutable blockchain events?',
      'How do I export batch records as CSV?'
    ]
  },
  ADMIN: {
    title: 'Consortium Administrator',
    summary: 'Manage consortium peer organizations (/organizations), oversee user roles (/users), and monitor cluster & blockchain health (/system-health).',
    actions: [
      { label: 'Organizations', route: '/organizations' },
      { label: 'Users & Roles', route: '/users' },
      { label: 'System Health', route: '/system-health' }
    ],
    suggestedQuestions: [
      'How do I view all consortium peers?',
      'Where do I inspect active user roles?'
    ]
  }
};

export async function queryAssistant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { query, role = 'SUPPLIER' } = req.body || {};
    const effectiveRole = (typeof role === 'string' ? role.toUpperCase() : 'SUPPLIER');
    const roleInfo = ROLE_SUMMARIES[effectiveRole] || ROLE_SUMMARIES.SUPPLIER;

    const q = (typeof query === 'string' ? query.toLowerCase().trim() : '');

    let responseText = `As an authorized ${roleInfo.title}, your primary duties are: ${roleInfo.summary}`;

    if (q.includes('batch') || q.includes('register')) {
      responseText = 'To register a batch: Go to Batches -> Register New Batch (/batches/new). Fill in the product template, quantity, origin, and dates. The platform commits the genesis hash to Hyperledger Fabric and generates your cryptographic QR code.';
    } else if (q.includes('ai') || q.includes('risk') || q.includes('anomaly')) {
      responseText = 'The AI service runs Python FastAPI with a Random Forest model evaluating 10 telemetry features (temperature spikes, transit delays, humidity fluctuations). It computes real-time risk scores (0-100) and flags cold-chain breaches.';
    } else if (q.includes('verify') || q.includes('qr')) {
      responseText = 'Public QR Verification requires no login. The server checks off-chain MongoDB events against on-chain Fabric ledger root hashes, verifying 100% LEDGER_CONFIRMED integrity without leaking private credentials.';
    }

    const payload: AssistantQueryResult = {
      query: query || '',
      role: effectiveRole,
      response: responseText,
      suggestedActions: roleInfo.actions,
      suggestedQuestions: roleInfo.suggestedQuestions
    };

    sendSuccess(res, payload);
  } catch (err) {
    next(err);
  }
}
