'use client';

import { useAuthStore } from '@/lib/auth-store';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
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
  Search,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Scale
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { label: 'Employees', icon: Users, href: '/employees' },
  { label: 'HR Strategic Pool', icon: ShieldAlert, href: '/hr-pool' },
  { label: 'Transfer Posting', icon: ArrowLeftRight, href: '/transfers' },
  { label: 'ACR Management', icon: FileText, href: '/acr' },
  { label: 'Rationalization', icon: Scale, href: '/rationalization' },
  { label: 'Leave Management', icon: CalendarDays, href: '/leaves' },
  { label: 'File Tracking', icon: Settings, href: '/files' },
  { label: 'Reports', icon: FileSpreadsheet, href: '/reports' },
  { label: 'Custom Modules', icon: Settings, href: '/custom' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, token, logout, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const pathPermissionMap: Record<string, string> = {
    '/employees': 'employees',
    '/hr-pool': 'employees',
    '/transfers': 'transfers',
    '/acr': 'acr',
    '/rationalization': 'rationalization',
    '/leaves': 'leaves',
    '/files': 'files',
    '/reports': 'reports',
    '/custom': 'custom',
  };

  const filteredNavItems = navItems.filter((item) => {
    if (item.href === '/') return true;
    const requiredPermission = pathPermissionMap[item.href];
    if (!requiredPermission) return true;
    return user?.role === 'Admin' || user?.permissions?.[requiredPermission] === true;
  });

  const displayNavItems = [...filteredNavItems];
  if (user?.role === 'Admin') {
    displayNavItems.push({ label: 'Administrator', icon: ShieldCheck, href: '/admin' });
  }

  const matchedPath = Object.keys(pathPermissionMap).find(p => pathname === p || pathname.startsWith(p + '/'));
  const requiredPermission = matchedPath ? pathPermissionMap[matchedPath] : undefined;
  const hasAccess = user?.role === 'Admin' || 
    (pathname === '/admin' ? false : (!requiredPermission || user?.permissions?.[requiredPermission] === true));

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && _hasHydrated && !token) {
      router.replace('/login');
    }
  }, [token, router, isMounted, _hasHydrated]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm(`Update database from ${file.name}?`)) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsSyncing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      await api.post('/api/sync/import-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert("Excel import started in the background. It may take a few moments. Please refresh the page after a while.");
    } catch (err) {
      alert("Import failed. Check your file format or try again.");
    } finally {
      setIsSyncing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportExcel = async () => {
    setIsSyncing(true);
    try {
      const response = await api.get('/api/sync/export-excel', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Employees_Export.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
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
        isCollapsed ? "w-20" : "w-60"
      )}>
        <div className="h-24 flex items-center px-6 shrink-0 overflow-hidden border-b border-white/10">
          <div className="bg-white h-10 w-10 rounded-2xl flex items-center justify-center text-primary shadow-lg shrink-0">
            <span className="font-black text-xl">H</span>
          </div>
          {!isCollapsed && (
            <div className="ml-3 flex flex-col">
              <span className="font-black text-lg tracking-tighter text-white leading-none">HRMS</span>
              <span className="text-[8px] font-black text-white/60 uppercase tracking-[0.2em] mt-1">Enterprise Pro</span>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-0.5">
          {displayNavItems.map((item) => {
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
          {(user?.role === 'Admin' || user?.permissions?.data_exchange === true) && !isCollapsed && (
            <div className="flex flex-col gap-1.5">
               <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-2">Data Exchange</p>
               <div className="flex gap-1">
                  <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                  <Button variant="ghost" className="flex-1 justify-center text-[11px] font-bold text-white bg-white/10 hover:bg-white/20 h-8 px-2 rounded-lg border border-white/5" onClick={handleImportClick} disabled={isSyncing}>
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
                pathname === '/hr-pool' ? 'HR Strategic Pool' : 
                pathname === '/transfers' ? 'Transfers' :
                pathname === '/acr' ? 'ACR Management' :
                pathname === '/rationalization' ? 'Rationalization' :
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
              className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl h-10 w-10 shrink-0"
              onClick={logout}
              title="Logout"
            >
              <LogOut className="h-4.5 w-4.5" />
            </Button>
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
            {hasAccess ? children : (
              <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 animate-in fade-in zoom-in-95 duration-500">
                <div className="relative mb-6">
                  <div className="bg-rose-500/10 p-6 rounded-full animate-pulse">
                    <Lock className="h-16 w-16 text-rose-600" />
                  </div>
                  <div className="absolute -top-1 -right-1 bg-rose-600 text-white p-1 rounded-full border-2 border-white">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                </div>
                
                <h2 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase mb-2">Access Denied</h2>
                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-8 text-center max-w-md">
                  You do not have permissions to view this section. Please contact your system administrator to request access.
                </p>
                
                <div className="flex gap-4">
                  <Button 
                    onClick={() => router.push('/')}
                    className="h-12 px-6 font-black uppercase text-xs tracking-widest rounded-xl bg-slate-900 hover:bg-primary transition-all shadow-xl"
                  >
                    <ArrowLeftRight className="mr-2 h-4 w-4" /> Back to Dashboard
                  </Button>
                  <Button 
                    onClick={logout}
                    variant="outline"
                    className="h-12 px-6 font-black uppercase text-xs tracking-widest rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 transition-all shadow-xl"
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
