'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Plus, Trash2, FileDown, FileJson, Printer, ArrowUpDown, ArrowUp, ArrowDown, Save, User, Briefcase, MapPin, Contact, FileText, ChevronRight, ArrowLeftRight, CalendarDays, Clock, History, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MultiSelect } from '@/components/ui/multi-select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from '@/lib/auth-store';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function TransferHistorySection({ employeeId, employeeName, currentPosting, onRegisterTransfer, canEdit }: { employeeId: number, employeeName: string, currentPosting: any, onRegisterTransfer: (data: any) => void, canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [editingTransfer, setEditingTransfer] = useState<any>(null);

  const { data: history, isLoading } = useQuery({
    queryKey: ['employee-transfer-history', employeeId],
    queryFn: async () => {
      const res = await api.get(`/api/transfers/${employeeId}`);
      return res.data;
    },
    enabled: !!employeeId
  });

  const deleteTransferMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/transfers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-transfer-history', employeeId] });
      alert("Transfer record deleted successfully.");
    }
  });

  const updateTransferMutation = useMutation({
    mutationFn: (data: { id: number; data: any }) => api.put(`/api/transfers/${data.id}`, data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-transfer-history', employeeId] });
      setEditingTransfer(null);
      alert("Transfer record updated successfully.");
    }
  });

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this transfer history record?")) {
      deleteTransferMutation.mutate(id);
    }
  };

  const handleUpdate = () => {
    if (!editingTransfer) return;
    updateTransferMutation.mutate({ id: editingTransfer.id, data: editingTransfer });
  };

  return (
    <div className="space-y-8">
      {/* History Table */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-base font-semibold text-slate-800 border-b border-slate-100 pb-3 mb-6 flex items-center justify-between">
          <span className="flex items-center"><History className="h-5 w-5 mr-2 text-slate-400" /> Movement History</span>
          {canEdit && <Button size="sm" onClick={() => onRegisterTransfer(currentPosting)} className="bg-primary hover:bg-primary/90 text-white font-bold text-[11px] uppercase">Register Transfer</Button>}
        </h3>
        
        {isLoading ? (
          <Skeleton className="h-40 w-full rounded-2xl opacity-20" />
        ) : !history || history.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-3xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 italic">No movement records found</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-100">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="h-10 border-none">
                  <TableHead className="text-[9px] font-black uppercase text-white">Order Details</TableHead>
                  <TableHead className="text-[9px] font-black uppercase text-white text-center">Previous Posting</TableHead>
                  <TableHead className="text-[9px] font-black uppercase text-white text-center">New Posting</TableHead>
                  <TableHead className="text-[9px] font-black uppercase text-white text-center">Joining Date</TableHead>
                  <TableHead className="text-[9px] font-black uppercase text-white text-center">Relieving Date</TableHead>
                  <TableHead className="text-[9px] font-black uppercase text-white text-center">Tenure</TableHead>
                  {canEdit && <TableHead className="text-[9px] font-black uppercase text-white text-center">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((r: any) => (
                  <TableRow key={r.id} className="h-14 border-b-slate-50 last:border-0">
                    <TableCell className="py-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-800"># {r.order_number || '---'}</span>
                        <span className="text-[9px] font-bold text-slate-400">{r.order_date || '---'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-600 uppercase">{r.previous_branch_office || '---'}</span>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{r.previous_region || '---'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-primary uppercase">{r.new_branch_office || '---'}</span>
                        <span className="text-[8px] font-black text-primary/60 uppercase tracking-tighter">{r.new_region || '---'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-3">
                      <span className="text-[10px] font-bold text-slate-600 uppercase">{r.joining_date || '---'}</span>
                    </TableCell>
                    <TableCell className="text-center py-3">
                      <span className="text-[10px] font-bold text-slate-600 uppercase">{r.relieving_date || '---'}</span>
                    </TableCell>
                    <TableCell className="text-center py-3">
                      <Badge variant="outline" className="text-[8px] font-black border-slate-200 text-slate-500 px-2 h-5">{r.duration_spent || 'Current'}</Badge>
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-center py-3">
                        <div className="flex items-center justify-center space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => setEditingTransfer(r)} className="h-7 w-7 text-blue-500 hover:text-blue-600 hover:bg-blue-50">
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} disabled={deleteTransferMutation.isPending} className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {editingTransfer && (
        <Dialog open={!!editingTransfer} onOpenChange={(open) => !open && setEditingTransfer(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Transfer Record</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs">Order Number</Label>
                <Input className="border-slate-200/50 h-9 text-xs" value={editingTransfer.order_number || ''} onChange={(e) => setEditingTransfer({...editingTransfer, order_number: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Order Date</Label>
                <Input type="date" className="border-slate-200/50 h-9 text-xs" value={editingTransfer.order_date || ''} onChange={(e) => setEditingTransfer({...editingTransfer, order_date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Previous Branch Office</Label>
                <Input className="border-slate-200/50 h-9 text-xs" value={editingTransfer.previous_branch_office || ''} onChange={(e) => setEditingTransfer({...editingTransfer, previous_branch_office: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Previous Region</Label>
                <Input className="border-slate-200/50 h-9 text-xs" value={editingTransfer.previous_region || ''} onChange={(e) => setEditingTransfer({...editingTransfer, previous_region: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">New Branch Office</Label>
                <Input className="border-slate-200/50 h-9 text-xs" value={editingTransfer.new_branch_office || ''} onChange={(e) => setEditingTransfer({...editingTransfer, new_branch_office: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">New Region</Label>
                <Input className="border-slate-200/50 h-9 text-xs" value={editingTransfer.new_region || ''} onChange={(e) => setEditingTransfer({...editingTransfer, new_region: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Relieving Date</Label>
                <Input type="date" className="border-slate-200/50 h-9 text-xs" value={editingTransfer.relieving_date || ''} onChange={(e) => setEditingTransfer({...editingTransfer, relieving_date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Duration Spent</Label>
                <Input className="border-slate-200/50 h-9 text-xs" value={editingTransfer.duration_spent || ''} onChange={(e) => setEditingTransfer({...editingTransfer, duration_spent: e.target.value})} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setEditingTransfer(null)}>Cancel</Button>
              <Button onClick={handleUpdate} disabled={updateTransferMutation.isPending} className="bg-primary hover:bg-primary/90 text-white">Save Changes</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function LeaveHistorySection({ employeeId, employeeName, canEdit }: { employeeId: number, employeeName: string, canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    from_date: '',
    to_date: '',
    status: 'Under Process',
    remarks: ''
  });

  const { data: history, isLoading } = useQuery({
    queryKey: ['employee-leave-history', employeeId],
    queryFn: async () => {
      const res = await api.get(`/api/leaves/`);
      return res.data.filter((r: any) => r.employee_id === employeeId);
    },
    enabled: !!employeeId
  });

  const leaveMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/leaves/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-leave-history', employeeId] });
      setFormData({ from_date: '', to_date: '', status: 'Under Process', remarks: '' });
      alert("Leave Application Registered Successfully!");
    }
  });

  const totalDays = useMemo(() => {
    if (!formData.from_date || !formData.to_date) return 0;
    const start = new Date(formData.from_date);
    const end = new Date(formData.to_date);
    const diffTime = end.getTime() - start.getTime();
    if (diffTime < 0) return 0;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [formData.from_date, formData.to_date]);

  return (
    <div className="space-y-8">
      {canEdit && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-base font-semibold text-slate-800 border-b border-slate-100 pb-3 mb-6 flex items-center">
            <CalendarDays className="h-5 w-5 mr-2 text-slate-400" /> Register Leave for {employeeName}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[13px] font-semibold text-slate-700">From Date</Label>
              <Input type="date" className="h-10 px-3 bg-white border border-slate-200/50 rounded-md text-sm text-slate-900 focus-visible:ring-2 focus-visible:ring-primary/20" value={formData.from_date} onChange={(e) => setFormData({...formData, from_date: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-[13px] font-semibold text-slate-700">To Date</Label>
              <Input type="date" className="h-10 px-3 bg-white border border-slate-200/50 rounded-md text-sm text-slate-900 focus-visible:ring-2 focus-visible:ring-primary/20" value={formData.to_date} onChange={(e) => setFormData({...formData, to_date: e.target.value})} />
            </div>
            
            <div className="bg-[#405189] p-6 rounded-3xl flex justify-between items-center shadow-xl md:col-span-2">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calculated Duration</span>
                 <span className="text-3xl font-black text-primary italic">{totalDays} DAYS</span>
            </div>

            <div className="space-y-2">
              <Label className="text-[13px] font-semibold text-slate-700">Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v || ''})}>
                <SelectTrigger className="h-10 px-3 bg-white border border-slate-200/50 rounded-md text-sm text-slate-900 focus-visible:ring-2 focus-visible:ring-primary/20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Approved" className="text-xs font-bold uppercase">Approved</SelectItem>
                  <SelectItem value="Under Process" className="text-xs font-bold uppercase">Under Process</SelectItem>
                  <SelectItem value="Rejected" className="text-xs font-bold uppercase">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[13px] font-semibold text-slate-700">Remarks</Label>
              <Input className="h-10 px-3 bg-white border border-slate-200/50 rounded-md text-sm text-slate-900 focus-visible:ring-2 focus-visible:ring-primary/20" value={formData.remarks} onChange={(e) => setFormData({...formData, remarks: e.target.value})} />
            </div>
          </div>

          <Button 
            className="w-full h-10 mt-6 text-sm font-medium shadow-sm bg-[#405189] hover:bg-[#405189] transition-all rounded-md text-white" 
            onClick={() => leaveMutation.mutate({ employee_id: employeeId, ...formData, total_days: totalDays })}
            disabled={leaveMutation.isPending}
          >
            <Save className="h-4 w-4 mr-3" /> SAVE LEAVE RECORD
          </Button>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-base font-semibold text-slate-800 border-b border-slate-100 pb-3 mb-6 flex items-center">
          <History className="h-5 w-5 mr-2 text-slate-400" /> Leave History
        </h3>
        
        {isLoading ? (
          <Skeleton className="h-40 w-full rounded-2xl opacity-20" />
        ) : !history || history.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-3xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 italic">No leave records found</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-100">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="h-10 border-none">
                  <TableHead className="text-[9px] font-black uppercase text-white">Period</TableHead>
                  <TableHead className="text-[9px] font-black uppercase text-white text-center">Days</TableHead>
                  <TableHead className="text-[9px] font-black uppercase text-white text-center">Status</TableHead>
                  <TableHead className="text-[9px] font-black uppercase text-white">Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((r: any) => (
                  <TableRow key={r.id} className="h-14 border-b-slate-50 last:border-0">
                    <TableCell className="py-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-800">{r.from_date} — {r.to_date}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-3">
                        <Badge className="bg-[#405189] text-white font-black text-[9px]">{r.total_days} DAYS</Badge>
                    </TableCell>
                    <TableCell className="text-center py-3">
                        <Badge variant="outline" className={cn(
                            "text-[8px] font-black uppercase",
                            r.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                            r.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                        )}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="py-3 text-[10px] font-bold text-slate-500 uppercase">{r.remarks || '---'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

function ACRHistorySection({ employeeId, employeeName, canEdit }: { employeeId: number, employeeName: string, canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
      year: new Date().getFullYear().toString(),
      from_date: '',
      to_date: '',
      ga: '',
      promotion: '',
      remarks: '',
      fitness_after_25_years: '',
      status: 'Pending'
  });

  const { data: history, isLoading } = useQuery({
    queryKey: ['employee-acr-history', employeeId],
    queryFn: async () => {
      const res = await api.get(`/api/acr?search=${employeeName}&category=All`);
      const emp = res.data.find((e: any) => e.id === employeeId);
      return emp?.reports || [];
    },
    enabled: !!employeeId
  });

  const acrMutation = useMutation({
    mutationFn: async (data: any) => {
        const allEmpsRes = await api.get(`/api/acr?search=${employeeName}&category=All&year=${data.year}`);
        const empRecord = allEmpsRes.data.find((e: any) => e.id === employeeId);
        let targetReportId = empRecord?.reports.find((r: any) => r.year === data.year)?.id;

        if (!targetReportId) {
            const res = await api.post('/api/acr/report', { 
                report_data: { employee_id: employeeId, year: data.year, status: 'Pending' } 
            });
            targetReportId = res.data.id;
        }

        return api.post('/api/acr/period', { 
            period_data: {
                acr_report_id: targetReportId,
                from_date: data.from_date,
                to_date: data.to_date,
                ga: data.ga,
                promotion: data.promotion,
                remarks: data.remarks,
                fitness_after_25_years: data.fitness_after_25_years,
                status: data.status
            }
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-acr-history', employeeId] });
      setFormData({ year: new Date().getFullYear().toString(), from_date: '', to_date: '', ga: '', promotion: '', remarks: '', fitness_after_25_years: '', status: 'Pending' });
      alert("ACR Entry Successful!");
    }
  });

  return (
    <div className="space-y-8">
      {canEdit && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-base font-semibold text-slate-800 border-b border-slate-100 pb-3 mb-6 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-slate-400" /> ACR Entry for {employeeName}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-[13px] font-semibold text-slate-700">Year</Label>
              <Input type="number" className="h-10 px-3 bg-white border border-slate-200/50 rounded-md text-sm text-slate-900 focus-visible:ring-2 focus-visible:ring-primary/20" value={formData.year} onChange={(e) => setFormData({...formData, year: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-[13px] font-semibold text-slate-700">From Date</Label>
              <Input type="date" className="h-10 px-3 bg-white border border-slate-200/50 rounded-md text-sm text-slate-900 focus-visible:ring-2 focus-visible:ring-primary/20" value={formData.from_date} onChange={(e) => setFormData({...formData, from_date: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-[13px] font-semibold text-slate-700">To Date</Label>
              <Input type="date" className="h-10 px-3 bg-white border border-slate-200/50 rounded-md text-sm text-slate-900 focus-visible:ring-2 focus-visible:ring-primary/20" value={formData.to_date} onChange={(e) => setFormData({...formData, to_date: e.target.value})} />
            </div>
            
            <div className="space-y-2">
              <Label className="text-[13px] font-semibold text-slate-700">GA</Label>
              <Select value={formData.ga} onValueChange={(v) => setFormData({...formData, ga: v || ''})}>
                <SelectTrigger className="h-10 px-3 bg-white border border-slate-200/50 rounded-md text-sm text-slate-900 focus-visible:ring-2 focus-visible:ring-primary/20"><SelectValue placeholder="Select GA" /></SelectTrigger>
                <SelectContent>
                  {['Outstanding', 'Very Good', 'Good', 'Average', 'Below Average', 'Poor'].map(o => <SelectItem key={o} value={o} className="text-xs font-bold uppercase">{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[13px] font-semibold text-slate-700">Promotion Fitness</Label>
              <Select value={formData.promotion} onValueChange={(v) => setFormData({...formData, promotion: v || ''})}>
                <SelectTrigger className="h-10 px-3 bg-white border border-slate-200/50 rounded-md text-sm text-slate-900 focus-visible:ring-2 focus-visible:ring-primary/20"><SelectValue placeholder="Select Fitness" /></SelectTrigger>
                <SelectContent>
                  {['Recommended for accelerated Promotion', 'Fit for Promotion', 'Recently promoted', 'Assessment for the further promotion in premature', 'Not yet fit for promotion but likely to become fit in course of time', 'Unfit for further promotion', 'Has reached his ceiling'].map(o => <SelectItem key={o} value={o} className="text-xs font-bold uppercase">{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[13px] font-semibold text-slate-700">Remarks</Label>
              <Select value={formData.remarks} onValueChange={(v) => setFormData({...formData, remarks: v || ''})}>
                <SelectTrigger className="h-10 px-3 bg-white border border-slate-200/50 rounded-md text-sm text-slate-900 focus-visible:ring-2 focus-visible:ring-primary/20"><SelectValue placeholder="Select Remarks" /></SelectTrigger>
                <SelectContent>
                  {['Satisfactory', 'Not Satisfactory'].map(o => <SelectItem key={o} value={o} className="text-xs font-bold uppercase">{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            className="w-full h-10 mt-6 text-sm font-medium shadow-sm bg-[#405189] hover:bg-[#405189] transition-all rounded-md text-white" 
            onClick={() => acrMutation.mutate(formData)}
            disabled={acrMutation.isPending}
          >
            <Save className="h-4 w-4 mr-3" /> REGISTER ACR ENTRY
          </Button>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-base font-semibold text-slate-800 border-b border-slate-100 pb-3 mb-6 flex items-center">
          <History className="h-5 w-5 mr-2 text-slate-400" /> ACR History
        </h3>
        
        {isLoading ? (
          <Skeleton className="h-40 w-full rounded-2xl opacity-20" />
        ) : !history || history.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-3xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 italic">No ACR records found</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-100">
            <Table>
                <TableHeader className="bg-slate-50">
                    <TableRow className="h-10 border-none">
                        <TableHead className="text-[9px] font-black uppercase text-white">Year</TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-white">Period</TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-white text-center">GA</TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-white text-center">Promotion</TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-white">Remarks</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {history.map((report: any) => (
                        report.periods?.map((p: any) => (
                            <TableRow key={p.id} className="h-14 border-b-slate-50 last:border-0">
                                <TableCell className="py-3 font-black text-primary text-xs">{report.year}</TableCell>
                                <TableCell className="py-3 text-[10px] font-bold text-slate-600 uppercase tabular-nums">{p.from_date} — {p.to_date}</TableCell>
                                <TableCell className="text-center py-3">
                                    <Badge className="bg-[#405189] text-white font-black text-[8px] uppercase">{p.ga || '---'}</Badge>
                                </TableCell>
                                <TableCell className="text-center py-3 text-[9px] font-bold text-slate-500 uppercase max-w-[150px] truncate" title={p.promotion}>{p.promotion || '---'}</TableCell>
                                <TableCell className="py-3 text-[10px] font-bold text-slate-500 uppercase">{p.remarks || '---'}</TableCell>
                            </TableRow>
                        ))
                    ))}
                </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

function EmployeesContent() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const canEdit = user?.role === 'Admin' || user?.permissions?.employees_form === true;
  const searchParams = useSearchParams();
  const router = useRouter();
  const highlightId = searchParams.get('highlight');
  const editId = searchParams.get('editId');

  const [editingEmp, setEditingEmp] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("personal");
  const [visibleCount, setVisibleCount] = useState(100);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const [filters, setFilters] = useState<any>({
    officer_official: [],
    hq_field: [],
    wing_division: [],
    region: [],
    branch_office: [],
    post_name: [],
    domicile: [],
    post_status: []
  });

  // Sync filters from URL search params on mount
  useEffect(() => {
    const newFilters: any = { ...filters };
    let hasChanges = false;
    
    searchParams.forEach((value, key) => {
      if (key === 'search') {
        if (search !== value) {
          setSearch(value);
        }
      } else if (newFilters[key] !== undefined) {
        const arr = value.split(',');
        if (newFilters[key].join(',') !== arr.join(',')) {
          newFilters[key] = arr;
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      setFilters(newFilters);
      setPage(1);
    }
  }, [searchParams]);

  const [sort, setSort] = useState<{ key: string; order: 'asc' | 'desc' | null }>({ key: '', order: null });

  const handleSort = (key: string) => {
    setPage(1);
    setSort(prev => {
      if (prev.key === key) {
        if (prev.order === 'asc') return { key, order: 'desc' };
        if (prev.order === 'desc') return { key: '', order: null };
      }
      return { key, order: 'asc' };
    });
  };

  const SortIcon = ({ column }: { column: string }) => {
    const isActive = sort.key === column && sort.order;
    return (
      <span className={cn(
        "ml-1.5 transition-all duration-200 inline-flex items-center",
        isActive ? "opacity-100 scale-110" : "opacity-0 group-hover:opacity-40 scale-100"
      )}>
        {isActive ? (
          sort.order === 'asc' ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
        ) : (
          <ArrowUpDown className="h-3 w-3" />
        )}
      </span>
    );
  };

  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setVisibleCount(100);
  }, [debouncedSearch, filters]);

  const { data: employeesData, isLoading } = useQuery({
    queryKey: ['employees', filters, debouncedSearch, visibleCount],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      Object.keys(filters).forEach(key => {
        if (filters[key].length > 0) params.append(key, filters[key].join(','));
      });
      params.append('skip', '0');
      params.append('limit', visibleCount.toString());
      const res = await api.get(`/api/employees?${params.toString()}`);
      return {
        data: res.data,
        totalCount: parseInt(res.headers['x-total-count'] || '0')
      };
    }
  });

  const employees = employeesData?.data || [];
  const totalCount = employeesData?.totalCount || 0;

  useEffect(() => {
    if (editId && employees) {
      const emp = employees.find((e: any) => e.id.toString() === editId);
      if (emp && !editingEmp) {
        setEditingEmp(emp);
        const newParams = new URLSearchParams(window.location.search);
        newParams.delete('editId');
        router.replace(`${window.location.pathname}?${newParams.toString()}`, { scroll: false });
      } else if (!emp && !editingEmp) {
        api.get(`/api/employees/${editId}`).then(res => {
          setEditingEmp(res.data);
          const newParams = new URLSearchParams(window.location.search);
          newParams.delete('editId');
          router.replace(`${window.location.pathname}?${newParams.toString()}`, { scroll: false });
        }).catch(() => {});
      }
    }
  }, [editId, employees, editingEmp, router]);

  const updateEmpMutation = useMutation({
    mutationFn: (data: { id: number; data: any }) => api.put(`/api/employees/${data.id}`, data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setEditingEmp(null);
    }
  });

  const transferMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/transfers/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-transfer-history', editingEmp?.id] });
      alert("Transfer Registered Successfully!");
    }
  });

  const handleRegisterTransfer = (currentPosting: any) => {
    if (!editingEmp) return;
    const transferData = {
        employee_id: editingEmp.id,
        new_branch_office: editingEmp.branch_office,
        new_region: editingEmp.section_district,
        order_number: editingEmp.order_number || '',
        order_date: editingEmp.order_date || '',
        remarks: 'Auto-registered via update'
    };
    transferMutation.mutate(transferData);
  };

  const deleteEmpMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/employees/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setEditingEmp(null);
      alert("Employee record terminated successfully.");
    }
  });

  const handleDelete = () => {
    if (!editingEmp) return;
    const confirmed = window.confirm(`CRITICAL ACTION: Are you sure you want to PERMANENTLY DELETE the record of ${editingEmp.name}? This action cannot be undone.`);
    if (confirmed) {
      deleteEmpMutation.mutate(editingEmp.id);
    }
  };


  const { data: filterOptions } = useQuery({
    queryKey: ['employee-filter-options'],
    queryFn: async () => {
      const res = await api.get('/api/employees/filter-options');
      return res.data;
    }
  });

  const resetFilters = () => {
    setFilters({
      officer_official: [],
      hq_field: [],
      wing_division: [],
      region: [],
      branch_office: [],
      post_name: [],
      domicile: [],
      post_status: []
    });
    setSearch('');
  };

  const availableFilterRegions = useMemo(() => {
    if (!filterOptions?.hierarchy) return filterOptions?.region || [];
    let regions: string[] = [];
    const selectedWings = filters.wing_division || [];
    if (selectedWings.length > 0) {
      selectedWings.forEach((w: string) => {
        if (filterOptions.hierarchy[w]) {
          regions.push(...Object.keys(filterOptions.hierarchy[w]));
        }
      });
    } else {
      return filterOptions.region || [];
    }
    return Array.from(new Set(regions)).sort();
  }, [filterOptions, filters.wing_division]);

  const availableFilterBranches = useMemo(() => {
    if (!filterOptions?.hierarchy) return filterOptions?.branch_office || [];
    let branches: string[] = [];
    const selectedWings = filters.wing_division || [];
    const selectedRegions = filters.region || [];

    if (selectedRegions.length > 0) {
      Object.entries(filterOptions.hierarchy).forEach(([w, wData]: any) => {
        if (selectedWings.length === 0 || selectedWings.includes(w)) {
          selectedRegions.forEach((r: string) => {
             if (wData[r]) branches.push(...wData[r]);
          });
        }
      });
    } else if (selectedWings.length > 0) {
      selectedWings.forEach((w: string) => {
         if (filterOptions.hierarchy[w]) {
            Object.values(filterOptions.hierarchy[w]).forEach((bList: any) => {
               branches.push(...bList);
            });
         }
      });
    } else {
      return filterOptions.branch_office || [];
    }
    return Array.from(new Set(branches)).sort();
  }, [filterOptions, filters.wing_division, filters.region]);

  const sortedEmployees = useMemo(() => {
    if (!employees) return [];
    if (!sort.key || !sort.order) return employees;

    return [...employees].sort((a, b) => {
      let valA = a[sort.key] || '';
      let valB = b[sort.key] || '';
      
      // Special handling for BPS (Numbers)
      if (sort.key === 'bs') {
        const numA = parseInt(valA) || 0;
        const numB = parseInt(valB) || 0;
        return sort.order === 'asc' ? numA - numB : numB - numA;
      }

      // Special handling for Dates
      if (['joining_date', 'place_of_posting'].includes(sort.key)) {
        const dateA = new Date(valA).getTime() || 0;
        const dateB = new Date(valB).getTime() || 0;
        return sort.order === 'asc' ? dateA - dateB : dateB - dateA;
      }

      valA = valA.toString().toLowerCase();
      valB = valB.toString().toLowerCase();
      if (valA < valB) return sort.order === 'asc' ? -1 : 1;
      if (valA > valB) return sort.order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [employees, sort]);

  const [isExporting, setIsExporting] = useState(false);
  const handleExport = async (type: 'excel' | 'pdf') => {
    try {
        setIsExporting(true);
        const params = new URLSearchParams();
        if (debouncedSearch) params.append('search', debouncedSearch);
        Object.keys(filters).forEach(key => {
            if (filters[key].length > 0) params.append(key, filters[key].join(','));
        });

        if (type === 'excel') {
            const url = `${api.defaults.baseURL}/api/employees/export/excel?${params.toString()}`;
            window.open(url, '_blank');
        } else {
            // PDF Export
            params.append('limit', '10000');
            const res = await api.get(`/api/employees?${params.toString()}`);
            const fullData = res.data?.items || [];
            
            if (!fullData.length) return;
            const doc = new jsPDF('landscape');
            doc.text("Personnel Registry Report", 14, 15);
            autoTable(doc, {
                startY: 20,
                head: [['#', 'Name', 'Designation', 'BPS', 'Office/Branch', 'Domicile', 'Appt. Date', 'Station DOJ', 'Duration']],
                body: fullData.map((e: any, i: number) => [
                    i + 1, 
                    e.name || '', 
                    e.post_name || '', 
                    e.bs || '', 
                    e.branch_office || '', 
                    e.domicile || '', 
                    formatDisplayDate(e.joining_date), 
                    formatDisplayDate(e.place_of_posting),
                    calculateDuration(e.place_of_posting)
                ]),
            });
            doc.save(`Employees_Export_${new Date().getTime()}.pdf`);
        }
    } catch (error) {
        console.error("Export failed:", error);
        alert("Export failed. Please try again.");
    } finally {
        setIsExporting(false);
    }
  };


  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr || dateStr.toLowerCase().includes('not match')) return "---";
    
    // If it's already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const parts = dateStr.split('-');
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    // If it's already DD-MM-YYYY or DD/MM/YYYY
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(dateStr)) {
      const parts = dateStr.split(/[-/]/);
      return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[2]}`;
    }
    
    // Try standard parsing
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${day}-${month}-${year}`;
    }
    return dateStr;
  };

  const calculateDuration = (startDateStr: string) => {
    if (!startDateStr || startDateStr.toLowerCase().includes('not match')) return "---";
    try {
      let parsedDateStr = startDateStr;
      // Convert DD-MM-YYYY to YYYY-MM-DD for reliable parsing
      if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(startDateStr)) {
        const parts = startDateStr.split(/[-/]/);
        parsedDateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }

      const start = new Date(parsedDateStr);
      if (isNaN(start.getTime())) return "---";
      
      const end = new Date();
      let years = end.getFullYear() - start.getFullYear();
      let months = end.getMonth() - start.getMonth();
      let days = end.getDate() - start.getDate();

      if (days < 0) {
        months--;
        const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
        days += prevMonth.getDate();
      }
      if (months < 0) {
        years--;
        months += 12;
      }
      return `${years}Y, ${months}M, ${days}D`;
    } catch (e) {
      return "---";
    }
  };

  const parseDateToYYYYMMDD = (dateStr: string) => {
    if (!dateStr || dateStr.toLowerCase().includes('not match')) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const dmYMatch = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmYMatch) return `${dmYMatch[3]}-${dmYMatch[2].padStart(2, '0')}-${dmYMatch[1].padStart(2, '0')}`;
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return ''; 
  };  const renderField = (field: { key: string, label: string, readOnly?: boolean, type?: string }) => {
    const rawVal = editingEmp[field.key] || '';
    const isFieldReadOnly = field.readOnly || !canEdit;
    
    if (field.type === 'date') {
      const safeDateVal = parseDateToYYYYMMDD(rawVal);
      return (
        <div key={field.key} className="flex flex-col space-y-1.5">
          <Label className="text-[13px] font-semibold text-slate-700">{field.label}</Label>
          <Input 
            type="date"
            value={safeDateVal} 
            onChange={(e) => setEditingEmp({...editingEmp, [field.key]: e.target.value})} 
            readOnly={isFieldReadOnly}
            className={cn("h-10 px-3 bg-white border border-slate-300 rounded-md text-sm text-slate-900 w-full", isFieldReadOnly && "bg-slate-50 cursor-not-allowed text-slate-500")}
          />
        </div>
      );
    }

    if (field.key === 'mobile_no') {
      return (
        <div key={field.key} className="flex flex-col space-y-1.5">
          <Label className="text-[13px] font-semibold text-slate-700">{field.label}</Label>
          <Input 
            type="text"
            value={rawVal}
            onChange={(e) => {
              let val = e.target.value.replace(/\D/g, '');
              if (val.length > 11) val = val.slice(0, 11);
              let formatted = val;
              if (val.length > 4) formatted = val.slice(0, 4) + '-' + val.slice(4);
              setEditingEmp({...editingEmp, [field.key]: formatted});
            }}
            placeholder="03XX-XXXXXXX"
            maxLength={12}
            readOnly={!canEdit}
            className={cn("h-10 px-3 bg-white border border-slate-300 rounded-md text-sm text-slate-900 w-full", !canEdit && "bg-slate-50 cursor-not-allowed text-slate-500")}
          />
        </div>
      );
    }

    const districtList = ['Abbottabad', 'Astore', 'Attock', 'Awaran', 'Badin', 'Bahawalnagar', 'Bahawalpur', 'Bajaur', 'Bannu', 'Barkhan', 'Batagram', 'Bhimber', 'Buner', 'Chaghi', 'Chakwal', 'Charsadda', 'Chiniot', 'Chitral', 'Dadu', 'Dera Bugti', 'Dera Ghazi Khan', 'Dera Ismail Khan', 'Diamer', 'Esper', 'Faisalabad', 'Ghanche', 'Ghizer', 'Ghotki', 'Gilgit', 'Gujranwala', 'Gujrat', 'Gupis Yasin', 'Gwadar', 'Hafizabad', 'Hangu', 'Haripur', 'Harnai', 'Hunza', 'Hyderabad', 'Islamabad', 'Jacobabad', 'Jafarabad', 'Jamshoro', 'Jhal Magsi', 'Jhang', 'Jhelum', 'Kachhi', 'Kambar Shahdadkot', 'Kamber Shahdad Kot', 'Karachi', 'Karachi Central', 'Karachi East', 'Karachi South', 'Karachi West', 'Kashmore', 'Kasur', 'Kech', 'Khairpur', 'Khanewal', 'Kharan', 'Khushab', 'Khuzdar', 'Kohat', 'Kohistan Lower', 'Kohistan Upper', 'Kolai Palas', 'Korangi', 'Kurram', 'Lahore', 'Lakki Marwat', 'Larkana', 'Lasbela', 'Layyah', 'Lodhran', 'Loralai', 'Lower Dir', 'Lower South Waziristan', 'Malakand', 'Malir', 'Mandi Bahauddin', 'Mansehra', 'Mardan', 'Mastung', 'Matiari', 'Mianwali', 'Mirpur', 'Mirpurkhas', 'Mohmand', 'Multan', 'Musakhel', 'Muzaffarabad', 'Muzaffargarh', 'Nankana Sahib', 'Narowal', 'Nasirabad', 'Naushahro Feroze', 'Neelum', 'North Waziristan', 'Nowshera', 'Nushki', 'Okara', 'Orakzai', 'Pakpattan', 'Panjgur', 'Pishin', 'Poonch', 'Qila Abdullah', 'Qila Saifullah', 'Quetta', 'Rawhim Yar Khan', 'Rajanpur', 'Rawalpindi', 'Sajawal', 'Sanghar', 'Sargodha', 'Shaheed Benazirabad', 'Shangla', 'Sheikhupura', 'Shikarpur', 'Shirani', 'Sialkot', 'Sibi', 'Skardu', 'Sohbatpur', 'South Waziristan', 'Sudhanoti', 'Sukkur', 'Swabi', 'Swat', 'Tando Allahyar', 'Tando Muhammad Khan', 'Tank', 'Tharparkar', 'Thatta', 'Toba Tek Singh', 'Tor Ghar', 'Umerkot', 'Upper Dir', 'Upper South Waziristan', 'Vehari', 'Washuk', 'Zhob', 'Ziarat'];

    const dropdownOptions: Record<string, string[]> = {
      'gender': ['Male', 'Female'],
      'religion': ['Islam', 'Hindu', 'Christian', 'Qadyani'],
      'marital_status': ['Married', 'Single'],
      'blood_group': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'NA'],
      'rural_urban': ['Rural', 'Urban'],
      'home_province': ['Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Islamabad Capital Territory', 'Azad Jammu and Kashmir', 'Gilgit-Baltistan'],
      'home_district': districtList,
      'domicile': districtList,
      'officer_official': ['Officer', 'Official'],
      'hq_field': ['HQ', 'Field', 'HR Pool'],
      'bs': ['2', '3', '4', '5', '6', '7', '9', '11', '13', '14', '15', '16', '17', '18', '19', '20', '21'],
      'post_name': ['Assistant Director', 'Assistant Director (Law)', 'Assistant Election Commissioner', 'Chowkidar', 'Daftry', 'Data Entry Operator', 'Deputy Assistant Director (Accounts)', 'Deputy Director', 'Director', 'Dispatch Rider', 'District Election Commission', 'Draughtsman', 'Farash', 'JPEC', 'Junior Assistant', 'Junior Personal Assistant', 'Mali', 'Naib Qasid', 'Photographer & Videograoher', 'Provincial Election Commissioner, Sindh', 'REC', 'Senior Assistant', 'Senior Personal Assistant', 'Staff Car Driver', 'Sub Assistant', 'Sub Engineer', 'Sweeper'],
      'post_status': ['Filled', 'Vacant'],
      'cadre_type': ['Cadre', 'Ex-Cadre', 'Ex-Cadre (Dying)'],
      'job_type': ['Contract', 'Permanent', 'Temporary'],
      'head_office': ['PEC Sindh'],
      'wing_division': filterOptions?.wing_division || [],
      'section_district': (() => {
        if (!filterOptions?.hierarchy) return filterOptions?.section_district || [];
        if (!editingEmp?.wing_division) return filterOptions.section_district || [];
        return Object.keys(filterOptions.hierarchy[editingEmp.wing_division] || {}).sort();
      })(),
      'branch_office': (() => {
        if (!filterOptions?.hierarchy) return filterOptions?.branch_office || [];
        let branches: string[] = [];
        if (editingEmp?.section_district && editingEmp?.wing_division) {
          branches = filterOptions.hierarchy[editingEmp.wing_division]?.[editingEmp.section_district] || [];
        } else if (editingEmp?.section_district) {
          Object.values(filterOptions.hierarchy).forEach((regions: any) => {
            if (regions[editingEmp.section_district]) branches.push(...regions[editingEmp.section_district]);
          });
        } else if (editingEmp?.wing_division) {
          Object.values(filterOptions.hierarchy[editingEmp.wing_division] || {}).forEach((bList: any) => {
            branches.push(...bList);
          });
        } else {
          return filterOptions.branch_office || [];
        }
        return Array.from(new Set(branches)).sort();
      })()
    };

    if (dropdownOptions[field.key]) {
      return (
        <div key={field.key} className="flex flex-col space-y-1.5">
          <Label className="text-[13px] font-semibold text-slate-700">{field.label}</Label>
          <select 
            value={rawVal}
            onChange={(e) => setEditingEmp({...editingEmp, [field.key]: e.target.value})}
            disabled={isFieldReadOnly}
            className={cn("h-10 px-3 bg-white border border-slate-300 rounded-md text-sm text-slate-900 w-full outline-none focus:ring-2 focus:ring-primary/20", isFieldReadOnly && "bg-slate-50 cursor-not-allowed text-slate-500")}
          >
            <option value="">Select {field.label}</option>
            {dropdownOptions[field.key].map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      );
    }

    return (
      <div key={field.key} className="flex flex-col space-y-1.5">
        <Label className="text-[13px] font-semibold text-slate-700">{field.label}</Label>
        <Input 
          type={field.type || 'text'}
          value={rawVal} 
          onChange={(e) => setEditingEmp({...editingEmp, [field.key]: e.target.value})} 
          readOnly={isFieldReadOnly}
          className={cn("h-10 px-3 bg-white border border-slate-300 rounded-md text-sm text-slate-900 w-full", isFieldReadOnly && "bg-slate-50 cursor-not-allowed text-slate-500")}
          placeholder="Enter value"
        />
      </div>
    );
  };


  return (
    <div className="space-y-6 w-full pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tighter uppercase italic">Personnel <span className="text-primary">Registry</span></h1>
      </div>

      <Card className="border-none shadow-sm bg-white overflow-visible rounded-xl border border-slate-100 no-print z-50">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-9 gap-4 p-4 items-start">
          <div className="w-full"><MultiSelect label="Officer/Officials" options={['Officer', 'Official']} selected={filters.officer_official} onChange={(vals) => setFilters({...filters, officer_official: vals})} placeholder="Officer/Officials" /></div>
          <div className="w-full"><MultiSelect label="HQ/Field" options={['HQ', 'Field']} selected={filters.hq_field} onChange={(vals) => setFilters({...filters, hq_field: vals})} placeholder="HQ/Field" /></div>
          <div className="w-full"><MultiSelect label="Wing/Division" options={filterOptions?.wing_division || []} selected={filters.wing_division || []} onChange={(vals) => setFilters({...filters, wing_division: vals})} placeholder="Wing/Division" /></div>
          <div className="w-full"><MultiSelect label="Region" options={availableFilterRegions} selected={filters.region} onChange={(vals) => setFilters({...filters, region: vals})} placeholder="Region" /></div>
          <div className="w-full"><MultiSelect label="Office/Branch" options={availableFilterBranches} selected={filters.branch_office} onChange={(vals) => setFilters({...filters, branch_office: vals})} placeholder="Office/Branch" /></div>
          <div className="w-full"><MultiSelect label="Designation" options={filterOptions?.post_name || []} selected={filters.post_name} onChange={(vals) => setFilters({...filters, post_name: vals})} placeholder="Designation" /></div>
          <div className="w-full"><MultiSelect label="Domicile" options={filterOptions?.domicile || []} selected={filters.domicile} onChange={(vals) => setFilters({...filters, domicile: vals})} placeholder="Domicile" /></div>
          <div className="w-full"><MultiSelect label="Status" options={['Filled', 'Vacant']} selected={filters.post_status} onChange={(vals) => setFilters({...filters, post_status: vals})} placeholder="Status" /></div>
          <div className="flex items-start justify-center h-full">
             <Button variant="ghost" size="sm" className="h-[40px] px-4 w-full text-[10px] font-black text-rose-500 uppercase hover:bg-rose-50 border border-rose-100 rounded-xl" onClick={resetFilters}>Clear All</Button>
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-3 no-print">
        <div className="relative group flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
          <Input placeholder="SEARCH REGISTRY (NAME, CNIC, CODE)..." className="border-slate-200/50 h-12 pl-12 bg-white border-none shadow-sm text-[16px] font-bold uppercase tracking-tight placeholder:text-slate-200 focus-visible:ring-1 focus-visible:ring-primary rounded-xl transition-all" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="bg-white px-6 h-12 rounded-xl font-bold text-slate-700 border border-slate-100 flex items-center shadow-sm">
            <span className="text-lg font-black text-primary leading-none tabular-nums mr-2">{totalCount}</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Records</span>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-100 h-12 px-2">
            <Button variant="ghost" size="sm" className="h-9 px-4 text-[11px] font-black text-slate-600 uppercase rounded-lg flex items-center gap-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all" onClick={() => handleExport('excel')}><FileDown className="h-4 w-4 text-emerald-600" /> Excel</Button>
            <div className="w-[1px] h-6 bg-slate-100" />
            <Button variant="ghost" size="sm" className="h-9 px-4 text-[11px] font-black text-slate-600 uppercase rounded-lg flex items-center gap-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all" onClick={() => handleExport('pdf')}><FileJson className="h-4 w-4 text-rose-600" /> PDF</Button>
            <div className="w-[1px] h-6 bg-slate-100" />
            <Button variant="ghost" size="sm" className="h-9 px-4 text-[11px] font-black text-slate-600 uppercase rounded-lg flex items-center gap-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all" onClick={() => window.print()}><Printer className="h-4 w-4 text-blue-600" /> Print</Button>
        </div>
      </div>

      <Card className="border-none shadow-2xl overflow-hidden bg-white rounded-3xl border border-slate-100">
        <Table className="table-fixed w-full">
          <TableHeader className="bg-[#405189]">
            <TableRow className="border-none hover:bg-white/5 h-14">
              <TableHead className="w-[3%] text-white font-black text-[10px] uppercase p-2 text-center">S.No</TableHead>
              <TableHead className="w-[22%] text-white font-black text-[12px] uppercase p-2 cursor-pointer group" onClick={() => handleSort('name')}>
                <div className="flex items-center">Name <SortIcon column="name" /></div>
              </TableHead>
              <TableHead className="w-[22%] text-white font-black text-[12px] uppercase p-2 cursor-pointer group" onClick={() => handleSort('post_name')}>
                <div className="flex items-center">Designation <SortIcon column="post_name" /></div>
              </TableHead>
              <TableHead className="w-[4%] text-white font-black text-[12px] uppercase p-2 text-center cursor-pointer group" onClick={() => handleSort('bs')}>
                <div className="flex items-center justify-center">BPS <SortIcon column="bs" /></div>
              </TableHead>
              <TableHead className="w-[15%] text-white font-black text-[12px] uppercase p-2 pl-12 cursor-pointer group" onClick={() => handleSort('branch_office')}>
                <div className="flex items-center">Office/Branch <SortIcon column="branch_office" /></div>
              </TableHead>
              <TableHead className="w-[7%] text-white font-black text-[11px] uppercase p-2 cursor-pointer group" onClick={() => handleSort('domicile')}>
                <div className="flex items-center">Domicile <SortIcon column="domicile" /></div>
              </TableHead>
              <TableHead className="w-[7%] text-white font-black text-[11px] uppercase p-2 text-center cursor-pointer group" onClick={() => handleSort('joining_date')}>
                <div className="flex items-center justify-center">Appt. Date <SortIcon column="joining_date" /></div>
              </TableHead>
              <TableHead className="w-[7%] text-white font-black text-[11px] uppercase p-2 text-center cursor-pointer group" onClick={() => handleSort('place_of_posting')}>
                <div className="flex items-center justify-center">Station DOJ <SortIcon column="place_of_posting" /></div>
              </TableHead>
              <TableHead className="w-[8%] text-white font-black text-[11px] uppercase p-2 text-center cursor-pointer group" onClick={() => handleSort('place_of_posting')}>
                <div className="flex items-center justify-center">Duration <SortIcon column="place_of_posting" /></div>
              </TableHead>
              <TableHead className="w-[5%] text-center text-white font-black text-[11px] uppercase p-2">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={10} className="text-center py-20"><Skeleton className="h-12 w-full opacity-30" /></TableCell></TableRow>
            ) : sortedEmployees.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-32 text-slate-300 font-black uppercase text-[10px] italic">No matching registry records</TableCell></TableRow>
            ) : (
              sortedEmployees.map((e: any, i: number) => (
                <TableRow key={e.id} id={`emp-${e.id}`} className={cn("group hover:bg-slate-50 border-b-slate-50 min-h-20 transition-all", highlightId === e.id.toString() && "bg-primary/5 animate-pulse")}>
                  <TableCell className="text-center font-black text-slate-300 text-[11px] p-2">{(page - 1) * 100 + i + 1}</TableCell>
                  <TableCell className="p-2 whitespace-normal break-words">
                      <span className="font-black text-slate-900 text-[14px] uppercase tracking-tight leading-tight">{e.name}</span>
                  </TableCell>
                  <TableCell className="p-2 text-[12px] font-bold text-slate-600 uppercase whitespace-normal break-words leading-tight">{e.post_name}</TableCell>
                  <TableCell className="text-center p-2">
                    <span className="font-black text-slate-700 text-[12px]">{e.bs}</span>
                  </TableCell>
                  <TableCell className="p-2 pl-12 whitespace-normal break-words">
                      <span className="font-bold text-slate-700 text-[12px] uppercase leading-tight">{e.branch_office}</span>
                  </TableCell>
                  <TableCell className="p-2 text-[12px] font-bold text-slate-600 uppercase whitespace-normal break-words leading-tight">{e.domicile}</TableCell>
                  <TableCell className="p-2 text-[12px] font-bold text-slate-500 text-center uppercase tabular-nums leading-tight">{formatDisplayDate(e.joining_date)}</TableCell>
                  <TableCell className="p-2 text-[12px] font-bold text-slate-500 text-center uppercase tabular-nums leading-tight">{formatDisplayDate(e.place_of_posting)}</TableCell>
                  <TableCell className="p-2 text-center">
                    <span className="text-[12px] font-black text-primary uppercase bg-primary/5 px-1.5 py-0.5 rounded whitespace-nowrap">
                      {calculateDuration(e.place_of_posting)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center p-2">
                    <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all" title={canEdit ? "Edit Employee" : "View master record"} onClick={() => setEditingEmp(e)}>
                        {canEdit ? <Edit2 className="h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {totalCount > visibleCount && (
          <div className="flex items-center justify-center px-4 py-4 bg-white border-t border-slate-100">
            <Button 
              variant="outline" 
              className="bg-slate-50 text-slate-600 font-bold hover:bg-slate-100 px-8" 
              onClick={() => setVisibleCount(v => v + 100)}
            >
              Load More Data
            </Button>
          </div>
        )}
        <div className="text-center pb-4 text-xs font-bold text-slate-400">
          Showing {Math.min(visibleCount, totalCount)} of {totalCount} records
        </div>
      </Card>

      <Dialog open={!!editingEmp} onOpenChange={(open) => !open && setEditingEmp(null)}>
        <DialogContent showCloseButton={false} className="!top-0 !left-0 !translate-x-0 !translate-y-0 fixed inset-0 w-screen h-screen max-w-none m-0 p-0 flex flex-col bg-slate-50 border-none shadow-none overflow-hidden z-[100]">
          
          {/* Header */}
          <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold text-slate-800 flex items-center">
                <span className="bg-primary w-1.5 h-6 mr-3 inline-block rounded-sm"></span>
                Personnel Master Record
              </DialogTitle>
              <p className="text-[13px] font-medium text-slate-500 mt-1 ml-4">Registry ID: {editingEmp?.id} • {canEdit ? 'Modifying System Parameters' : 'View Only Mode'}</p>
            </div>
            <div className="flex items-center gap-3">
              {!canEdit ? (
                <Button className="h-10 px-6 rounded-md font-medium text-sm bg-[#405189] hover:bg-[#405189] text-white shadow-sm transition-all" onClick={() => setEditingEmp(null)}>Close</Button>
              ) : (
                <>
                  <Button variant="outline" className="h-10 px-4 rounded-md font-medium text-sm border-slate-300 hover:bg-slate-50" onClick={() => setEditingEmp(null)}>Discard</Button>
                  <Button
                    className="h-10 px-6 rounded-md font-medium text-sm bg-primary hover:bg-primary/90 text-white shadow-sm transition-all"
                    onClick={() => updateEmpMutation.mutate({ id: editingEmp.id, data: editingEmp })}
                    disabled={updateEmpMutation.isPending}
                  >
                    {updateEmpMutation.isPending ? 'Syncing...' : <><Save className="h-4 w-4 mr-2" /> Commit Changes</>}
                  </Button>
                </>
              )}
            </div>
          </div>
          
          {editingEmp && (
            <div className="flex-1 overflow-hidden flex">
              <Tabs defaultValue="personal" className="flex-1 flex" orientation="vertical" value={activeTab} onValueChange={setActiveTab}>
                
                {/* Sidebar Navigation */}
                <div className="w-64 bg-slate-50 border-r border-slate-200 p-4 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 pl-2">Categories</p>
                  
                  <TabsList className="flex flex-col h-auto bg-transparent gap-2 p-0">
                    {[
                      { id: 'personal', icon: User, label: 'Personal Info' },
                      { id: 'contact', icon: Contact, label: 'Contact & Origin' },
                      { id: 'service', icon: Briefcase, label: 'Service Details' },
                      { id: 'posting', icon: MapPin, label: 'Posting & Location' },
                      { id: 'leaves', icon: CalendarDays, label: 'Leave History' },
                      { id: 'acr', icon: FileText, label: 'ACR History' },
                      { id: 'additional', icon: FileText, label: 'Additional Info' },
                    ].map((tab) => (
                      <TabsTrigger 
                        key={tab.id}
                        value={tab.id} 
                        className="w-full justify-start px-3 py-2.5 rounded-md text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm border border-transparent transition-all text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                      >
                        <tab.icon className={cn("h-4 w-4 mr-3", activeTab === tab.id ? "text-primary" : "text-slate-400")} />
                        {tab.label}
                        <ChevronRight className={cn("h-4 w-4 ml-auto transition-transform", activeTab === tab.id ? "opacity-100 translate-x-0 text-primary" : "opacity-0 -translate-x-2")} />
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {canEdit && (
                    <div className="mt-auto pt-6 border-t border-slate-200/60">
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-rose-500 hover:text-rose-600 hover:bg-rose-50 font-bold uppercase text-[10px] tracking-widest"
                        onClick={handleDelete}
                        disabled={deleteEmpMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" /> {deleteEmpMutation.isPending ? 'Terminating...' : 'Terminate Record'}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-100/50">
                  <div className="max-w-5xl">
                    <TabsContent value="personal" className="m-0 border-none outline-none">
                      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="text-base font-semibold text-slate-800 border-b border-slate-100 pb-3 mb-6 flex items-center">
                          <User className="h-5 w-5 mr-2 text-slate-400" /> Personal Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-6">
                          {[
                            { key: 'name', label: 'Full Name' },
                            { key: 'father_name', label: "Father's Name" },
                            { key: 'cnic', label: 'CNIC Number' },
                            { key: 'dob', label: 'Date of Birth', type: 'date' },
                            { key: 'gender', label: 'Gender' },
                            { key: 'religion', label: 'Religion' },
                            { key: 'marital_status', label: 'Marital Status' },
                            { key: 'blood_group', label: 'Blood Group' },
                          ].map(renderField)}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="contact" className="m-0 border-none outline-none">
                      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="text-base font-semibold text-slate-800 border-b border-slate-100 pb-3 mb-6 flex items-center">
                          <Contact className="h-5 w-5 mr-2 text-slate-400" /> Contact & Origin
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-6">
                          {[
                            { key: 'mobile_no', label: 'Mobile No' },
                            { key: 'email', label: 'Email Address' },
                            { key: 'domicile', label: 'Domicile' },
                            { key: 'home_province', label: 'Home Province' },
                            { key: 'home_district', label: 'Home District' },
                            { key: 'rural_urban', label: 'Rural/Urban' },
                            { key: 'temp_address', label: 'Temporary Address' },
                            { key: 'perm_address', label: 'Permanent Address' },
                          ].map(renderField)}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="service" className="m-0 border-none outline-none">
                      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="text-base font-semibold text-slate-800 border-b border-slate-100 pb-3 mb-6 flex items-center">
                          <Briefcase className="h-5 w-5 mr-2 text-slate-400" /> Service Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-6">
                          {[
                            { key: 'employee_no', label: 'Employee No' },
                            { key: 'personal_file_no', label: 'Personal File No' },
                            { key: 'code', label: 'Code' },
                            { key: 'seniority_no', label: 'Seniority No' },
                            { key: 'officer_official', label: 'Officer / Official' },
                            { key: 'hq_field', label: 'HQ / Field' },
                            { key: 'bs', label: 'BPS (Grade)' },
                            { key: 'post_name', label: 'Designation' },
                            { key: 'cadre_type', label: 'Cadre Type' },
                            { key: 'job_type', label: 'Job Type' },
                            { key: 'direct_promotion', label: 'Direct / Promotion' },
                            { key: 'entry_govt', label: 'Govt Entry Date', type: 'date' },
                            { key: 'joining_date', label: 'Appointment Date', type: 'date' },
                            { key: 'probation_status', label: 'Probation Status' },
                            { key: 'probation_till_date', label: 'Probation Till Date', type: 'date' },
                          ].map(renderField)}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="posting" className="m-0 border-none outline-none space-y-6">
                      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="text-base font-semibold text-slate-800 border-b border-slate-100 pb-3 mb-6 flex items-center">
                          <MapPin className="h-5 w-5 mr-2 text-slate-400" /> Posting & Location
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-6">
                          {[
                            { key: 'head_office', label: 'Head Office' },
                            { key: 'wing_division', label: 'Wing / Division' },
                            { key: 'section_district', label: 'Region / District' },
                            { key: 'branch_office', label: 'Office / Branch' },
                            { key: 'post_status', label: 'Post Status' },
                            { key: 'place_of_posting', label: 'Date of Joining Station', type: 'date' },
                            { key: 'order_number', label: 'Order Number' },
                            { key: 'order_date', label: 'Order Date', type: 'date' },
                            { key: 'relieving_date', label: 'Relieving Date', type: 'date' },
                          ].map(renderField)}
                        </div>
                        </div>
                        <TransferHistorySection employeeId={editingEmp?.id} employeeName={editingEmp?.name} currentPosting={editingEmp} onRegisterTransfer={handleRegisterTransfer} canEdit={canEdit} />
                        </TabsContent>

                        <TabsContent value="transfers" className="m-0 border-none outline-none">
                        {/* Empty, now redundant as it's in posting tab */}
                        </TabsContent>
                    
                    <TabsContent value="leaves" className="m-0 border-none outline-none">
                      <LeaveHistorySection employeeId={editingEmp?.id} employeeName={editingEmp?.name} canEdit={canEdit} />
                    </TabsContent>
                    
                    <TabsContent value="acr" className="m-0 border-none outline-none">
                      <ACRHistorySection employeeId={editingEmp?.id} employeeName={editingEmp?.name} canEdit={canEdit} />
                    </TabsContent>

                    <TabsContent value="additional" className="m-0 border-none outline-none">
                      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="text-base font-semibold text-slate-800 border-b border-slate-100 pb-3 mb-6 flex items-center">
                          <FileText className="h-5 w-5 mr-2 text-slate-400" /> Additional Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-6">
                          {[
                            { key: 'qualification', label: 'Qualification' },
                            { key: 'area_expertise', label: 'Area of Expertise' },
                            { key: 'disability', label: 'Disability Status' },
                            { key: 'dual_nationality', label: 'Dual Nationality' },
                            { key: 'passport_noc', label: 'Passport NOC' },
                          ].map(renderField)}
                        </div>
                      </div>
                    </TabsContent>
                  </div>
                </div>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>


    </div>
  );
}

export default function EmployeesPage() {
  return (
    <Suspense fallback={<div>Loading Registry Console...</div>}>
      <EmployeesContent />
    </Suspense>
  );
}
