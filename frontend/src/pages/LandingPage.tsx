import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Cpu,
  QrCode,
  Lock,
  ArrowRight,
  Database,
  CheckCircle2,
  FileCheck
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="space-y-24 py-8">
      {/* Hero Section */}
      <section className="relative text-center space-y-8 max-w-4xl mx-auto pt-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-400 text-xs font-semibold tracking-wide">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
          <span>Next-Gen Enterprise Supply Chain Security</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Cryptographically Verified & <br />
          <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
            AI-Monitored Supply Chains
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
          SecureChainFlow unites permissioned <strong>Hyperledger Fabric</strong> blockchain immutability with predictive <strong>Machine Learning</strong> quality inspection to eliminate counterfeiting and supply disruptions.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            to="/login"
            className="px-6 py-3.5 text-base font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-xl shadow-sky-600/30 flex items-center gap-2 hover:gap-3 transition-all duration-200"
          >
            <span>Access Platform</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/verify"
            className="px-6 py-3.5 text-base font-semibold text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-xl flex items-center gap-2 transition-colors"
          >
            <QrCode className="w-5 h-5 text-sky-400" />
            <span>Scan / Verify Product QR</span>
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 text-left">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-sky-950/80 border border-sky-800/60 flex items-center justify-center text-sky-400">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Immutable Notarization</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Every handover, quality check, and custody event is hashed into a SHA-256 canonical digest and validated on Hyperledger Fabric.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">AI Decision Support</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Real-time anomaly detection scores transit delays, temperature fluctuations, and supplier reliability with full provenance metadata.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Public QR Provenance</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              End-consumers scan opaque cryptographic QR tags to view verified origin, custody timeline, and tamper verification status.
            </p>
          </div>
        </div>
      </section>

      {/* Consortium Lifecycle Section */}
      <section className="p-8 sm:p-12 rounded-3xl bg-slate-900/40 border border-slate-800/80 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            End-to-End Chain of Custody
          </h2>
          <p className="text-sm text-slate-400">
            Strict role-based permissions ensure each consortium participant records verified business events.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
          {[
            { step: '01', role: 'Supplier', action: 'Batch Registration' },
            { step: '02', role: 'Processor', action: 'Lineage & Quality' },
            { step: '03', role: 'Transporter', action: 'Custody Handover' },
            { step: '04', role: 'Warehouse', action: 'Storage & Receipt' },
            { step: '05', role: 'Retailer', action: 'Store Inventory' },
            { step: '06', role: 'Consumer', action: 'QR Verification' },
          ].map((item) => (
            <div key={item.step} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/60 space-y-2">
              <span className="text-xs font-mono font-bold text-sky-400">{item.step}</span>
              <div className="text-sm font-semibold text-slate-200">{item.role}</div>
              <div className="text-xs text-slate-500">{item.action}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Security Architecture Guarantee */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            <span>Strict Zero-Trust Architecture</span>
          </div>
          <h2 className="text-3xl font-bold text-white">
            Dual Layer Integrity: On-Chain Hash + Off-Chain Store
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Operational details and sensor streams reside securely off-chain in MongoDB Atlas. A canonical SHA-256 fingerprint is recorded on Hyperledger Fabric. When verifying, the server recomputes the exact digest: any byte modification immediately triggers a tamper alert.
          </p>
          <ul className="space-y-2 text-sm text-slate-400 pt-2">
            <li className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-sky-400" />
              <span>Idempotent transaction submission with retry reconciliation</span>
            </li>
            <li className="flex items-center gap-2">
              <Database className="w-4 h-4 text-sky-400" />
              <span>Role-governed server-side RBAC across every endpoint</span>
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <span>Transparent status flags: Confirmed, Pending, or Demo</span>
            </li>
          </ul>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 font-mono text-xs text-slate-300 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-slate-400">Canonical Integrity Notarization</span>
            <span className="text-emerald-400 font-semibold">256-BIT DIGEST</span>
          </div>
          <div className="bg-slate-950 p-4 rounded-lg space-y-2 overflow-x-auto text-slate-400">
            <p className="text-slate-500">// Off-chain payload canonicalized</p>
            <p className="text-sky-300">&#123;&quot;batchId&quot;:&quot;B-9840-X&quot;,&quot;eventType&quot;:&quot;QUALITY_APPROVED&quot;,...&#125;</p>
            <p className="text-slate-500 pt-2">// SHA-256 Digest committed to Fabric Chaincode</p>
            <p className="text-emerald-400 break-all">e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</p>
            <p className="text-slate-500 pt-2">// Fabric Transaction Status</p>
            <p className="text-indigo-400">STATUS: COMMITTED | TxID: tx_8fa0329cf</p>
          </div>
        </div>
      </section>
    </div>
  );
};
