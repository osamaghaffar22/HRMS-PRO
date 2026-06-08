'use client';

import { useAuthStore } from '@/lib/auth-store';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FileSpreadsheet, 
  ArrowLeftRight, 
  FileText, 
  CalendarDays,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  RefreshCw,
  Download,
  Search
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { label: 'Employees', icon: Users, href: '/employees' },
  { label: 'Transfer Posting', icon: ArrowLeftRight, href: '/transfers' },
  { label: 'ACR Management', icon: FileText, href: '/acr' },
  { label: 'Leave Management', icon: CalendarDays, href: '/leaves' },
  { label: 'Reports', icon: FileSpreadsheet, href: '/reports' },
  { label: 'Custom Modules', icon: Settings, href: '/custom' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, token, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !token) {
      router.push('/login');
    }
  }, [token, router, isMounted]);

  const handleImportExcel = async () => {
    if (!confirm("Update database from Excel?")) return;
    setIsSyncing(true);
    try {
      await api.post('/api/sync/import-excel');
      window.location.reload();
    } catch (err) {
      alert("Sync failed. Check if Excel is open.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportExcel = async () => {
    setIsSyncing(true);
    try {
      await api.post('/api/sync/export-excel');
      alert("Excel updated!");
    } catch (err) {
      alert("Export failed.");
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isMounted) return null;
  if (!token) return null;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar - Modern Purple Style */}
      <aside className={cn(
        "hidden md:flex flex-col bg-primary transition-all duration-500 ease-in-out shadow-2xl shadow-primary/20 z-20",
        isCollapsed ? "w-20" : "w-72"
      )}>
        <div className="h-24 flex items-center px-8 shrink-0 overflow-hidden border-b border-white/10">
          <div className="bg-white h-12 w-12 rounded-2xl flex items-center justify-center text-primary shadow-lg shrink-0">
            <span className="font-black text-2xl">H</span>
          </div>
          {!isCollapsed && (
            <div className="ml-4 flex flex-col">
              <span className="font-black text-xl tracking-tighter text-white leading-none">HRMS</span>
              <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] mt-1">Enterprise Pro</span>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center h-10 px-3 rounded-lg transition-all duration-300 group relative",
                  isActive 
                    ? "bg-white text-primary font-bold shadow-md shadow-white/5" 
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon className={cn("h-4.5 w-4.5 shrink-0", !isCollapsed && "mr-3")} />
                {!isCollapsed && <span className="text-sm font-medium tracking-tight">{item.label}</span>}
                {isActive && !isCollapsed && <div className="ml-auto w-1 h-1 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 space-y-2 border-t border-white/10">
          {!isCollapsed && (
            <div className="flex flex-col gap-1.5">
               <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-2">Data Exchange</p>
               <div className="flex gap-1">
                  <Button variant="ghost" className="flex-1 justify-center text-[11px] font-bold text-white bg-white/10 hover:bg-white/20 h-8 px-2 rounded-lg border border-white/5" onClick={handleImportExcel} disabled={isSyncing}>
                     <RefreshCw className={cn("h-3 w-3 mr-1.5", isSyncing && "animate-spin")} /> Import
                  </Button>
                  <Button variant="ghost" className="flex-1 justify-center text-[11px] font-bold text-white bg-white/10 hover:bg-white/20 h-8 px-2 rounded-lg border border-white/5" onClick={handleExportExcel} disabled={isSyncing}>
                     <Download className="h-3 w-3 mr-1.5" /> Export
                  </Button>
               </div>
            </div>
          )}

          <Button 
            variant="ghost" 
            className={cn(
              "w-full justify-start text-white/60 hover:text-white hover:bg-rose-500/20 h-10 px-3 rounded-lg transition-all",
              isCollapsed && "justify-center"
            )}
            onClick={logout}
          >
            <LogOut className={cn("h-4 w-4 shrink-0", !isCollapsed && "mr-3")} />
            {!isCollapsed && <span className="font-bold text-[13px] uppercase tracking-wider">Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Full-Width Solid Purple Header - No Gaps */}
        <header className="h-20 bg-secondary border-b border-primary/20 flex items-center justify-between px-10 shrink-0 z-20 shadow-md">
          <div className="flex flex-col" style={{ fontFamily: 'Arial, sans-serif' }}>
            <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase leading-none">
               {pathname === '/employees' ? 'Employees' : 
                pathname === '/transfers' ? 'Transfers' :
                pathname === '/acr' ? 'ACR Management' :
                pathname === '/leaves' ? 'Leaves' :
                pathname === '/reports' ? 'Reports' :
                pathname === '/custom' ? 'Custom Modules' : 'Dashboard'}
            </h1>
            <p className="text-[9px] font-black text-primary uppercase tracking-[0.3em] mt-1">
              Human Resource Management System Pro
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-900 tracking-tight">{user?.full_name}</p>
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{user?.role}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-white border border-primary/20 shadow-sm flex items-center justify-center text-primary font-bold text-base">
              {user?.username?.[0].toUpperCase()}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden text-slate-600"
              onClick={() => setIsMobileOpen(!isMobileOpen)}
            >
              <Menu />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-10 scroll-smooth">
          <div className="max-w-[1800px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
