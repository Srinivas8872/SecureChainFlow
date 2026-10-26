# SECURECHAINFLOW
## Project Blueprint, Technical Specification & Master Build Prompt
### Blockchain + AI/ML Supply Chain Management Platform

*A single implementation guide for planning, building, testing, securing, and deploying the project from scratch.*
*Version 1.0 | Prepared: 24 October 2026*

---

## How to use this document
This document consolidates the agreed SecureChainFlow concept, requirements, proposed technology stack, architecture, pages, data flow, implementation phases, quality gates, deployment approach, and one reusable master prompt for an AI coding assistant. Use it as the project source of truth. Build in small, verifiable phases rather than asking an AI tool to generate the entire codebase in one unreviewed pass.

- Treat features marked "MVP" as the minimum working prototype; treat later hardening items as production-readiness work.
- Do not claim a feature is implemented until its code, tests, and integration have been verified.
- Hyperledger Fabric, AI/ML, and cloud services require environment configuration and real integration; mock/demo behavior must be clearly labelled.
- The ML algorithm and final input features are intentionally not preselected. Choose them only after defining the prediction task and reviewing suitable data.

---

## 1. Product vision and scope
**Project title:** "SecureChainFlow: Blockchain and AI Integrated Platform for Secure and Transparent Supply Chain Management."  
SecureChainFlow is a web-based platform for tracking product batches and supply-chain events, verifying product history, and turning operational data into useful risk and quality insights.

### Core value proposition
- **Blockchain:** records important, authorized supply-chain events in a permissioned, tamper-evident ledger.
- **AI/ML:** analyses available operational and optional sensor data to identify unusual patterns, estimate defined risks, and support quality monitoring.
- **QR verification:** gives users a simple route to a product or batch record; the QR code identifies/links to the record and is not itself a security mechanism.
- **Operational database and cloud storage:** store detailed records, readings, documents, images, and other data that do not belong directly on-chain.
- **Role-based web dashboards:** show users the actions and information appropriate to their roles.

### Product principles
- General supply-chain products, not limited to agricultural or food products.
- Build a credible student prototype first, with a clear path to stronger production deployment.
- Use transparent status labels: Demo, Pending, Confirmed, Failed, or Unavailable as appropriate.
- Never fabricate blockchain transaction IDs, AI predictions, scan results, or audit events.
- The platform should fail safely when an external dependency is down and explain what is unavailable.

---

## 2. Users, roles, and permissions

| Role | Typical capabilities | Restrictions / notes |
| :--- | :--- | :--- |
| **Supplier** | Register products/batches; record source and dispatch events; view own records. | Cannot edit another organization's records without explicit permission. |
| **Processor / Manufacturer** | Record processing, transformation, quality checks, and batch relationships. | Must preserve source-to-output batch lineage. |
| **Transporter** | Record pickup, shipment status, custody handover, and delivery events. | Only authorized shipments/batches. |
| **Warehouse** | Record receipt, storage, stock status, and dispatch. | Access scoped to assigned facilities/batches. |
| **Retailer** | Record retail receipt and availability; inspect product history. | Limited to relevant inventory and events. |
| **Regulator / Auditor** | Read authorized records, review history, verification status, and audit views. | Read access unless a separate explicit permission is designed. |
| **Customer / Public viewer** | Scan QR and view a curated public product/batch history. | No private operational data, personal data, or internal risk details. |
| **Administrator** | Manage users, organizations, roles, reference data, and system health. | Privileged actions must be logged and protected. |

*Implement role-based access control (RBAC) on the server. Hiding a button in React is not authorization. Every protected API endpoint must verify the authenticated user, role, organization scope, and ownership/assignment rules.*

---

## 3. Functional requirements and feature modules

### 3.1 Authentication and account management (MVP)
- Sign up/in flow according to the chosen deployment model; support administrator-created or approved organizational accounts if open self-registration is unsuitable.
- Hash passwords with bcrypt; never store plaintext passwords.
- Use JWT access tokens with expiration and a deliberate storage strategy. Prefer secure, HttpOnly cookies for browser sessions when the deployment architecture supports them; implement CSRF protection if cookie-based auth is used.
- Logout, session/token expiry handling, protected routes, role-aware navigation, and server-side RBAC.
- Password reset and email verification are production hardening items if email delivery is configured.

### 3.2 Organization and user administration
- Create/manage organizations, users, assigned roles, account status, and relevant facilities.
- Record administrator actions in an audit log.
- Prevent users from granting themselves higher privileges.

### 3.3 Product and batch management (MVP)
- Create a product template and a unique batch with product name/category, batch ID, source, quantity/unit, manufacture or registration date, optional expiry date, organization, and relevant metadata.
- Validate required fields, allowed values, quantity ranges, date consistency, and duplicate batch IDs.
- View searchable/filterable product and batch lists with pagination.
- Show batch status, current custodian (if recorded), timeline, related files, and verification status.
- Do not silently overwrite historical events. Corrections should be represented by an authorized corrective event with reason and audit trail.

### 3.4 Supply-chain event tracking (MVP)
- Record events such as REGISTERED, PROCESSED, QUALITY_CHECKED, DISPATCHED, IN_TRANSIT, RECEIVED, STORED, RETAILED, RECALLED, and DELIVERED where relevant.
- Each event should include event type, batch ID, timestamp, actor/organization, location or facility when appropriate, notes, relevant data reference, and status.
- Validate permitted transitions and actor permissions before recording an event.
- Display an ordered, readable timeline and indicate whether an event is confirmed on the blockchain, pending, or failed.

### 3.5 QR generation and public verification (MVP)
- Generate a QR code linked to a stable public verification URL or opaque verification identifier for a product/batch.
- Provide download/print functionality for the QR code.
- Scanning opens a public-safe verification page showing product/batch identity, selected history, and verification status.
- Rate-limit public endpoints, avoid exposing sequential private IDs or sensitive data, and prevent QR tampering from becoming an authorization bypass.

### 3.6 Blockchain traceability (MVP integration; local Fabric setup first)
- Use Hyperledger Fabric as a permissioned blockchain network, with Chaincode implementing transaction validation and ledger operations.
- Record essential supply-chain event fields and/or a canonical payload hash plus references. Do not place large files or high-volume sensor streams directly on-chain.
- Persist the Fabric transaction ID, event ID, timestamp, and commit/validation status where available.
- Distinguish pending submission from committed/validated transactions. Never show "verified on blockchain" until a real confirmation has been received.
- Provide a clearly labelled local/demo mode if the Fabric network is unavailable during UI development; demo data must never be presented as a real blockchain transaction.

### 3.7 Off-chain data and document storage
- Store detailed operational records and structured metadata in MongoDB Atlas.
- Store large documents, images, certificates, or reports in a configured object/cloud storage service; save metadata and object references in MongoDB.
- For integrity-sensitive records, canonicalize the relevant payload, calculate a cryptographic hash, and associate it with the corresponding ledger event.
- On verification, retrieve the off-chain content, recompute the hash using the same canonicalization rules, and compare it with the on-chain reference.
- Use private access controls, file size/type limits, malware scanning where available, and expiring signed URLs for protected files.

### 3.8 AI/ML insights (MVP after data definition)
- Start by defining one measurable task, for example anomaly flagging from event/operational patterns or risk scoring from clearly specified inputs.
- Document data sources, labels, target variable, feature definitions, missing-data handling, train/test strategy, metrics, limitations, and intended use.
- Use Python, Pandas, NumPy, and scikit-learn. Choose a model only after task and data review; do not hard-code an arbitrary model without justification.
- Expose predictions through a small Python service or a well-defined backend integration; validate inputs and version the model.
- Show a score/category, short explanation of contributing factors when supported, model/version, generated time, and a disclaimer that predictions support—not replace—human decisions.
- If no valid dataset exists, build the integration contract and clearly labelled sample-data demo first. Do not present synthetic results as validated real-world accuracy.

### 3.9 Dashboard and reporting (MVP)
- Role-specific summary cards: batches, events, shipments, pending actions, failed verifications, and risk flags where meaningful.
- Search/filter by batch, product, organization, date, status, and event type.
- Visualize event volumes and risk/quality trends only when enough valid data exists.
- Export reports to CSV or PDF only if implemented and tested; exports must obey role permissions and avoid leaking private fields.

### 3.10 Audit, alerts, and system status
- Record security-relevant and business-critical actions in an append-oriented audit trail.
- Show integration health for MongoDB, Fabric, AI service, and storage, without exposing secrets or sensitive diagnostics.
- Alerts may be in-app initially; email/SMS notifications are optional and require explicit provider configuration.
- Provide meaningful loading, empty, retry, error, and offline/dependency-unavailable states.

---

## 4. Website pages and navigation

| Page / route suggestion | Purpose and key content | Access |
| :--- | :--- | :--- |
| `/` | Public landing page: value proposition, workflow, security/traceability explanation, CTA to sign in or verify. | Public |
| `/login` | Sign in and clear validation/error feedback. | Public |
| `/register` or `/request-access` | Account creation or access request based on deployment policy. | Public/configurable |
| `/dashboard` | Role-specific overview, KPIs, recent events, pending actions, system status. | Authenticated |
| `/products` | Product templates list, search, filters, pagination. | Authenticated by role |
| `/products/new` | Create product template. | Authorized roles |
| `/products/:productId` | Product details and associated batches. | Authorized roles |
| `/batches` | Batch list and status filters. | Authenticated by role |
| `/batches/new` | Create/register a batch. | Authorized roles |
| `/batches/:batchId` | Batch overview, lineage, event timeline, data/documents, blockchain status, QR. | Scoped access |
| `/batches/:batchId/events/new` | Add a permitted supply-chain event. | Authorized roles |
| `/shipments` | Shipment/custody views and assigned shipments. | Relevant roles |
| `/qr/:verificationId` | Public-safe product/batch verification page. | Public, limited fields |
| `/analytics` | Quality, anomaly, risk and operational insights; display data provenance and model limitations. | Authorized roles |
| `/reports` | Filters and export actions if implemented. | Authorized roles |
| `/users` | User/role management. | Admin |
| `/organizations` | Organization and facility management. | Admin |
| `/audit-logs` | Searchable audit records. | Admin/auditor |
| `/settings` | Profile, security preferences, organization context. | Authenticated |
| `/system-health` | Dependency status and safe diagnostics. | Admin |

*App shell: responsive sidebar/navigation, top bar with role/organization context, breadcrumbs, page title, primary action, accessible content region. Keep public verification separate from authenticated internal dashboards.*

---

## 5. Agreed technology stack
- **Frontend:** React.js (TypeScript recommended)
- **Styling:** Tailwind CSS
- **Backend API:** Node.js + Express.js
- **Database:** MongoDB Atlas (Mongoose ODM)
- **Blockchain:** Hyperledger Fabric
- **Smart Contracts:** Fabric Chaincode
- **AI/ML Service:** Python + scikit-learn
- **Data Processing:** Pandas + NumPy
- **QR:** A maintained QR library
- **File Storage:** Cloud/object storage
- **Authentication:** JWT + bcrypt + RBAC
- **Deployment:** Vercel (Frontend), Render (Backend), Docker for reproducible local services

---

## 6. Architecture and Data Flow
High-level request path:
1. User opens React + Tailwind CSS web app and signs in.
2. Frontend calls Node.js/Express REST API over HTTPS.
3. Backend validates request, authenticates user, enforces role/organization permissions, and validates payload.
4. MongoDB stores operational metadata and off-chain records; object storage holds large files.
5. Blockchain adapter submits authorized event transactions to Hyperledger Fabric Chaincode and records status.
6. Python AI/ML service receives validated feature data and returns versioned analysis results.
7. Frontend displays data, event history, QR verification, AI insights, and integration status with clear provenance labels.

*Lifecycle: CREATED -> SUBMITTED -> COMMITTED/VALIDATED or FAILED.*

---

## 7. Blockchain, On-Chain/Off-Chain, and QR Design
- **On-chain:** Stable event ID, batch/product reference, event type, actor/organization reference, timestamp, canonical payload hash (SHA-256), and tx metadata.
- **Off-chain:** Operational data, quality measurements, sensor readings, documents, images.
- **Integrity verification:** Recompute SHA-256 digest on canonical JSON representation of record; compare against on-chain hash.

---

## 8. AI/ML Design and Responsible Evaluation
- Define task: e.g. Batch Anomaly Detection / Transit Risk Scoring based on historical event durations, temperature excursions, route anomaly flags, and supplier reliability.
- Document dataset schema, baseline model, cross-validation metrics, limitations, model versioning, and explainability.

---

## 9. Data Model and API Contract
- Collections: `users`, `organizations`, `products`, `batches`, `supplyChainEvents`, `shipments`, `documents`, `verificationTokens`, `modelPredictions`, `auditLogs`.
- REST API: `/api/v1/*` consistent prefix, structured JSON error responses, Zod validation schemas, pagination caps.

---

## 10. Security and Production Readiness
- Security headers (Helmet), CORS allowlist, rate limiting.
- Bcrypt password hashing (work factor 10+).
- JWT expiration and role/organization scoping on every route.
- Sanitized logging without credentials or sensitive payload leakage.
- Health checks (`/api/v1/health`), metrics, and graceful degradation.

---

## 11. UX/UI and Accessibility Standards
- Clean, trustworthy enterprise design system with responsive layouts.
- Reusable UI primitives, keyboard accessibility, visible focus indicators.
- Loading skeletons, empty states, error recovery, confirmation modals.
