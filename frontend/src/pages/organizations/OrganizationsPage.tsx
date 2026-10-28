import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  MapPin,
  RefreshCw,
  Search
} from 'lucide-react';
import { api } from '../../lib/api';
import { Badge } from '../../components/common/Badge';

interface OrganizationItem {
  id: string;
  name: string;
  type: string;
  status: string;
  facilities?: string[];
  contactEmail?: string;
  memberCount?: number;
  createdAt?: string;
}

export const OrganizationsPage: React.FC = () => {
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const data = await api.get<OrganizationItem[]>('/auth/organizations');
      setOrganizations(data || []);
    } catch (err) {
      console.error('Failed to load organizations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const filtered = organizations.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.type.toLowerCase().includes(search.toLowerCase())
  );

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ADMIN':
        return 'border-purple-500/30 bg-purple-500/10 text-purple-400';
      case 'SUPPLIER':
        return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
      case 'MANUFACTURER':
        return 'border-sky-500/30 bg-sky-500/10 text-sky-400';
      case 'LOGISTICS':
        return 'border-amber-500/30 bg-amber-500/10 text-amber-400';
      case 'WAREHOUSING':
        return 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400';
      case 'RETAIL':
        return 'border-rose-500/30 bg-rose-500/10 text-rose-400';
      case 'AUDIT':
        return 'border-teal-500/30 bg-teal-500/10 text-teal-400';
      default:
        return 'border-slate-700 bg-slate-800 text-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Consortium Organizations</h1>
            <Badge variant="info">
              {organizations.length} Verified Members
            </Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Registered peer enterprises and authorized regulatory nodes participating in the SecureChainFlow network.
          </p>
        </div>

        <button
          onClick={fetchOrganizations}
          className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors self-start"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Filter organizations by name or type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900/80 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 animate-pulse h-44" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
          <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-white">No Organizations Found</h3>
          <p className="text-sm text-slate-400">No consortium peer matched your search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((org) => (
            <div
              key={org.id}
              className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-sky-400 font-bold border border-slate-700">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white leading-tight">{org.name}</h3>
                      <span className={`inline-block text-[10px] font-mono font-bold px-2 py-0.5 mt-1 rounded border ${getTypeColor(org.type)}`}>
                        {org.type}
                      </span>
                    </div>
                  </div>
                  <Badge variant="success" dot>
                    VERIFIED
                  </Badge>
                </div>

                {org.facilities && org.facilities.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" /> Registered Facilities:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {org.facilities.map((fac, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-[11px] bg-slate-950/80 border border-slate-800/80 text-slate-300 rounded"
                        >
                          {fac}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span><strong>{org.memberCount || 1}</strong> Authorized Operators</span>
                </span>
                <span className="text-emerald-400 text-[11px] font-mono">Consortium Peer</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
