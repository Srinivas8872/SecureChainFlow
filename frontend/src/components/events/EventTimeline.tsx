import React from 'react';
import {
  CheckCircle2,
  Truck,
  Package,
  ShieldAlert,
  Thermometer,
  Droplets,
  Building,
  User as UserIcon,
  Clock,
  ShieldCheck,
  MapPin
} from 'lucide-react';
import { Badge } from '../common/Badge';

export interface TimelineEvent {
  id: string;
  eventType: string;
  actorId?: {
    id: string;
    name: string;
    role: string;
  };
  organizationId?: {
    id: string;
    name: string;
    type: string;
  };
  location?: string;
  facility?: string;
  temperature?: number;
  humidity?: number;
  notes?: string;
  payloadHash: string;
  blockchainStatus: 'PENDING' | 'COMMITTED' | 'FAILED' | 'LOCAL_DEMO';
  txId?: string;
  occurredAt: string;
}

interface EventTimelineProps {
  events: TimelineEvent[];
}

export const EventTimeline: React.FC<EventTimelineProps> = ({ events }) => {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'REGISTERED':
        return <Package className="w-4 h-4 text-sky-400" />;
      case 'QUALITY_CHECKED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'DISPATCHED':
      case 'IN_TRANSIT':
      case 'DELIVERED':
        return <Truck className="w-4 h-4 text-indigo-400" />;
      case 'RECALLED':
        return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      default:
        return <Package className="w-4 h-4 text-slate-400" />;
    }
  };

  const getBlockchainStatusBadge = (status: string) => {
    if (status === 'COMMITTED') {
      return (
        <Badge variant="success" dot>
          <ShieldCheck className="w-3 h-3 inline mr-1" />
          Confirmed on Fabric
        </Badge>
      );
    }
    if (status === 'LOCAL_DEMO') {
      return (
        <Badge variant="purple" dot>
          Demo Ledger Node
        </Badge>
      );
    }
    if (status === 'FAILED') {
      return <Badge variant="danger" dot>Failed</Badge>;
    }
    return (
      <Badge variant="warning" dot>
        <Clock className="w-3 h-3 inline mr-1" />
        Pending
      </Badge>
    );
  };

  if (!events || events.length === 0) {
    return (
      <div className="p-8 text-center rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 space-y-2">
        <Clock className="w-8 h-8 text-slate-600 mx-auto" />
        <p className="text-sm">No custody events recorded yet for this batch.</p>
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
      {events.map((ev, index) => (
        <div key={ev.id || index} className="relative group">
          {/* Timeline node dot */}
          <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-slate-900 border-2 border-sky-500/80 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-110 transition-transform">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          </div>

          {/* Event Content Card */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 hover:border-slate-700 transition-all space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/60">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                  {getEventIcon(ev.eventType)}
                </div>
                <span className="font-bold text-white text-sm font-mono tracking-wide">
                  {ev.eventType}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(ev.occurredAt).toLocaleString()}
                </span>
              </div>

              <div>{getBlockchainStatusBadge(ev.blockchainStatus)}</div>
            </div>

            {/* Actor & Organization Context */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  Organization:{' '}
                  <strong className="text-slate-200">
                    {ev.organizationId?.name || 'Authorized Consortium Node'}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-slate-300">
                <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  Recorded by:{' '}
                  <strong className="text-slate-200">
                    {ev.actorId?.name || 'Consortium Agent'}
                  </strong>{' '}
                  <span className="text-slate-500 font-mono">({ev.actorId?.role})</span>
                </span>
              </div>

              {(ev.facility || ev.location) && (
                <div className="flex items-center gap-1.5 text-slate-300 sm:col-span-2">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>
                    Facility / Location:{' '}
                    <span className="text-slate-200">
                      {[ev.facility, ev.location].filter(Boolean).join(' — ')}
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Sensor & Telemetry Readings */}
            {(ev.temperature !== undefined || ev.humidity !== undefined) && (
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {ev.temperature !== undefined && (
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-sky-300">
                    <Thermometer className="w-3.5 h-3.5 text-sky-400" />
                    <span>Temp: {ev.temperature.toFixed(1)}°C</span>
                  </div>
                )}
                {ev.humidity !== undefined && (
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-indigo-300">
                    <Droplets className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Humidity: {ev.humidity.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {ev.notes && (
              <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60 leading-relaxed italic">
                &ldquo;{ev.notes}&rdquo;
              </p>
            )}

            {/* Cryptographic SHA-256 Digest */}
            <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-slate-500 overflow-x-auto">
              <span className="truncate max-w-[400px]">
                Digest: <span className="text-emerald-400">{ev.payloadHash}</span>
              </span>
              {ev.txId && (
                <span className="text-slate-400 font-sans ml-2 shrink-0">
                  TxID: <span className="font-mono text-slate-300">{ev.txId}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
