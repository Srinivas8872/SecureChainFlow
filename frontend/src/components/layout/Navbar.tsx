import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, LogOut, Activity } from 'lucide-react';
import { Badge } from '../common/Badge';

interface NavbarProps {
  user?: {
    name: string;
    role: string;
    organizationName?: string;
  } | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white group-hover:text-sky-400 transition-colors">
              SecureChain<span className="text-sky-400 font-extrabold">Flow</span>
            </span>
            <span className="block text-[10px] tracking-wider font-mono text-slate-400 uppercase">
              Blockchain + AI Supply Chain
            </span>
          </div>
        </Link>

        {/* Status / Navigation */}
        <div className="flex items-center gap-4">
          <Link
            to="/system-health"
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Network Health</span>
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              <Link
                to="/settings"
                title="View Profile & Settings"
                className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all group"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-sky-400 transition-colors">
                    👋 Welcome, <strong className="text-white font-bold">{user.name}</strong>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {user.organizationName || 'Consortium Node'}
                  </span>
                </div>
              </Link>
              <Badge variant="info" dot>
                {user.role}
              </Badge>
              <button
                onClick={onLogout}
                title="Sign Out"
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/verify"
                className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-md shadow-sky-600/20 transition-all hover:scale-[1.02]"
              >
                Verify Product QR
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
