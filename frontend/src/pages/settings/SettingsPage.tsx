import React, { useState } from 'react';
import {
  User,
  Building2,
  Shield,
  CheckCircle2,
  Save,
  Globe,
  Database,
  Cpu
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Badge } from '../../components/common/Badge';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.patch('/auth/profile', { name: displayName });
      setMessage('Profile updated successfully.');
    } catch (err: any) {
      setMessage(`Failed to update profile: ${err.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Platform Settings & Profile</h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your consortium operator identity, security credentials, and node preferences.
        </p>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-sky-950/40 border border-sky-800/40 text-sky-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-sky-400" />
          <span>{message}</span>
        </div>
      )}

      {/* 1. Operator Identity Card */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-950 flex items-center justify-center text-sky-400 border border-sky-800/40">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Operator Profile</h2>
            <p className="text-xs text-slate-400">Your assigned identity in the supply-chain consortium</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Account Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full bg-slate-950/60 border border-slate-800/60 rounded-lg px-3.5 py-2 text-sm text-slate-400 cursor-not-allowed font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Assigned RBAC Role
              </label>
              <div className="flex items-center gap-2">
                <Badge variant="info">{user?.role || 'SUPPLIER'}</Badge>
                <span className="text-xs text-slate-500">Fixed by consortium admin</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Affiliated Organization
              </label>
              <div className="flex items-center gap-2 text-sm text-slate-200">
                <Building2 className="w-4 h-4 text-slate-400" />
                <span>{user?.organizationName || 'Consortium Member'}</span>
              </div>
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. Security & Blockchain Node Overview */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-950 flex items-center justify-center text-indigo-400 border border-indigo-800/40">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Consortium Security Parameters</h2>
            <p className="text-xs text-slate-400">Cryptographic trust anchors and ledger configuration</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/60 space-y-1">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-sky-400" /> Fabric Channel
            </div>
            <div className="text-sm font-mono font-bold text-white">mychannel</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/60 space-y-1">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-400" /> Database Cluster
            </div>
            <div className="text-sm font-mono font-bold text-white">MongoDB Atlas Cloud</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/60 space-y-1">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-400" /> Risk Engine
            </div>
            <div className="text-sm font-mono font-bold text-white">Scikit-learn v1.0</div>
          </div>
        </div>
      </div>
    </div>
  );
};
