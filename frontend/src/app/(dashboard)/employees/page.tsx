'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
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
import { Search, Plus, Trash2, FileDown, FileJson, Printer, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MultiSelect } from '@/components/ui/multi-select';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function EmployeesContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<any>({
    officer_official: [],
    hq_field: [],
    region: [],
    branch_office: [],
    post_name: [],
    domicile: [],
    post_status: []
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

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees', filters, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      Object.keys(filters).forEach(key => {
        if (filters[key].length > 0) params.append(key, filters[key].join(','));
      });
      const res = await api.get(`/api/employees?${params.toString()}`);
      return res.data;
    }
  });

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
      region: [],
      branch_office: [],
      post_name: [],
      domicile: [],
      post_status: []
    });
    setSearch('');
  };

  const sortedEmployees = useMemo(() => {
    if (!employees) return [];
    if (!sort.key || !sort.order) return employees;

    return [...employees].sort((a, b) => {
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
  }, [employees, sort]);

  const handleExport = (type: 'excel' | 'pdf') => {
    if (!sortedEmployees.length) return;
    if (type === 'excel') {
        const ws = XLSX.utils.json_to_sheet(sortedEmployees.map((e: any, i: number) => ({
            'S.No': i + 1, 'Name': e.name, 'Post': e.post_name, 'BPS': e.bs, 'Region': e.region, 'Office': e.branch_office, 'Status': e.post_status
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Employees");
        XLSX.writeFile(wb, `Employees_Export_${new Date().getTime()}.xlsx`);
    } else {
        const doc = new jsPDF('landscape');
        doc.text("Personnel Registry Report", 14, 15);
        autoTable(doc, {
            startY: 20,
            head: [['#', 'Name', 'Designation', 'BPS', 'Region', 'Office', 'Status']],
            body: sortedEmployees.map((e: any, i: number) => [i + 1, e.name, e.post_name, e.bs, e.region, e.branch_office, e.post_status]),
        });
        doc.save(`Employees_Export_${new Date().getTime()}.pdf`);
    }
  };

  return (
    <div className="space-y-4 w-full pb-10">
      <Card className="border-none shadow-sm bg-white overflow-hidden rounded-xl border border-slate-100 no-print">
        <div className="flex flex-wrap divide-x divide-slate-100">
          <MultiSelect label="Officer/Officials" options={['Officer', 'Official']} selected={filters.officer_official} onChange={(vals) => setFilters({...filters, officer_official: vals})} placeholder="Officer/Officials" />
          <MultiSelect label="HQ/Field" options={['HQ', 'Field']} selected={filters.hq_field} onChange={(vals) => setFilters({...filters, hq_field: vals})} placeholder="HQ/Field" />
          <MultiSelect label="Region" options={filterOptions?.region || []} selected={filters.region} onChange={(vals) => setFilters({...filters, region: vals})} placeholder="Region" />
          <MultiSelect label="Office/Branch" options={filterOptions?.branch_office || []} selected={filters.branch_office} onChange={(vals) => setFilters({...filters, branch_office: vals})} placeholder="Office/Branch" />
          <MultiSelect label="Designation" options={filterOptions?.post_name || []} selected={filters.post_name} onChange={(vals) => setFilters({...filters, post_name: vals})} placeholder="Designation" />
          <MultiSelect label="Domicile" options={filterOptions?.domicile || []} selected={filters.domicile} onChange={(vals) => setFilters({...filters, domicile: vals})} placeholder="Domicile" />
          <MultiSelect label="Status" options={['Filled', 'Vacant']} selected={filters.post_status} onChange={(vals) => setFilters({...filters, post_status: vals})} placeholder="Status" />
          <div className="p-4 flex items-center justify-center border-l border-slate-100 ml-auto">
             <Button variant="ghost" size="sm" className="h-10 px-4 text-[10px] font-black text-rose-500 uppercase hover:bg-rose-50 border border-rose-100 rounded-lg" onClick={resetFilters}>Clear All</Button>
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-3 no-print">
        <div className="relative group flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
          <Input placeholder="SEARCH REGISTRY (NAME, CNIC, CODE)..." className="h-12 pl-12 bg-white border-none shadow-sm text-[16px] font-bold uppercase tracking-tight placeholder:text-slate-200 focus-visible:ring-1 focus-visible:ring-primary rounded-xl transition-all" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="bg-white px-6 h-12 rounded-xl font-bold text-slate-700 border border-slate-100 flex items-center shadow-sm">Total: {sortedEmployees.length}</div>
        <div className="flex gap-2">
            <Button variant="secondary" className="h-12 px-5 rounded-xl font-semibold" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> Print</Button>
            <Button variant="secondary" className="h-12 px-5 rounded-xl font-semibold" onClick={() => handleExport('pdf')}><FileJson className="h-4 w-4 mr-2" /> PDF</Button>
            <Button variant="secondary" className="h-12 px-5 rounded-xl font-semibold" onClick={() => handleExport('excel')}><FileDown className="h-4 w-4 mr-2" /> Excel</Button>
        </div>
      </div>

      <Card className="border-none shadow-2xl overflow-hidden bg-white rounded-3xl border border-slate-100">
        <Table>
          <TableHeader className="bg-slate-900">
            <TableRow className="border-none hover:bg-slate-900 h-14">
              <TableHead className="w-12 text-white font-black text-[10px] uppercase p-4 text-center">S.No</TableHead>
              <TableHead className="text-white font-black text-[11px] uppercase p-4 cursor-pointer" onClick={() => handleSort('name')}>Personnel <SortIcon column="name" /></TableHead>
              <TableHead className="text-white font-black text-[11px] uppercase p-4 cursor-pointer" onClick={() => handleSort('post_name')}>Post <SortIcon column="post_name" /></TableHead>
              <TableHead className="text-white font-black text-[11px] uppercase p-4 text-center cursor-pointer" onClick={() => handleSort('bs')}>BPS <SortIcon column="bs" /></TableHead>
              <TableHead className="text-white font-black text-[11px] uppercase p-4 cursor-pointer" onClick={() => handleSort('branch_office')}>Deployment <SortIcon column="branch_office" /></TableHead>
              <TableHead className="text-white font-black text-[11px] uppercase p-4 text-center">Status</TableHead>
              <TableHead className="text-right text-white font-black text-[11px] uppercase p-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-20"><Skeleton className="h-12 w-full opacity-30" /></TableCell></TableRow>
            ) : sortedEmployees.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-32 text-slate-300 font-black uppercase text-[10px] italic">No matching registry records</TableCell></TableRow>
            ) : (
              sortedEmployees.map((e: any, i: number) => (
                <TableRow key={e.id} id={`emp-${e.id}`} className={cn("group hover:bg-slate-50 border-b-slate-50 h-20 transition-all", highlightId === e.id.toString() && "bg-primary/5 animate-pulse")}>
                  <TableCell className="text-center font-black text-slate-300 text-[10px]">{i + 1}</TableCell>
                  <TableCell className="p-4">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-900 text-sm uppercase tracking-tight leading-none">{e.name}</span>
                      <span className="text-[10px] text-slate-400 mt-1 font-bold tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">CNIC: {e.cnic}</span>
                    </div>
                  </TableCell>
                  <TableCell className="p-4 text-xs font-bold text-slate-600 uppercase">{e.post_name}</TableCell>
                  <TableCell className="text-center p-4">
                    <Badge variant="outline" className="font-black text-primary border-primary/20 text-[10px] h-7 px-3">{e.bs}</Badge>
                  </TableCell>
                  <TableCell className="p-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-700 text-[10px] uppercase leading-none">{e.branch_office}</span>
                      <span className="text-[9px] text-slate-400 mt-1 uppercase tracking-tighter italic">{e.region}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center p-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                      e.post_status === 'Filled' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                    )}>{e.post_status}</span>
                  </TableCell>
                  <TableCell className="text-right p-4">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"><Plus className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
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
