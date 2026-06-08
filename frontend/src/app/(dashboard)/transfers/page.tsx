'use client';

import { useState, useMemo } from 'react';
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
import { Search, Save, MapPin, Building2, User, Trash2, Printer, FileDown, FileJson, Clock, History, Edit2, ArrowUpDown, ArrowUp, ArrowDown, Plus } from 'lucide-react';
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

export default function TransfersPage() {
  const queryClient = useQueryClient();
  
  // Selection States
  const [empSearch, setEmpSearch] = useState('');
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  
  // Filter States
  const [regionFilter, setRegionFilter] = useState<string[]>([]);
  const [officeFilter, setOfficeFilter] = useState<string[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [sort, setSort] = useState<{ key: string; order: 'asc' | 'desc' | null }>({ key: '', order: null });

  // Form State
  const [formData, setFormData] = useState({
    new_branch_office: '',
    new_region: '',
    order_number: '',
    order_date: '',
    remarks: ''
  });

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

  // Queries
  const { data: employees } = useQuery({
    queryKey: ['employees-search-transfer', empSearch],
    queryFn: async () => {
      if (!empSearch || empSearch.length < 2) return [];
      const res = await api.get(`/api/employees?search=${empSearch}`);
      return res.data;
    },
    enabled: empSearch.length >= 2
  });

  const { data: allRecords, isLoading: recordsLoading } = useQuery({
    queryKey: ['transfers-all'],
    queryFn: async () => {
      const res = await api.get('/api/transfers/');
      return res.data;
    }
  });

  // Filter & Sort Logic
  const filteredRecords = useMemo(() => {
    if (!allRecords) return [];
    let result = allRecords.filter((r: any) => {
        const matchesRegion = regionFilter.length === 0 || regionFilter.includes(r.new_region);
        const matchesOffice = officeFilter.length === 0 || officeFilter.includes(r.new_branch_office);
        const matchesSearch = !historySearch || 
            r.employee_name?.toLowerCase().includes(historySearch.toLowerCase()) ||
            r.employee_id.toString().includes(historySearch);
        return matchesRegion && matchesOffice && matchesSearch;
    });

    if (sort.key && sort.order) {
        result = [...result].sort((a, b) => {
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
    }
    return result;
  }, [allRecords, regionFilter, officeFilter, historySearch, sort]);

  const transferMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/transfers/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers-all'] });
      setSelectedEmp(null);
      setEmpSearch('');
      setFormData({ new_branch_office: '', new_region: '', order_number: '', order_date: '', remarks: '' });
      alert("Transfer Order Registered Successfully!");
    }
  });

  const handleExport = (type: 'excel' | 'pdf') => {
    if (filteredRecords.length === 0) return;
    if (type === 'excel') {
        const rows = filteredRecords.map((r: any, i: number) => ({
            'S.No': i + 1, 'Name': r.employee_name, 'Designation': r.employee_post, 'BPS': r.employee_bs,
            'New Region': r.new_region, 'New Office': r.new_branch_office, 'Order #': r.order_number, 'Order Date': r.order_date
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Transfers_Report");
        XLSX.writeFile(wb, `Transfers_Report_${new Date().getTime()}.xlsx`);
    } else {
        const doc = new jsPDF('landscape', 'pt', 'a4');
        doc.text(`Transfer & Posting History Report`, 40, 40);
        autoTable(doc, {
            startY: 60,
            head: [['#', 'Name', 'Designation', 'BPS', 'New Region', 'New Office', 'Order #', 'Order Date']],
            body: filteredRecords.map((r: any, i: number) => [i + 1, r.employee_name, r.employee_post, r.employee_bs, r.new_region, r.new_branch_office, r.order_number, r.order_date]),
        });
        doc.save(`Transfers_Report_${new Date().getTime()}.pdf`);
    }
  };

  const resetFilters = () => {
    setRegionFilter([]);
    setOfficeFilter([]);
    setHistorySearch('');
  };

  return (
    <div className="space-y-6 w-full pb-10 px-2 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tighter uppercase italic">Transfer <span className="text-primary">& Posting</span></h1>
        <div className="text-slate-500 font-bold text-xs uppercase tracking-widest opacity-70">Movement Control & Deployment History</div>
      </div>

      <Card className="border-none shadow-sm bg-white overflow-hidden rounded-xl border border-slate-100 no-print">
        <div className="flex flex-wrap divide-x divide-slate-100">
            <MultiSelect label="New Region" options={Array.from(new Set(allRecords?.map((r: any) => r.new_region).filter(Boolean)))} selected={regionFilter} onChange={(vals) => setRegionFilter(vals)} placeholder="Region" />
            <MultiSelect label="New Office" options={Array.from(new Set(allRecords?.map((r: any) => r.new_branch_office).filter(Boolean)))} selected={officeFilter} onChange={(vals) => setOfficeFilter(vals)} placeholder="Office" />
            <div className="p-4 flex items-center justify-center border-l border-slate-100 ml-auto">
                <Button variant="ghost" size="sm" className="h-10 px-4 text-[10px] font-black text-rose-500 uppercase hover:bg-rose-50 border border-rose-100 rounded-lg" onClick={resetFilters}>Clear All</Button>
            </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-4 no-print relative z-[50]">
        <div className="relative group flex-[2] min-w-[250px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
            <Input 
                placeholder="SEARCH HISTORY PERSONNEL..." 
                className="h-12 pl-12 bg-white border-none shadow-sm text-[16px] font-bold uppercase tracking-tight placeholder:text-slate-200 focus-visible:ring-1 focus-visible:ring-primary rounded-xl transition-all" 
                value={historySearch} 
                onChange={(e) => setHistorySearch(e.target.value)} 
            />
        </div>
        <div className="bg-white px-6 h-12 rounded-xl font-bold text-slate-700 border border-slate-100 flex items-center shadow-sm">Total: {filteredRecords.length}</div>
        <div className="flex gap-2 ml-auto">
            <Button variant="secondary" className="h-12 px-5 rounded-xl font-semibold" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> Print</Button>
            <Button variant="secondary" className="h-12 px-5 rounded-xl font-semibold" onClick={() => handleExport('pdf')}><FileJson className="h-4 w-4 mr-2" /> PDF</Button>
            <Button variant="secondary" className="h-12 px-5 rounded-xl font-semibold" onClick={() => handleExport('excel')}><FileDown className="h-4 w-4 mr-2" /> Excel</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        <Card className="xl:col-span-4 border-none shadow-2xl bg-white rounded-3xl border border-slate-100 print:hidden">
          <CardHeader className="bg-slate-900 text-white p-8 rounded-t-3xl">
            <CardTitle className="text-lg font-black uppercase tracking-widest flex items-center italic text-primary"><Clock className="h-5 w-5 mr-3" /> New Deployment</CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
              {/* Employee Search */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Select Personnel</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Search by name, code or cnic..." 
                    className="pl-10 h-12 bg-slate-50 border-none font-bold text-xs"
                    value={empSearch}
                    onChange={(e) => setEmpSearch(e.target.value)}
                  />
                </div>
                {employees && employees.length > 0 && !selectedEmp && (
                  <div className="border rounded-xl shadow-2xl max-h-48 overflow-y-auto bg-white z-20 border-slate-100 mt-2">
                    {employees.map((e: any) => (
                      <div key={e.id} className="p-3 hover:bg-slate-50 cursor-pointer border-b last:border-0 group" onClick={() => setSelectedEmp(e)}>
                        <p className="font-black text-slate-800 text-[10px] uppercase group-hover:text-primary transition-colors">{e.name}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">{e.post_name} | {e.branch_office}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedEmp && (
                <div className="bg-primary/5 p-6 rounded-2xl border-2 border-dashed border-primary/20 animate-in zoom-in-95">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg"><User className="h-5 w-5" /></div>
                    <div><p className="font-black text-slate-900 uppercase text-xs">{selectedEmp.name}</p><p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Active Choice</p></div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 text-[9px] font-black text-rose-500 uppercase p-0 mt-3 hover:bg-transparent" onClick={() => setSelectedEmp(null)}>Change Selection</Button>
                </div>
              )}

              <div className="space-y-6 pt-4 border-t border-slate-50">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase">New Region</label>
                      <Input className="h-12 bg-slate-50 border-none font-bold text-xs uppercase rounded-xl" value={formData.new_region} onChange={(e) => setFormData({...formData, new_region: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase">New Office</label>
                      <Input className="h-12 bg-slate-50 border-none font-bold text-xs uppercase rounded-xl" value={formData.new_branch_office} onChange={(e) => setFormData({...formData, new_branch_office: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Order #</label>
                      <Input className="h-12 bg-slate-50 border-none font-bold text-xs uppercase rounded-xl" value={formData.order_number} onChange={(e) => setFormData({...formData, order_number: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Order Date</label>
                      <Input type="date" className="h-12 bg-slate-50 border-none font-bold text-xs rounded-xl" value={formData.order_date} onChange={(e) => setFormData({...formData, order_date: e.target.value})} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Remarks</label>
                    <Input className="h-12 bg-slate-50 border-none font-bold text-xs uppercase rounded-xl" value={formData.remarks} onChange={(e) => setFormData({...formData, remarks: e.target.value})} />
                  </div>
              </div>

              <Button className="w-full h-14 text-sm font-black shadow-2xl bg-slate-900 hover:bg-primary transition-all rounded-2xl tracking-widest" onClick={() => transferMutation.mutate({ employee_id: selectedEmp.id, ...formData })} disabled={!selectedEmp || transferMutation.isPending}>
                  <Save className="h-4 w-4 mr-3" /> REGISTER MOVEMENT
              </Button>
          </CardContent>
        </Card>

        <div className="xl:col-span-8 space-y-6">
            <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm flex items-center italic px-2"><History className="h-4 w-4 mr-3 text-primary" /> Transfer Log</h3>
            <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden border border-slate-100">
                <Table>
                <TableHeader className="bg-slate-900">
                    <TableRow className="border-none">
                    <TableHead className="font-black text-white text-[9px] uppercase p-4 cursor-pointer" onClick={() => handleSort('name')}>Personnel <SortIcon column="name" /></TableHead>
                    <TableHead className="font-black text-white text-[9px] uppercase p-4 cursor-pointer" onClick={() => handleSort('bs')}>BPS <SortIcon column="bs" /></TableHead>
                    <TableHead className="font-black text-white text-[9px] uppercase p-4">Deployment</TableHead>
                    <TableHead className="font-black text-white text-[9px] uppercase p-4">Order Details</TableHead>
                    <TableHead className="text-right text-white font-black text-[9px] uppercase p-4 print:hidden">Manage</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {recordsLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20"><Skeleton className="h-10 w-full opacity-30" /></TableCell></TableRow>
                    ) : filteredRecords.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 text-slate-300 font-black uppercase text-[10px] italic">No transfer records found</TableCell></TableRow>
                    ) : (
                    filteredRecords.map((r: any) => (
                        <TableRow key={r.id} className="group hover:bg-slate-50 border-b-slate-50 h-16">
                        <TableCell className="p-4">
                            <div className="flex flex-col">
                                <span className="font-black text-slate-900 text-xs uppercase">{r.employee_name}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">{r.employee_post}</span>
                            </div>
                        </TableCell>
                        <TableCell className="text-center font-black text-primary text-[10px]">{r.employee_bs || '-'}</TableCell>
                        <TableCell className="p-4">
                            <div className="flex flex-col">
                                <span className="font-bold text-slate-700 text-[10px] uppercase">{r.new_branch_office}</span>
                                <span className="text-[9px] text-slate-400 uppercase">{r.new_region}</span>
                            </div>
                        </TableCell>
                        <TableCell className="p-4">
                            <div className="flex flex-col">
                                <span className="font-bold text-slate-700 text-[10px]"># {r.order_number}</span>
                                <span className="text-[9px] text-slate-400">{r.order_date}</span>
                            </div>
                        </TableCell>
                        <TableCell className="text-right p-4 print:hidden">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-200 hover:text-rose-500 transition-colors"><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                        </TableRow>
                    ))
                    )}
                </TableBody>
                </Table>
            </Card>
        </div>
      </div>
    </div>
  );
}
