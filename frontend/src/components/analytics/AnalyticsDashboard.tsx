import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Package,
  AlertTriangle,
  CheckCircle2,
  Link as ChainIcon,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Activity,
  XCircle,
  Cpu,
} from 'lucide-react';
import { api } from '../../lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AnalyticsSummary {
  totalBatches: number;
  totalEvents: number;
  recalledBatches: number;
  committedBatches: number;
  blockchainCommitRate: number;
  statusBreakdown: Record<string, number>;
  eventTypeBreakdown: Record<string, number>;
  blockchainBreakdown: Record<string, number>;
  generatedAt: string;
}

interface RiskResult {
  batchId: string;
  batchCode: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  anomalies: string[];
  source: string;
  analysedAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const RISK_COLORS: Record<string, string> = {
  LOW: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  MEDIUM: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  HIGH: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/30',
};

const STATUS_COLORS: Record<string, string> = {
  REGISTERED: '#6366f1',
  IN_PROCESSING: '#a855f7',
  QUALITY_APPROVED: '#06b6d4',
  IN_TRANSIT: '#f59e0b',
  STORED: '#3b82f6',
  AVAILABLE_FOR_SALE: '#10b981',
  DELIVERED: '#22c55e',
  RECALLED: '#ef4444',
};

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------
const KpiCard: React.FC<{
  label: string;
  value: string | number;
  sub?: string;
  Icon: React.FC<any>;
  iconColor?: string;
  trend?: 'up' | 'down' | 'neutral';
}> = ({ label, value, sub, Icon, iconColor = 'text-indigo-400', trend }) => (
  <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 p-5 flex items-center gap-4">
    <div className={`p-2.5 rounded-xl bg-slate-700/50 ${iconColor}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-slate-500 font-medium truncate">{label}</p>
      <p className="text-2xl font-bold text-white leading-tight">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
    {trend === 'up' && <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
    {trend === 'down' && <TrendingUp className="w-4 h-4 text-red-400 flex-shrink-0 rotate-180" />}
  </div>
);

// ---------------------------------------------------------------------------
// Mini bar chart (SVG)
// ---------------------------------------------------------------------------
const MiniBarChart: React.FC<{ data: Record<string, number>; colorMap?: Record<string, string> }> = ({
  data,
  colorMap = {},
}) => {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = Math.max(...entries.map(([, v]) => v), 1);
  return (
    <div className="space-y-2">
      {entries.map(([key, val]) => {
        const pct = (val / max) * 100;
        const color = colorMap[key] ?? '#6366f1';
        return (
          <div key={key} className="flex items-center gap-3 text-sm">
            <span className="w-32 text-slate-400 text-xs truncate">{key.replace(/_/g, ' ')}</span>
            <div className="flex-1 h-2 bg-slate-700/60 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            <span className="text-slate-300 text-xs w-8 text-right">{val}</span>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Risk Score Panel
// ---------------------------------------------------------------------------
const RiskScoreGauge: React.FC<{ score: number; level: string }> = ({ score, level }) => {
  const colorClass = RISK_COLORS[level] ?? RISK_COLORS.LOW;
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="12" />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            stroke={
              level === 'CRITICAL'
                ? '#ef4444'
                : level === 'HIGH'
                ? '#f97316'
                : level === 'MEDIUM'
                ? '#f59e0b'
                : '#10b981'
            }
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{score}</span>
          <span className="text-xs text-slate-500">/ 100</span>
        </div>
      </div>
      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${colorClass}`}>{level} RISK</span>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main AnalyticsDashboard
// ---------------------------------------------------------------------------
export const AnalyticsDashboard: React.FC<{ batchId?: string }> = ({ batchId }) => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [risk, setRisk] = useState<RiskResult | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [riskLoading, setRiskLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [riskError, setRiskError] = useState<string | null>(null);

  const fetchSummary = async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const data = await api.get<AnalyticsSummary>('/analytics/summary');
      setSummary(data);
    } catch (err: any) {
      setSummaryError(err.message ?? 'Failed to load analytics');
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchRisk = async (id: string) => {
    setRiskLoading(true);
    setRiskError(null);
    try {
      const data = await api.post<RiskResult>('/analytics/risk', { batchId: id });
      setRisk(data);
    } catch (err: any) {
      setRiskError(err.message ?? 'Risk analysis failed');
    } finally {
      setRiskLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    if (batchId) fetchRisk(batchId);
  }, [batchId]);

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-400" />
          Analytics & Risk Intelligence
        </h2>
        <button
          id="analytics-refresh-btn"
          onClick={fetchSummary}
          disabled={summaryLoading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 text-xs transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${summaryLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary KPIs */}
      {summaryLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : summaryError ? (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-sm text-red-400">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          {summaryError}
        </div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Total Batches"
              value={summary.totalBatches}
              Icon={Package}
              iconColor="text-indigo-400"
              trend="up"
            />
            <KpiCard
              label="Total Events"
              value={summary.totalEvents}
              Icon={Activity}
              iconColor="text-cyan-400"
            />
            <KpiCard
              label="Blockchain Commit Rate"
              value={`${summary.blockchainCommitRate}%`}
              sub={`${summary.committedBatches} committed`}
              Icon={ChainIcon}
              iconColor="text-emerald-400"
            />
            <KpiCard
              label="Recalled Batches"
              value={summary.recalledBatches}
              Icon={ShieldAlert}
              iconColor={summary.recalledBatches > 0 ? 'text-red-400' : 'text-slate-400'}
              trend={summary.recalledBatches > 0 ? 'down' : 'neutral'}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Batch Status Breakdown */}
            <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-400" />
                Batch Status Distribution
              </h3>
              <MiniBarChart data={summary.statusBreakdown} colorMap={STATUS_COLORS} />
            </div>

            {/* Event Type Breakdown */}
            <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Event Type Distribution
              </h3>
              <MiniBarChart data={summary.eventTypeBreakdown} />
            </div>
          </div>

          {/* Blockchain status breakdown */}
          <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <ChainIcon className="w-4 h-4 text-emerald-400" />
              Blockchain Commit Status
            </h3>
            <div className="flex flex-wrap gap-4">
              {Object.entries(summary.blockchainBreakdown).map(([status, count]) => (
                <div
                  key={status}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700/60 bg-slate-700/30"
                >
                  {status === 'COMMITTED' || status === 'LOCAL_DEMO' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : status === 'FAILED' ? (
                    <XCircle className="w-4 h-4 text-red-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  )}
                  <span className="text-sm text-slate-300">{status}</span>
                  <span className="text-sm font-bold text-white">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {/* Per-Batch AI Risk Score */}
      {batchId && (
        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              AI Anomaly Risk Score
            </h3>
            <button
              id="refresh-risk-btn"
              onClick={() => fetchRisk(batchId)}
              disabled={riskLoading}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3 h-3 ${riskLoading ? 'animate-spin' : ''}`} />
              Re-analyse
            </button>
          </div>

          {riskLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            </div>
          ) : riskError ? (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-sm text-red-400">
              <XCircle className="w-5 h-5 flex-shrink-0" />
              {riskError}
            </div>
          ) : risk ? (
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <RiskScoreGauge score={risk.riskScore} level={risk.riskLevel} />
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Anomaly Findings</p>
                  {risk.anomalies.length === 0 ? (
                    <p className="text-sm text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      No anomalies detected
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {risk.anomalies.map((a, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                          {a}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="text-xs text-slate-600">
                  Source: <span className="text-slate-500">{risk.source}</span> ·{' '}
                  {new Date(risk.analysedAt).toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-slate-600 italic">
                  AI-generated risk score is for decision support only and must not replace authorized human audit.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
