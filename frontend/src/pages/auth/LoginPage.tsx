import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, AlertCircle, KeyRound } from 'lucide-react';
import { Button } from '../../components/common/Button';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const demoAccounts = [
    { label: 'Admin', email: 'admin@securechainflow.com', role: 'ADMIN' },
    { label: 'Supplier', email: 'supplier@agri-corp.com', role: 'SUPPLIER' },
    { label: 'Manufacturer', email: 'processor@apex-foods.com', role: 'PROCESSOR' },
    { label: 'Transporter', email: 'transporter@swift-freight.com', role: 'TRANSPORTER' },
    { label: 'Warehouse', email: 'warehouse@metro-storage.com', role: 'WAREHOUSE' },
    { label: 'Retailer', email: 'retailer@prime-market.com', role: 'RETAILER' },
    { label: 'Auditor', email: 'auditor@iso-cert.org', role: 'REGULATOR' },
  ];

  const handleQuickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password@123');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate. Please check your credentials.');
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
        <h1 className="text-2xl font-bold text-white">Sign In to SecureChainFlow</h1>
        <p className="text-sm text-slate-400">
          Enter your authorized consortium credentials to access the secure ledger
        </p>
      </div>

      {/* Quick Demo Credentials Autofill Banner */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-sky-400">
          <KeyRound className="w-3.5 h-3.5" />
          <span>Quick Demo Account Selector</span>
        </div>
        <p className="text-[11px] text-slate-400">
          Click any role to autofill validated test credentials (Password: <code>Password@123</code>):
        </p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {demoAccounts.map((acc) => (
            <button
              key={acc.role}
              type="button"
              onClick={() => handleQuickFill(acc.email)}
              className="px-2 py-1 text-[11px] font-medium rounded bg-slate-800 hover:bg-sky-600/30 hover:text-sky-300 text-slate-300 border border-slate-700/60 transition-colors"
            >
              {acc.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-300 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="email">
            Consortium Email Address
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@organization.com"
            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="password">
            Password
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
          Sign In
        </Button>
      </form>

      <div className="text-center text-xs text-slate-400">
        Need access for your organization?{' '}
        <Link to="/register" className="text-sky-400 hover:text-sky-300 font-semibold underline">
          Register new organization
        </Link>
      </div>
    </div>
  );
};
