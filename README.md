# SecureChainFlow

> **Blockchain and AI Integrated Platform for Secure and Transparent Supply Chain Management**

SecureChainFlow is an enterprise web platform for registering product batches, notarizing supply-chain custody transitions on **Hyperledger Fabric**, detecting anomalies with **scikit-learn**, and providing instant public product verification via **QR codes**.

---

## 🏗 Architecture Overview

- **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide icons, React Router DOM.
- **Backend REST API:** Node.js, Express, TypeScript, Zod validation, JWT, bcrypt, Helmet, Express Rate Limit.
- **Database:** MongoDB Atlas (Mongoose ODM) with automatic embedded in-memory database fallback for seamless local development and automated CI.
- **Blockchain:** Hyperledger Fabric permissioned smart contract (`Chaincode`) for immutable state notarization, with canonical SHA-256 payload digest verification.
- **AI Decision-Support:** Python, FastAPI, Pandas, NumPy, scikit-learn for batch risk assessment and anomaly detection.
- **Storage:** Configurable object/document storage with cryptographic hashing.

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- **Node.js:** v18+ (tested on Node v26)
- **npm:** v9+
- **Python:** v3.10+ (for AI service)

### 1. Clone & Configure Environment
```bash
cp .env.example .env
```

### 2. Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Run Development Services
```bash
# Start backend API (runs on port 5000 with in-memory MongoDB enabled by default)
npm --prefix backend run dev

# Start frontend application (runs on http://localhost:5173)
npm --prefix frontend run dev

# Start AI inference service (optional, runs on port 8000)
cd ai-service
pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload
```

---

## 🧪 Testing

```bash
# Run backend unit and integration test suite
npm --prefix backend run test

# Build frontend production bundle
npm --prefix frontend run build

# Build backend production bundle
npm --prefix backend run build
```

---

## 📄 License & Integrity Statement
Built according to the `SecureChainFlow_Project_Blueprint_and_Master_Prompt.md` specification. No synthetic data is presented as verified blockchain transactions or trained AI accuracy without explicit labels.
