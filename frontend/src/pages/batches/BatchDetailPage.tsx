import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  Layers,
  ArrowLeft,
  QrCode,
  Download,
  ExternalLink,
  Building,
  Calendar,
  MapPin,
  Plus,
  GitCommit
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge, BadgeVariant } from '../../components/common/Badge';
import { EventTimeline, TimelineEvent } from '../../components/events/EventTimeline';
import { RecordEventModal } from '../../components/events/RecordEventModal';
import { AnalyticsDashboard } from '../../components/analytics/AnalyticsDashboard';

interface BatchDetail {
  id: string;
  batchCode: string;
  productId: {
    id: string;
    name: string;
    category: string;
    sku?: string;
    description?: string;
  };
  organizationId: {
    id: string;
    name: string;
    type: string;
    contactEmail?: string;
  };
  currentCustodianId: {
    id: string;
    name: string;
    type: string;
    contactEmail?: string;
  };
  source: string;
  quantity: number;
  unit: string;
  status: string;
  blockchainStatus: 'PENDING' | 'COMMITTED' | 'FAILED' | 'LOCAL_DEMO';
  manufactureDate: string;
  expiryDate?: string;
  verificationToken: string;
  verificationUrl: string;
  qrDataUrl: string;
  payloadHash: string;
  txId?: string;
  createdAt: string;
}

export const BatchDetailPage: React.FC = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBatchAndEvents = async () => {
    if (!batchId) return;
    try {
      const [batchData, eventList] = await Promise.all([
        api.get<BatchDetail>(`/batches/${batchId}`),
        api.get<TimelineEvent[]>(`/batches/${batchId}/events`)
      ]);
      setBatch(batchData);
      setEvents(eventList);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve batch detail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatchAndEvents();
  }, [batchId]);

  const handleDownloadQr = () => {
    if (!batch?.qrDataUrl) return;
    const a = document.createElement('a');
    a.href = batch.qrDataUrl;
    a.download = `QR_${batch.batchCode}.png`;
    a.click();
  };

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

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <span className="text-sm text-slate-400">Loading batch cryptographic records...</span>
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="max-w-lg mx-auto my-12 p-8 rounded-2xl bg-slate-900 border border-rose-900 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Batch Not Found</h2>
        <p className="text-sm text-slate-400">{error || 'The requested batch could not be located.'}</p>
        <Link to="/batches">
          <Button variant="secondary">Back to Batches</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/batches"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold font-mono text-white">{batch.batchCode}</h1>
              <Badge variant={getStatusBadgeVariant(batch.status)}>{batch.status}</Badge>
            </div>
            <p className="text-xs text-slate-400">
              Registered on {new Date(batch.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsRecordModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Record Custody Event</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product & Origin Card */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-sky-400" />
              <span>Product & Provenance Overview</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Product Name</span>
                <div className="font-semibold text-white">{batch.productId?.name}</div>
                <div className="text-xs text-slate-400">{batch.productId?.category}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Quantity / Unit</span>
                <div className="font-semibold font-mono text-white">
                  {batch.quantity} {batch.unit}
                </div>
                <div className="text-xs text-slate-400">Standard Packaged Lot</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  Origin / Source
                </span>
                <div className="text-white text-xs leading-relaxed">{batch.source}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-sky-400" />
                  Manufacture & Expiry
                </span>
                <div className="text-white text-xs">
                  Harvest: {new Date(batch.manufactureDate).toLocaleDateString()}
                </div>
                {batch.expiryDate && (
                  <div className="text-amber-400 text-xs">
                    Expires: {new Date(batch.expiryDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chain of Custody */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-indigo-400" />
              <span>Consortium Custody Status</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                <span className="text-xs text-slate-500 uppercase font-semibold">Originating Organization</span>
                <div className="font-semibold text-slate-200">{batch.organizationId?.name}</div>
                <Badge variant="purple">{batch.organizationId?.type}</Badge>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                <span className="text-xs text-slate-500 uppercase font-semibold">Current Custodian</span>
                <div className="font-semibold text-slate-200">{batch.currentCustodianId?.name}</div>
                <Badge variant="info">IN POSSESSION</Badge>
              </div>
            </div>
          </div>

          {/* Cryptographic Proof Notarization */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400 font-semibold uppercase">Canonical SHA-256 Integrity Digest</span>
              <span className="text-emerald-400 font-bold">256-BIT CHECKSUM</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-emerald-400 break-all">
              {batch.payloadHash}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>Ledger Consensus Status: <strong className="text-slate-300">{batch.blockchainStatus}</strong></span>
              {batch.txId && <span>TxID: {batch.txId}</span>}
            </div>
          </div>

          {/* Event History & Chain of Custody Timeline */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <GitCommit className="w-5 h-5 text-sky-400" />
                <span>Supply Chain Custody Timeline</span>
              </h2>
              <span className="text-xs font-mono text-slate-400">{events.length} Event(s) Notarized</span>
            </div>

            <EventTimeline events={events} />
          </div>
        </div>

        {/* QR Code & Public Verification Card (1 col) */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-white font-bold text-base">
              <QrCode className="w-5 h-5 text-sky-400" />
              <span>Public Verification QR</span>
            </div>

            <p className="text-xs text-slate-400">
              Cryptographically unique identifier linking consumers directly to the approved provenance ledger.
            </p>

            <div className="p-4 bg-white rounded-xl inline-block shadow-xl">
              {batch.qrDataUrl ? (
                <img src={batch.qrDataUrl} alt="Batch QR Code" className="w-48 h-48 mx-auto" />
              ) : (
                <div className="w-48 h-48 bg-slate-200 animate-pulse rounded" />
              )}
            </div>

            <div className="space-y-2 pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleDownloadQr}
                className="w-full flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download QR Code (PNG)</span>
              </Button>

              <Link
                to={`/verify/${batch.verificationToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
              >
                <span>Open Public Verification Page</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* AI Risk & Analytics */}
      <AnalyticsDashboard batchId={batch.id} />

      <RecordEventModal
        batchId={batch.id}
        batchCode={batch.batchCode}
        currentStatus={batch.status}
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onEventRecorded={loadBatchAndEvents}
      />
    </div>
  );
};
