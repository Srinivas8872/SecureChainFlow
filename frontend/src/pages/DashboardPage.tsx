import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
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
  UserCheck,
  Clock,
  Download,
  Loader2,
  RefreshCw,
  MapPin
} from 'lucide-react';
import { Badge } from '../components/common/Badge';

interface RecentEvent {
  id: string;
  batchCode: string;
  eventType: string;
  location: string | null;
  facility: string | null;
  temperature: number | null;
  humidity: number | null;
  blockchainStatus: string;
  occurredAt: string;
  recordedBy?: { name: string; role: string } | null;
  organization?: { name: string } | null;
}

interface AnalyticsSummary {
  totalBatches: number;
  totalEvents: number;
  recalledBatches: number;
  committedBatches: number;
  blockchainCommitRate: number;
  statusBreakdown: Record<string, number>;
  eventTypeBreakdown: Record<string, number>;
  blockchainBreakdown: Record<string, number>;
  recentEvents?: RecentEvent[];
  generatedAt: string;
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [welcomeAlert, setWelcomeAlert] = useState<string | null>(() => {
    return (location.state as any)?.welcomeMessage || 
      ((location.state as any)?.justRegistered ? `Welcome to SecureChainFlow, ${user?.name || 'Operator'}!` : null) ||
      ((location.state as any)?.justLoggedIn ? `Welcome back, ${user?.name || 'Operator'}!` : null);
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '🌅 Good morning';
    if (hour < 17) return '☀️ Good afternoon';
    return '🌙 Good evening';
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<AnalyticsSummary>('/analytics/summary');
      setSummary(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load live consortium statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleExportCsv = async (type: 'batches' | 'events') => {
    setExporting(true);
    try {
      const blob = await api.downloadBlob(`/analytics/export?type=${type}`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `securechainflow_${type}_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export failed: ${err.message || 'Unknown error'}`);
    } finally {
      setExporting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-8">
      {/* Dynamic Celebration / Welcome Alert */}
      {welcomeAlert && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-950/80 via-indigo-950/80 to-purple-950/80 border border-sky-500/40 shadow-xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30 font-bold">
              🎉
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">{welcomeAlert}</h2>
              <p className="text-xs text-sky-300/80">
                You are authenticated as an authorized <strong>{user.role}</strong> operator for <strong>{user.organizationName || 'Consortium Member'}</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={() => setWelcomeAlert(null)}
            className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-900/80 text-slate-300 hover:text-white border border-slate-700/60"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Welcome & Role Context Banner */}
      <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-sky-950/50 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-sky-500/25 border border-sky-400/20 flex-shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {getGreeting()},{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-300 to-white">
                  {user.name}
                </span>!
              </h1>
              <Badge variant="info" dot>
                {user.role}
              </Badge>
            </div>
            <p className="text-sm text-slate-400 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5">
                <Building className="w-4 h-4 text-slate-500" />
                <span>Organization: <strong className="text-slate-200">{user.organizationName || 'Consortium Member'}</strong></span>
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400 font-mono text-xs flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Session Active & Verified
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Action depending on role */}
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
              to="/analytics"
              className="px-4 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-lg shadow-md shadow-purple-600/20 flex items-center gap-2 transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Audit Quality & AI Risk</span>
            </Link>
          )}

          {/* Export Report Action */}
          <button
            onClick={() => handleExportCsv('batches')}
            disabled={exporting}
            className="px-3.5 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            title="Download verified operational CSV report"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin text-sky-400" /> : <Download className="w-4 h-4 text-sky-400" />}
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Real Live Metrics Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5 rounded-xl bg-slate-900 border border-slate-800 animate-pulse h-28" />
          ))}
        </div>
      ) : error ? (
        <div className="p-5 rounded-xl bg-red-950/20 border border-red-800/40 text-red-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span>{error}</span>
          </div>
          <button onClick={fetchDashboardData} className="px-3 py-1 text-xs bg-red-900/50 hover:bg-red-800 rounded flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Batches */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Batches</span>
              <Layers className="w-5 h-5 text-sky-400" />
            </div>
            <div className="text-3xl font-extrabold text-white">{summary?.totalBatches ?? 0}</div>
            <div className="text-xs text-slate-500">Live operational registered lots</div>
          </div>

          {/* Blockchain Notarization */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Blockchain Notarized</span>
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold text-emerald-400">{summary?.committedBatches ?? 0}</div>
            <div className="text-xs text-emerald-500/80">
              {summary?.blockchainCommitRate ?? 0}% committed on Fabric ledger
            </div>
          </div>

          {/* Supply Chain Events */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Chain Events Logged</span>
              <QrCode className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="text-3xl font-extrabold text-indigo-400">{summary?.totalEvents ?? 0}</div>
            <div className="text-xs text-slate-500">Immutable lifecycle telemetry</div>
          </div>

          {/* Recalled / High Risk Flags */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Recall & Risk Flags</span>
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-3xl font-extrabold text-amber-400">{summary?.recalledBatches ?? 0}</div>
            <div className="text-xs text-amber-500/80">Active quality alerts / recalls</div>
          </div>
        </div>
      )}

      {/* Recent Supply Chain Events Feed */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-sky-400" />
            <h2 className="text-lg font-bold text-white">Recent Supply Chain Activity</h2>
          </div>
          <Link to="/batches" className="text-xs text-sky-400 hover:text-sky-300 transition">
            View All Batches &rarr;
          </Link>
        </div>

        {summary?.recentEvents && summary.recentEvents.length > 0 ? (
          <div className="divide-y divide-slate-800/80">
            {summary.recentEvents.map((ev) => (
              <div key={ev.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/30">
                      {ev.eventType}
                    </span>
                    <span className="text-sm font-semibold text-white">
                      Batch <strong className="text-sky-400">{ev.batchCode}</strong>
                    </span>
                    {ev.location && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-400">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {ev.location}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    Recorded by {ev.recordedBy?.name || 'Authorized Actor'} ({ev.organization?.name || 'Consortium Member'})
                    {ev.temperature != null && ` · Temp: ${ev.temperature}°C`}
                    {ev.humidity != null && ` · RH: ${ev.humidity}%`}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>{new Date(ev.occurredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  <span className={`px-2 py-0.5 rounded font-mono text-[10px] ${ev.blockchainStatus === 'COMMITTED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                    {ev.blockchainStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center space-y-2">
            <p className="text-sm text-slate-400">No events recorded yet in the consortium ledger.</p>
            <p className="text-xs text-slate-500">Create a product template and register an initial batch to start logging custody events.</p>
          </div>
        )}
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
