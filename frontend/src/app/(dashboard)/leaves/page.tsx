'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Search, Save, Calendar, User, Trash2, Printer, FileDown, FileJson, Clock, History, Edit2, ArrowUpDown, ArrowUp, ArrowDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MultiSelect } from '@/components/ui/multi-select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function LeavesPage() {
  const queryClient = useQueryClient();
  const [isMounted, setIsMounted] = useState(false);
  
  // States
  const [empSearch, setEmpSearch] = useState('');
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string[]>(['all']);
  const [historySearch, setHistorySearch] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [sort, setSort] = useState<{ key: string; order: 'asc' | 'desc' | null }>({ key: '', order: null });
  
  const [formData, setFormData] = useState({
    from_date: '',
    to_date: '',
    status: 'Under Process',
    remarks: ''
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSort = (key: string) => {
    let nextOrder: 'asc' | 'desc' | null = null;
    if (sort.key !== key) {
      nextOrder = (key === 'bs') ? 'desc' : 'asc';
    } else {
      if (sort.order === 'asc') nextOrder = 'desc';
      else if (sort.order === 'desc') nextOrder = null;
      else nextOrder = 'asc';
    }
    setSort({ key, order: nextOrder });
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sort.key !== column || !sort.order) return <ArrowUpDown className="ml-2 h-3 w-3 opacity-30" />;
    return sort.order === 'asc' ? <ArrowUp className="ml-2 h-3 w-3 text-primary" /> : <ArrowDown className="ml-2 h-3 w-3 text-primary" />;
  };

  // Fetching Data
  const { data: employees } = useQuery({
    queryKey: ['employees-search-leave', empSearch],
    queryFn: async () => {
      if (!empSearch || empSearch.length < 2) return [];
      const res = await api.get(`/api/employees?search=${empSearch}`);
      return res.data;
    },
    enabled: empSearch.length >= 2
  });

  const { data: allRecords, isLoading: recordsLoading } = useQuery({
    queryKey: ['leaves-all'],
    queryFn: async () => {
      const res = await api.get('/api/leaves/');
      return res.data;
    }
  });

  // Split Logic
  const { activeRecords, historyRecords } = useMemo(() => {
    if (!allRecords || !isMounted) return { activeRecords: [], historyRecords: [] };
    
    const todayStr = new Date().toISOString().split('T')[0];

    const active = allRecords.filter((r: any) => {
        const matchesStatus = (statusFilter.includes('all') || statusFilter.includes(r.status));
        const isExpired = r.to_date < todayStr;
        return !isExpired || r.status !== 'Approved';
    });

    const sortedActive = [...active].sort((a, b) => {
        if (!sort.key || !sort.order) return 0;
        let valA = (sort.key === 'bs' ? a.employee_bs : (sort.key === 'name' ? a.employee_name : (sort.key === 'post_name' ? a.employee_post : a[sort.key]))) || '';
        let valB = (sort.key === 'bs' ? b.employee_bs : (sort.key === 'name' ? b.employee_name : (sort.key === 'post_name' ? b.employee_post : b[sort.key]))) || '';
        if (sort.key === 'bs') {
            const numA = parseInt(valA) || 0;
            const numB = parseInt(valB) || 0;
            return sort.order === 'asc' ? numA - numB : numB - numA;
        }
        valA = valA.toString().toLowerCase();
        valB = valB.toString().toLowerCase();
        if (valA < valB) return sort.order === 'asc' ? -1 : 1;
        if (valA > valB) return sort.order === 'asc' ? 1 : -1;
        return 0;
    });

    const history = allRecords.filter((r: any) => {
        const isExpired = r.to_date < todayStr;
        const isApproved = r.status === 'Approved';
        if (!isExpired || !isApproved) return false;
        if (!historySearch || historySearch.trim() === "") return true;
        const s = historySearch.toLowerCase();
        return (r.employee_name?.toLowerCase() || "").includes(s) || r.employee_id.toString().includes(s);
    });

    return { activeRecords: sortedActive, historyRecords: history };
  }, [allRecords, statusFilter, historySearch, isMounted, sort]);

  const totalDays = useMemo(() => {
    if (!formData.from_date || !formData.to_date) return 0;
    const start = new Date(formData.from_date);
    const end = new Date(formData.to_date);
    const diffTime = end.getTime() - start.getTime();
    if (diffTime < 0) return 0;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [formData.from_date, formData.to_date]);

  const leaveMutation = useMutation({
    mutationFn: (data: any) => editingId 
        ? api.put(`/api/leaves/${editingId}`, data) 
        : api.post('/api/leaves/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves-all'] });
      resetForm();
      alert(editingId ? "Successfully Updated!" : "Leave Application Saved!");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/leaves/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leaves-all'] })
  });

  const handleEdit = (record: any) => {
    setEditingId(record.id);
    setSelectedEmp({ id: record.employee_id, name: record.employee_name }); 
    setFormData({
        from_date: record.from_date,
        to_date: record.to_date,
        status: record.status,
        remarks: record.remarks || ''
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setSelectedEmp(null);
    setEmpSearch('');
    setFormData({ from_date: '', to_date: '', status: 'Under Process', remarks: '' });
  };

  const handleSave = () => {
    if (!selectedEmp || !formData.from_date || !formData.to_date) {
        alert("Please select employee and dates");
        return;
    }
    leaveMutation.mutate({
      employee_id: selectedEmp.id,
      ...formData
    });
  };

  const handleExport = (type: 'excel' | 'pdf') => {
    const dataToExport = activeRecords;
    if (dataToExport.length === 0) { alert("No data to export"); return; }
    if (type === 'excel') {
        const rows = dataToExport.map((r, i) => ({
            'S.No': i + 1, 'Name': r.employee_name, 'Designation': r.employee_post, 'BPS': r.employee_bs,
            'From': r.from_date, 'To': r.to_date, 'Days': r.total_days, 'Status': r.status, 'Remarks': r.remarks
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Leaves_Report");
        XLSX.writeFile(wb, `Leaves_Report_${new Date().getTime()}.xlsx`);
    } else {
        const doc = new jsPDF('landscape', 'pt', 'a4');
        doc.text(`Leave Management Report`, 40, 40);
        autoTable(doc, {
            startY: 60,
            head: [['#', 'Name', 'Designation', 'BPS', 'From', 'To', 'Days', 'Status', 'Remarks']],
            body: dataToExport.map((r, i) => [i + 1, r.employee_name, r.employee_post, r.employee_bs, r.from_date, r.to_date, r.total_days, r.status, r.remarks]),
        });
        doc.save(`Leaves_Report_${new Date().getTime()}.pdf`);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="space-y-6 w-full pb-10 px-2 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tighter uppercase italic">Leave <span className="text-primary">Management</span></h1>
        <div className="text-slate-500 font-bold text-xs uppercase tracking-widest">Attendance Control & Absence Monitoring</div>
      </div>

      <Card className="border-none shadow-sm bg-white overflow-hidden rounded-xl border border-slate-100 no-print">
        <div className="flex flex-wrap divide-x divide-slate-100">
            <MultiSelect label="Status" options={['Approved', 'Under Process', 'Rejected']} selected={statusFilter.filter(s => s !== 'all')} onChange={(vals) => setStatusFilter(vals.length ? vals : ['all'])} placeholder="Status" />
            <div className="p-4 flex items-center justify-center border-l border-slate-100 ml-auto">
                <Button variant="ghost" size="sm" className="h-10 px-4 text-[10px] font-black text-rose-500 uppercase hover:bg-rose-50 border border-rose-100 rounded-lg" onClick={() => { setStatusFilter(['all']); setHistorySearch(''); }}>Clear All</Button>
            </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-4 no-print relative z-[50]">
        <div className="relative group flex-[2] min-w-[250px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
            <Input 
                placeholder="SEARCH ACTIVE REGISTRY PERSONNEL..." 
                className="h-12 pl-12 bg-white border-none shadow-sm text-[16px] font-bold uppercase tracking-tight placeholder:text-slate-200 focus-visible:ring-1 focus-visible:ring-primary rounded-xl transition-all" 
                value={historySearch} 
                onChange={(e) => setHistorySearch(e.target.value)} 
            />
        </div>
        <div className="bg-white px-6 h-12 rounded-xl font-bold text-slate-700 border border-slate-100 flex items-center shadow-sm">Total: {activeRecords.length}</div>
        <div className="flex gap-2 ml-auto">
            <Button variant="secondary" className="h-12 px-5 rounded-xl font-semibold" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> Print</Button>
            <Button variant="secondary" className="h-12 px-5 rounded-xl font-semibold" onClick={() => handleExport('pdf')}><FileJson className="h-4 w-4 mr-2" /> PDF</Button>
            <Button variant="secondary" className="h-12 px-5 rounded-xl font-semibold" onClick={() => handleExport('excel')}><FileDown className="h-4 w-4 mr-2" /> Excel</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        <Card className="xl:col-span-4 border-none shadow-2xl bg-white rounded-3xl border border-slate-100 print:hidden">
          <CardHeader className="bg-slate-900 text-white p-8 rounded-t-3xl">
            <CardTitle className="text-lg font-black uppercase tracking-widest flex items-center italic text-primary"><Calendar className="h-5 w-5 mr-3" /> {editingId ? 'Modify Record' : 'Record Application'}</CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="space-y-3">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Find Personnel</Label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                <Input 
                  placeholder={editingId ? "Edit mode enabled..." : "SEARCH NAME OR CODE..."} 
                  disabled={!!editingId} 
                  className="pl-12 h-14 bg-slate-50 border-none font-bold text-sm rounded-2xl shadow-inner uppercase" 
                  value={empSearch} 
                  onChange={(e) => setEmpSearch(e.target.value)} 
                />
              </div>
              
              {employees && employees.length > 0 && !selectedEmp && (
                <div className="border rounded-2xl shadow-2xl max-h-48 overflow-y-auto bg-white z-50 border-slate-100 mt-2">
                  {employees.map((e: any) => (
                    <div key={e.id} className="p-4 hover:bg-slate-50 cursor-pointer border-b last:border-0 group" onClick={() => setSelectedEmp(e)}>
                      <p className="font-black text-slate-800 text-xs uppercase group-hover:text-primary transition-colors">{e.name}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">{e.post_name} | {e.branch_office}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedEmp && (
              <div className="bg-primary/5 p-6 rounded-2xl border-2 border-dashed border-primary/20 animate-in zoom-in-95">
                <div className="flex items-center gap-4 mb-3">
                  <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg"><User className="h-5 w-5" /></div>
                  <div><p className="font-black text-slate-900 uppercase text-xs tracking-tight">{selectedEmp.name}</p><p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Active Personnel</p></div>
                </div>
                {!editingId && <Button variant="ghost" size="sm" className="h-6 text-[9px] font-black text-rose-500 uppercase p-0 hover:bg-transparent" onClick={() => setSelectedEmp(null)}>Reset</Button>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-50">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase">From Date</Label>
                <Input type="date" className="h-12 bg-slate-50 border-none font-bold text-xs rounded-xl uppercase" value={formData.from_date} onChange={(e) => setFormData({...formData, from_date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase">To Date</Label>
                <Input type="date" className="h-12 bg-slate-50 border-none font-bold text-xs rounded-xl uppercase" value={formData.to_date} onChange={(e) => setFormData({...formData, to_date: e.target.value})} />
              </div>
            </div>

            <div className="bg-slate-900 p-8 rounded-3xl flex justify-between items-center shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Leave Duration</span>
               <span className="text-4xl font-black text-primary tracking-tighter italic z-10">{totalDays} DAYS</span>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Application Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v || ''})}>
                <SelectTrigger className="h-14 bg-slate-50 border-none font-bold text-xs rounded-2xl shadow-inner"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                  <SelectItem value="Approved" className="text-xs font-bold uppercase py-3">Approved</SelectItem>
                  <SelectItem value="Under Process" className="text-xs font-bold uppercase py-3">Under Process</SelectItem>
                  <SelectItem value="Rejected" className="text-xs font-bold uppercase py-3">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase">Remarks / Notes</Label>
                <Input placeholder="Enter extra details..." className="h-12 bg-slate-50 border-none font-bold text-xs rounded-xl shadow-inner" value={formData.remarks} onChange={(e) => setFormData({...formData, remarks: e.target.value})} />
            </div>

            <div className="flex gap-4">
                {editingId && <Button variant="outline" className="flex-1 h-14 font-black rounded-2xl uppercase text-[10px]" onClick={resetForm}>Cancel</Button>}
                <Button className="flex-[2] h-14 text-sm font-black shadow-2xl bg-slate-900 hover:bg-primary transition-all rounded-2xl tracking-widest" onClick={handleSave} disabled={!selectedEmp || leaveMutation.isPending}>
                    <Save className="h-4 w-4 mr-3" /> {editingId ? 'COMMIT UPDATES' : 'SAVE TO REGISTRY'}
                </Button>
            </div>
          </CardContent>
        </Card>

        <div className="xl:col-span-8 space-y-10">
            <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden border border-slate-100">
              <Table className="w-full">
                <TableHeader className="bg-slate-900">
                  <TableRow className="border-none">
                    <TableHead className="font-black text-white text-[9px] uppercase p-5 cursor-pointer" onClick={() => handleSort('name')}>Name <SortIcon column="name" /></TableHead>
                    <TableHead className="font-black text-white text-[9px] uppercase p-5 cursor-pointer" onClick={() => handleSort('bs')}>BPS <SortIcon column="bs" /></TableHead>
                    <TableHead className="font-black text-white text-[9px] uppercase p-5 cursor-pointer" onClick={() => handleSort('post_name')}>Designation <SortIcon column="post_name" /></TableHead>
                    <TableHead className="font-black text-white text-[9px] uppercase p-5 text-center">Period</TableHead>
                    <TableHead className="font-black text-white text-[9px] uppercase p-5 text-center">Days</TableHead>
                    <TableHead className="font-black text-white text-[9px] uppercase p-5 text-center">Status</TableHead>
                    <TableHead className="font-black text-white text-[9px] uppercase p-5 text-center">Remarks</TableHead>
                    <TableHead className="text-right text-white font-black text-[9px] uppercase p-5 print:hidden">Manage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recordsLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-20"><Skeleton className="h-10 w-full opacity-30" /></TableCell></TableRow>
                  ) : activeRecords.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-32 text-slate-300 font-black uppercase text-[10px] italic opacity-50 bg-slate-50/50">No active applications currently</TableCell></TableRow>
                  ) : (
                    activeRecords.map((record: any) => (
                      <TableRow key={record.id} className="group hover:bg-slate-50 h-20 border-b-slate-50">
                        <TableCell className="p-5 font-black text-slate-900 text-xs uppercase">{record.employee_name || 'Personnel #' + record.employee_id}</TableCell>
                        <TableCell className="text-center font-black text-slate-600 text-[10px]">{record.employee_bs || '-'}</TableCell>
                        <TableCell className="text-center font-black text-primary text-[10px]">{record.employee_post || 'DESIGNATION NOT SET'}</TableCell>
                        <TableCell className="text-[11px] font-bold text-slate-600 text-center tabular-nums">{record.from_date} <span className="mx-2 text-slate-300 tracking-tighter">---------</span> {record.to_date}</TableCell>
                        <TableCell className="text-center p-5"><Badge className="bg-slate-900 text-white border-none font-black text-[10px] h-8 px-4 rounded-full">{record.total_days} DAYS</Badge></TableCell>
                        <TableCell className="text-center p-5"><span className={cn("uppercase text-[9px] font-black px-4 py-1.5 rounded-full border shadow-sm", record.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : record.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100')}>{record.status}</span></TableCell>
                        <TableCell className="p-5 text-center text-[10px] font-bold text-slate-600">{record.remarks || "-"}</TableCell>
                        <TableCell className="text-right p-5 print:hidden"><div className="flex justify-end gap-2"><Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all" onClick={() => handleEdit(record)}><Edit2 className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-10 w-10 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all" onClick={() => { if(confirm("Permanent Delete?")) deleteMutation.mutate(record.id); }}><Trash2 className="h-4 w-4" /></Button></div></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>

            <div className="space-y-6 pt-10 border-t-2 border-slate-100">
              <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm flex items-center italic px-2"><History className="h-4 w-4 mr-3 text-primary" /> Service History Registry</h3>
              <Card className="border-none shadow-xl bg-slate-50/50 rounded-3xl overflow-hidden border border-slate-100">
                 <div className="p-6 bg-white border-b border-slate-100 flex gap-4 items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input placeholder="SEARCH COMPLETE ARCHIVE BY NAME OR ID..." className="h-14 pl-12 bg-slate-50 border-none font-bold text-xs uppercase rounded-2xl shadow-inner" value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} />
                    </div>
                 </div>
                 <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-100">
                        <TableRow><TableHead className="font-black text-slate-500 text-[9px] uppercase p-4">Personnel Name</TableHead><TableHead className="font-black text-slate-500 text-[9px] uppercase p-4 text-center">Leave Period</TableHead><TableHead className="font-black text-slate-500 text-[9px] uppercase p-4 text-center">Total Days</TableHead><TableHead className="font-black text-slate-500 text-[9px] uppercase p-4 text-center">Status</TableHead><TableHead className="font-black text-slate-500 text-[9px] uppercase p-4 text-center">Remarks</TableHead><TableHead className="text-right text-slate-500 font-black text-[9px] uppercase p-4">Manage</TableHead></TableRow>
                      </TableHeader>
                      <TableBody>
                        {historyRecords.length === 0 ? (<TableRow><TableCell colSpan={6} className="text-center py-20 text-slate-300 font-black uppercase text-[10px] italic tracking-widest">No matching archive found</TableCell></TableRow>) : (
                          historyRecords.map((r: any) => (
                            <TableRow key={r.id} className="h-14 bg-white/50 border-b-slate-50 hover:bg-white transition-colors"><TableCell className="p-4 font-black text-slate-800 text-[10px] uppercase truncate max-w-[200px]">{r.employee_name || 'Personnel #' + r.employee_id}</TableCell><TableCell className="text-[10px] font-bold text-slate-500 text-center tabular-nums">{r.from_date} to {r.to_date}</TableCell><TableCell className="text-center p-4"><span className="text-[10px] font-black text-slate-400">{r.total_days} DAYS</span></TableCell><TableCell className="text-center p-4"><Badge variant="outline" className="text-[8px] font-black uppercase text-slate-400 border-slate-200">{r.status}</Badge></TableCell><TableCell className="text-center p-4 text-[10px] font-bold text-slate-600">{r.remarks || "-"}</TableCell><TableCell className="text-right p-4"><div className="flex justify-end gap-2"><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all" onClick={() => handleEdit(r)}><Edit2 className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all" onClick={() => { if(confirm("Permanent Delete?")) deleteMutation.mutate(r.id); }}><Trash2 className="h-4 w-4" /></Button></div></TableCell></TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                 </div>
              </Card>
            </div>
        </div>
      </div>
    </div>
  );
}
