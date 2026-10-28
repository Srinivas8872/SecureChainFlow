import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck,
  Package,
  MapPin,
  Search,
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { api } from '../../lib/api';
import { Badge } from '../../components/common/Badge';

interface ShipmentBatch {
  id: string;
  batchCode: string;
  productId: {
    id: string;
    name: string;
    category: string;
    sku?: string;
  };
  organizationId: {
    name: string;
    type: string;
  };
  currentCustodianId?: {
    name: string;
    type: string;
  };
  source: string;
  quantity: number;
  unit: string;
  status: string;
  blockchainStatus: string;
  verificationToken: string;
  createdAt: string;
  updatedAt: string;
}

export const ShipmentsPage: React.FC = () => {
  const [shipments, setShipments] = useState<ShipmentBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const data = await api.get<ShipmentBatch[]>('/batches');
      setShipments(data || []);
    } catch (err) {
      console.error('Failed to load shipments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  const filtered = shipments.filter((s) => {
    const matchesSearch =
      s.batchCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.productId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.source?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.currentCustodianId?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (filterStatus === 'ALL') return matchesSearch;
    if (filterStatus === 'TRANSIT') return matchesSearch && (s.status === 'IN_TRANSIT' || s.status === 'DISPATCHED');
    if (filterStatus === 'DELIVERED') return matchesSearch && s.status === 'DELIVERED';
    if (filterStatus === 'STORED') return matchesSearch && (s.status === 'STORED' || s.status === 'AVAILABLE_FOR_SALE');
    return matchesSearch;
  });

  const getStatusBadgeVariant = (status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' => {
    switch (status) {
      case 'IN_TRANSIT':
      case 'DISPATCHED':
        return 'warning';
      case 'DELIVERED':
        return 'success';
      case 'STORED':
      case 'AVAILABLE_FOR_SALE':
        return 'info';
      case 'RECALLED':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Logistics & Shipments</h1>
            <Badge variant="info">
              {shipments.length} Active Consignments
            </Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time multi-party custody tracking, route telemetry, and blockchain-notarized carrier handovers.
          </p>
        </div>

        <button
          onClick={fetchShipments}
          className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors self-start"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Quick Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by batch code, product, route..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Consignments' },
            { id: 'TRANSIT', label: 'In Transit' },
            { id: 'STORED', label: 'In Warehouse' },
            { id: 'DELIVERED', label: 'Delivered' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                filterStatus === tab.id
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Shipment Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 animate-pulse h-48" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
          <Truck className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-white">No Shipments Found</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            No supply chain consignments matched the selected criteria. Register a batch or dispatch an existing inventory lot to view logistics tracking.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-mono font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                      {item.batchCode}
                    </span>
                    <h3 className="text-base font-bold text-white mt-1.5">
                      {item.productId?.name || 'General Commodity'}
                    </h3>
                  </div>
                  <Badge variant={getStatusBadgeVariant(item.status)} dot>
                    {item.status}
                  </Badge>
                </div>

                <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <span className="truncate">Origin: <strong className="text-slate-300">{item.source}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <span className="truncate">Custodian: <strong className="text-slate-300">{item.currentCustodianId?.name || item.organizationId?.name}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <span>Payload: <strong className="text-slate-300">{item.quantity} {item.unit}</strong></span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-emerald-400 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{item.blockchainStatus}</span>
                </span>

                <Link
                  to={`/batches/${item.id}`}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium flex items-center gap-1.5 transition-colors"
                >
                  <span>Track Consignment</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
