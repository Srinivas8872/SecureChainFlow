import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Layers, Plus, Search, ArrowRight, ShieldCheck, Clock } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge, BadgeVariant } from '../../components/common/Badge';

interface BatchItem {
  id: string;
  batchCode: string;
  productId: {
    id: string;
    name: string;
    category: string;
  };
  organizationId: {
    id: string;
    name: string;
  };
  currentCustodianId: {
    id: string;
    name: string;
  };
  source: string;
  quantity: number;
  unit: string;
  status: string;
  blockchainStatus: 'PENDING' | 'COMMITTED' | 'FAILED' | 'LOCAL_DEMO';
  manufactureDate: string;
  createdAt: string;
}

export const BatchesListPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const qs = params.toString() ? `?${params.toString()}` : '';
      const data = await api.get<BatchItem[]>(`/batches${qs}`);
      setBatches(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [search, statusFilter]);

  const getStatusBadgeVariant = (status: string): BadgeVariant => {
    switch (status) {
      case 'QUALITY_APPROVED':
      case 'AVAILABLE_FOR_SALE':
      case 'DELIVERED':
        return 'success';
      case 'IN_TRANSIT':
      case 'IN_PROCESSING':
        return 'info';
      case 'STORED':
      case 'REGISTERED':
        return 'neutral';
      case 'RECALLED':
        return 'danger';
      default:
        return 'warning';
    }
  };

  const getBlockchainBadge = (bStatus: string) => {
    if (bStatus === 'COMMITTED') {
      return (
        <Badge variant="success" dot>
          <ShieldCheck className="w-3 h-3 inline mr-1" />
          Confirmed on Fabric
        </Badge>
      );
    }
    if (bStatus === 'LOCAL_DEMO') {
      return (
        <Badge variant="purple" dot>
          Demo Ledger Node
        </Badge>
      );
    }
    if (bStatus === 'FAILED') {
      return <Badge variant="danger" dot>Failed</Badge>;
    }
    return (
      <Badge variant="warning" dot>
        <Clock className="w-3 h-3 inline mr-1" />
        Pending
      </Badge>
    );
  };

  const canRegister = hasRole('SUPPLIER', 'PROCESSOR', 'ADMIN');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-sky-400" />
            <span>Supply Chain Batches</span>
          </h1>
          <p className="text-sm text-slate-400">
            Track product batch lots, current custodians, and cryptographic ledger consensus states.
          </p>
        </div>

        {canRegister && (
          <Link to="/batches/new">
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>Register New Batch</span>
            </Button>
          </Link>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by batch code or source..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-56 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="">All Batch Statuses</option>
          <option value="REGISTERED">REGISTERED</option>
          <option value="IN_PROCESSING">IN_PROCESSING</option>
          <option value="QUALITY_APPROVED">QUALITY_APPROVED</option>
          <option value="IN_TRANSIT">IN_TRANSIT</option>
          <option value="STORED">STORED</option>
          <option value="AVAILABLE_FOR_SALE">AVAILABLE_FOR_SALE</option>
          <option value="DELIVERED">DELIVERED</option>
          <option value="RECALLED">RECALLED</option>
        </select>
      </div>

      {/* Batches Table */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-sm text-slate-400">Loading batch records...</div>
        </div>
      ) : batches.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
          <Layers className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-white">No Batches Found</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            {search || statusFilter ? 'No batches match your filter criteria.' : 'Register a new batch to start the supply chain traceability record.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Batch Code</th>
                <th className="px-5 py-3.5">Product</th>
                <th className="px-5 py-3.5">Quantity</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Blockchain Notarization</th>
                <th className="px-5 py-3.5">Current Custodian</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-4 font-mono font-bold text-white">
                    <Link to={`/batches/${b.id}`} className="hover:text-sky-400 transition-colors">
                      {b.batchCode}
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-medium text-slate-200">{b.productId?.name || 'Unnamed Product'}</div>
                    <div className="text-xs text-slate-500">{b.productId?.category}</div>
                  </td>
                  <td className="px-5 py-4 font-mono">
                    {b.quantity} {b.unit}
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={getStatusBadgeVariant(b.status)}>
                      {b.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    {getBlockchainBadge(b.blockchainStatus)}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-300">
                    {b.currentCustodianId?.name || b.organizationId?.name || 'Origin Facility'}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      to={`/batches/${b.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-sky-600/20 hover:text-sky-400 text-xs font-medium text-slate-300 transition-colors"
                    >
                      <span>Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
