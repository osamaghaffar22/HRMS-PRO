'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { MultiSelect } from '@/components/ui/multi-select';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Scale, 
  AlertCircle
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';

export default function RationalizationPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = useAuthStore();
  const canEdit = user?.role === 'Admin' || user?.permissions?.rationalization === true;
  
  const [showDialog, setShowDialog] = useState(false);
  const [page, setPage] = useState(1);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [desigSearch, setDesigSearch] = useState('');
  const [officeSearch, setOfficeSearch] = useState('');
  const [formData, setFormData] = useState({
    wing_division: '',
    region: '',
    branch_office: '',
    post_allocations: {} as Record<string, number>
  });

  const { data: filterOptions } = useQuery({
    queryKey: ['employee-filter-options'],
    queryFn: async () => {
      const res = await api.get('/api/employees/filter-options');
      return res.data;
    }
  });

  const { data: quotas, isLoading } = useQuery({
    queryKey: ['rationalization-status'],
    queryFn: async () => {
      const res = await api.get('/api/rationalization/status?limit=10000');
      return res.data;
    }
  });

  const { data: summaryStats, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['rationalization-summary'],
    queryFn: async () => {
      const res = await api.get('/api/rationalization/summary');
      return res.data;
    }
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/rationalization/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rationalization-status'] });
      setShowDialog(false);
      setFormData({ wing_division: '', region: '', branch_office: '', post_allocations: {} });
    },
    onError: (err: any) => alert(err.response?.data?.detail || "Error creating quota")
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.put(`/api/rationalization/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rationalization-status'] });
      setShowDialog(false);
      setEditingItem(null);
    },
    onError: (err: any) => alert(err.response?.data?.detail || "Error updating quota")
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/rationalization/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rationalization-status'] });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const allocations = Object.entries(formData.post_allocations).filter(([_, v]) => v >= 0);
    if (allocations.length === 0) return alert("Please select at least one designation and set its quota.");

    if (editingItem) {
      const [postName, allocated] = allocations[0];
      updateMutation.mutate({ 
        id: editingItem.id, 
        data: { 
          wing_division: formData.wing_division, 
          region: formData.region, 
          branch_office: formData.branch_office, 
          post_name: postName, 
          allocated_posts: allocated 
        } 
      });
    } else {
      try {
        for (const [postName, allocated] of allocations) {
          await api.post('/api/rationalization/', {
              wing_division: formData.wing_division,
              region: formData.region,
              branch_office: formData.branch_office,
              post_name: postName,
              allocated_posts: allocated
          });
        }
        queryClient.invalidateQueries({ queryKey: ['rationalization-status'] });
        setShowDialog(false);
        setFormData({ wing_division: '', region: '', branch_office: '', post_allocations: {} });
      } catch (err: any) {
        alert(err.response?.data?.detail || "Error creating bulk quotas");
      }
    }
  };

  const availableRegions = useMemo(() => {
    if (!filterOptions?.hierarchy) return filterOptions?.section_district || [];
    if (!formData.wing_division) return filterOptions.section_district || [];
    return Object.keys(filterOptions.hierarchy[formData.wing_division] || {}).sort();
  }, [filterOptions, formData.wing_division]);

  const availableBranches = useMemo(() => {
    if (!filterOptions?.hierarchy) return filterOptions?.branch_office || [];
    let branches: string[] = [];
    if (formData.region && formData.wing_division) {
      branches = filterOptions.hierarchy[formData.wing_division]?.[formData.region] || [];
    } else if (formData.region) {
      Object.values(filterOptions.hierarchy).forEach((regions: any) => {
        if (regions[formData.region]) branches.push(...regions[formData.region]);
      });
    } else if (formData.wing_division) {
      Object.values(filterOptions.hierarchy[formData.wing_division] || {}).forEach((bList: any) => {
        branches.push(...bList);
      });
    } else {
      return filterOptions.branch_office || [];
    }
    return Array.from(new Set(branches)).sort();
  }, [filterOptions, formData.wing_division, formData.region]);

  const openCreate = () => {
    setEditingItem(null);
    setFormData({ wing_division: '', region: '', branch_office: '', post_allocations: {} });
    setShowDialog(true);
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      wing_division: item.wing_division || '',
      region: item.region || '',
      branch_office: item.branch_office || '',
      post_allocations: { [item.post_name]: item.allocated_posts }
    });
    setShowDialog(true);
  };

  return (
    <div className="space-y-6 w-full pb-10">
      <div className="flex justify-between items-center px-2">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">Resource <span className="text-primary">Rationalization</span></h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.4em] mt-1 opacity-70">Manage seat quotas & prevent over-posting</p>
        </div>
        {canEdit && (
          <Button 
            className="h-12 px-6 font-black uppercase text-xs tracking-widest rounded-xl shadow-2xl bg-[#405189] hover:bg-primary transition-all group"
            onClick={openCreate}
          >
            <Plus className="mr-2 h-4 w-4 group-hover:rotate-90 transition-transform" />
            Add Seat Quota
          </Button>
        )}
      </div>

      {!isLoadingSummary && summaryStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-none shadow-sm bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl overflow-hidden h-28">
            <CardContent className="p-4 flex flex-col justify-center items-center text-white h-full relative">
              <Scale className="absolute right-[-10px] bottom-[-10px] h-20 w-20 opacity-10" />
              <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80 mb-1 z-10">Total Sanctioned Seats</p>
              <h2 className="text-4xl font-black tracking-tighter z-10">{summaryStats.totalSeats}</h2>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl overflow-hidden h-28">
            <CardContent className="p-4 flex flex-col justify-center items-center text-white h-full relative">
              <div className="absolute right-[-10px] bottom-[-10px] h-20 w-20 opacity-10 bg-white rounded-full flex items-center justify-center"><div className="h-10 w-10 bg-emerald-600 rounded-full" /></div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80 mb-1 z-10">Total Filled Seats</p>
              <h2 className="text-4xl font-black tracking-tighter z-10">{summaryStats.totalFilled}</h2>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl overflow-hidden h-28">
            <CardContent className="p-4 flex flex-col justify-center items-center text-white h-full relative">
              <div className="absolute right-[-10px] bottom-[-10px] h-20 w-20 opacity-10 border-[10px] border-white rounded-full" />
              <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80 mb-1 z-10">Total Vacant / Excess</p>
              <h2 className="text-4xl font-black tracking-tighter z-10">{summaryStats.totalVacant > 0 ? summaryStats.totalVacant : Math.abs(summaryStats.totalVacant)} {summaryStats.totalVacant < 0 ? 'EXCESS' : ''}</h2>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-none shadow-2xl bg-white rounded-3xl overflow-hidden border border-slate-100 min-h-[400px]">
        <CardHeader className="bg-[#405189] text-white p-6 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-black uppercase tracking-[0.2em] flex items-center italic text-white">
            <Scale className="h-5 w-5 mr-3 text-white" /> Active Post Quotas
          </CardTitle>
          <div className="flex gap-2">
            <Input 
              placeholder="FILTER DESIGNATION..." 
              value={desigSearch} 
              onChange={(e) => setDesigSearch(e.target.value)}
              className="h-9 w-60 bg-white/10 border-none text-white placeholder:text-white/50 text-xs font-bold focus-visible:ring-1 focus-visible:ring-white rounded-lg"
            />
            <Input 
              placeholder="FILTER OFFICE..." 
              value={officeSearch} 
              onChange={(e) => setOfficeSearch(e.target.value)}
              className="h-9 w-60 bg-white/10 border-none text-white placeholder:text-white/50 text-xs font-bold focus-visible:ring-1 focus-visible:ring-white rounded-lg"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !quotas || quotas.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center">
                <Scale className="h-12 w-12 text-slate-200 mb-4" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">No rationalization rules configured</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#405189]">
                  <TableRow className="h-12 border-none">
                    <TableHead className="font-black text-white text-[10px] uppercase p-4">Wing / Division</TableHead>
                    <TableHead className="font-black text-white text-[10px] uppercase p-4">Region</TableHead>
                    <TableHead className="font-black text-white text-[10px] uppercase p-4">Office / Branch</TableHead>
                    <TableHead className="font-black text-white text-[10px] uppercase p-4">Designation</TableHead>
                    <TableHead className="font-black text-white text-[10px] uppercase p-4 text-center">Allocated Quota</TableHead>
                    <TableHead className="font-black text-white text-[10px] uppercase p-4 text-center">Currently Filled</TableHead>
                    <TableHead className="font-black text-white text-[10px] uppercase p-4 text-center">Status</TableHead>
                    {canEdit && <TableHead className="text-right text-white font-black text-[10px] uppercase p-4">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotas.filter((q: any) => 
                    q.post_name?.toLowerCase().includes(desigSearch.toLowerCase()) && 
                    q.branch_office?.toLowerCase().includes(officeSearch.toLowerCase())
                  ).slice((page - 1) * 50, page * 50).map((q: any) => {
                    const isFull = q.current_count >= q.allocated_posts;
                    const isOver = q.current_count > q.allocated_posts;
                    return (
                      <TableRow 
                        key={q.id} 
                        className="h-16 hover:bg-slate-50 transition-colors cursor-pointer"
                        onDoubleClick={() => router.push(`/employees?branch_office=${encodeURIComponent(q.branch_office)}&post_name=${encodeURIComponent(q.post_name)}`)}
                        title="Double click to view employees posted here"
                      >
                        <TableCell className="p-4 font-bold text-slate-700 text-xs">{q.wing_division || '---'}</TableCell>
                        <TableCell className="p-4 font-bold text-slate-700 text-xs">{q.region || '---'}</TableCell>
                        <TableCell className="p-4 font-bold text-slate-700 text-xs">{q.branch_office}</TableCell>
                        <TableCell className="p-4 font-black text-primary text-[11px] uppercase tracking-wide">{q.post_name}</TableCell>
                        <TableCell className="p-4 text-center">
                          <span className="text-lg font-black text-slate-800">{q.allocated_posts}</span>
                        </TableCell>
                        <TableCell className="p-4 text-center">
                           <span className={`text-lg font-black ${isOver ? 'text-rose-600' : 'text-slate-600'}`}>{q.current_count}</span>
                        </TableCell>
                        <TableCell className="p-4 text-center">
                          <Badge className={
                            isOver ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20' : 
                            isFull ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' : 
                            'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          }>
                            {isOver ? `+${q.current_count - q.allocated_posts} EXCESS` : isFull ? 'QUOTA FULL' : `${q.vacant} VACANT`}
                          </Badge>
                        </TableCell>
                        {canEdit && (
                          <TableCell className="text-right p-4">
                            <div className="flex gap-2 justify-end">
                              <Button variant="ghost" size="sm" onClick={() => openEdit(q)} className="h-8 text-[10px] font-black uppercase text-primary hover:bg-primary/10">
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => {
                                  if (confirm('Delete this rationalization rule?')) deleteMutation.mutate(q.id);
                              }} className="h-8 text-[10px] font-black uppercase text-rose-500 hover:bg-rose-50">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {quotas?.length > 50 && (
                <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-500">
                    Showing {(page - 1) * 50 + 1} to {Math.min(page * 50, quotas.length)} of {quotas.length} rules
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * 50 >= quotas.length}>Next</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[700px] bg-white border-slate-200">
          <DialogHeader className="border-b border-slate-100 pb-3 mb-2">
            <DialogTitle className="text-base font-semibold text-slate-800 flex items-center">
              <Scale className="h-5 w-5 mr-2 text-slate-400" />
              {editingItem ? 'Edit Seat Quota' : 'Define New Seat Quota'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col gap-5 py-2">
            <div className="flex flex-col space-y-1.5">
              <Label className="text-[13px] font-semibold text-slate-700">Wing / Division <span className="text-rose-500">*</span></Label>
              <select 
                value={formData.wing_division} 
                onChange={(e) => setFormData({...formData, wing_division: e.target.value})}
                className="h-11 px-3 bg-white border border-slate-300 rounded-md text-sm text-slate-900 w-full outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select Wing</option>
                {filterOptions?.wing_division?.filter((o: string) => o).map((o: string) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            
            <div className="flex flex-col space-y-1.5">
              <Label className="text-[13px] font-semibold text-slate-700">Region <span className="text-rose-500">*</span></Label>
              <select 
                value={formData.region} 
                onChange={(e) => setFormData({...formData, region: e.target.value})}
                className="h-11 px-3 bg-white border border-slate-300 rounded-md text-sm text-slate-900 w-full outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select Region</option>
                {availableRegions.map((o: string) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            
            <div className="flex flex-col space-y-1.5">
              <Label className="text-[13px] font-semibold text-slate-700">Office / Branch <span className="text-rose-500">*</span></Label>
              <select 
                value={formData.branch_office} 
                onChange={(e) => setFormData({...formData, branch_office: e.target.value})}
                className="h-11 px-3 bg-white border border-slate-300 rounded-md text-sm text-slate-900 w-full outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select Office</option>
                {availableBranches.map((o: string) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-[13px] font-semibold text-slate-700">Select Designations (Multiple) <span className="text-rose-500">*</span></Label>
              <div className="bg-white w-full">
                <MultiSelect
                  options={filterOptions?.post_name?.filter((o: string) => o) || []}
                  selected={Object.keys(formData.post_allocations)}
                  onChange={(vals) => {
                    const newAllocs = { ...formData.post_allocations };
                    Object.keys(newAllocs).forEach(k => { if (!vals.includes(k)) delete newAllocs[k] });
                    vals.forEach(k => { if (newAllocs[k] === undefined) newAllocs[k] = 0 });
                    setFormData({...formData, post_allocations: newAllocs});
                  }}
                  placeholder="Search and select designations..."
                  label="Designations"
                />
              </div>
            </div>

            {Object.keys(formData.post_allocations).length > 0 && (
              <div className="mt-2 w-full">
                <Label className="text-[13px] font-semibold text-slate-700 border-b border-slate-100 pb-2 mb-4 block">Set Quota Numbers</Label>
                <div className="flex flex-col gap-3">
                  {Object.entries(formData.post_allocations).map(([post, qty]) => (
                    <div key={post} className="flex items-center justify-between gap-4 w-full">
                      <span className="text-xs font-bold text-slate-600 uppercase truncate" title={post}>{post}</span>
                      <Input 
                        type="number" 
                        min="0" 
                        className="h-10 px-3 bg-white border border-slate-200/50 rounded-md text-sm text-slate-900 focus-visible:ring-2 focus-visible:ring-primary/20 w-24 text-center font-bold" 
                        value={qty} 
                        onChange={e => setFormData({
                          ...formData, 
                          post_allocations: { ...formData.post_allocations, [post]: parseInt(e.target.value) || 0 }
                        })} 
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
            <Button variant="outline" className="h-10 text-sm font-medium" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="h-10 px-4 bg-primary hover:bg-primary/90 text-white font-medium text-sm shadow-sm">
              {editingItem ? 'Save Changes' : 'Create Quota'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
