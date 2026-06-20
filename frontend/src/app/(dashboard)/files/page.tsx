'use client';

import React, { useState, useMemo } from 'react';
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
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from "@/lib/utils";
import { Search, Plus, Trash2, Edit2, FileText, FileDown, FileJson, Printer, XCircle, History } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function FileTrackingPage() {
  const [search, setSearch] = useState('');
  const [putUpByFilter, setPutUpByFilter] = useState('');
  const [putUpDateFilter, setPutUpDateFilter] = useState('');
  const [isHistoryView, setIsHistoryView] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    file_name: '',
    case_subject: '',
    reason: '',
    put_up: '',
    put_up_date: new Date().toISOString().split('T')[0],
    mark_branch: '',
    receiver_name: '',
    receiving_date: '',
    return_date: '',
    status: 'In Progress'
  });
  const [subjectSearch, setSubjectSearch] = useState('');
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);

  const queryClient = useQueryClient();

  const { data: files, isLoading } = useQuery({
    queryKey: ['file-tracking'],
    queryFn: async () => {
      const res = await api.get('/api/files');
      return res.data;
    }
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await api.get('/api/employees');
      return res.data;
    }
  });

  const establishmentOfficials = useMemo(() => {
    if (!employees) return [];
    return employees.filter((e: any) => {
      const branch = (e.branch_office || "").toLowerCase();
      const name = (e.name || "").toLowerCase();
      const postName = (e.post_name || "").toLowerCase();
      
      return branch.includes("establishment") &&
             !name.includes("vacant") &&
             !name.includes("bilal") &&
             !postName.includes("naib qasid");
    });
  }, [employees]);

  const allBranches = useMemo(() => {
    if (!employees) return [];
    const hqEmployees = employees.filter((e: any) => 
      e.hq_field === 'HQ' && 
      !(e.branch_office || "").includes('DEC ') && 
      !(e.branch_office || "").includes('REC ')
    );
    const branches = Array.from(new Set(hqEmployees.map((e: any) => e.branch_office).filter(Boolean))) as string[];
    return branches.sort();
  }, [employees]);

  const autocompleteOptions = useMemo(() => {
    if (!employees && !files) return [];
    
    const optionsMap = new Map();
    if (employees) {
      employees.forEach((e: any) => {
        if (e.name) optionsMap.set(e.name, { id: e.id, name: e.name, personal_file_no: e.personal_file_no });
      });
    }

    if (files) {
      files.forEach((f: any) => {
        if (f.case_subject && !optionsMap.has(f.case_subject)) {
          optionsMap.set(f.case_subject, {
            id: `past-${f.id}`,
            name: f.case_subject,
            personal_file_no: f.file_name || ''
          });
        }
      });
    }
    
    return Array.from(optionsMap.values());
  }, [employees, files]);

  const createMutation = useMutation({
    mutationFn: (newFile: any) => api.post('/api/files', newFile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file-tracking'] });
      setIsAddOpen(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: number, updates: any }) => api.put(`/api/files/${data.id}`, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file-tracking'] });
      setIsAddOpen(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/files/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file-tracking'] });
    }
  });

  const handleCloseFile = (file: any) => {
    if (window.confirm(`Are you sure you want to close the file "${file.case_subject || 'Unknown'}"?`)) {
      const today = new Date().toISOString().split('T')[0];
      updateMutation.mutate({ 
        id: file.id, 
        updates: {
          file_name: file.file_name || '',
          case_subject: file.case_subject || '',
          reason: file.reason || '',
          put_up: file.put_up || '',
          put_up_date: file.put_up_date || '',
          mark_branch: file.mark_branch || '',
          receiver_name: file.receiver_name || '',
          receiving_date: file.receiving_date || '',
          return_date: today,
          status: 'Closed'
        } 
      });
    }
  };

  const resetForm = () => {
    setEditingFile(null);
    setSubjectSearch('');
    setFormData({
      file_name: '',
      case_subject: '',
      reason: '',
      put_up: '',
      put_up_date: new Date().toISOString().split('T')[0],
      mark_branch: '',
      receiver_name: '',
      receiving_date: '',
      return_date: '',
      status: 'In Progress'
    });
  };

  const handleEdit = (file: any) => {
    setEditingFile(file);
    setSubjectSearch(file.case_subject || '');
    setFormData({
      file_name: file.file_name || '',
      case_subject: file.case_subject || '',
      reason: file.reason || '',
      put_up: file.put_up || '',
      put_up_date: file.put_up_date || '',
      mark_branch: file.mark_branch || '',
      receiver_name: file.receiver_name || '',
      receiving_date: file.receiving_date || '',
      return_date: file.return_date || '',
      status: file.status || 'In Progress'
    });
    setIsAddOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingFile) {
      updateMutation.mutate({ id: editingFile.id, updates: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredFiles = useMemo(() => {
    if (!files) return [];
    
    // Default view shows non-closed files, History view shows only closed files
    let result = files.filter((f: any) => 
      isHistoryView ? f.status === 'Closed' : f.status !== 'Closed'
    );

    if (putUpByFilter) {
      result = result.filter((f: any) => f.put_up === putUpByFilter);
    }

    if (putUpDateFilter) {
      result = result.filter((f: any) => f.put_up_date === putUpDateFilter);
    }

    if (search) {
      const s = search.toLowerCase();
      result = result.filter((f: any) => 
        (f.file_name && f.file_name.toLowerCase().includes(s)) ||
        (f.case_subject && f.case_subject.toLowerCase().includes(s)) ||
        (f.reason && f.reason.toLowerCase().includes(s)) ||
        (f.put_up && f.put_up.toLowerCase().includes(s)) ||
        (f.mark_branch && f.mark_branch.toLowerCase().includes(s)) ||
        (f.receiver_name && f.receiver_name.toLowerCase().includes(s)) ||
        (f.status && f.status.toLowerCase().includes(s))
      );
    }

    return result;
  }, [files, search, putUpByFilter, putUpDateFilter, isHistoryView]);

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr.toLowerCase().includes('not match')) return "—";
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const parts = dateStr.split('-');
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(dateStr)) {
      const parts = dateStr.split(/[-/]/);
      return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[2]}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${day}-${month}-${year}`;
    }
    return dateStr;
  };

  const handleExportExcel = () => {
    if (!filteredFiles || filteredFiles.length === 0) return;
    const rows = filteredFiles.map((f: any, i: number) => ({
      'S.No': i + 1,
      'File Name': f.file_name || '—',
      'Case / Subject': f.case_subject || '—',
      'Reason / Case': f.reason || '—',
      'Put Up By': f.put_up || '—',
      'Put Up Date': formatDate(f.put_up_date),
      'Mark Branch': f.mark_branch || '—',
      'Receiver Name': f.receiver_name || '—',
      'Receiving Date': formatDate(f.receiving_date),
      'Return Date': formatDate(f.return_date),
      'Status': f.status || '—'
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "File Tracking");
    XLSX.writeFile(wb, `File_Tracking_${new Date().getTime()}.xlsx`);
  };

  const handleExportPDF = () => {
    if (!filteredFiles || filteredFiles.length === 0) return;
    const doc = new jsPDF('landscape', 'pt', 'a4');
    doc.text(`File Movement Tracking Report`, 40, 40);
    const tableData = filteredFiles.map((f: any, i: number) => [
      i + 1,
      f.file_name || '—',
      f.case_subject || '—',
      f.reason || '—',
      f.put_up || '—',
      formatDate(f.put_up_date),
      f.mark_branch || '—',
      f.receiver_name || '—',
      formatDate(f.receiving_date),
      formatDate(f.return_date),
      f.status || '—'
    ]);
    autoTable(doc, {
      startY: 60,
      head: [['#', 'File Name', 'Case / Subject', 'Reason', 'Put Up', 'Put Up Date', 'Mark Branch', 'Receiver', 'Rcv. Date', 'Return Date', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
      styles: { fontSize: 8 }
    });
    doc.save(`File_Tracking_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="space-y-6 w-full pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tighter uppercase italic">File <span className="text-primary">Tracking</span></h1>
      </div>

      <div className="flex items-center gap-3 no-print">
        <div className="relative group flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="SEARCH FILES, SUBJECTS, OR RECEIVERS..." 
            className="h-12 pl-12 bg-white border-none shadow-sm text-[16px] font-bold uppercase tracking-tight placeholder:text-slate-200 focus-visible:ring-1 focus-visible:ring-primary rounded-xl transition-all" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>
        
        <div className="bg-white shadow-sm border border-slate-100 rounded-xl h-12 flex items-center px-3 w-64">
          <select 
            value={putUpByFilter} 
            onChange={e => setPutUpByFilter(e.target.value)} 
            className="w-full h-full bg-transparent border-none text-[12px] font-black uppercase text-slate-700 outline-none focus:ring-0 cursor-pointer"
          >
            <option value="">ALL OFFICIALS (PUT UP BY)</option>
            {establishmentOfficials.map((o: any) => (
              <option key={o.id} value={o.name}>{o.name}</option>
            ))}
          </select>
        </div>

        <div className="bg-white shadow-sm border border-slate-100 rounded-xl h-12 flex items-center px-3 w-40">
          <Input 
            type="date"
            value={putUpDateFilter}
            onChange={e => setPutUpDateFilter(e.target.value)}
            className="w-full h-full border-none shadow-none focus-visible:ring-0 px-0 text-[12px] font-black uppercase text-slate-700 cursor-pointer bg-transparent"
            title="Filter by Put Up Date"
          />
        </div>

        {(search || putUpByFilter || putUpDateFilter) && (
          <Button 
            variant="ghost" 
            className="h-12 px-4 text-rose-500 hover:text-rose-600 hover:bg-rose-50 font-black text-[11px] uppercase tracking-widest rounded-xl transition-all"
            onClick={() => {
              setSearch('');
              setPutUpByFilter('');
              setPutUpDateFilter('');
            }}
          >
            Clear Filters
          </Button>
        )}

        <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-100 h-12 px-2">
            <div className="flex flex-col items-center justify-center px-4 border-r border-slate-100 mr-2">
                <span className="text-lg font-black text-primary leading-none tabular-nums">{filteredFiles?.length || 0}</span>
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5">Records</span>
            </div>
            <Button variant="ghost" size="sm" className="h-9 px-4 text-[11px] font-black text-slate-600 uppercase rounded-lg flex items-center gap-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all" onClick={handleExportExcel}><FileDown className="h-4 w-4 text-emerald-600" /> Excel</Button>
            <div className="w-[1px] h-6 bg-slate-100" />
            <Button variant="ghost" size="sm" className="h-9 px-4 text-[11px] font-black text-slate-600 uppercase rounded-lg flex items-center gap-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all" onClick={handleExportPDF}><FileJson className="h-4 w-4 text-rose-600" /> PDF</Button>
            <div className="w-[1px] h-6 bg-slate-100" />
            <Button variant="ghost" size="sm" className="h-9 px-4 text-[11px] font-black text-slate-600 uppercase rounded-lg flex items-center gap-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all" onClick={() => window.print()}><Printer className="h-4 w-4 text-blue-600" /> Print</Button>
            
            <div className="w-[1px] h-6 bg-slate-100 mx-2" />

            <Button 
              variant={isHistoryView ? "secondary" : "outline"}
              className={cn(
                "h-9 font-black text-[11px] uppercase tracking-widest px-5 rounded-lg shadow-sm transition-all border",
                isHistoryView 
                  ? "bg-slate-800 text-white hover:bg-slate-700 border-slate-800" 
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              )}
              onClick={() => setIsHistoryView(!isHistoryView)}
            >
              <History className="h-4 w-4 mr-2" /> {isHistoryView ? 'Show Active' : 'History'}
            </Button>

            <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if(!open) resetForm(); }}>
              <DialogTrigger render={<button className={cn(buttonVariants({ variant: 'default' }), "h-9 ml-2 font-black text-[11px] uppercase tracking-widest px-6 rounded-lg shadow-md shadow-primary/20 cursor-pointer")} />}>
                <Plus className="h-4 w-4 mr-2" /> New File
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] border-none shadow-2xl p-0 overflow-hidden bg-slate-50/95 backdrop-blur-3xl">
                <DialogHeader className="p-6 pb-0">
                  <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 flex items-center">
                    <FileText className="h-5 w-5 mr-3 text-primary" /> {editingFile ? 'Update File Movement' : 'New File Entry'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">File Name / No.</Label>
                      <Input required value={formData.file_name} onChange={e => setFormData({...formData, file_name: e.target.value})} className="h-10 border-none shadow-inner bg-slate-100 focus-visible:ring-primary/20 uppercase font-bold text-xs" placeholder="e.g., HR/2024/001" />
                    </div>
                    
                    <div className="col-span-2 space-y-1.5 relative">
                      <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Case / Subject</Label>
                      <Input 
                        required 
                        value={subjectSearch} 
                        onChange={e => {
                          setSubjectSearch(e.target.value);
                          setFormData({...formData, case_subject: e.target.value});
                          setShowSubjectDropdown(true);
                        }} 
                        onFocus={() => setShowSubjectDropdown(true)}
                        onBlur={() => setTimeout(() => setShowSubjectDropdown(false), 200)}
                        className="h-10 border-none shadow-inner bg-slate-100 focus-visible:ring-primary/20 uppercase font-bold text-xs" 
                        placeholder="Search Official Name or type manually..." 
                      />
                      {showSubjectDropdown && subjectSearch && autocompleteOptions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50">
                          {autocompleteOptions.filter((e: any) => e.name?.toLowerCase().includes(subjectSearch.toLowerCase()) || e.personal_file_no?.toLowerCase().includes(subjectSearch.toLowerCase())).slice(0, 50).map((e: any) => (
                            <div 
                              key={e.id} 
                              className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-xs font-bold uppercase border-b border-slate-100 last:border-0"
                              onMouseDown={() => {
                                setSubjectSearch(e.name || '');
                                setFormData({
                                  ...formData, 
                                  case_subject: e.name || '',
                                  file_name: e.personal_file_no || formData.file_name
                                });
                                setShowSubjectDropdown(false);
                              }}
                            >
                              {e.name} <span className="text-slate-400 font-medium ml-1">{e.personal_file_no ? `(${e.personal_file_no})` : ''}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="col-span-2 space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Reason / Case</Label>
                      <Input value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} className="h-10 border-none shadow-inner bg-slate-100 focus-visible:ring-primary/20 uppercase font-bold text-xs" placeholder="Reason for the file..." />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Put Up By</Label>
                      <select value={formData.put_up} onChange={e => setFormData({...formData, put_up: e.target.value})} className="flex h-10 w-full rounded-md border-none bg-slate-100 px-3 py-2 text-xs font-bold uppercase shadow-inner outline-none focus-visible:ring-2 focus-visible:ring-primary/20">
                        <option value="">-- SELECT OFFICIAL --</option>
                        {establishmentOfficials.map((o: any) => (
                          <option key={o.id} value={o.name}>{o.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Put Up Date</Label>
                      <Input type="date" value={formData.put_up_date} onChange={e => setFormData({...formData, put_up_date: e.target.value})} className="h-10 border-none shadow-inner bg-slate-100 focus-visible:ring-primary/20 font-bold text-xs" />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Mark Branch (To)</Label>
                      <select value={formData.mark_branch} onChange={e => setFormData({...formData, mark_branch: e.target.value})} className="flex h-10 w-full rounded-md border-none bg-slate-100 px-3 py-2 text-xs font-bold uppercase shadow-inner outline-none focus-visible:ring-2 focus-visible:ring-primary/20">
                        <option value="">-- SELECT BRANCH --</option>
                        {allBranches.map((b: string) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Receiver Name</Label>
                      <Input value={formData.receiver_name} onChange={e => setFormData({...formData, receiver_name: e.target.value})} className="h-10 border-none shadow-inner bg-slate-100 focus-visible:ring-primary/20 uppercase font-bold text-xs" placeholder="Who received it" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Receiving Date</Label>
                      <Input type="date" value={formData.receiving_date} onChange={e => setFormData({...formData, receiving_date: e.target.value})} className="h-10 border-none shadow-inner bg-slate-100 focus-visible:ring-primary/20 font-bold text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Return Date</Label>
                      <Input type="date" value={formData.return_date} onChange={e => setFormData({...formData, return_date: e.target.value})} className="h-10 border-none shadow-inner bg-slate-100 focus-visible:ring-primary/20 font-bold text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Status</Label>
                      <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="flex h-10 w-full rounded-md border-none bg-slate-100 px-3 py-2 text-xs font-bold uppercase shadow-inner outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50">
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Returned">Returned</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>
                  </div>
                  <DialogFooter className="pt-4 border-t border-slate-200/60">
                    <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)} className="text-[11px] font-black uppercase tracking-widest">Cancel</Button>
                    <Button type="submit" className="bg-primary hover:bg-primary/90 text-white text-[11px] font-black uppercase tracking-widest shadow-md shadow-primary/20">
                      {editingFile ? 'Update' : 'Save'} File
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
        </div>
      </div>

      <Card className="border-none shadow-2xl overflow-hidden bg-white rounded-3xl border border-slate-100">
        <div className="w-full overflow-x-auto">
          <Table className="w-full">
            <TableHeader className="bg-slate-900">
              <TableRow className="hover:bg-slate-900 border-none h-14">
                <TableHead className="w-12 text-white font-black text-[12px] uppercase p-3 text-center">S.No</TableHead>
                <TableHead className="w-40 text-white font-black text-[12px] uppercase p-3">File Name</TableHead>
                <TableHead className="w-48 text-white font-black text-[12px] uppercase p-3">Case / Subject</TableHead>
                <TableHead className="w-48 text-white font-black text-[12px] uppercase p-3">Reason / Case</TableHead>
                <TableHead className="w-40 text-white font-black text-[12px] uppercase p-3">Put Up</TableHead>
                <TableHead className="w-32 text-white font-black text-[12px] uppercase p-3 text-center">Put Up Date</TableHead>
                <TableHead className="w-40 text-white font-black text-[12px] uppercase p-3">Mark Branch</TableHead>
                <TableHead className="w-40 text-white font-black text-[12px] uppercase p-3">Receiver Name</TableHead>
                <TableHead className="w-32 text-white font-black text-[12px] uppercase p-3 text-center">Rcv. Date</TableHead>
                <TableHead className="w-32 text-white font-black text-[12px] uppercase p-3 text-center">Return Date</TableHead>
                <TableHead className="w-32 text-white font-black text-[12px] uppercase p-3 text-center">Status</TableHead>
                <TableHead className="w-24 text-center text-white font-black text-[12px] uppercase p-3 sticky right-0 bg-slate-900">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={12} className="py-10 text-center text-slate-500 font-semibold">Loading data...</TableCell></TableRow>
              ) : filteredFiles?.length === 0 ? (
                <TableRow><TableCell colSpan={12} className="py-20 text-center text-slate-400 font-black uppercase text-xs italic tracking-widest">{isHistoryView ? 'No closed files found in history' : 'No active files found'}</TableCell></TableRow>
              ) : (
                filteredFiles?.map((f: any, i: number) => (
                  <TableRow key={f.id} className="transition-colors border-b border-slate-100 hover:bg-slate-50/80">
                    <TableCell className="text-[11px] font-black text-slate-400 text-center p-3">{i + 1}</TableCell>
                    <TableCell className="p-3 text-[12px] font-black text-slate-900 uppercase">{f.file_name || '—'}</TableCell>
                    <TableCell className="p-3 text-[11px] font-bold text-slate-600 uppercase whitespace-normal break-words max-w-[200px]">{f.case_subject || '—'}</TableCell>
                    <TableCell className="p-3 text-[11px] font-bold text-slate-600 uppercase whitespace-normal break-words max-w-[200px]">{f.reason || '—'}</TableCell>
                    <TableCell className="p-3 text-[11px] font-bold text-slate-600 uppercase">{f.put_up || '—'}</TableCell>
                    <TableCell className="p-3 text-[11px] font-bold text-primary text-center bg-primary/5">{formatDate(f.put_up_date)}</TableCell>
                    <TableCell className="p-3 text-[11px] font-bold text-slate-600 uppercase">{f.mark_branch || '—'}</TableCell>
                    <TableCell className="p-3 text-[11px] font-bold text-slate-600 uppercase">{f.receiver_name || '—'}</TableCell>
                    <TableCell className="p-3 text-[11px] font-bold text-emerald-600 text-center bg-emerald-50/50">{formatDate(f.receiving_date)}</TableCell>
                    <TableCell className="p-3 text-[11px] font-bold text-rose-600 text-center bg-rose-50/50">{formatDate(f.return_date)}</TableCell>
                    <TableCell className="p-3 text-[10px] font-black text-center uppercase tracking-wider">
                        {f.status === 'Completed' && <span className="text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">Completed</span>}
                        {f.status === 'In Progress' && <span className="text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100">In Progress</span>}
                        {f.status === 'Returned' && <span className="text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">Returned</span>}
                        {f.status === 'Closed' && <span className="text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">Closed</span>}
                        {f.status === 'Pending' && <span className="text-rose-600 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-100">Pending</span>}
                        {!['Completed', 'In Progress', 'Returned', 'Pending', 'Closed'].includes(f.status) && <span className="text-slate-600">{f.status || '—'}</span>}
                    </TableCell>
                    <TableCell className="text-center p-3 sticky right-0 bg-white shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.05)] border-l border-slate-100">
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100 p-0 transition-colors" title="Close File" onClick={() => handleCloseFile(f)}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 text-primary hover:bg-primary/10 p-0" title="Edit" onClick={() => handleEdit(f)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-0 transition-colors" title="Delete" onClick={() => deleteMutation.mutate(f.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
