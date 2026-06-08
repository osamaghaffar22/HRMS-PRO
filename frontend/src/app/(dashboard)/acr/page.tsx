'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from "@/lib/utils";
import { Search, Plus, Trash2, FileDown, FileJson, Printer, ArrowUpDown, ArrowUp, ArrowDown, User, Calendar, Save, History, Clock } from 'lucide-react';
import { MultiSelect } from '@/components/ui/multi-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const OFFICERS_COLUMNS = [
  { name: 'S.No', width: 'w-10' },
  { name: 'Name', width: 'w-48' },
  { name: 'Designation', width: 'w-[120px]' },
  { name: 'BPS', width: 'w-16' },
  { name: 'Office', width: 'w-32' },
  { name: 'From / To', width: 'w-72' },
  { name: 'Duration', width: 'w-40' },
  { name: 'Status', width: 'w-40' },
  { name: 'Actions', width: 'w-20' }
];

const OFFICIALS_COLUMNS = [
  { name: 'S.No', width: 'w-10' },
  { name: 'Name', width: 'w-32' },
  { name: 'Designation', width: 'w-[120px]' },
  { name: 'BPS', width: 'w-16' },
  { name: 'Office', width: 'w-32' },
  { name: 'From / To', width: 'w-40' },
  { name: 'GA', width: 'w-24' },
  { name: 'Promotion', width: 'w-40' },
  { name: 'Fitness', width: 'w-16' },
  { name: 'Remarks', width: 'w-24' },
  { name: 'Duration', width: 'w-24' },
  { name: 'Actions', width: 'w-20' }
];

export default function ACRPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Officer');
  const [year, setYear] = useState('2025'); 
  const [completionFilter, setCompletionFilter] = useState<string[]>([]); 
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [gaFilter, setGaFilter] = useState<string[]>([]);
  const [remarksFilter, setRemarksFilter] = useState<string[]>([]);
  const [fitnessFilter, setFitnessFilter] = useState<string[]>([]);
  const [promotionFilter, setPromotionFilter] = useState<string[]>([]);
  const [designationFilter, setDesignationFilter] = useState<string[]>([]);

  // ACR Form Specific States
  const [formEmpSearch, setFormEmpSearch] = useState('');
  const [selectedFormEmp, setSelectedFormEmp] = useState<any>(null);
  const [acrFormData, setAcrFormData] = useState({
      year: '2025',
      from_date: '',
      to_date: '',
      ga: '',
      promotion: '',
      remarks: '',
      fitness_after_25_years: '',
      status: 'Pending'
  });

  const [sort, setSort] = useState<{ key: string; order: 'asc' | 'desc' | null }>({ key: '', order: null });

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

  const queryClient = useQueryClient();

  const { data: availableYears = ['2023', '2024', '2025', '2026'] } = useQuery({
    queryKey: ['acr-years'],
    queryFn: async () => {
      const res = await api.get('/api/config/acr_years');
      return res.data.value || ['2023', '2024', '2025', '2026'];
    }
  });

  const addYear = async (direction: 'before' | 'after') => {
      const sorted = [...availableYears].sort();
      let newList = [];
      if (direction === 'before') {
          const earliest = parseInt(sorted[0]);
          newList = [(earliest - 1).toString(), ...availableYears];
      } else {
          const latest = parseInt(sorted[sorted.length - 1]);
          newList = [...availableYears, (latest + 1).toString()];
      }
      await api.post('/api/config/acr_years', { value: newList });
      queryClient.invalidateQueries({ queryKey: ['acr-years'] });
  };

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    resetFilters();
  };

  const resetFilters = () => {
    setDesignationFilter([]);
    setStatusFilter([]);
    setGaFilter([]);
    setRemarksFilter([]);
    setFitnessFilter([]);
    setPromotionFilter([]);
    setCompletionFilter([]);
    setSearch('');
  };

  const { data: employees, isLoading } = useQuery({
    queryKey: ['acr-employees', search, category, year],
    queryFn: async () => {
      const res = await api.get(`/api/acr?search=${search}&category=${category}&year=${year}`);
      return res.data;
    }
  });

  const { data: formSearchEmployees } = useQuery({
      queryKey: ['acr-form-search', formEmpSearch],
      queryFn: async () => {
          if (formEmpSearch.length < 2) return [];
          const res = await api.get(`/api/employees?search=${formEmpSearch}`);
          return res.data;
      },
      enabled: formEmpSearch.length >= 2
  });

  // Query for specific employee history in ACR Form
  const { data: individualHistory, isLoading: isLoadingHistory, refetch: refetchIndividualHistory } = useQuery({
      queryKey: ['acr-individual-history', selectedFormEmp?.id],
      queryFn: async () => {
          if (!selectedFormEmp) return [];
          const res = await api.get(`/api/acr?search=${selectedFormEmp.name}&category=All`);
          return res.data.filter((e: any) => e.id === selectedFormEmp.id)[0]?.reports || [];
      },
      enabled: !!selectedFormEmp
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month}, ${year}`;
  };

  const formatTenure = (from: string, to: string) => {
    if (!from || !to) return "0Y 0M 0D";
    const d1 = new Date(from);
    const d2 = new Date(to);
    const totalDays = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (totalDays >= 365) return "1 Year";
    const y = Math.floor(totalDays / 365);
    const m = Math.floor((totalDays % 365) / 30);
    const d = (totalDays % 365) % 30;
    return `${y}Y ${m}M ${d}D`;
  };

  const getSumTenure = (periods: any[]) => {
    let totalDays = 0;
    periods.forEach(p => {
        const d1 = new Date(p.from);
        const d2 = new Date(p.to);
        totalDays += Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    });
    const targetDays = 365;
    const remainingDays = Math.max(0, targetDays - totalDays);
    const y = Math.floor(totalDays / 365);
    const m = Math.floor((totalDays % 365) / 30);
    const d = (totalDays % 365) % 30;
    const ry = Math.floor(remainingDays / 365);
    const rm = Math.floor((remainingDays % 365) / 30);
    const rd = (remainingDays % 365) % 30;
    return { submitted: { y, m, d }, remaining: { y: ry, m: rm, d: rd }, totalDays, isCompleted: totalDays >= 365 };
  };

  const calculateGaps = (targetYear: string, submittedPeriods: { from: string, to: string }[]) => {
    const yearStart = new Date(`${targetYear}-01-01`);
    const yearEnd = new Date(`${targetYear}-12-31`);
    let gaps = [{ start: yearStart, end: yearEnd }];
    submittedPeriods.forEach(p => {
        if (!p.from || !p.to) return;
        const pStart = new Date(p.from);
        const pEnd = new Date(p.to);
        let newGaps: { start: Date, end: Date }[] = [];
        gaps.forEach(gap => {
            if (pEnd < gap.start || pStart > gap.end) { newGaps.push(gap); } 
            else {
                if (pStart > gap.start) {
                    const beforeEnd = new Date(pStart);
                    beforeEnd.setDate(beforeEnd.getDate() - 1);
                    if (beforeEnd >= gap.start) { newGaps.push({ start: gap.start, end: beforeEnd }); }
                }
                if (pEnd < gap.end) {
                    const afterStart = new Date(pEnd);
                    afterStart.setDate(afterStart.getDate() + 1);
                    if (afterStart <= gap.end) { newGaps.push({ start: afterStart, end: gap.end }); }
                }
            }
        });
        gaps = newGaps;
    });
    return gaps;
  };

  const filteredEmployees = React.useMemo(() => {
    let result = employees?.filter((emp: any) => {
      const submitted = emp.reports?.flatMap((r: any) => r.periods.map((p: any) => ({...p, reportId: r.id, isManuallyCompleted: r.is_manually_completed}))) || [];
      const total = getSumTenure(submitted);
      const isCompleted = submitted.some((p: any) => p.isManuallyCompleted) || total.totalDays >= 365;
      const matchesCompletion = completionFilter.length === 0 || (completionFilter.includes('Completed') && isCompleted) || (completionFilter.includes('Incomplete') && !isCompleted);
      const matchesStatus = statusFilter.length === 0 || submitted.some((p: any) => statusFilter.includes(p.status));
      const matchesGa = gaFilter.length === 0 || submitted.some((p: any) => gaFilter.includes(p.ga));
      const matchesPromotion = promotionFilter.length === 0 || submitted.some((p: any) => promotionFilter.includes(p.promotion));
      const matchesRemarks = remarksFilter.length === 0 || submitted.some((p: any) => remarksFilter.includes(p.remarks));
      const matchesFitness = fitnessFilter.length === 0 || submitted.some((p: any) => fitnessFilter.includes(p.fitness_after_25_years));
      const matchesDesignation = designationFilter.length === 0 || designationFilter.includes(emp.post_name || '');
      return matchesCompletion && matchesStatus && matchesGa && matchesPromotion && matchesRemarks && matchesFitness && matchesDesignation;
    }) || [];

    if (sort.key && sort.order) {
        result = [...result].sort((a, b) => {
            let valA = a[sort.key] || '';
            let valB = b[sort.key] || '';
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
  }, [employees, sort, completionFilter, statusFilter, gaFilter, promotionFilter, remarksFilter, fitnessFilter, designationFilter]);

  const handleExportExcel = () => {
    if (!filteredEmployees || filteredEmployees.length === 0) return;
    const rows: any[] = [];
    filteredEmployees.forEach((emp: any, i: number) => {
      const submitted = emp.reports?.flatMap((r: any) => r.periods.map((p: any) => ({...p}))) || [];
      const gaps = calculateGaps(year, submitted);
      const showSubmitted = completionFilter.length === 0 || completionFilter.includes('Completed');
      const showRemaining = completionFilter.length === 0 || completionFilter.includes('Incomplete');

      if (showSubmitted) {
          submitted.forEach((p: any) => {
              rows.push({
                  'S.No': i + 1, 'Name': emp.name, 'Designation': emp.post_name, 'BPS': emp.bs, 'Office': emp.branch_office,
                  'From Date': formatDate(p.from), 'To Date': formatDate(p.to), 'Duration': formatTenure(p.from, p.to), 'Status': 'Submitted'
              });
          });
      }
      if (showRemaining) {
          gaps.forEach((g: any) => {
              const fromStr = g.start.toISOString().split('T')[0];
              const toStr = g.end.toISOString().split('T')[0];
              rows.push({
                  'S.No': i + 1, 'Name': emp.name, 'Designation': emp.post_name, 'BPS': emp.bs, 'Office': emp.branch_office,
                  'From Date': formatDate(fromStr), 'To Date': formatDate(toStr), 'Duration': formatTenure(fromStr, toStr), 'Status': 'Remaining'
              });
          });
      }
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ACR_Report");
    XLSX.writeFile(wb, `ACR_Report_${year}_${new Date().getTime()}.xlsx`);
  };

  const handleExportPDF = () => {
    if (!filteredEmployees || filteredEmployees.length === 0) return;
    const doc = new jsPDF('landscape', 'pt', 'a4');
    doc.text(`ACR Management Report - ${year} (${category})`, 40, 40);
    const tableData: any[] = [];
    filteredEmployees.forEach((emp: any, i: number) => {
        const submitted = emp.reports?.flatMap((r: any) => r.periods.map((p: any) => ({...p}))) || [];
        const gaps = calculateGaps(year, submitted);
        const showSubmitted = completionFilter.length === 0 || completionFilter.includes('Completed');
        const showRemaining = completionFilter.length === 0 || completionFilter.includes('Incomplete');
        if (showSubmitted) {
            submitted.forEach((p: any) => {
                tableData.push([i + 1, emp.name, emp.post_name, emp.bs, emp.branch_office, formatDate(p.from), formatDate(p.to), formatTenure(p.from, p.to), 'Submitted']);
            });
        }
        if (showRemaining) {
            gaps.forEach((g: any) => {
                const fromStr = g.start.toISOString().split('T')[0];
                const toStr = g.end.toISOString().split('T')[0];
                tableData.push([i + 1, emp.name, emp.post_name, emp.bs, emp.branch_office, formatDate(fromStr), formatDate(toStr), formatTenure(fromStr, toStr), 'Remaining']);
            });
        }
    });
    autoTable(doc, {
      startY: 60,
      head: [['#', 'Name', 'Designation', 'BPS', 'Office', 'From', 'To', 'Duration', 'Remarks']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] },
      styles: { fontSize: 8 }
    });
    doc.save(`ACR_Report_${year}_${new Date().getTime()}.pdf`);
  };

  const handlePrint = () => window.print();

  const addPeriod = async (e: React.FormEvent, employeeId: number, reportId: number | null) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    try {
        let targetReportId = reportId;
        if (!targetReportId) {
            const res = await api.post('/api/acr/report', { report_data: { employee_id: employeeId, year: year, status: 'Pending' } });
            targetReportId = res.data.id;
        }
        await api.post('/api/acr/period', { 
            period_data: { acr_report_id: targetReportId, from_date: formData.get('from_date'), to_date: formData.get('to_date'), status: "Pending" }
        });
        queryClient.invalidateQueries({ queryKey: ['acr-employees'] });
    } catch (error: any) { alert(error.response?.data?.detail || "An error occurred."); }
  };

  const handleFormSave = async () => {
      if (!selectedFormEmp || !acrFormData.from_date || !acrFormData.to_date) {
          alert("Fill all required fields"); return;
      }
      try {
          const allEmpsRes = await api.get(`/api/acr?search=${selectedFormEmp.name}&category=All&year=${acrFormData.year}`);
          const empRecord = allEmpsRes.data.find((e: any) => e.id === selectedFormEmp.id);
          let targetReportId = empRecord?.reports.find((r: any) => r.year === acrFormData.year)?.id;

          if (!targetReportId) {
              const res = await api.post('/api/acr/report', { 
                  report_data: { employee_id: selectedFormEmp.id, year: acrFormData.year, status: 'Pending' } 
              });
              targetReportId = res.data.id;
          }

          await api.post('/api/acr/period', { 
              period_data: {
                  acr_report_id: targetReportId,
                  from_date: acrFormData.from_date,
                  to_date: acrFormData.to_date,
                  ga: acrFormData.ga,
                  promotion: acrFormData.promotion,
                  remarks: acrFormData.remarks,
                  fitness_after_25_years: acrFormData.fitness_after_25_years,
                  status: acrFormData.status
              }
          });

          alert("ACR Entry Successful!");
          refetchIndividualHistory();
          queryClient.invalidateQueries({ queryKey: ['acr-employees'] });
      } catch (err: any) { 
          const msg = err.response?.data?.detail || "Error saving ACR";
          alert(msg); 
      }
  };

  const updatePeriodField = async (id: number, field: string, value: string) => {
    const previousEmployees = queryClient.getQueryData(['acr-employees', search, category, year]);
    queryClient.setQueryData(['acr-employees', search, category, year], (old: any) => {
        if (!old) return old;
        return old.map((emp: any) => ({
            ...emp,
            reports: emp.reports?.map((r: any) => ({ ...r, periods: r.periods?.map((p: any) => p.id === id ? { ...p, [field]: value } : p) }))
        }));
    });
    try { await api.patch(`/api/acr/period/${id}`, { [field]: value }); } 
    catch (err) { queryClient.setQueryData(['acr-employees', search, category, year], previousEmployees); }
  };

  const deletePeriod = async (id: number) => {
    await api.delete(`/api/acr/period/${id}`);
    queryClient.invalidateQueries({ queryKey: ['acr-employees'] });
    refetchIndividualHistory();
  };

  const toggleReportCompletion = async (reportId: number) => {
    const previousEmployees = queryClient.getQueryData(['acr-employees', search, category, year]);
    queryClient.setQueryData(['acr-employees', search, category, year], (old: any) => {
        if (!old) return old;
        return old.map((emp: any) => ({
            ...emp,
            reports: emp.reports?.map((r: any) => ({ ...r, is_manually_completed: r.id === reportId ? !r.is_manually_completed : r.is_manually_completed }))
        }));
    });
    try { await api.patch(`/api/acr/report/${reportId}/toggle-complete`); } 
    catch (err) { queryClient.setQueryData(['acr-employees', search, category, year], previousEmployees); }
  };

  return (
    <div className="space-y-6 w-full pb-10 px-2 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tighter uppercase italic">ACR <span className="text-primary">Management</span></h1>
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-200 no-print">
            <Button variant="outline" size="sm" onClick={() => addYear('before')} className="h-9 w-9 rounded-lg">-</Button>
            {[...availableYears].sort().map((y: string) => (
                <Button key={y} variant={year === y ? "default" : "ghost"} onClick={() => setYear(y)} className="h-9 px-4 rounded-lg font-semibold">{y}</Button>
            ))}
            <Button variant="outline" size="sm" onClick={() => addYear('after')} className="h-9 w-9 rounded-lg">+</Button>
        </div>
      </div>
      
      <Tabs defaultValue="Officer" onValueChange={handleCategoryChange}>
        <TabsList className="h-16 p-2 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <TabsTrigger value="Officer" className="px-10 py-3 text-lg font-bold rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Officers</TabsTrigger>
          <TabsTrigger value="Official" className="px-10 py-3 text-lg font-bold rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Officials</TabsTrigger>
          <TabsTrigger value="Form" className="px-10 py-3 text-lg font-bold rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all italic text-primary font-black uppercase tracking-tighter">ACR Form</TabsTrigger>
        </TabsList>
        
        <TabsContent value="Form" className="space-y-8 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Side Form Column */}
                <Card className="lg:col-span-4 border-none shadow-2xl bg-white rounded-3xl border border-slate-100">
                    <CardHeader className="bg-slate-900 text-white p-8 rounded-t-3xl">
                        <CardTitle className="text-lg font-black uppercase tracking-widest flex items-center italic text-primary"><Calendar className="h-5 w-5 mr-3" /> ACR Entry Form</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Personnel Search</Label>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                <Input placeholder="SEARCH NAME OR CODE..." className="pl-12 h-14 bg-slate-50 border-none font-bold text-sm rounded-2xl shadow-inner uppercase" value={formEmpSearch} onChange={(e) => setFormEmpSearch(e.target.value)} />
                            </div>
                            {formSearchEmployees && formSearchEmployees.length > 0 && !selectedFormEmp && (
                                <div className="border rounded-2xl shadow-2xl max-h-48 overflow-y-auto bg-white z-50 border-slate-100 mt-2">
                                    {formSearchEmployees.map((e: any) => (
                                        <div key={e.id} className="p-4 hover:bg-slate-50 cursor-pointer border-b last:border-0 group" onClick={() => setSelectedFormEmp(e)}>
                                            <p className="font-black text-slate-800 text-xs uppercase group-hover:text-primary transition-colors">{e.name}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase">{e.post_name} (BPS {e.bs})</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedFormEmp && (
                            <div className="bg-primary/5 p-6 rounded-2xl border-2 border-dashed border-primary/20">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg"><User className="h-5 w-5" /></div>
                                    <div><p className="font-black text-slate-900 uppercase text-xs">{selectedFormEmp.name}</p><p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Selected Personnel</p></div>
                                    <Button variant="ghost" size="sm" className="ml-auto h-8 text-[9px] font-black text-rose-500 uppercase p-0 hover:bg-transparent underline" onClick={() => setSelectedFormEmp(null)}>Reset</Button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3 pt-4 border-t border-slate-50">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">2. Select Year & Dates</Label>
                            <select className="h-12 w-full bg-slate-50 border-none font-bold text-xs rounded-xl px-4 uppercase" value={acrFormData.year} onChange={(e) => setAcrFormData({...acrFormData, year: e.target.value})}>
                                {[...availableYears].sort().map((y: string) => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <div className="grid grid-cols-2 gap-4">
                                <Input type="date" className="h-12 bg-slate-50 border-none font-bold text-xs rounded-xl" value={acrFormData.from_date} onChange={(e) => setAcrFormData({...acrFormData, from_date: e.target.value})} />
                                <Input type="date" className="h-12 bg-slate-50 border-none font-bold text-xs rounded-xl" value={acrFormData.to_date} onChange={(e) => setAcrFormData({...acrFormData, to_date: e.target.value})} />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">3. ACR Details</Label>
                            <div className="grid grid-cols-1 gap-4 text-xs font-bold uppercase">
                                <div className="space-y-1.5">
                                    <Label className="text-[9px] text-slate-400 ml-1">General Assessment (GA)</Label>
                                    <select className="h-12 w-full bg-slate-50 border-none rounded-xl px-4" value={acrFormData.ga} onChange={(e) => setAcrFormData({...acrFormData, ga: e.target.value})}>
                                        <option value="">-- SELECT GA --</option>
                                        {['Outstanding', 'Very Good', 'Good', 'Average', 'Below Average', 'Poor'].map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[9px] text-slate-400 ml-1">Promotion Fitness</Label>
                                    <select className="h-12 w-full bg-slate-50 border-none rounded-xl px-4" value={acrFormData.promotion} onChange={(e) => setAcrFormData({...acrFormData, promotion: e.target.value})}>
                                        <option value="">-- SELECT PROMOTION --</option>
                                        {['Recommended for accelerated Promotion', 'Fit for Promotion', 'Recently promoted', 'Assessment for the further promotion in premature', 'Not yet fit for promotion but likely to become fit in course of time', 'Unfit for further promotion', 'Has reached his ceiling'].map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] text-slate-400 ml-1">Fitness (After 25Y)</Label>
                                        <select className="h-12 w-full bg-slate-50 border-none rounded-xl px-4" value={acrFormData.fitness_after_25_years} onChange={(e) => setAcrFormData({...acrFormData, fitness_after_25_years: e.target.value})}>
                                            <option value="">-- FITNESS --</option>
                                            <option value="Fit">Fit</option><option value="Unfit">Unfit</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] text-slate-400 ml-1">Submission Status</Label>
                                        <select className="h-12 w-full bg-slate-50 border-none rounded-xl px-4" value={acrFormData.status} onChange={(e) => setAcrFormData({...acrFormData, status: e.target.value})}>
                                            <option value="Pending">Pending</option><option value="Sent">Sent</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[9px] text-slate-400 ml-1">Remarks</Label>
                                    <select className="h-12 w-full bg-slate-50 border-none rounded-xl px-4" value={acrFormData.remarks} onChange={(e) => setAcrFormData({...acrFormData, remarks: e.target.value})}>
                                        <option value="">-- SELECT REMARKS --</option>
                                        <option value="Satisfactory">Satisfactory</option><option value="Not Satisfactory">Not Satisfactory</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <Button className="w-full h-14 text-sm font-black shadow-2xl bg-slate-900 hover:bg-primary transition-all rounded-2xl tracking-[0.2em] uppercase" onClick={handleFormSave} disabled={!selectedFormEmp}>
                            <Save className="h-4 w-4 mr-3" /> Save ACR Entry
                        </Button>
                    </CardContent>
                </Card>

                <div className="lg:col-span-8 space-y-6">
                    <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm flex items-center italic px-2">
                        <History className="h-4 w-4 mr-3 text-primary" /> Individual ACR History 
                        {selectedFormEmp && <span className="ml-2 text-slate-400 font-bold tracking-tight">— {selectedFormEmp.name}</span>}
                    </h3>
                    
                    <Card className="border-none shadow-2xl bg-white rounded-3xl overflow-hidden border border-slate-100 min-h-[400px]">
                        <Table>
                            <TableHeader className="bg-slate-100">
                                <TableRow>
                                    <TableHead className="font-black text-slate-500 text-[9px] uppercase p-4">Year</TableHead>
                                    <TableHead className="font-black text-slate-500 text-[9px] uppercase p-4">Period</TableHead>
                                    <TableHead className="font-black text-slate-500 text-[9px] uppercase p-4 text-center">Duration</TableHead>
                                    <TableHead className="font-black text-slate-500 text-[9px] uppercase p-4 text-center">GA / Prom</TableHead>
                                    <TableHead className="font-black text-slate-500 text-[9px] uppercase p-4 text-center">Remarks</TableHead>
                                    <TableHead className="text-right text-slate-500 font-black text-[9px] uppercase p-4">Manage</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!selectedFormEmp ? (
                                    <TableRow><TableCell colSpan={6} className="py-40 text-center text-slate-300 font-black uppercase text-[10px] italic tracking-[0.3em]">Search & Select Personnel to view history</TableCell></TableRow>
                                ) : isLoadingHistory ? (
                                    <TableRow><TableCell colSpan={6} className="py-20 text-center"><Skeleton className="h-20 w-full opacity-30" /></TableCell></TableRow>
                                ) : !individualHistory || individualHistory.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="py-40 text-center text-slate-300 font-black uppercase text-[10px] italic tracking-[0.3em]">No ACR records found for this employee</TableCell></TableRow>
                                ) : (
                                    individualHistory.map((report: any) => (
                                        report.periods?.map((p: any) => (
                                            <TableRow key={p.id} className="h-16 hover:bg-slate-50/50 transition-colors border-b-slate-50">
                                                <TableCell className="p-4 font-black text-primary text-xs">{report.year}</TableCell>
                                                <TableCell className="p-4 text-[10px] font-bold text-slate-600 uppercase tabular-nums whitespace-nowrap">{formatDate(p.from)} - {formatDate(p.to)}</TableCell>
                                                <TableCell className="p-4 text-center text-[10px] font-black text-slate-400 italic">{formatTenure(p.from, p.to)}</TableCell>
                                                <TableCell className="p-4 text-center">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[9px] font-black text-slate-800 uppercase leading-none">{p.ga || "-"}</span>
                                                        <span className="text-[7px] font-bold text-slate-400 uppercase leading-none truncate max-w-[100px]">{p.promotion || "-"}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="p-4 text-center text-[10px] font-bold text-slate-500 uppercase">{p.remarks || "-"}</TableCell>
                                                <TableCell className="text-right p-4">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-300 hover:text-rose-600 transition-colors" onClick={() => deletePeriod(p.id)}><Trash2 className="h-4 w-4" /></Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </div>
            </div>
        </TabsContent>

        <TabsContent value={category === 'Form' ? 'Officer' : category} className="space-y-4 mt-6">
          <Card className="border-none shadow-sm bg-white overflow-hidden rounded-xl border border-slate-100 no-print">
            <div className="flex flex-wrap divide-x divide-slate-100">
                <MultiSelect label="Status" options={['Completed', 'Incomplete']} selected={completionFilter} onChange={(vals) => setCompletionFilter(vals)} placeholder="Status" />
                {category === 'Officer' && (
                    <MultiSelect label="Periods" options={['Pending', 'Sent']} selected={statusFilter} onChange={(vals) => setStatusFilter(vals)} placeholder="Periods" />
                )}
                <MultiSelect label="Designation" options={Array.from(new Set(employees?.map((e: any) => e.post_name).filter(Boolean)))} selected={designationFilter} onChange={(vals) => setDesignationFilter(vals)} placeholder="Designation" />
                {category === 'Official' && (
                <>
                    <MultiSelect label="GA" options={['Outstanding', 'Very Good', 'Good', 'Average', 'Below Average', 'Poor']} selected={gaFilter} onChange={(vals) => setGaFilter(vals)} placeholder="GA" />
                    <MultiSelect label="Promotion" options={['Recommended for accelerated Promotion', 'Fit for Promotion', 'Recently promoted', 'Assessment for the further promotion in premature', 'Not yet fit for promotion but likely to become fit in course of time', 'Unfit for further promotion', 'Has reached his ceiling']} selected={promotionFilter} onChange={(vals) => setPromotionFilter(vals)} placeholder="Promotion" />
                    <MultiSelect label="Remarks" options={['Satisfactory', 'Not Satisfactory']} selected={remarksFilter} onChange={(vals) => setRemarksFilter(vals)} placeholder="Remarks" />
                    <MultiSelect label="Fitness" options={['Fit', 'Unfit']} selected={fitnessFilter} onChange={(vals) => setFitnessFilter(vals)} placeholder="Fitness" />
                </>
                )}
                <div className="p-4 flex items-center justify-center border-l border-slate-100 ml-auto">
                    <Button variant="ghost" size="sm" className="h-10 px-4 text-[10px] font-black text-rose-500 uppercase hover:bg-rose-50 border border-rose-100 rounded-lg" onClick={resetFilters}>Clear All</Button>
                </div>
            </div>
          </Card>

          <div className="flex items-center gap-3 no-print">
            <div className="relative group flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
              <Input placeholder={`SEARCH ${category.toUpperCase()} (NAME, CNIC)...`} className="h-12 pl-12 bg-white border-none shadow-sm text-[16px] font-bold uppercase tracking-tight placeholder:text-slate-200 focus-visible:ring-1 focus-visible:ring-primary rounded-xl transition-all" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-100 h-12 px-2">
                <div className="flex flex-col items-center justify-center px-4 border-r border-slate-100 mr-2">
                    <span className="text-lg font-black text-primary leading-none tabular-nums">{filteredEmployees?.length || 0}</span>
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5">Records</span>
                </div>
                <Button variant="ghost" size="sm" className="h-9 px-4 text-[11px] font-black text-slate-600 uppercase rounded-lg flex items-center gap-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all" onClick={handleExportExcel}><FileDown className="h-4 w-4 text-emerald-600" /> Excel</Button>
                <div className="w-[1px] h-6 bg-slate-100" />
                <Button variant="ghost" size="sm" className="h-9 px-4 text-[11px] font-black text-slate-600 uppercase rounded-lg flex items-center gap-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all" onClick={handleExportPDF}><FileJson className="h-4 w-4 text-rose-600" /> PDF</Button>
                <div className="w-[1px] h-6 bg-slate-100" />
                <Button variant="ghost" size="sm" className="h-9 px-4 text-[11px] font-black text-slate-600 uppercase rounded-lg flex items-center gap-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all" onClick={handlePrint}><Printer className="h-4 w-4 text-blue-600" /> Print</Button>
            </div>
          </div>

          <Card className="border-none shadow-2xl overflow-hidden bg-white rounded-3xl border border-slate-100">
            <div className="w-full overflow-x-auto">
              <Table className="w-full table-fixed">
                <TableHeader className="bg-slate-900">
                  <TableRow className="hover:bg-slate-900 border-none h-14">
                    {(category === 'Officer' ? OFFICERS_COLUMNS : OFFICIALS_COLUMNS).map((col) => {
                      const sortKeyMap: any = { 'Name': 'name', 'Designation': 'post_name', 'BPS': 'bs', 'Office': 'branch_office' };
                      const sortKey = sortKeyMap[col.name];
                      return (
                        <TableHead key={col.name} className={`${col.width} text-white font-black text-[12px] uppercase p-2 ${['Duration', 'Status', 'Actions'].includes(col.name) ? 'text-center' : ''} ${sortKey ? 'cursor-pointer hover:bg-slate-800 transition-colors' : ''}`} onClick={() => sortKey && handleSort(sortKey)}>
                          <div className={`flex items-center ${['Duration', 'Status', 'Actions'].includes(col.name) ? 'justify-center' : ''}`}>
                            {col.name} {sortKey && <SortIcon column={sortKey} />}
                          </div>
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={category === 'Officer' ? 9 : 12} className="py-10 text-center text-slate-500 font-semibold">Loading data...</TableCell></TableRow>
                  ) : (
                    filteredEmployees?.map((emp: any, i: number) => {
                        const submitted = emp.reports?.flatMap((r: any) => r.periods.map((p: any) => ({...p, reportId: r.id, isManuallyCompleted: r.is_manually_completed, type: 'Submitted'}))) || [];
                        const gaps = calculateGaps(year, submitted).map((g, idx) => ({ id: `gap-${emp.id}-${idx}`, from: g.start.toISOString().split('T')[0], to: g.end.toISOString().split('T')[0], type: 'Remaining', status: 'Pending' }));
                        const displayRows = [...submitted, ...gaps].sort((a, b) => new Date(a.from).getTime() - new Date(b.from).getTime());
                        const total = getSumTenure(submitted);
                        return (
                      <React.Fragment key={emp.id}>
                        {displayRows.length === 0 ? (
                          <TableRow className="border-b border-slate-100 hover:bg-slate-50">
                            <TableCell className="text-[12px] font-black text-slate-300 text-center p-2">{i + 1}</TableCell>
                            <TableCell className="p-2 text-[14px] font-bold text-slate-900 uppercase leading-tight whitespace-normal break-words">{emp.name}</TableCell>
                            <TableCell className="p-2 text-slate-600 text-[13px] uppercase whitespace-normal break-words">{emp.post_name}</TableCell>
                            <TableCell className="p-2 text-primary font-black text-[12px] uppercase">{emp.bs}</TableCell>
                            <TableCell className="p-2 text-slate-600 text-[12px] uppercase whitespace-normal break-words">{emp.branch_office}</TableCell>
                            <TableCell colSpan={category === 'Officer' ? 4 : 7} className="text-center py-4">
                                <Dialog>
                                    <DialogTrigger render={<button className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 text-xs font-black uppercase rounded-lg border-primary text-primary hover:bg-primary/10 tracking-widest px-3")}><Plus className="h-3 w-3 mr-1"/> Add Period</button>} />
                                    <DialogContent>
                                        <DialogHeader><DialogTitle>Add ACR Period</DialogTitle></DialogHeader>
                                        <form onSubmit={(e) => addPeriod(e, emp.id, null)}>
                                            <Input name="from_date" type="date" className="mb-2" required />
                                            <Input name="to_date" type="date" className="mb-4" required />
                                            <DialogFooter><Button type="submit">Save</Button></DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </TableCell>
                          </TableRow>
                        ) : (
                            displayRows.map((p: any, pIdx: number) => (
                                <TableRow key={p.id} className={cn("border-b border-slate-100 hover:bg-slate-50/50", p.type === 'Remaining' && "bg-rose-50/20")}>
                                    {pIdx === 0 && (
                                        <>
                                            <TableCell className="text-[12px] font-black text-slate-300 text-center p-2 align-middle" rowSpan={displayRows.length}>{i + 1}</TableCell>
                                            <TableCell className="p-2 text-[14px] font-bold text-slate-900 uppercase leading-tight whitespace-normal break-words align-middle" rowSpan={displayRows.length}>{emp.name}</TableCell>
                                            <TableCell className="p-2 text-slate-600 text-[13px] uppercase whitespace-normal break-words align-middle" rowSpan={displayRows.length}>{emp.post_name}</TableCell>
                                            <TableCell className="p-2 text-primary font-black text-[12px] uppercase align-middle" rowSpan={displayRows.length}>{emp.bs}</TableCell>
                                            <TableCell className="p-2 text-slate-600 text-[12px] uppercase whitespace-normal break-words align-middle" rowSpan={displayRows.length}>{emp.branch_office}</TableCell>
                                        </>
                                    )}
                                    <TableCell className="text-[11px] font-bold text-slate-700 whitespace-nowrap p-2">
                                        <div className="flex flex-col">
                                            <span>{formatDate(p.from)} - {formatDate(p.to)}</span>
                                            {p.type === 'Remaining' && <span className="text-[8px] text-rose-500 font-black uppercase tracking-tighter">Remaining</span>}
                                            {p.type === 'Submitted' && <span className="text-[8px] text-emerald-500 font-black uppercase tracking-tighter">Submitted</span>}
                                        </div>
                                    </TableCell>
                                    {(category === 'Official' || category === 'Form') && (
                                      <>
                                        {/* GA Column */}
                                        <TableCell className="p-1">{p.type === 'Submitted' ? (<select className="h-7 border border-slate-200 rounded px-1 text-[10px] font-bold uppercase w-full bg-white focus:border-primary" value={p.ga ? String(p.ga) : ''} onChange={(e) => updatePeriodField(p.id, 'ga', e.target.value)}><option value="">Select</option>{['Outstanding', 'Very Good', 'Good', 'Average', 'Below Average', 'Poor'].map(o => <option key={o} value={o}>{o}</option>)}</select>) : <span className="text-[10px] text-slate-300 font-bold px-2 italic uppercase">Missing</span>}</TableCell>
                                        
                                        {/* Promotion Column */}
                                        <TableCell className="p-1">{p.type === 'Submitted' ? (<select className="h-7 border border-slate-200 rounded px-1 text-[10px] font-bold uppercase w-full bg-white focus:border-primary" value={p.promotion ? String(p.promotion) : ''} onChange={(e) => updatePeriodField(p.id, 'promotion', e.target.value)}><option value="">Select</option>{['Recommended for accelerated Promotion', 'Fit for Promotion', 'Recently promoted', 'Assessment for the further promotion in premature', 'Not yet fit for promotion but likely to become fit in course of time', 'Unfit for further promotion', 'Has reached his ceiling'].map(o => <option key={o} value={o}>{o}</option>)}</select>) : <span className="text-[10px] text-slate-300 font-bold px-2 italic uppercase">Missing</span>}</TableCell>
                                        
                                        {/* Fitness Column */}
                                        <TableCell className="p-1">{p.type === 'Submitted' ? (<select className="h-7 border border-slate-200 rounded px-1 text-[10px] font-bold uppercase w-full bg-white focus:border-primary" value={p.fitness_after_25_years ? String(p.fitness_after_25_years) : ''} onChange={(e) => updatePeriodField(p.id, 'fitness_after_25_years', e.target.value)}><option value="">Select</option>{['Fit', 'Unfit'].map(o => <option key={o} value={o}>{o}</option>)}</select>) : <span className="text-[10px] text-slate-300 font-bold px-2 italic uppercase">Missing</span>}</TableCell>
                                        
                                        {/* Remarks Column */}
                                        <TableCell className="p-1">{p.type === 'Submitted' ? (<select className="h-7 border border-slate-200 rounded px-1 text-[10px] font-bold uppercase w-full bg-white focus:border-primary" value={p.remarks ? String(p.remarks) : ''} onChange={(e) => updatePeriodField(p.id, 'remarks', e.target.value)}> <option value="">Select</option>{['Satisfactory', 'Not Satisfactory'].map(o => <option key={o} value={o}>{o}</option>)}</select>) : <span className="text-[10px] text-slate-300 font-bold px-2 italic uppercase">Missing</span>}</TableCell>
                                      </>
                                    )}
                                    <TableCell className="text-[11px] text-center text-slate-700 font-black italic">{formatTenure(p.from, p.to)}</TableCell>
                                    {category === 'Officer' && (
                                        <TableCell className="p-1"><div className="flex justify-center">{p.type === 'Submitted' ? (<select className="h-9 border border-slate-200 rounded-lg text-[11px] font-bold uppercase w-32 text-center bg-white focus:border-primary" value={p.status ? String(p.status) : 'Pending'} onChange={(e) => updatePeriodField(p.id, 'status', e.target.value)}><option value="Pending">Pending</option><option value="Sent">Sent</option></select>) : <span className="text-[10px] text-slate-300 font-black uppercase italic tracking-tighter">Missing Record</span>}</div></TableCell>
                                    )}
                                    <TableCell className="flex justify-center items-center gap-1 py-4 align-middle">
                                        {p.type === 'Submitted' ? (
                                            <>
                                                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" checked={p.isManuallyCompleted} onChange={() => toggleReportCompletion(p.reportId)} />
                                                <Dialog><DialogTrigger render={<button className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 w-8 text-primary hover:bg-primary/10 p-0")}><Plus className="h-4 w-4" /></button>} /><DialogContent><DialogHeader><DialogTitle>Add ACR Period</DialogTitle></DialogHeader><form onSubmit={(e) => addPeriod(e, emp.id, p.reportId)}><Input name="from_date" type="date" className="mb-2" required /><Input name="to_date" type="date" className="mb-4" required /><DialogFooter><Button type="submit">Save</Button></DialogFooter></form></DialogContent></Dialog>
                                                <Button variant="ghost" size="sm" className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 h-8 w-8 p-0" onClick={() => deletePeriod(p.id)}><Trash2 className="h-4 w-4" /></Button>
                                            </>
                                        ) : (
                                            <Dialog><DialogTrigger render={<button className="h-8 px-2 text-[8px] font-black uppercase rounded border border-rose-200 text-rose-500 hover:bg-rose-50 tracking-tighter">Add Missing</button>} /><DialogContent><DialogHeader><DialogTitle>Fill Missing ACR Period</DialogTitle></DialogHeader><form onSubmit={(e) => addPeriod(e, emp.id, null)}><Input name="from_date" type="date" defaultValue={p.from} className="mb-2" required /><Input name="to_date" type="date" defaultValue={p.to} className="mb-4" required /><DialogFooter><Button type="submit">Save</Button></DialogFooter></form></DialogContent></Dialog>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                        {submitted.length > 0 && (
                            <TableRow className="bg-slate-50 font-bold text-[11px] uppercase border-b border-slate-100">
                                <TableCell colSpan={5} className="text-right border-r border-slate-100 py-3 px-4 font-black text-slate-400">Summary</TableCell>
                                <TableCell colSpan={category === 'Officer' ? 4 : 7} className="text-right py-3 px-6 text-slate-900 tracking-tight">
                                    <span className="text-slate-400 mr-2 italic">Total Duration:</span>
                                    <span className="text-primary font-black mr-4">{`${total.submitted.y}Y ${total.submitted.m}M ${total.submitted.d}D`}</span>
                                    <span className="text-slate-300 mx-2">|</span> 
                                    <span className="text-slate-400 mr-2 italic">Remaining:</span>
                                    <span className="text-rose-500 font-black mr-4">{`${total.remaining.y}Y ${total.remaining.m}M ${total.remaining.d}D`}</span>
                                    <span className="text-slate-300 mx-2">|</span> 
                                    {submitted.some((p: any) => p.isManuallyCompleted) || total.totalDays >= 365 ? (
                                        <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 font-black tracking-widest text-[9px]">Completed</span>
                                    ) : (
                                        <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100 font-black tracking-widest text-[9px]">Incomplete</span>
                                    )}
                                </TableCell>
                            </TableRow>
                        )}
                      </React.Fragment>
                    )})
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
