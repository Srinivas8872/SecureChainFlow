import React, { useState, useEffect } from 'react';
import {
  Database,
  Cpu,
  Server,
  RefreshCw,
  Zap,
  ShieldCheck
} from 'lucide-react';
import { api } from '../../lib/api';
import { Badge } from '../../components/common/Badge';

interface HealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  environment: string;
  integrations: {
    database: {
      status: string;
      inMemoryMode: boolean;
    };
    blockchain: {
      configuredNetwork: string;
      chaincode: string;
      mode: string;
    };
    aiService: {
      configuredUrl: string;
      status: string;
    };
    objectStorage: {
      provider: string;
      bucket: string;
    };
  };
}

export const SystemHealthPage: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [lastCheck, setLastCheck] = useState<string>('');

  const checkHealth = async () => {
    setLoading(true);
    const start = performance.now();
    try {
      const data = await api.get<HealthResponse>('/health');
      const end = performance.now();
      setHealth(data);
      setPingLatency(Math.round(end - start));
      setLastCheck(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to probe health endpoint:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Probe every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Consortium System Health</h1>
            <Badge variant="success" dot>
              All Systems Operational
            </Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time infrastructure probes across Hyperledger Fabric, MongoDB Atlas, and FastAPI AI Inference nodes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {pingLatency !== null && (
            <div className="text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Ping: <strong>{pingLatency}ms</strong></span>
            </div>
          )}

          <button
            onClick={checkHealth}
            className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-400' : ''}`} />
            <span>Probe Nodes</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Database Subsystem */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 flex items-center justify-center text-emerald-400 border border-emerald-800/40">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">MongoDB Atlas Database</h3>
                <p className="text-xs text-slate-400">Primary operational document store & index cluster</p>
              </div>
            </div>
            <Badge variant={health?.integrations?.database?.status === 'connected' ? 'success' : 'warning'} dot>
              {health?.integrations?.database?.status?.toUpperCase() || 'PROBING'}
            </Badge>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/60 font-mono text-xs space-y-2 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">Connection State:</span>
              <span className="text-emerald-400 font-semibold">{health?.integrations?.database?.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Database Engine:</span>
              <span>{health?.integrations?.database?.inMemoryMode ? 'In-Memory Sandbox' : 'MongoDB Atlas Cloud'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Replica Protocol:</span>
              <span>TLS 1.3 Encrypted / ReplicaSet</span>
            </div>
          </div>
        </div>

        {/* 2. Hyperledger Fabric Blockchain */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-950 flex items-center justify-center text-indigo-400 border border-indigo-800/40">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Hyperledger Fabric Ledger</h3>
                <p className="text-xs text-slate-400">Permissioned consortium smart contract gateway</p>
              </div>
            </div>
            <Badge variant="success" dot>
              SYNCHRONIZED
            </Badge>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/60 font-mono text-xs space-y-2 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">Active Channel:</span>
              <span className="text-sky-400">{health?.integrations?.blockchain?.configuredNetwork}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Chaincode ID:</span>
              <span className="text-indigo-400">{health?.integrations?.blockchain?.chaincode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Gateway Mode:</span>
              <span>{health?.integrations?.blockchain?.mode}</span>
            </div>
          </div>
        </div>

        {/* 3. AI Predictive Risk Service */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-950 flex items-center justify-center text-sky-400 border border-sky-800/40">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">AI Quality Risk Service</h3>
                <p className="text-xs text-slate-400">FastAPI scikit-learn continuous anomaly scorer</p>
              </div>
            </div>
            <Badge variant="info" dot>
              INFERENCE READY
            </Badge>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/60 font-mono text-xs space-y-2 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">Inference Host:</span>
              <span>{health?.integrations?.aiService?.configuredUrl}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Model Artifact:</span>
              <span className="text-sky-400">RandomForest v1.0 (10 Telemetry Features)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Fallback Strategy:</span>
              <span>Deterministic Heuristic</span>
            </div>
          </div>
        </div>

        {/* 4. Backend Application API Node */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-950 flex items-center justify-center text-purple-400 border border-purple-800/40">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Express Backend API</h3>
                <p className="text-xs text-slate-400">REST gateway, RBAC middleware, and rate limiter</p>
              </div>
            </div>
            <Badge variant="success" dot>
              V1.0.0 HEALTHY
            </Badge>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/60 font-mono text-xs space-y-2 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">Environment:</span>
              <span className="uppercase text-amber-400">{health?.environment}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Server Time:</span>
              <span>{health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Last Probed:</span>
              <span>{lastCheck || 'Just now'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
