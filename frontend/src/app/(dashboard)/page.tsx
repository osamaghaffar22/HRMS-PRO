'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  Users, 
  UserCheck, 
  UserPlus, 
  Shield, 
  Building2, 
  MapPin,
  Search,
  ChevronRight,
  ClipboardList,
  Activity,
  UserSquare
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export default function DashboardPage() {
  const router = useRouter();
  const [desigSearch, setDesigSearch] = useState('');
  const [empSearch, setEmpSearch] = useState('');

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats-overall'],
    queryFn: async () => {
      const res = await api.get('/api/stats/overall');
      return res.data;
    }
  });

  const { data: designationStats, isLoading: desigLoading } = useQuery({
    queryKey: ['stats-designation'],
    queryFn: async () => {
      const res = await api.get('/api/stats/designation');
      return res.data;
    }
  });

  const { data: recentEmployees, isLoading: recentLoading } = useQuery({
    queryKey: ['recent-employees', empSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (empSearch) params.append('search', empSearch);
      const res = await api.get(`/api/employees?${params.toString()}&limit=8`);
      return res.data;
    }
  });

  const filteredDesignations = designationStats?.filter((d: any) => 
    d.designation.toLowerCase().includes(desigSearch.toLowerCase())
  );

  const StatCard = ({ title, data, filters, colorClass }: any) => {
    const basePath = filters.basePath || '/employees';
    return (
    <Card className={cn(
      "corporate-card border-none shadow-sm hover:shadow-2xl transition-all duration-500 group overflow-hidden bg-white relative h-full hover:-translate-y-1 hover:scale-[1.02] cursor-default",
      "before:absolute before:top-0 before:left-0 before:w-1 before:h-full",
      colorClass === 'purple' ? "before:bg-primary" : 
      colorClass === 'blue' ? "before:bg-blue-500" : 
      colorClass === 'green' ? "before:bg-emerald-500" : 
      colorClass === 'gray' ? "before:bg-slate-400" : "before:bg-rose-500"
    )}>
      <div className="p-4">
        <h3 className="font-bold text-slate-800 uppercase text-sm tracking-wider mb-4 text-center">{title}</h3>

        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center p-2 rounded-xl bg-slate-50 border border-slate-100/50 hover:bg-white hover:shadow-md transition-all cursor-pointer" onClick={() => router.push(`${basePath}?${filters.total}`)}>
            <span className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Total</span>
            {statsLoading ? <Skeleton className="h-4 w-6" /> : <span className="text-base font-black text-slate-900 leading-none">{data?.total || 0}</span>}
          </div>
          <div className="flex flex-col items-center p-2 rounded-xl bg-blue-50/50 border border-blue-100/50 hover:bg-white hover:shadow-md transition-all cursor-pointer" onClick={() => router.push(`${basePath}?${filters.filled}`)}>
            <span className="text-[9px] font-bold text-blue-400 uppercase mb-0.5">Filled</span>
            {statsLoading ? <Skeleton className="h-4 w-6" /> : <span className="text-base font-black text-blue-600 leading-none">{data?.filled || 0}</span>}
          </div>
          <div className="flex flex-col items-center p-2 rounded-xl bg-rose-50/50 border border-rose-100/50 hover:bg-white hover:shadow-md transition-all cursor-pointer" onClick={() => router.push(`${basePath}?${filters.vacant}`)}>
            <span className="text-[9px] font-black text-rose-400 uppercase mb-0.5">Vacant</span>
            {statsLoading ? <Skeleton className="h-4 w-6" /> : <span className="text-base font-black text-rose-600 leading-none">{data?.vacant || 0}</span>}
          </div>
        </div>
      </div>
    </Card>
    );
  };

  return (
    <div className="space-y-4 max-w-[1700px] mx-auto pt-2 pb-6">
      
      {/* 8 Functional Stat Cards - Ultra Compact */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 px-2">
        <StatCard title="All Staff Registry" data={stats?.all_staff} filters={{ total: '', filled: 'post_status=Filled', vacant: 'post_status=Vacant' }} colorClass="purple" />
        <StatCard title="Officers (BPS 17+)" data={stats?.officers} filters={{ total: 'officer_official=Officer', filled: 'officer_official=Officer&post_status=Filled', vacant: 'officer_official=Officer&post_status=Vacant' }} colorClass="blue" />
        <StatCard title="Officials (BPS 1-16)" data={stats?.officials} filters={{ total: 'officer_official=Official', filled: 'officer_official=Official&post_status=Filled', vacant: 'officer_official=Official&post_status=Vacant' }} colorClass="green" />
        <StatCard title="HQ Officers" data={stats?.hq_officers} filters={{ total: 'hq_field=HQ&officer_official=Officer', filled: 'hq_field=HQ&officer_official=Officer&post_status=Filled', vacant: 'hq_field=HQ&officer_official=Officer&post_status=Vacant' }} colorClass="red" />
        
        <StatCard title="Field Officers" data={stats?.field_officers} filters={{ total: 'hq_field=Field&officer_official=Officer', filled: 'hq_field=Field&officer_official=Officer&post_status=Filled', vacant: 'hq_field=Field&officer_official=Officer&post_status=Vacant' }} colorClass="purple" />
        <StatCard title="HQ Officials" data={stats?.hq_officials} filters={{ total: 'hq_field=HQ&officer_official=Official', filled: 'hq_field=HQ&officer_official=Official&post_status=Filled', vacant: 'hq_field=HQ&officer_official=Official&post_status=Vacant' }} colorClass="blue" />
        <StatCard title="Field Officials" data={stats?.field_officials} filters={{ total: 'hq_field=Field&officer_official=Official', filled: 'hq_field=Field&officer_official=Official&post_status=Filled', vacant: 'hq_field=Field&officer_official=Official&post_status=Vacant' }} colorClass="green" />
        <StatCard title="HR Strategic Pool" data={stats?.hr_pool} filters={{ basePath: '/hr-pool', total: '', filled: 'post_status=Filled', vacant: 'post_status=Vacant' }} colorClass="gray" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 px-2 items-start mt-6">

        {/* Designation Breakdown - Flush Header */}
        <Card className="xl:col-span-5 corporate-card border-none shadow-lg flex flex-col h-[600px] overflow-hidden !py-0">
          <CardHeader className="bg-[#DED2FF] p-4 space-y-3 shrink-0 border-b border-primary/20">
            <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center text-slate-900">
               Designation Summary
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <Input 
                placeholder="Filter designations..." 
                className="bg-white border-primary/10 text-slate-900 h-8 text-[10px] pl-9 placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-primary uppercase font-bold"
                value={desigSearch}
                onChange={(e) => setDesigSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <div className="flex-1 overflow-y-auto">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="font-bold text-slate-500 text-[11px] uppercase p-2 pl-4">Post Name</TableHead>
                  <TableHead className="text-center font-bold text-slate-500 text-[11px] uppercase p-2">Total</TableHead>
                  <TableHead className="text-center font-bold text-blue-600 text-[11px] uppercase p-2">Filled</TableHead>
                  <TableHead className="text-center font-bold text-rose-600 text-[11px] uppercase p-2 pr-4">Vacant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {desigLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={4} className="p-2"><Skeleton className="h-5 w-full opacity-30" /></TableCell></TableRow>
                  ))
                ) : (
                  filteredDesignations?.map((row: any, i: number) => (
                    <TableRow key={i} className="hover:bg-slate-50 border-b border-slate-50 transition-colors">
                      <TableCell className="font-bold text-slate-700 uppercase text-[11px] p-2 pl-4 truncate max-w-[180px]" title={row.designation}>{row.designation}</TableCell>
                      <TableCell className="text-center font-bold text-slate-900 p-2 text-[13px] cursor-pointer hover:text-blue-600" onClick={() => router.push(`/employees?search=${row.designation}`)}>{row.total}</TableCell>
                      <TableCell className="text-center font-bold text-blue-600 bg-blue-50/30 p-2 text-[13px] cursor-pointer hover:bg-blue-100" onClick={() => router.push(`/employees?search=${row.designation}&post_status=Filled`)}>{row.filled}</TableCell>
                      <TableCell className="text-center font-bold text-rose-600 bg-rose-50/30 p-2 text-[13px] cursor-pointer hover:bg-rose-100" onClick={() => router.push(`/employees?search=${row.designation}&post_status=Vacant`)}>{row.vacant}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Personnel Search - Corporate List Style */}
        <Card className="xl:col-span-7 corporate-card border-none shadow-lg flex flex-col h-[600px] overflow-hidden !py-0">
          <CardHeader className="bg-[#DED2FF] p-4 space-y-3 shrink-0 border-b border-primary/20">
             <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center text-slate-900">
               Personnel Search
             </CardTitle>
             <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
               <Input 
                 placeholder="ENTER NAME, CNIC OR CODE..." 
                 className="bg-white border-primary/10 text-slate-900 h-8 text-[10px] pl-9 placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-primary uppercase font-bold"
                 value={empSearch}
                 onChange={(e) => setEmpSearch(e.target.value)}
               />
             </div>
          </CardHeader>
          
          <div className="flex-1 overflow-y-auto">
             <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                   <TableRow>
                      <TableHead className="font-bold text-slate-500 text-[11px] uppercase p-2 pl-4">Personnel Information</TableHead>
                      <TableHead className="text-center font-bold text-slate-500 text-[11px] uppercase p-2">Designation</TableHead>
                      <TableHead className="text-center font-bold text-slate-500 text-[11px] uppercase p-2">Office/Branch</TableHead>
                      <TableHead className="text-center font-bold text-slate-500 text-[11px] uppercase p-2">Status</TableHead>
                      <TableHead className="text-right font-bold text-slate-500 text-[11px] uppercase p-2 pr-4">Action</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                   {recentLoading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={4} className="p-2"><Skeleton className="h-8 w-full opacity-20" /></TableCell></TableRow>
                      ))
                   ) : recentEmployees?.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-32 text-slate-300 font-bold uppercase italic tracking-widest text-[10px]">No records identified</TableCell></TableRow>
                   ) : (
                      recentEmployees?.map((emp: any) => (
                        <TableRow key={emp.id} className="hover:bg-slate-50 transition-colors border-b border-slate-50 group h-16">
                           <TableCell className="p-2 pl-4">
                              <div className="flex flex-col gap-0">
                                 <span className="font-bold text-slate-900 text-[11px] uppercase tracking-tight group-hover:text-blue-600 transition-colors">{emp.name || '---'}</span>
                                 <span className="text-[9px] font-bold text-slate-400 tracking-wider">CNIC: {emp.cnic || 'N/A'}</span>
                              </div>
                           </TableCell>
                           <TableCell className="text-center p-2">
                              <div className="flex flex-col">
                                 <span className="text-slate-600 text-[10px] font-semibold uppercase">{emp.post_name}</span>
                                 <span className="text-[9px] font-bold text-slate-400 uppercase">Grade {emp.bs}</span>
                              </div>
                           </TableCell>
                           <TableCell className="text-center p-2">
                               <span className="text-slate-600 text-[10px] font-semibold uppercase">{emp.branch_office}</span>
                           </TableCell>
                           <TableCell className="p-2 text-center">
                              <Badge className={cn(
                                 "text-[9px] font-bold uppercase border-none shadow-none tracking-widest h-5 px-2 rounded-full",
                                 emp.name?.toLowerCase().includes('vacant') ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                              )}>
                                 {emp.name?.toLowerCase().includes('vacant') ? 'Vacant' : 'Filled'}
                              </Badge>
                           </TableCell>
                           <TableCell className="p-2 text-right pr-4">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-all" onClick={() => router.push(`/employees?search=${emp.name}`)}>
                                 <ChevronRight className="h-3.5 w-3.5" />
                              </Button>
                           </TableCell>
                        </TableRow>
                      ))
                   )}
                </TableBody>
             </Table>
          </div>
          <div className="p-4 bg-slate-900 flex justify-between items-center shrink-0">
             <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Matches: {recentEmployees?.length || 0}</p>
             <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">PEC SINDH Official Master Console</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
