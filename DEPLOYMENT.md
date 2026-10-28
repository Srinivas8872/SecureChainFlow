# SecureChainFlow Production Deployment & Operations Runbook

This guide contains end-to-end operational instructions for deploying and running **SecureChainFlow** across production cloud infrastructure (MongoDB Atlas, Render, Vercel, and Hyperledger Fabric).

---

## 1. System Architecture & Topology

```
+-------------------------------------------------------------------------------+
|                             CLIENT / BROWSER                                  |
|   Consumer QR Scans (Unauthenticated)  |  Consortium Portal (Authenticated)   |
+------------------------------------+------------------------------------------+
                                     |
               HTTPS (TLS 1.3)       |
                                     v
+-------------------------------------------------------------------------------+
|                       FRONTEND SPA (Vercel / Nginx)                           |
|   - React 18 + Vite 6 + Tailwind CSS 3.4                                      |
|   - SPA Client-side Route Rewrites (`vercel.json` / `nginx.conf`)             |
+------------------------------------+------------------------------------------+
                                     |
              REST API Requests      | Authorization: Bearer <JWT>
                                     v
+-------------------------------------------------------------------------------+
|                       BACKEND API (Render Web Service)                        |
|   - Node.js 22 + Express 4 + TypeScript 5.7                                   |
|   - Security: Helmet headers, CORS allowlist, rate limiting                   |
|   - Health Check: GET /api/v1/health                                          |
+-------------------+------------------------------+----------------------------+
                    |                              |
         Mongoose   |                    Inference | HTTP (Internal/Private)
                    v                              v
+-------------------+----------+   +---------------+----------------------------+
|  DATABASE (MongoDB Atlas)    |   |     AI SERVICE (FastAPI / Render)          |
|  - Multi-region replica set  |   |   - Python 3.11 + scikit-learn             |
|  - TLS 1.3 encrypted         |   |   - Continuous Risk Scoring (0–100)        |
|  - Partial indexes for idemp |   |   - Health Check: GET /health              |
+------------------------------+   +--------------------------------------------+
                    |
                    | Fabric Gateway SDK
                    v
+-------------------------------------------------------------------------------+
|               BLOCKCHAIN CONSORTIUM (Hyperledger Fabric v2.5 LTS)             |
|   - Organizations: Org1 (Supplier), Org2 (Processor), Org3 (Retailer)        |
|   - Peer Endpoints: TLS mutual auth (mTLS), Orderer Raft cluster              |
|   - Chaincode: `securechainflow` smart contract with canonical SHA-256 digests|
+-------------------------------------------------------------------------------+
```

---

## 2. Environment Variables & Secret Configuration

Create private `.env` files in production. **Never commit real credentials or private keys to git.**

### Backend (`backend/.env` or Render Dashboard)
| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment | `production` |
| `PORT` | Listening port | `5000` |
| `FRONTEND_ORIGIN` | Allowed CORS origin | `https://securechainflow.vercel.app` |
| `MONGODB_URI` | MongoDB Atlas SRV connection string | `mongodb+srv://<user>:<pwd>@cluster0.mongodb.net/securechainflow?retryWrites=true&w=majority` |
| `USE_IN_MEMORY_DB` | In-memory MongoDB override (dev only) | `false` |
| `JWT_SECRET` | 64+ char random secret for signing JWTs | Generate via `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | Session token lifetime | `24h` |
| `BCRYPT_ROUNDS` | Password hashing work factor | `10` |
| `AI_SERVICE_URL` | Private network URL to FastAPI service | `https://securechainflow-ai.onrender.com` |
| `FABRIC_USE_MOCK_GATEWAY` | Toggle mock/production Fabric gateway | `true` (mock) or `false` (live Fabric) |
| `FABRIC_CONNECTION_PROFILE` | Path to Fabric connection profile | `blockchain/network/connection-org1.json` |
| `FABRIC_WALLET_PATH` | Path to X.509 identity wallet | `blockchain/network/wallet` |
| `FABRIC_CHANNEL_NAME` | Hyperledger Fabric channel | `mychannel` |
| `FABRIC_CHAINCODE_NAME` | Deployed smart contract ID | `securechainflow` |
| `FABRIC_MSP_ID` | Member Services Provider ID | `Org1MSP` |

### Frontend (`frontend/.env` or Vercel Dashboard)
| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Public URL to Backend REST API | `https://securechainflow-api.onrender.com/api/v1` |
| `VITE_APP_NAME` | Application display title | `SecureChainFlow` |

### AI Service (`ai-service/.env` or Render Dashboard)
| Variable | Description | Example |
| :--- | :--- | :--- |
| `ENVIRONMENT` | Runtime environment | `production` |
| `PORT` | Listening port | `8000` |

---

## 3. Database Deployment: MongoDB Atlas

1. **Provision Cluster**:
   * Create an M10+ dedicated or M0 free cluster in your cloud provider region (e.g. AWS `us-east-1`).
2. **Configure Database User**:
   * In *Database Access*, create a user (e.g. `scf_backend_user`) with `readWrite` privileges on the `securechainflow` database.
3. **Network Security & IP Allowlist**:
   * In *Network Access*, add the outbound IP addresses of your backend hosts (or `0.0.0.0/0` with strong password authentication if Render dynamic IPs are used).
4. **Copy Connection String**:
   * Retrieve the SRV URI: `mongodb+srv://<user>:<password>@cluster0.mongodb.net/securechainflow?retryWrites=true&w=majority`
   * Set this as `MONGODB_URI` in the backend service.

---

## 4. Backend Deployment on Render

1. Log in to [Render](https://render.com) and click **New + > Web Service**.
2. Connect your repository.
3. Configure settings:
   * **Root Directory:** `backend`
   * **Runtime:** `Node`
   * **Build Command:** `npm install && npm run build`
   * **Start Command:** `npm start`
   * **Health Check Path:** `/api/v1/health`
4. In **Environment Variables**, supply all backend variables from Section 2.
5. Deploy and verify health check:
   ```bash
   curl -i https://your-backend.onrender.com/api/v1/health
   # Expected: HTTP 200 {"success":true,"data":{"status":"HEALTHY",...}}
   ```

---

## 5. AI Service Deployment on Render

1. Click **New + > Web Service**.
2. Connect your repository.
3. Configure settings:
   * **Root Directory:** `ai-service`
   * **Runtime:** `Python`
   * **Build Command:** `pip install --no-cache-dir -r requirements.txt`
   * **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   * **Health Check Path:** `/health`
4. Copy the service URL (e.g. `https://securechainflow-ai.onrender.com`) and update `AI_SERVICE_URL` in the Backend Web Service.

---

## 6. Frontend Deployment on Vercel

1. Log in to [Vercel](https://vercel.com) and click **Add New... > Project**.
2. Import the repository.
3. Configure project settings:
   * **Framework Preset:** `Vite`
   * **Root Directory:** `frontend`
   * **Build Command:** `npm run build`
   * **Output Directory:** `dist`
4. Under **Environment Variables**:
   * `VITE_API_BASE_URL` = `https://your-backend.onrender.com/api/v1`
5. Click **Deploy**.
6. The included `vercel.json` automatically manages client-side SPA routing rewrites. Verify by directly opening a deep URL such as `/verify/demo-token-12345`.

---

## 7. Hyperledger Fabric Production Network Setup

When transitioning from `LOCAL_DEMO` mode to a live Hyperledger Fabric network:

1. **Deploy Consortium Network**:
   ```bash
   cd blockchain/network
   ./start-network.sh
   ./deploy-chaincode.sh
   ```
2. **Export Connection Profile**:
   * Generate `connection-org1.json` containing the peer endpoints, orderer addresses, and TLS CA certificates.
   * Place the file at the path specified by `FABRIC_CONNECTION_PROFILE`.
3. **Register & Enroll Client Identity**:
   * Enroll the application identity with the Fabric CA (Org1 CA).
   * Save the X.509 certificate and private key in `blockchain/network/wallet/user1.id`.
4. **Activate Live Gateway in Backend**:
   * Update `backend/.env`:
     ```env
     FABRIC_USE_MOCK_GATEWAY=false
     ```
   * Restart backend. The [fabricAdapter.ts](file:///e:/Major%20Project/backend/src/integrations/fabric/fabricAdapter.ts) will initialize the `@hyperledger/fabric-gateway` client, connect to the peer endpoint with mutual TLS, submit endorsement proposals, and return real blockchain transaction IDs.

---

## 8. Docker Compose Local Full-Stack Deployment

To run the entire multi-service stack locally with Docker Compose:

```bash
# Build and start all 4 services (mongodb, backend, ai-service, frontend)
docker-compose up --build -d

# Check running containers
docker-compose ps

# View backend logs
docker-compose logs -f backend

# Shutdown all services
docker-compose down -v
```

---

## 9. Rollback & Disaster Recovery Procedures

1. **Frontend Rollback**:
   * In Vercel, navigate to *Deployments*, locate the previous successful build, and click **Promote to Production** (instant zero-downtime rollback).
2. **Backend Rollback**:
   * In Render, go to *Deploys*, click the previous deploy commit, and select **Rollback to this deploy**.
3. **Database Restoration**:
   * In MongoDB Atlas, continuous point-in-time recovery (PITR) allows single-click restoration to any minute within the retention window.
4. **Secret Rotation**:
   * If `JWT_SECRET` is compromised, rotate it immediately in the Render dashboard. Existing sessions will expire gracefully, prompting users to re-authenticate with their password.
