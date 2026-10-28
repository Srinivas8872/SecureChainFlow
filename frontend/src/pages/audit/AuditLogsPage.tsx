import React, { useState, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { api } from '../../lib/api';
import { Badge } from '../../components/common/Badge';

interface AuditLogItem {
  id: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  actor?: {
    name?: string;
    email?: string;
    role?: string;
  };
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

interface AuditLogsResponse {
  logs: AuditLogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
      });
      if (search) params.append('search', search);
      if (outcomeFilter) params.append('outcome', outcomeFilter);
      if (actionFilter) params.append('action', actionFilter);

      const res = await api.get<AuditLogsResponse>(`/audit-logs?${params.toString()}`);
      setLogs(res.logs || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalCount(res.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, outcomeFilter, actionFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'SUCCESS':
        return (
          <Badge variant="success">
            <CheckCircle2 className="w-3 h-3 mr-1 inline" /> SUCCESS
          </Badge>
        );
      case 'FAILURE':
        return (
          <Badge variant="danger">
            <XCircle className="w-3 h-3 mr-1 inline" /> FAILURE
          </Badge>
        );
      case 'BLOCKED':
        return (
          <Badge variant="warning">
            <AlertTriangle className="w-3 h-3 mr-1 inline" /> BLOCKED
          </Badge>
        );
      default:
        return <Badge variant="neutral">{outcome}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Consortium Audit Trail</h1>
            <Badge variant="info">
              {totalCount} Recorded Events
            </Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Immutable system activity log recording authentication, batch creation, blockchain commits, and compliance verifications.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors self-start"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-400' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filters Bar */}
      <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by action, email, resource ID, or IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <select
          value={outcomeFilter}
          onChange={(e) => {
            setOutcomeFilter(e.target.value);
            setPage(1);
          }}
          className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
        >
          <option value="">All Outcomes</option>
          <option value="SUCCESS">Success Only</option>
          <option value="FAILURE">Failures Only</option>
          <option value="BLOCKED">Blocked Only</option>
        </select>

        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
        >
          <option value="">All Actions</option>
          <option value="USER_LOGGED_IN">User Logins</option>
          <option value="PRODUCT_CREATED">Product Creations</option>
          <option value="BATCH_REGISTERED">Batch Registrations</option>
          <option value="EVENT_NOTARIZED">Ledger Notarizations</option>
          <option value="EXPORT_ANALYTICS">CSV Exports</option>
        </select>

        <button
          type="submit"
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          Filter
        </button>
      </form>

      {/* Audit Log Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Timestamp</th>
                <th className="py-3.5 px-4 font-semibold">Action</th>
                <th className="py-3.5 px-4 font-semibold">Actor</th>
                <th className="py-3.5 px-4 font-semibold">Resource</th>
                <th className="py-3.5 px-4 font-semibold">Outcome</th>
                <th className="py-3.5 px-4 font-semibold">IP Address</th>
                <th className="py-3.5 px-4 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500 font-sans">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-400" />
                    Loading secure audit records...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500 font-sans">
                    No audit records found matching your filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpanded = expandedRow === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap text-slate-400">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-semibold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-sans">
                          <div className="text-slate-200 font-medium">
                            {log.actor?.name || log.actor?.email || 'System'}
                          </div>
                          {log.actor?.role && (
                            <div className="text-[10px] text-slate-500 font-mono">
                              Role: {log.actor.role}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-400">
                          <span className="text-slate-300 font-medium">{log.resourceType}</span>
                          {log.resourceId && (
                            <span className="text-slate-500 ml-1">#{log.resourceId.slice(0, 8)}...</span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {getOutcomeBadge(log.outcome)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-400">
                          {log.ipAddress || '127.0.0.1'}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-sans text-xs flex items-center gap-1 ml-auto"
                          >
                            <span>Payload</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-950/90">
                          <td colSpan={7} className="p-4 border-t border-slate-800/40">
                            <div className="text-xs space-y-2">
                              <div className="text-slate-400 font-sans font-semibold">Audit Record Payload Details:</div>
                              <pre className="p-3 bg-slate-900 rounded-lg text-emerald-400 font-mono text-[11px] overflow-x-auto border border-slate-800">
                                {JSON.stringify(
                                  {
                                    id: log.id,
                                    action: log.action,
                                    resourceType: log.resourceType,
                                    resourceId: log.resourceId,
                                    outcome: log.outcome,
                                    actor: log.actor,
                                    details: log.details,
                                    userAgent: log.userAgent,
                                    timestamp: log.createdAt
                                  },
                                  null,
                                  2
                                )}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-sans">
            <div>
              Showing page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong>
            </div>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 border border-slate-800 rounded text-slate-300"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 border border-slate-800 rounded text-slate-300"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
