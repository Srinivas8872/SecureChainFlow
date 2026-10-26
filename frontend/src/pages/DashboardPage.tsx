import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Layers,
  Truck,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  QrCode,
  LineChart,
  ShieldCheck,
  Building,
  UserCheck
} from 'lucide-react';
import { Badge } from '../components/common/Badge';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-8">
      {/* Welcome & Role Context Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/40 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Welcome, {user.name}</h1>
            <Badge variant="info" dot>
              {user.role}
            </Badge>
          </div>
          <p className="text-sm text-slate-400 flex items-center gap-2">
            <Building className="w-4 h-4 text-slate-500" />
            <span>Organization: <strong className="text-slate-200">{user.organizationName || 'Consortium Member'}</strong></span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {user.role === 'SUPPLIER' && (
            <Link
              to="/batches/new"
              className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-md shadow-sky-600/20 flex items-center gap-2 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Register New Batch</span>
            </Link>
          )}

          {(user.role === 'TRANSPORTER' || user.role === 'WAREHOUSE') && (
            <Link
              to="/batches"
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-colors"
            >
              <Truck className="w-4 h-4" />
              <span>Log Custody Event</span>
            </Link>
          )}

          {user.role === 'REGULATOR' && (
            <Link
              to="/audit-logs"
              className="px-4 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-lg shadow-md shadow-purple-600/20 flex items-center gap-2 transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Inspect Audit Trail</span>
            </Link>
          )}
        </div>
      </div>

      {/* Role-Specific Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Batches</span>
            <Layers className="w-5 h-5 text-sky-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">12</div>
          <div className="text-xs text-slate-500">Under active organization custody</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Blockchain Notarized</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">48</div>
          <div className="text-xs text-emerald-500/80">100% committed on Fabric ledger</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">AI Risk Flags</span>
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400">1</div>
          <div className="text-xs text-amber-500/80">1 temperature excursion flagged</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">QR Inquiries</span>
            <QrCode className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-indigo-400">154</div>
          <div className="text-xs text-slate-500">Public provenance verifications</div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/products"
          className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-sky-500/50 hover:bg-slate-900 transition-all space-y-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-sky-950 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white group-hover:text-sky-400 transition-colors">
            Product & Batch Management
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Register new batch serials, inspect genealogy, and generate tamper-evident public QR codes.
          </p>
        </Link>

        <Link
          to="/analytics"
          className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 transition-all space-y-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-950 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
            <LineChart className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">
            Predictive AI & Quality Risk
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Machine learning anomaly scoring for transit delays, environmental variance, and supplier ratings.
          </p>
        </Link>

        <Link
          to="/system-health"
          className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition-all space-y-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-950 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
            <UserCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
            Consortium Health & Node Diagnostics
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Verify peer connectivity, chaincode synchronization, and operational database health.
          </p>
        </Link>
      </div>
    </div>
  );
};
