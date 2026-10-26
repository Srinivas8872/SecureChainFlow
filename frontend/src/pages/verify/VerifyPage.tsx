import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Package,
  MapPin,
  Thermometer,
  Droplets,
  Hash,
  Calendar,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  QrCode,
  Search,
  Loader2,
  Clock,
  User,
  BarChart3,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface EventRecord {
  eventType: string;
  occurredAt: string;
  location: string | null;
  facility: string | null;
  temperature: number | null;
  humidity: number | null;
  notes: string | null;
  payloadHash: string;
  blockchainStatus: string;
  txId: string | null;
  recordedBy: { name: string; role: string } | null;
  organization: { name: string } | null;
}

interface VerifyResult {
  verificationToken: string;
  batchCode: string;
  status: string;
  blockchainStatus: string;
  txId: string | null;
  payloadHash: string | null;
  source: string;
  quantity: number;
  unit: string;
  manufactureDate: string;
  expiryDate: string | null;
  product: {
    name: string;
    category: string;
    description: string | null;
    sku: string | null;
  } | null;
  originOrganization: { name: string } | null;
  currentCustodian: { name: string } | null;
  eventChain: EventRecord[];
  integrity: {
    score: number;
    verified: boolean;
    totalEvents: number;
    hashMatches: number;
    hashMismatches: number;
  };
  verifiedAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api/v1';

const EVENT_COLORS: Record<string, string> = {
  REGISTERED: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  PROCESSED: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  QUALITY_CHECKED: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  DISPATCHED: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  IN_TRANSIT: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  RECEIVED: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  STORED: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  RETAILED: 'bg-green-500/20 text-green-300 border-green-500/40',
  DELIVERED: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  RECALLED: 'bg-red-500/20 text-red-300 border-red-500/40',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const IntegrityBadge: React.FC<{ integrity: VerifyResult['integrity'] }> = ({ integrity }) => {
  if (integrity.hashMismatches > 0) {
    return (
      <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-red-500/10 border border-red-500/40">
        <ShieldX className="w-8 h-8 text-red-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-bold text-red-300">Integrity Alert</p>
          <p className="text-xs text-red-400/80">{integrity.hashMismatches} hash mismatch(es) — possible tampering</p>
        </div>
      </div>
    );
  }
  if (integrity.score < 100) {
    return (
      <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/40">
        <ShieldAlert className="w-8 h-8 text-yellow-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-bold text-yellow-300">Partial Verification</p>
          <p className="text-xs text-yellow-400/80">{integrity.score}% integrity score</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/40">
      <ShieldCheck className="w-8 h-8 text-emerald-400 flex-shrink-0" />
      <div>
        <p className="text-sm font-bold text-emerald-300">Verified Authentic</p>
        <p className="text-xs text-emerald-400/80">All {integrity.totalEvents} event hashes confirmed</p>
      </div>
    </div>
  );
};

const BlockchainBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { color: string; label: string; Icon: React.FC<any> }> = {
    COMMITTED: { color: 'text-emerald-400', label: 'On-Chain Committed', Icon: CheckCircle2 },
    LOCAL_DEMO: { color: 'text-blue-400', label: 'Local Demo Ledger', Icon: CheckCircle2 },
    PENDING: { color: 'text-yellow-400', label: 'Pending Commit', Icon: AlertTriangle },
    FAILED: { color: 'text-red-400', label: 'Commit Failed', Icon: XCircle },
  };
  const cfg = map[status] ?? { color: 'text-slate-400', label: status, Icon: AlertTriangle };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${cfg.color}`}>
      <cfg.Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
};

const EventCard: React.FC<{ event: EventRecord; index: number; total: number }> = ({
  event,
  index,
  total,
}) => {
  const [expanded, setExpanded] = useState(false);
  const colorClass = EVENT_COLORS[event.eventType] ?? 'bg-slate-500/20 text-slate-300 border-slate-500/40';

  return (
    <div className="relative flex gap-4">
      {/* Timeline spine */}
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-xs font-bold ${colorClass}`}>
          {index + 1}
        </div>
        {index < total - 1 && (
          <div className="w-0.5 flex-1 mt-1 bg-gradient-to-b from-slate-600 to-transparent min-h-8" />
        )}
      </div>

      {/* Card */}
      <div className="flex-1 mb-6">
        <div
          className="rounded-xl border border-slate-700/60 bg-slate-800/60 hover:border-slate-600 transition-colors cursor-pointer"
          onClick={() => setExpanded((p) => !p)}
        >
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${colorClass}`}>
                {event.eventType.replace(/_/g, ' ')}
              </span>
              {event.location && (
                <span className="hidden sm:flex items-center gap-1 text-xs text-slate-400">
                  <MapPin className="w-3 h-3" />
                  {event.location}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-xs hidden sm:block">
                {new Date(event.occurredAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>

          {expanded && (
            <div className="border-t border-slate-700/60 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <InfoRow icon={<Clock className="w-3.5 h-3.5" />} label="Occurred At" value={new Date(event.occurredAt).toLocaleString('en-IN')} />
              {event.location && <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="Location" value={event.location} />}
              {event.facility && <InfoRow icon={<Building2 className="w-3.5 h-3.5" />} label="Facility" value={event.facility} />}
              {event.temperature != null && (
                <InfoRow
                  icon={<Thermometer className="w-3.5 h-3.5" />}
                  label="Temperature"
                  value={`${event.temperature}°C`}
                  highlight={event.temperature > 8 || event.temperature < -2}
                />
              )}
              {event.humidity != null && (
                <InfoRow
                  icon={<Droplets className="w-3.5 h-3.5" />}
                  label="Humidity"
                  value={`${event.humidity}%`}
                  highlight={event.humidity > 85}
                />
              )}
              {event.recordedBy && (
                <InfoRow icon={<User className="w-3.5 h-3.5" />} label="Recorded By" value={`${event.recordedBy.name} (${event.recordedBy.role})`} />
              )}
              {event.organization && (
                <InfoRow icon={<Building2 className="w-3.5 h-3.5" />} label="Organization" value={event.organization.name} />
              )}
              {event.notes && (
                <div className="col-span-full">
                  <p className="text-xs text-slate-500 mb-1">Notes</p>
                  <p className="text-slate-300 text-xs bg-slate-700/40 rounded p-2">{event.notes}</p>
                </div>
              )}
              <div className="col-span-full mt-1">
                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                  <Hash className="w-3 h-3" /> SHA-256 Payload Hash
                </p>
                <code className="text-xs text-emerald-400/80 font-mono break-all bg-slate-900/60 p-2 rounded block">
                  {event.payloadHash}
                </code>
              </div>
              <div className="col-span-full flex items-center gap-2">
                <BlockchainBadge status={event.blockchainStatus} />
                {event.txId && (
                  <span className="text-xs text-slate-500 font-mono truncate">Tx: {event.txId}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const InfoRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}> = ({ icon, label, value, highlight }) => (
  <div>
    <p className="text-xs text-slate-500 mb-0.5 flex items-center gap-1">
      {icon}
      {label}
    </p>
    <p className={`text-sm font-medium ${highlight ? 'text-amber-400' : 'text-slate-200'}`}>
      {value}
    </p>
  </div>
);

// ---------------------------------------------------------------------------
// QR Scanner hook (html5-qrcode)
// ---------------------------------------------------------------------------
function useQrScanner(onResult: (text: string) => void) {
  const scannerRef = useRef<any>(null);
  const elementId = 'qr-scanner-region';

  const start = useCallback(async () => {
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode(elementId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText: string) => {
          onResult(decodedText);
        },
        undefined
      );
    } catch {
      // Camera permission denied or not available
    }
  }, [onResult]);

  const stop = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
  }, []);

  return { start, stop, elementId };
}

// ---------------------------------------------------------------------------
// Main VerifyPage
// ---------------------------------------------------------------------------
export const VerifyPage: React.FC = () => {
  const { token: routeToken } = useParams<{ token?: string }>();
  const navigate = useNavigate();

  const [tokenInput, setTokenInput] = useState(routeToken ?? '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  const handleQrResult = useCallback((text: string) => {
    // Extract token from URL if scanned as a full URL
    const urlMatch = text.match(/\/verify\/([a-f0-9-]+)/i);
    const extracted = urlMatch ? urlMatch[1] : text.trim();
    setTokenInput(extracted);
    setScannerOpen(false);
  }, []);

  const { start, stop, elementId } = useQrScanner(handleQrResult);

  useEffect(() => {
    if (scannerOpen) start();
    else stop();
    return () => { stop(); };
  }, [scannerOpen, start, stop]);

  const lookup = useCallback(async (tok: string) => {
    if (!tok.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/verify/${tok.trim()}`);
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message ?? `HTTP ${res.status}`);
      }
      setResult(body.data as VerifyResult);
    } catch (err: any) {
      setError(err.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-lookup if token in URL
  useEffect(() => {
    if (routeToken) lookup(routeToken);
  }, [routeToken, lookup]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/verify/${tokenInput.trim()}`, { replace: true });
    lookup(tokenInput.trim());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Public QR Verification Portal
          </div>
          <h1 className="text-3xl font-bold text-white">Verify Batch Authenticity</h1>
          <p className="text-slate-400 text-sm max-w-lg mx-auto">
            Scan the QR code on any SecureChainFlow-tracked product or enter the verification token manually to view its complete, immutable supply chain history.
          </p>
        </div>

        {/* Search Panel */}
        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 backdrop-blur-sm p-6 space-y-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="verify-token-input"
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Enter verification token or UUID…"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !tokenInput.trim()}
              id="verify-submit-btn"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Verify
            </button>
          </form>

          {/* QR Camera Scanner */}
          <div className="flex items-center gap-3">
            <button
              id="toggle-qr-scanner-btn"
              type="button"
              onClick={() => setScannerOpen((p) => !p)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-600 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-300 text-sm transition"
            >
              <QrCode className="w-4 h-4" />
              {scannerOpen ? 'Close Camera' : 'Scan QR Code'}
            </button>
            <span className="text-xs text-slate-500">Use your device camera to scan a product QR code</span>
          </div>

          {scannerOpen && (
            <div className="rounded-xl overflow-hidden border border-slate-700 bg-black">
              <div id={elementId} className="w-full" style={{ minHeight: 300 }} />
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/10">
            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-300">Verification Failed</p>
              <p className="text-xs text-red-400/80 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
            <p className="text-slate-400 text-sm">Querying supply chain ledger…</p>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="space-y-6 animate-fade-in">
            {/* Integrity Banner */}
            <IntegrityBadge integrity={result.integrity} />

            {/* Recalled warning */}
            {result.status === 'RECALLED' && (
              <div className="flex items-start gap-3 p-4 rounded-xl border border-red-500/40 bg-red-500/10">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-300">⚠ Batch Recalled</p>
                  <p className="text-xs text-red-400/80">This batch has been officially recalled. Do not consume or distribute.</p>
                </div>
              </div>
            )}

            {/* Batch Info Card */}
            <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-400" />
                  {result.product?.name ?? result.batchCode}
                </h2>
                <BlockchainBadge status={result.blockchainStatus} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <InfoRow icon={<Hash className="w-3.5 h-3.5" />} label="Batch Code" value={result.batchCode} />
                <InfoRow icon={<Package className="w-3.5 h-3.5" />} label="Status" value={result.status.replace(/_/g, ' ')} />
                {result.product?.category && (
                  <InfoRow icon={<BarChart3 className="w-3.5 h-3.5" />} label="Category" value={result.product.category} />
                )}
                <InfoRow
                  icon={<Calendar className="w-3.5 h-3.5" />}
                  label="Manufacture Date"
                  value={new Date(result.manufactureDate).toLocaleDateString('en-IN')}
                />
                {result.expiryDate && (
                  <InfoRow
                    icon={<Calendar className="w-3.5 h-3.5" />}
                    label="Expiry Date"
                    value={new Date(result.expiryDate).toLocaleDateString('en-IN')}
                    highlight={new Date(result.expiryDate) < new Date()}
                  />
                )}
                <InfoRow
                  icon={<Package className="w-3.5 h-3.5" />}
                  label="Quantity"
                  value={`${result.quantity} ${result.unit}`}
                />
                <InfoRow
                  icon={<MapPin className="w-3.5 h-3.5" />}
                  label="Source"
                  value={result.source}
                />
                {result.originOrganization && (
                  <InfoRow
                    icon={<Building2 className="w-3.5 h-3.5" />}
                    label="Origin"
                    value={result.originOrganization.name}
                  />
                )}
                {result.currentCustodian && (
                  <InfoRow
                    icon={<Building2 className="w-3.5 h-3.5" />}
                    label="Current Custodian"
                    value={result.currentCustodian.name}
                  />
                )}
              </div>

              {result.payloadHash && (
                <div>
                  <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                    <Hash className="w-3 h-3" /> Batch SHA-256 Payload Hash
                  </p>
                  <code className="text-xs text-emerald-400/80 font-mono break-all bg-slate-900/60 p-2 rounded block">
                    {result.payloadHash}
                  </code>
                </div>
              )}

              {/* Integrity Stats */}
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-700/60">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{result.integrity.totalEvents}</p>
                  <p className="text-xs text-slate-500">Total Events</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-400">{result.integrity.hashMatches}</p>
                  <p className="text-xs text-slate-500">Hash Matches</p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold ${result.integrity.hashMismatches > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                    {result.integrity.hashMismatches}
                  </p>
                  <p className="text-xs text-slate-500">Mismatches</p>
                </div>
              </div>
            </div>

            {/* Event Chain */}
            <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 p-6">
              <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                Supply Chain Event History
              </h3>
              {result.eventChain.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">No events recorded yet.</p>
              ) : (
                <div>
                  {result.eventChain.map((ev, i) => (
                    <EventCard key={i} event={ev} index={i} total={result.eventChain.length} />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-slate-600">
              Verified at {new Date(result.verifiedAt).toLocaleString('en-IN')} · SecureChainFlow Ledger
            </p>
          </div>
        )}

        {/* Back link for authenticated users */}
        <div className="text-center">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyPage;
