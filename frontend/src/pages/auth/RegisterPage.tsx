import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '../../components/common/Button';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('SUPPLIER');
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await register({
        name,
        email,
        password,
        role,
        organizationName: organizationName.trim() || undefined,
      });
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check the entered fields.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
          <ShieldCheck className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Join SecureChainFlow Consortium</h1>
        <p className="text-sm text-slate-400">
          Create an organizational account to participate in tamper-evident supply chain tracking
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-300 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="name">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="email">
            Corporate Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@supplycompany.com"
            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="organization">
            Organization Name
          </label>
          <input
            id="organization"
            type="text"
            required
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            placeholder="e.g. Pacific Agri Exports Ltd"
            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="role">
            Consortium Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
          >
            <option value="SUPPLIER">Supplier (Batch Creation & Source Dispatch)</option>
            <option value="PROCESSOR">Processor / Manufacturer (Transformation & Quality)</option>
            <option value="TRANSPORTER">Transporter (Logistics & Custody Handover)</option>
            <option value="WAREHOUSE">Warehouse (Storage & Inventory Intake)</option>
            <option value="RETAILER">Retailer (Store Receipt & Customer Sale)</option>
            <option value="REGULATOR">Regulator / Auditor (Compliance Oversight)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="password">
            Password (min 8 chars, 1 uppercase, 1 number)
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
          />
        </div>

        <Button type="submit" variant="primary" className="w-full" isLoading={loading}>
          Create Account
        </Button>
      </form>

      <div className="text-center text-xs text-slate-400">
        Already registered?{' '}
        <Link to="/login" className="text-sky-400 hover:text-sky-300 font-semibold underline">
          Sign In
        </Link>
      </div>
    </div>
  );
};
