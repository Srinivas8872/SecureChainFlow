# SecureChainFlow — Hyperledger Fabric Blockchain Architecture & Operations

## 1. Overview
SecureChainFlow utilizes **Hyperledger Fabric (v2.5 LTS)** as a permissioned, consortium blockchain for notarizing essential supply-chain events and cryptographic payload digests off-chain without leaking private operational data.

### Architectural Principles:
1. **On-Chain vs. Off-Chain Separation**:
   - **On-Chain**: Event ID, Batch ID, Event Type, Actor ID, Organization ID, Canonical Payload SHA-256 Digest, Fabric Transaction ID, and Ledger Commit Timestamp.
   - **Off-Chain (MongoDB Atlas)**: Full operational telemetry, sensor records (temperature/humidity), facilities, notes, actor profile information, and document references.
2. **Deterministic Canonical Hashing**:
   - The backend computes a deterministic SHA-256 digest of the canonical event payload before submission.
   - The chaincode validates that required fields are present, verifies composite key uniqueness, and records the event state immutably.
3. **Transparent Execution Mode**:
   - When Fabric peer connectivity is active, transactions are committed to the channel with live peer endorsements.
   - When Fabric network is unavailable or during local UI development, the system runs safely in `LOCAL_DEMO` mode, clearly reporting demo status without fabricating fake on-chain transaction confirmations.

---

## 2. Chaincode Contract Specification (`SecureChainFlowContract`)

File: `blockchain/chaincode/index.js`

### Transactions & Methods:

#### `recordEvent(ctx, eventId, batchId, eventType, actorId, organizationId, payloadHash, timestamp)`
- Validates presence of `eventId`, `batchId`, `payloadHash`.
- Uses composite key `Event~batchId~eventId`.
- Rejects duplicate event submissions for the same batch ID.
- Emits `EventRecorded` event with `{ eventId, batchId, txId }`.
- Returns immutable JSON state record with `txId` and `recordedAt`.

#### `verifyEventHash(ctx, batchId, eventId, submittedHash)`
- Queries ledger by composite key `Event~batchId~eventId`.
- Compares `submittedHash` against `committedHash`.
- Returns verification status:
  - `INTEGRITY_CONFIRMED`: off-chain payload matches on-chain notarization.
  - `HASH_MISMATCH_TAMPER_DETECTED`: hash discrepancy identified.
  - `EVENT_NOT_FOUND_ON_CHAIN`: event has not been recorded on ledger.

#### `queryEventsByBatch(ctx, batchId)`
- Performs partial composite key query across all events registered for `batchId`.
- Returns full chronological ledger history for auditing.

---

## 3. Local Development & Deployment Workflow

### Prerequisites:
- Docker & Docker Compose
- Node.js 18+ (for chaincode packaging)
- cURL / Git Bash (on Windows)

### Commands:
```bash
# 1. Start Fabric test network with CouchDB and Certificate Authorities
cd blockchain/network
bash start-network.sh

# 2. Package and deploy chaincode to channel 'mychannel'
bash deploy-chaincode.sh

# 3. Configure backend environment variable
# In .env:
FABRIC_USE_MOCK_GATEWAY=false
FABRIC_CONNECTION_PROFILE=blockchain/network/connection-org1.json
FABRIC_WALLET_PATH=blockchain/network/wallet
FABRIC_CHANNEL_NAME=mychannel
FABRIC_CHAINCODE_NAME=securechainflow
```
