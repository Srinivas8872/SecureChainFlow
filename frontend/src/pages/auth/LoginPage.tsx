import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '../../components/common/Button';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showDemoDrawer, setShowDemoDrawer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  // Load remembered email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('securechainflow_remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

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
      await login(email.trim().toLowerCase(), password);

      // Handle remember me
      if (rememberMe) {
        localStorage.setItem('securechainflow_remembered_email', email.trim().toLowerCase());
      } else {
        localStorage.removeItem('securechainflow_remembered_email');
      }

      navigate(from, {
        replace: true,
        state: {
          justLoggedIn: true,
        }
      });
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-8 space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-xl shadow-sky-500/20">
          <ShieldCheck className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Operator Sign In
        </h1>
        <p className="text-sm text-slate-400">
          Enter your registered consortium credentials to access your supply-chain node.
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-300 text-sm flex items-start gap-3 shadow-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Login Form Card */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-5">
        
        {/* Email Address */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="email">
            Consortium Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@organization.com"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm transition-all"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-300" htmlFor="password">
              Password
            </label>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-slate-200"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Remember Me */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-sky-600 focus:ring-sky-500 focus:ring-offset-slate-900"
            />
            <span>Remember my email</span>
          </label>

          <span className="text-slate-500 font-mono text-[11px]">
            TLS 1.3 Protected
          </span>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            className="w-full py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30"
            isLoading={loading}
          >
            <span>Sign In to Operator Node</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </form>

      {/* Collapsible Demo Accounts Helper */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
        <button
          type="button"
          onClick={() => setShowDemoDrawer(!showDemoDrawer)}
          className="w-full flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-sky-400 transition-colors"
        >
          <span className="flex items-center gap-2">
            <KeyRound className="w-3.5 h-3.5 text-sky-400" />
            <span>Pre-Seeded Demo Test Accounts</span>
          </span>
          {showDemoDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showDemoDrawer && (
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <p className="text-[11px] text-slate-400">
              Need quick test access? Click any role below to autofill pre-seeded credentials:
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleQuickFill(acc.email)}
                  className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-slate-800 hover:bg-sky-600/30 hover:text-sky-300 text-slate-300 border border-slate-700/60 transition-colors"
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Switch to Registration */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 text-center text-xs text-slate-400">
        New to the SecureChainFlow network?{' '}
        <Link to="/register" className="text-sky-400 hover:text-sky-300 font-bold underline transition-colors">
          Register New Account & Organization
        </Link>
      </div>
    </div>
  );
};
