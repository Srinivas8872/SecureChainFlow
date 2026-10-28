export interface AssistantMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  actions?: Array<{
    label: string;
    route: string;
  }>;
  suggestions?: string[];
}

export interface RoleGuide {
  title: string;
  badge: string;
  description: string;
  responsibilities: string[];
  steps: Array<{
    step: number;
    title: string;
    description: string;
    actionRoute?: string;
    actionLabel?: string;
  }>;
  quickQuestions: string[];
}

export const ROLE_GUIDES: Record<string, RoleGuide> = {
  SUPPLIER: {
    title: 'Supplier & Origin Producer',
    badge: 'Origin Genesis & Harvest',
    description: 'Responsible for defining product specifications, registering genesis supply-chain batches, anchoring initial payload hashes to the Fabric blockchain, and dispatching cargo.',
    responsibilities: [
      'Define Product Master Templates with safe temperature and humidity limits.',
      'Register Genesis Batches with manufacturing & expiry dates.',
      'Generate and print cryptographically unique QR codes with tamper-evident tokens.',
      'Log DISPATCHED transitions to transfer custody to carriers or processors.'
    ],
    steps: [
      {
        step: 1,
        title: 'Define Product Master Template',
        description: 'Navigate to Products and create a template with SKU, category, and cold-chain temperature thresholds (e.g., 2°C to 8°C).',
        actionRoute: '/products',
        actionLabel: 'Go to Products'
      },
      {
        step: 2,
        title: 'Register Genesis Batch',
        description: 'Go to Batches and click Register New Batch. Enter batch code, quantity, origin farm, and production dates.',
        actionRoute: '/batches/new',
        actionLabel: 'Create New Batch'
      },
      {
        step: 3,
        title: 'Anchor to Blockchain & Download QR',
        description: 'The system computes the SHA-256 hash and commits it to the Hyperledger Fabric ledger. Print the generated QR code for packaging.'
      },
      {
        step: 4,
        title: 'Log Dispatch Event',
        description: 'When handing cargo to carriers or processors, click Log Custody Event on the batch page and record DISPATCHED.',
        actionRoute: '/batches',
        actionLabel: 'View Batches'
      }
    ],
    quickQuestions: [
      'How do I register a new batch?',
      'How does QR token generation work?',
      'How do I set safe temperature thresholds?',
      'What happens when I log a DISPATCHED event?'
    ]
  },

  PROCESSOR: {
    title: 'Processor / Manufacturer',
    badge: 'Transformation & Quality Control',
    description: 'Responsible for receiving raw agricultural or chemical commodities, performing secondary transformations/packaging, and certifying quality standards.',
    responsibilities: [
      'Inspect incoming raw batches from suppliers.',
      'Execute lab quality testing and compliance verification.',
      'Log QUALITY_CHECKED events with inspection metadata and temperature telemetry.',
      'Authorize processed consignments for distribution.'
    ],
    steps: [
      {
        step: 1,
        title: 'Locate Incoming Consignment',
        description: 'Open Batches or Shipments to find the batch arriving from the primary producer.',
        actionRoute: '/batches',
        actionLabel: 'View Batches'
      },
      {
        step: 2,
        title: 'Perform Quality Inspection',
        description: 'Conduct chemical/food grade safety testing and verify package integrity.'
      },
      {
        step: 3,
        title: 'Log QUALITY_CHECKED Event',
        description: 'Click Log Custody Event, select QUALITY_CHECKED, and input inspection notes and temperature readings.',
        actionRoute: '/batches',
        actionLabel: 'Log Quality Check'
      },
      {
        step: 4,
        title: 'Dispatch to Logistics',
        description: 'Once packaged, record a DISPATCHED event transferring custody to transport logistics.'
      }
    ],
    quickQuestions: [
      'How do I log a QUALITY_CHECKED event?',
      'What inspection data should I record?',
      'Can a processor create product templates?',
      'How does quality approval affect the AI risk score?'
    ]
  },

  TRANSPORTER: {
    title: 'Transporter / Logistics Carrier',
    badge: 'Freight Transit & Reefer Telemetry',
    description: 'Responsible for inter-facility freight shipping, monitoring real-time reefer container telemetry (temperature/humidity), and executing multi-party handovers.',
    responsibilities: [
      'Accept consignments from suppliers or processing plants.',
      'Record IN_TRANSIT events with live GPS and sensor readings.',
      'Prevent cold-chain breaches by keeping cargo within calibrated thresholds.',
      'Safely deliver freight to warehouse receiving bays.'
    ],
    steps: [
      {
        step: 1,
        title: 'Accept Consignment',
        description: 'Check active freight assignments on the Shipments page.',
        actionRoute: '/shipments',
        actionLabel: 'Go to Shipments'
      },
      {
        step: 2,
        title: 'Log IN_TRANSIT Event',
        description: 'Select the batch, click Log Custody Event, and select IN_TRANSIT.',
        actionRoute: '/batches',
        actionLabel: 'Log Transit Event'
      },
      {
        step: 3,
        title: 'Record Cold-Chain Telemetry',
        description: 'Enter real-time temperature (e.g. 4.2°C), relative humidity (82%), and route coordinates.'
      },
      {
        step: 4,
        title: 'Transfer Custody at Warehouse',
        description: 'Deliver the cargo to the destination facility dock for warehouse intake.'
      }
    ],
    quickQuestions: [
      'How do I log container temperature and humidity?',
      'What happens if temperature exceeds the safe limit during transit?',
      'Where do I view active shipments?',
      'How does AI detect cold-chain anomalies?'
    ]
  },

  WAREHOUSE: {
    title: 'Warehouse / Storage Operator',
    badge: 'Intake, Climate Silos & Inventory',
    description: 'Responsible for receiving freight at unloading docks, inspecting physical seal integrity, placing lots in climate-regulated storage, and managing inventory.',
    responsibilities: [
      'Verify physical QR codes and digital tokens at the unloading bay.',
      'Log RECEIVED events to formally acknowledge transfer of custody.',
      'Log STORED events with climate silo telemetry.',
      'Monitor cold storage health and prepare outgoing orders.'
    ],
    steps: [
      {
        step: 1,
        title: 'Receive Freight at Dock',
        description: 'Locate the incoming batch and log a RECEIVED event to accept legal custody.',
        actionRoute: '/batches',
        actionLabel: 'Open Batch List'
      },
      {
        step: 2,
        title: 'Store in Climate Silo',
        description: 'Transfer pallets into cold storage and log a STORED event with ambient silo temperature & humidity.'
      },
      {
        step: 3,
        title: 'Track Inventory Health',
        description: 'Monitor storage duration and shelf-life depletion using the AI & Analytics dashboard.',
        actionRoute: '/analytics',
        actionLabel: 'View Analytics'
      }
    ],
    quickQuestions: [
      'How do I intake an incoming shipment?',
      'What is the difference between RECEIVED and STORED?',
      'How do I check storage anomalies?',
      'Where do I view warehouse inventory?'
    ]
  },

  RETAILER: {
    title: 'Retailer / Point of Sale',
    badge: 'Store Intake & Consumer Display',
    description: 'Responsible for receiving verified inventory at distribution centers or retail supermarkets, confirming delivery, and enabling consumer QR scanning.',
    responsibilities: [
      'Receive shipments at retail dock and log DELIVERED event.',
      'Verify 100% blockchain integrity score before placing goods on shelves.',
      'Display product packaging with certified QR codes for consumer scanning.',
      'Facilitate farm-to-shelf transparency for shoppers.'
    ],
    steps: [
      {
        step: 1,
        title: 'Confirm Store Receipt',
        description: 'Find the arriving consignment on Shipments or Batches and record the DELIVERED event.',
        actionRoute: '/shipments',
        actionLabel: 'View Shipments'
      },
      {
        step: 2,
        title: 'Verify Blockchain Integrity',
        description: 'Scan or verify the batch QR code to ensure 100% LEDGER_CONFIRMED status.',
        actionRoute: '/verify',
        actionLabel: 'Verify Batch'
      },
      {
        step: 3,
        title: 'Customer Transparency',
        description: 'Consumers can scan the QR code on the packaging to view the complete journey from origin farm.'
      }
    ],
    quickQuestions: [
      'How do I log a DELIVERED event?',
      'How does a consumer verify the product QR code?',
      'What information does the consumer see?',
      'Can an item be verified after sale?'
    ]
  },

  REGULATOR: {
    title: 'Regulator / Compliance Auditor',
    badge: 'Governance, Compliance & Audit',
    description: 'Responsible for independent compliance oversight, verifying zero data tampering across the consortium, reviewing immutable audit trails, and inspecting AI predictive risk reports.',
    responsibilities: [
      'Examine immutable system audit logs for unauthorized actions or security violations.',
      'Review continuous AI quality risk scores and temperature excursion records.',
      'Export full batch and event records in CSV format for regulatory archives.',
      'Verify cryptographic ledger consistency between MongoDB and Hyperledger Fabric.'
    ],
    steps: [
      {
        step: 1,
        title: 'Inspect Consortium Audit Trail',
        description: 'Go to Audit Logs to view all authentication, batch creation, and blockchain events.',
        actionRoute: '/audit-logs',
        actionLabel: 'Audit Logs'
      },
      {
        step: 2,
        title: 'Analyze Predictive Risk Engine',
        description: 'Go to AI & Analytics to review anomaly alerts and multi-hop cold-chain scores.',
        actionRoute: '/analytics',
        actionLabel: 'AI Analytics'
      },
      {
        step: 3,
        title: 'Export Compliance Records',
        description: 'Use the Export CSV tool on the Dashboard or Analytics page to download complete records.',
        actionRoute: '/dashboard',
        actionLabel: 'Export Data'
      },
      {
        step: 4,
        title: 'Check Infrastructure Uptime',
        description: 'Probe node and blockchain health at System Health.',
        actionRoute: '/system-health',
        actionLabel: 'System Health'
      }
    ],
    quickQuestions: [
      'How do I audit immutable blockchain events?',
      'How do I export batch records as CSV?',
      'How does the AI model score cold-chain compliance?',
      'Where do I view all registered consortium organizations?'
    ]
  },

  ADMIN: {
    title: 'Consortium Administrator',
    badge: 'Consortium Governance & Infrastructure',
    description: 'Responsible for network orchestration, managing consortium peer organizations, reviewing operator clearances, and maintaining node infrastructure.',
    responsibilities: [
      'Maintain consortium peer directory and verify new organizational nodes.',
      'Oversee user roles and ensure proper RBAC separation of duties.',
      'Monitor Hyperledger Fabric channel, MongoDB Atlas cluster, and AI service health.',
      'Manage platform settings and cryptographic trust anchors.'
    ],
    steps: [
      {
        step: 1,
        title: 'Inspect Consortium Organizations',
        description: 'View peer organizations and registered facilities.',
        actionRoute: '/organizations',
        actionLabel: 'Organizations'
      },
      {
        step: 2,
        title: 'Audit User Clearances',
        description: 'Review active operators and role assignments at Users & Roles.',
        actionRoute: '/users',
        actionLabel: 'Users & Roles'
      },
      {
        step: 3,
        title: 'Monitor System Infrastructure',
        description: 'Review live ping latency, database cluster state, and Fabric channel diagnostics.',
        actionRoute: '/system-health',
        actionLabel: 'System Health'
      }
    ],
    quickQuestions: [
      'How do I view all consortium peers?',
      'Where do I inspect active user roles?',
      'How do I check live system health and ping latency?',
      'How do I update platform settings?'
    ]
  },

  GUEST: {
    title: 'Visitor / Public Consumer',
    badge: 'Public Consumer Transparency',
    description: 'Any external consumer, retail customer, or prospective consortium partner who wants to verify an item or learn how SecureChainFlow works.',
    responsibilities: [
      'Scan physical packaging QR code or input verification token.',
      'Review anti-counterfeiting integrity score and origin proof.',
      'Inspect chronological harvest-to-shelf journey.',
      'Sign up for an operator account to participate in the consortium.'
    ],
    steps: [
      {
        step: 1,
        title: 'Verify a Product QR Code',
        description: 'Open the public verification portal to inspect a batch without needing to log in.',
        actionRoute: '/verify',
        actionLabel: 'Verify QR Code'
      },
      {
        step: 2,
        title: 'Register as an Operator',
        description: 'Create an account to participate in supply-chain tracking as a Supplier, Transporter, or Retailer.',
        actionRoute: '/register',
        actionLabel: 'Register Account'
      }
    ],
    quickQuestions: [
      'How do I verify a product with its QR code?',
      'What does a 100% integrity score mean?',
      'How do I join the SecureChainFlow consortium?',
      'What technologies power this project?'
    ]
  }
};

// General FAQ and Knowledge Database
export const PROJECT_FAQS: Array<{
  keywords: string[];
  question: string;
  answer: string;
  actions?: Array<{ label: string; route: string }>;
}> = [
  {
    keywords: ['stages', 'lifecycle', 'workflow', 'steps', 'how works', 'overview', 'process'],
    question: 'What are the 7 stages of SecureChainFlow?',
    answer: `SecureChainFlow operates in 7 sequential stages:
1. **Identity & Auth**: Operators sign in with personalized RBAC credentials.
2. **Product Templates**: Define SKU standards and temperature limits (2°C - 8°C).
3. **Genesis Batch & QR**: Supplier creates batch, hashes payload (SHA-256), anchors to Hyperledger Fabric, and issues a tamper-evident QR code.
4. **Custody & Telemetry**: Multi-hop custody transitions (Supplier -> Processor -> Transporter -> Warehouse -> Retailer) logging live IoT sensor readings.
5. **AI Quality Risk Engine**: Python FastAPI + Scikit-Learn Random Forest analyzes cold-chain spikes and shelf-life in real-time.
6. **Zero-Trust QR Verification**: Consumers scan packaging QR codes for 100% cryptographic ledger proof with zero data leakage.
7. **Consortium Governance**: Real-time audit logs, peer directory, and system health diagnostics.`,
    actions: [
      { label: 'Register a Batch', route: '/batches/new' },
      { label: 'Verify a Product', route: '/verify' },
      { label: 'System Health', route: '/system-health' }
    ]
  },
  {
    keywords: ['blockchain', 'fabric', 'hyperledger', 'ledger', 'immutability', 'tamper'],
    question: 'How does Hyperledger Fabric blockchain prevent tampering?',
    answer: `Every batch registration and custody handover calculates a cryptographic SHA-256 hash that is notarized onto the permissioned Hyperledger Fabric ledger (channel: *mychannel*). 

If a malicious actor alters records inside the off-chain MongoDB database, the verification engine detects a hash mismatch immediately and drops the Integrity Score from 100% to TAMPER_DETECTED.`,
    actions: [
      { label: 'Audit Logs', route: '/audit-logs' },
      { label: 'Check Ledger Health', route: '/system-health' }
    ]
  },
  {
    keywords: ['ai', 'machine learning', 'risk score', 'fastapi', 'scikit', 'telemetry', 'model', 'random forest'],
    question: 'How does the AI predictive risk engine work?',
    answer: `The AI service runs on Python FastAPI (Port 8000) using a trained Scikit-Learn **Random Forest** model. 

It evaluates 10 continuous telemetry features across the journey:
- Temperature variance and duration outside calibrated limits (e.g. spikes above 8°C).
- Relative humidity fluctuations.
- Transit delays relative to expected shipping schedules.

It outputs a Risk Score (0-100), a categorical Risk Level (LOW, MEDIUM, HIGH, CRITICAL), and specific anomaly warning tags. If the AI service is momentarily offline, a deterministic heuristic fallback guarantees zero downtime.`,
    actions: [
      { label: 'AI & Analytics Dashboard', route: '/analytics' }
    ]
  },
  {
    keywords: ['qr', 'verify', 'scan', 'token', 'consumer', 'counterfeit'],
    question: 'How does QR Code verification work for consumers?',
    answer: `Each registered batch receives a unique cryptographic Verification Token encoded into a QR code. 

When scanned by a consumer:
1. No login or password is required.
2. The server compares off-chain MongoDB records against on-chain Fabric ledger state.
3. Shows an authenticated **100% LEDGER_CONFIRMED** badge, farm origin, and chronological journey.
4. Privacy boundary middleware strictly conceals internal database IDs, passwords, and pricing.`,
    actions: [
      { label: 'Test QR Verification', route: '/verify' }
    ]
  },
  {
    keywords: ['register', 'batch', 'create batch', 'new batch'],
    question: 'How do I create and register a new batch?',
    answer: `To register a new consignment:
1. Log in with a **SUPPLIER** account.
2. Go to **Batches** in the sidebar and click **Register New Batch** (/batches/new).
3. Select a Product Master Template.
4. Fill in Batch Code, Quantity, Origin Location, and Manufacturing/Expiry dates.
5. Click **Register Batch**. The system automatically computes the genesis hash, commits to the blockchain, and generates your downloadable QR code.`,
    actions: [
      { label: 'Go to Batch Creation', route: '/batches/new' }
    ]
  },
  {
    keywords: ['health', 'ping', 'nodes', 'database', 'atlas', 'status'],
    question: 'How do I check system infrastructure and node health?',
    answer: `Open the **System Health** page (/system-health). It performs real-time diagnostic probes measuring:
- **Ping Round-Trip Latency** (e.g. 15ms).
- **MongoDB Atlas Database**: Cluster connectivity, replica protocol (TLS 1.3).
- **Hyperledger Fabric**: Synchronized channel state on *mychannel*.
- **AI Quality Risk Service**: FastAPI inference node readiness.
- **Express Backend API**: REST gateway status.`,
    actions: [
      { label: 'Probe System Health', route: '/system-health' }
    ]
  },
  {
    keywords: ['export', 'csv', 'download', 'reports', 'analytics'],
    question: 'How do I export consortium data to CSV?',
    answer: `Consortium operators and regulators can export data at any time:
1. Go to the **Dashboard** (/dashboard) or **AI & Analytics** (/analytics).
2. Click **Export Batches CSV** or **Export Events CSV**.
3. A standardized CSV file containing batch codes, SKUs, origin, timestamps, telemetry, and blockchain status will automatically download.`,
    actions: [
      { label: 'Open Analytics Export', route: '/analytics' }
    ]
  }
];

/**
 * Intelligent NLP & Keyword Matcher that returns the most helpful response
 */
export function queryConsortiumAssistant(
  query: string,
  userRole?: string,
  userName?: string
): AssistantMessage {
  const q = query.trim().toLowerCase();
  const effectiveRole = (userRole || 'GUEST').toUpperCase();
  const roleGuide = ROLE_GUIDES[effectiveRole] || ROLE_GUIDES.GUEST;
  const nameGreeting = userName ? `, ${userName}` : '';

  // 1. Check for greeting
  if (/^(hi|hello|hey|greetings|good\s*(morning|afternoon|evening))/i.test(q)) {
    return {
      id: Math.random().toString(36).substring(2, 9),
      sender: 'bot',
      text: `Hello${nameGreeting}! 👋 I am your **SecureChainFlow Consortium AI Assistant**.

As an authorized **${roleGuide.title}** (${effectiveRole}), I can guide you through:
- Your role responsibilities and required actions.
- Step-by-step instructions for registering batches, logging telemetry, or auditing.
- Understanding Hyperledger Fabric blockchain immutability and AI risk scoring.

How can I assist you right now?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions: roleGuide.quickQuestions,
      actions: roleGuide.steps[0]?.actionRoute ? [
        { label: roleGuide.steps[0].actionLabel || 'Take Action', route: roleGuide.steps[0].actionRoute }
      ] : undefined
    };
  }

  // 2. Check for role responsibilities query
  if (
    q.includes('my role') ||
    q.includes('my responsibilities') ||
    q.includes('what can i do') ||
    q.includes('how can i use') ||
    q.includes('how do i work') ||
    q.includes('what should i do') ||
    q.includes('role guide')
  ) {
    const stepsList = roleGuide.steps
      .map((s) => `**Step ${s.step}: ${s.title}**\n${s.description}`)
      .join('\n\n');

    const actions = roleGuide.steps
      .filter((s) => s.actionRoute && s.actionLabel)
      .map((s) => ({ label: s.actionLabel!, route: s.actionRoute! }));

    return {
      id: Math.random().toString(36).substring(2, 9),
      sender: 'bot',
      text: `### 📋 Your Role Guide: ${roleGuide.title} (${roleGuide.badge})

${roleGuide.description}

#### Primary Responsibilities:
${roleGuide.responsibilities.map((r) => `- ${r}`).join('\n')}

#### Step-by-Step Workflow:
${stepsList}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actions,
      suggestions: roleGuide.quickQuestions
    };
  }

  // 3. Search FAQ Knowledge Base
  let bestMatch: (typeof PROJECT_FAQS)[0] | null = null;
  let maxMatchCount = 0;

  for (const faq of PROJECT_FAQS) {
    let matchScore = 0;
    for (const kw of faq.keywords) {
      if (q.includes(kw)) {
        matchScore += 2;
      }
    }
    if (matchScore > maxMatchCount) {
      maxMatchCount = matchScore;
      bestMatch = faq;
    }
  }

  if (bestMatch && maxMatchCount > 0) {
    return {
      id: Math.random().toString(36).substring(2, 9),
      sender: 'bot',
      text: `### 💡 ${bestMatch.question}\n\n${bestMatch.answer}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actions: bestMatch.actions,
      suggestions: [
        'What are the 7 stages of SecureChainFlow?',
        'How does Hyperledger Fabric blockchain prevent tampering?',
        'How does the AI predictive risk engine work?'
      ]
    };
  }

  // 4. Role-specific query fallback
  for (const [rKey, rGuide] of Object.entries(ROLE_GUIDES)) {
    if (q.includes(rKey.toLowerCase()) || q.includes(rGuide.title.toLowerCase())) {
      const stepsList = rGuide.steps
        .map((s) => `**Step ${s.step}: ${s.title}** — ${s.description}`)
        .join('\n\n');

      return {
        id: Math.random().toString(36).substring(2, 9),
        sender: 'bot',
        text: `### 🏢 Role Information: ${rGuide.title}

${rGuide.description}

#### Key Workflow Steps:
${stepsList}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: rGuide.steps.filter((s) => s.actionRoute).map((s) => ({ label: s.actionLabel || 'Open Page', route: s.actionRoute! })),
        suggestions: rGuide.quickQuestions
      };
    }
  }

  // 5. Intelligent general assistant fallback
  return {
    id: Math.random().toString(36).substring(2, 9),
    sender: 'bot',
    text: `I understand you are asking about: *"${query}"*.

Here is how you can proceed in SecureChainFlow:
- **For Role Operations**: Ask *"What are my steps as ${effectiveRole}?"* to see your customized step-by-step checklist.
- **For Batch Lifecycle**: We follow 7 stages starting from **Products** (/products) to **Batch Creation** (/batches/new), **Custody Telemetry** (/shipments), **AI Risk Assessment** (/analytics), and **QR Verification** (/verify).
- **For Infrastructure Diagnostics**: You can check the live status of MongoDB Atlas and Hyperledger Fabric at **System Health** (/system-health).

What specific task would you like guidance on?`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    suggestions: [
      `What are my steps as ${effectiveRole}?`,
      'What are the 7 stages of SecureChainFlow?',
      'How does QR Code verification work for consumers?',
      'How does Hyperledger Fabric blockchain prevent tampering?'
    ],
    actions: [
      { label: 'View Dashboard', route: '/dashboard' },
      { label: 'System Health', route: '/system-health' }
    ]
  };
}
