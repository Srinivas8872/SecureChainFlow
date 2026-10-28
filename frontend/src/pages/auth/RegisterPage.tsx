import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { api } from '../../lib/api';
import {
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  Check,
  User,
  Mail,
  Building2,
  Lock,
  ArrowRight
} from 'lucide-react';
import { Button } from '../../components/common/Button';

interface OrgOption {
  id: string;
  name: string;
  type: string;
}

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('SUPPLIER');
  
  // Organization state: either existing or new
  const [orgMode, setOrgMode] = useState<'existing' | 'new'>('existing');
  const [existingOrgs, setExistingOrgs] = useState<OrgOption[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [customOrgName, setCustomOrgName] = useState<string>('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Load registered organizations on mount
  useEffect(() => {
    async function loadOrgs() {
      try {
        const orgs = await api.get<OrgOption[]>('/auth/organizations');
        if (orgs && orgs.length > 0) {
          setExistingOrgs(orgs);
          setSelectedOrgId(orgs[0].id);
        } else {
          setOrgMode('new');
        }
      } catch (err) {
        console.warn('Could not load organizations list, falling back to custom organization creation.', err);
        setOrgMode('new');
      }
    }
    loadOrgs();
  }, []);

  // Password rules validation
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber;
  const doPasswordsMatch = password.length > 0 && password === confirmPassword;

  // Strength score: 0 to 4
  const strengthScore = [hasMinLength, hasUppercase, hasLowercase, hasNumber].filter(Boolean).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isPasswordValid) {
      setError('Password must be at least 8 characters and include uppercase, lowercase, and numeric characters.');
      return;
    }

    if (!doPasswordsMatch) {
      setError('The passwords entered do not match. Please re-enter them carefully.');
      return;
    }

    if (orgMode === 'new' && !customOrgName.trim()) {
      setError('Please provide an organization name for your enterprise account.');
      return;
    }

    setLoading(true);

    try {
      await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        organizationId: orgMode === 'existing' && selectedOrgId ? selectedOrgId : undefined,
        organizationName: orgMode === 'new' ? customOrgName.trim() : undefined,
      });

      // Navigate to dashboard with welcoming state
      navigate('/dashboard', {
        replace: true,
        state: {
          justRegistered: true,
          welcomeMessage: `Welcome to SecureChainFlow, ${name.trim()}!`
        }
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check the entered fields.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto my-8 space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-xl shadow-sky-500/20">
          <ShieldCheck className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Join SecureChainFlow
        </h1>
        <p className="text-sm text-slate-400 max-w-sm mx-auto">
          Create your personalized operator identity to participate in tamper-evident blockchain supply chain tracking.
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-300 text-sm flex items-start gap-3 shadow-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Registration Form Card */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-5">
        
        {/* Full Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="name">
            Full Name <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe / Srinivas M"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm transition-all"
            />
          </div>
        </div>

        {/* Corporate / Personal Email */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="email">
            Email Address <span className="text-rose-400">*</span>
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

        {/* Consortium Role */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="role">
            Consortium Role & Clearance <span className="text-rose-400">*</span>
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm transition-all"
          >
            <option value="SUPPLIER">Supplier (Batch Creation & Source Dispatch)</option>
            <option value="PROCESSOR">Processor / Manufacturer (Transformation & Quality Checks)</option>
            <option value="TRANSPORTER">Transporter (Logistics, Reefer Telemetry & Handovers)</option>
            <option value="WAREHOUSE">Warehouse (Intake, Storage & Environmental Silos)</option>
            <option value="RETAILER">Retailer (Store Receipt & Consumer Point-of-Sale)</option>
            <option value="REGULATOR">Regulator / Auditor (Full Compliance & Audit Access)</option>
            <option value="ADMIN">Consortium Administrator (Governance & Node Orchestration)</option>
          </select>
        </div>

        {/* Organization Selection / Custom Input */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-300">
              Affiliated Organization <span className="text-rose-400">*</span>
            </label>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setOrgMode('existing')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  orgMode === 'existing'
                    ? 'bg-sky-500/20 text-sky-400 font-semibold border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Existing Member
              </button>
              <button
                type="button"
                onClick={() => setOrgMode('new')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  orgMode === 'new'
                    ? 'bg-sky-500/20 text-sky-400 font-semibold border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                + Register New
              </button>
            </div>
          </div>

          {orgMode === 'existing' && existingOrgs.length > 0 ? (
            <div className="relative">
              <Building2 className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
              >
                {existingOrgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.type})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="relative">
              <Building2 className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="text"
                required
                value={customOrgName}
                onChange={(e) => setCustomOrgName(e.target.value)}
                placeholder="e.g. Apex Biotech Solutions Ltd"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
              />
            </div>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="password">
            Password <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
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

          {/* Password Strength Indicator */}
          {password.length > 0 && (
            <div className="mt-2.5 space-y-2">
              <div className="flex items-center gap-1.5 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    strengthScore === 1
                      ? 'w-1/4 bg-rose-500'
                      : strengthScore === 2
                      ? 'w-2/4 bg-amber-500'
                      : strengthScore === 3
                      ? 'w-3/4 bg-sky-500'
                      : 'w-full bg-emerald-500'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-1 text-[11px] font-medium text-slate-400 pt-1">
                <span className={`flex items-center gap-1 ${hasMinLength ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <Check className={`w-3 h-3 ${hasMinLength ? 'text-emerald-400' : 'text-slate-600'}`} />
                  8+ characters
                </span>
                <span className={`flex items-center gap-1 ${hasUppercase ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <Check className={`w-3 h-3 ${hasUppercase ? 'text-emerald-400' : 'text-slate-600'}`} />
                  1 uppercase letter
                </span>
                <span className={`flex items-center gap-1 ${hasLowercase ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <Check className={`w-3 h-3 ${hasLowercase ? 'text-emerald-400' : 'text-slate-600'}`} />
                  1 lowercase letter
                </span>
                <span className={`flex items-center gap-1 ${hasNumber ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <Check className={`w-3 h-3 ${hasNumber ? 'text-emerald-400' : 'text-slate-600'}`} />
                  1 number digit
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="confirmPassword">
            Confirm Password <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-slate-200"
              title={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {confirmPassword.length > 0 && (
            <p className={`text-[11px] mt-1.5 font-medium flex items-center gap-1 ${
              doPasswordsMatch ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {doPasswordsMatch ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Passwords match</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Passwords do not match yet</span>
                </>
              )}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            className="w-full py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30"
            isLoading={loading}
          >
            <span>Complete Registration & Authenticate</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </form>

      {/* Switch to Login */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
        Already have a registered account?{' '}
        <Link to="/login" className="text-sky-400 hover:text-sky-300 font-bold underline transition-colors">
          Sign In to Your Account
        </Link>
      </div>
    </div>
  );
};
