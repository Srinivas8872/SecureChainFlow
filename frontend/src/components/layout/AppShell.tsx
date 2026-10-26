import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Layers,
  Truck,
  QrCode,
  LineChart,
  ShieldAlert,
  Users,
  Building2,
  Settings,
  Activity,
  Menu,
  X
} from 'lucide-react';
import { Navbar } from './Navbar';

interface AppShellProps {
  children: React.ReactNode;
  user?: any;
  onLogout?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({ children, user, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Products', href: '/products', icon: Package },
    { name: 'Batches', href: '/batches', icon: Layers },
    { name: 'Shipments', href: '/shipments', icon: Truck },
    { name: 'QR Verification', href: '/verify', icon: QrCode },
    { name: 'AI & Analytics', href: '/analytics', icon: LineChart },
    { name: 'Audit Logs', href: '/audit-logs', icon: ShieldAlert },
    { name: 'Organizations', href: '/organizations', icon: Building2 },
    { name: 'Users & Roles', href: '/users', icon: Users },
    { name: 'System Health', href: '/system-health', icon: Activity },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar user={user} onLogout={onLogout} />

      <div className="flex-1 flex overflow-hidden">
        {/* Mobile menu trigger */}
        <div className="md:hidden fixed bottom-4 right-4 z-50">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-3 bg-sky-600 text-white rounded-full shadow-xl hover:bg-sky-500 focus:outline-none"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Sidebar Navigation for Authenticated Pages */}
        {user && (
          <aside
            className={`fixed inset-y-0 left-0 z-30 w-64 pt-16 bg-slate-900/90 border-r border-slate-800/80 backdrop-blur-xl transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:pt-0 ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="h-full flex flex-col justify-between py-6 px-3">
              <nav className="space-y-1">
                {navigation.map((item) => {
                  const isActive = location.pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="p-3 bg-slate-950/60 border border-slate-800/60 rounded-xl text-xs space-y-1">
                <div className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  Fabric Ledger Mode
                </div>
                <div className="flex items-center gap-2 text-emerald-400 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Channel: mychannel</span>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
