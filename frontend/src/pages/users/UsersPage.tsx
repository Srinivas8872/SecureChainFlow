import React, { useState, useEffect } from 'react';
import {
  Building2,
  Mail,
  Search,
  RefreshCw
} from 'lucide-react';
import { api } from '../../lib/api';
import { Badge } from '../../components/common/Badge';

interface ConsortiumUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  organizationId?: {
    id: string;
    name: string;
    type: string;
  };
  lastLoginAt?: string;
  createdAt?: string;
}

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<ConsortiumUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await api.get<ConsortiumUser[]>('/auth/users');
      setUsers(data || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filtered = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.organizationId?.name || '').toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter ? u.role === roleFilter : true;
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeVariant = (role: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' => {
    switch (role) {
      case 'ADMIN':
        return 'danger';
      case 'REGULATOR':
        return 'warning';
      case 'SUPPLIER':
      case 'PROCESSOR':
        return 'success';
      case 'TRANSPORTER':
      case 'WAREHOUSE':
      case 'RETAILER':
        return 'info';
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
            <h1 className="text-2xl font-bold text-white">Consortium Users & Roles</h1>
            <Badge variant="info">
              {users.length} Active Operators
            </Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Authorized operators and role assignments managing product templates, batch custody handovers, and compliance.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors self-start"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search operator by name, email, or organization..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
        >
          <option value="">All Roles</option>
          <option value="ADMIN">ADMIN</option>
          <option value="SUPPLIER">SUPPLIER</option>
          <option value="PROCESSOR">PROCESSOR</option>
          <option value="TRANSPORTER">TRANSPORTER</option>
          <option value="WAREHOUSE">WAREHOUSE</option>
          <option value="RETAILER">RETAILER</option>
          <option value="REGULATOR">REGULATOR</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">User Operator</th>
                <th className="py-3.5 px-4 font-semibold">Role</th>
                <th className="py-3.5 px-4 font-semibold">Affiliated Organization</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500 font-sans">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-400" />
                    Loading consortium user registry...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500 font-sans">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold border border-slate-700">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{user.name}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                            <Mail className="w-3 h-3 text-slate-500" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-500" />
                        <span className="font-medium text-slate-200">
                          {user.organizationId?.name || 'Independent Operator'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge variant="success" dot>
                        {user.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 font-mono">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Recent Session'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
