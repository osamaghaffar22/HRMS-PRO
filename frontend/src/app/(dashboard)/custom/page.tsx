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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { 
  Search, 
  Plus, 
  Trash2, 
  Save, 
  Layout, 
  Settings2, 
  User, 
  X,
  History,
  CheckCircle2,
  ChevronDown,
  Filter,
  RotateCcw,
  Edit2,
  Download,
  Printer,
  FileText,
  ArrowLeft
} from 'lucide-react';
import { MultiSelect } from '@/components/ui/multi-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const columnGroups = [
  {
    id: 'personal',
    title: 'Personal Details',
    columns: [
      { id: 'name', label: 'Name' },
      { id: 'father_name', label: 'Father Name' },
      { id: 'dob', label: 'Date of Birth' },
      { id: 'cnic', label: 'CNIC' },
      { id: 'gender', label: 'Gender' },
      { id: 'religion', label: 'Religion' },
      { id: 'marital_status', label: 'Marital Status' },
      { id: 'blood_group', label: 'Blood Group' },
      { id: 'domicile', label: 'Domicile' },
      { id: 'home_province', label: 'Home Province' },
      { id: 'home_district', label: 'Home District' },
      { id: 'rural_urban', label: 'Rural/Urban' },
      { id: 'nationality', label: 'Nationality' },
      { id: 'dual_nationality', label: 'Dual Nationality' },
      { id: 'passport_noc', label: 'Passport NOC' },
      { id: 'disability', label: 'Disability' },
      { id: 'email', label: 'Email' },
      { id: 'mobile_no', label: 'Mobile No' },
      { id: 'temp_address', label: 'Temp Address' },
      { id: 'perm_address', label: 'Perm Address' },
      { id: 'total_age', label: 'Total Age' },
      { id: 'youth_adult', label: 'Youth/Adult' }
    ]
  },
  {
    id: 'official',
    title: 'Official Details',
    columns: [
      { id: 'personal_file_no', label: 'Personal File No' },
      { id: 'employee_no', label: 'Employee No' },
      { id: 's_no', label: 'S.No' },
      { id: 'code', label: 'Code' },
      { id: 'seniority_no', label: 'Seniority No' },
      { id: 'officer_official', label: 'Officer/Official' },
      { id: 'hq_field', label: 'HQ/Field' },
      { id: 'head_office', label: 'Head Office' },
      { id: 'wing_division', label: 'Wing/Division' },
      { id: 'section_district', label: 'Section/District' },
      { id: 'branch_office', label: 'Branch/Office' },
      { id: 'place_of_posting', label: 'Place of Posting' },
      { id: 'bs', label: 'BPS / Grade' },
      { id: 'post_name', label: 'Post Name / Designation' },
      { id: 'post_status', label: 'Post Status' },
      { id: 'cadre_type', label: 'Cadre Type' },
      { id: 'job_type', label: 'Job Type' }
    ]
  },
  {
    id: 'qualification',
    title: 'Qualification & Experience',
    columns: [
      { id: 'qualification', label: 'Qualification' },
      { id: 'area_expertise', label: 'Area of Expertise' }
    ]
  },
  {
    id: 'service',
    title: 'Service History',
    columns: [
      { id: 'direct_promotion', label: 'Direct/Promotion' },
      { id: 'entry_govt', label: 'Entry in Govt' },
      { id: 'joining_date', label: 'Joining Date' },
      { id: 'joining_present_post', label: 'Joining Present Post' },
      { id: 'total_service', label: 'Total Service' },
      { id: 'tenure_current_station', label: 'Tenure (Current Station)' },
      { id: 'tenure_current_scale', label: 'Tenure (Current Scale)' },
      { id: 'probation_status', label: 'Probation Status' },
      { id: 'probation_till_date', label: 'Probation Till Date' }
    ]
  }
];

const availableColumns = columnGroups.flatMap(g => g.columns);

export default function CustomModulesPage() {
  const queryClient = useQueryClient();
  
  // Tab/Module Selection
  const [activeModule, setActiveModule] = useState<any>(null);
  const [showConfig, setShowModuleConfig] = useState(false);

  // New Module Creation State
  const [newModuleName, setNewModuleName] = useState('');
  const [selectedBaseColsLabels, setSelectedBaseColsLabels] = useState<string[]>([]);
  const [newModuleCols, setNewModuleCols] = useState<string[]>([]);
  const [currentColInput, setCurrentColInput] = useState('');

  // Registry List Filters
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});

  // Data Entry State
  const [editingEmp, setEditingEmp] = useState<any>(null);
  const [editingData, setEditingData] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Queries
  const { data: modules, isLoading: modulesLoading } = useQuery({
    queryKey: ['custom-modules'],
    queryFn: async () => {
      const res = await api.get('/api/custom-modules/');
      return res.data;
    }
  });

  const { data: allEmployees, isLoading: allEmpLoading } = useQuery({
    queryKey: ['employees-all-custom'],
    queryFn: async () => {
      const res = await api.get('/api/employees');
      return res.data;
    },
    enabled: !!activeModule
  });

  const { data: moduleData, isLoading: dataLoading } = useQuery({
    queryKey: ['custom-data', activeModule?.id],
    queryFn: async () => {
      if (!activeModule) return [];
      const res = await api.get(`/api/custom-modules/${activeModule.id}/data`);
      return res.data;
    },
    enabled: !!activeModule
  });

  const mergedData = useMemo(() => {
    if (!allEmployees || !activeModule) return [];
    
    const customDataMap: Record<number, any> = {};
    if (moduleData) {
      moduleData.forEach((d: any) => {
         customDataMap[d.employee_id] = d.data || {};
      });
    }

    let result = allEmployees.map((emp: any) => ({
      ...emp,
      customData: customDataMap[emp.id] || {}
    }));

    Object.entries(activeFilters).forEach(([key, values]) => {
      if (values.length > 0) {
        result = result.filter((emp: any) => {
          const isCustom = activeModule.columns?.custom?.includes(key);
          const val = isCustom ? emp.customData[key] : emp[key];
          return values.includes(String(val || ''));
        });
      }
    });

    if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        result = result.filter((emp: any) => 
            emp.name?.toLowerCase().includes(lowerSearch) || 
            emp.post_name?.toLowerCase().includes(lowerSearch)
        );
    }

    return result;
  }, [allEmployees, moduleData, activeFilters, activeModule, searchTerm]);

  const handleFilterChange = (id: string, values: string[]) => {
    setActiveFilters(prev => ({ ...prev, [id]: values }));
  };

  const getUniqueOptions = (colId: string, isCustom: boolean): string[] => {
    if (!allEmployees || !activeModule) return [];
    
    const customDataMap: Record<number, any> = {};
    if (moduleData) {
      moduleData.forEach((d: any) => { customDataMap[d.employee_id] = d.data || {}; });
    }

    const values = allEmployees.map((emp: any) => {
        const val = isCustom ? customDataMap[emp.id]?.[colId] : emp[colId];
        return String(val || '');
    }).filter(Boolean);
    return Array.from(new Set(values)).sort() as string[];
  };

  const getLabel = (id: string) => availableColumns.find(c => c.id === id)?.label || id;

  const exportData = (type: 'excel' | 'pdf' | 'print') => {
      if (type === 'print') { window.print(); return; }
      
      const cols = [
          ...(activeModule?.columns?.base || []).map((c: string) => ({ id: c, label: getLabel(c), isCustom: false })),
          ...(activeModule?.columns?.custom || []).map((c: string) => ({ id: c, label: c, isCustom: true }))
      ];

      if (type === 'excel') {
          const wsData = mergedData.map((emp: any) => {
              const row: any = {};
              cols.forEach(c => {
                  row[c.label] = c.isCustom ? emp.customData[c.id] : emp[c.id];
              });
              return row;
          });
          const ws = XLSX.utils.json_to_sheet(wsData);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Registry");
          XLSX.writeFile(wb, `${activeModule.title}_Registry.xlsx`);
      } else if (type === 'pdf') {
          const doc = new jsPDF('landscape');
          doc.text(`${activeModule.title} Registry`, 14, 15);
          const head = [['#', ...cols.map(c => c.label)]];
          const body = mergedData.map((emp: any, idx: number) => [
              idx + 1,
              ...cols.map(c => c.isCustom ? emp.customData[c.id] : emp[c.id])
          ]);
          autoTable(doc, { startY: 20, head, body, styles: { fontSize: 8 } });
          doc.save(`${activeModule.title}_Registry.pdf`);
      }
  };

  // Mutations
  const createModuleMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/custom-modules/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-modules'] });
      setNewModuleName('');
      setNewModuleCols([]);
      setSelectedBaseColsLabels([]);
      setShowModuleConfig(false);
    }
  });

  const saveDataMutation = useMutation({
    mutationFn: (data: any) => api.post(`/api/custom-modules/${activeModule.id}/data`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-data', activeModule.id] });
    }
  });

  const deleteRecordMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/custom-modules/data/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custom-data', activeModule?.id] })
  });

  const deleteModuleMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/custom-modules/${id}`),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['custom-modules'] });
        setActiveModule(null);
    }
  });

  // Helpers
  const addColumn = () => {
    if (currentColInput.trim()) {
      setNewModuleCols([...newModuleCols, currentColInput.trim()]);
      setCurrentColInput('');
    }
  };

  const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

  return (
    <div className="space-y-6 w-full pb-10">
      <div className="flex justify-between items-center px-2">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">Engineered <span className="text-primary">Modules</span></h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.4em] mt-1 opacity-70">Dynamic Registry Generation System</p>
        </div>
        <Button 
            className="h-12 px-6 font-black uppercase text-xs tracking-widest rounded-xl shadow-2xl bg-slate-900 hover:bg-primary transition-all group"
            onClick={() => setShowModuleConfig(!showConfig)}
        >
          {showConfig ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4 group-hover:rotate-90 transition-transform" />}
          {showConfig ? 'Close Designer' : 'Engine New Module'}
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Navigation Sidebar */}
        {!activeModule && (
        <Card className="xl:col-span-3 border-none shadow-2xl bg-white rounded-3xl overflow-hidden border border-slate-100 min-h-[400px]">
          <CardHeader className="bg-slate-900 text-white p-6">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center italic">
              <Layout className="h-4 w-4 mr-3 text-primary" /> Active Deployments
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2 mt-4">
            {modulesLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : modules?.map((m: any) => (
              <div 
                key={m.id} 
                className={cn(
                  "p-5 rounded-2xl cursor-pointer transition-all flex justify-between items-center group border-2",
                  activeModule?.id === m.id 
                    ? "bg-primary/5 border-primary shadow-lg" 
                    : "bg-white border-transparent hover:border-slate-100 hover:bg-slate-50"
                )}
                onClick={() => setActiveModule(m)}
              >
                <div>
                    <p className={cn("font-black uppercase text-xs tracking-tight", activeModule?.id === m.id ? "text-primary" : "text-slate-700")}>{m.title}</p>
                    <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                        {m.columns?.base?.length || 0} Base | {m.columns?.custom?.length || 0} Custom Segments
                    </p>
                </div>
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-8 w-8 text-rose-300 hover:text-rose-500 transition-all rounded-lg" onClick={(e) => { e.stopPropagation(); if(confirm("Destroy Module?")) deleteModuleMutation.mutate(m.id); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </CardContent>
        </Card>
        )}

        {/* Main Workspace */}
        <div className={activeModule ? "xl:col-span-12 space-y-8" : "xl:col-span-9 space-y-8"}>
          {showConfig && (
            <Card className="border-none shadow-2xl bg-white rounded-3xl overflow-hidden border-2 border-dashed border-slate-200 animate-in slide-in-from-top-4 duration-500">
               <CardHeader className="bg-slate-50 p-8 border-b border-slate-100">
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center italic text-slate-800">
                    <Settings2 className="h-5 w-5 mr-3 text-primary" /> Registry Blueprint Designer
                  </CardTitle>
               </CardHeader>
               <CardContent className="p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">1. Module Title</Label>
                        <Input placeholder="E.G., DEGREE VERIFICATION..." className="h-14 bg-slate-50 border-none font-black text-sm rounded-2xl shadow-inner uppercase" value={newModuleName} onChange={(e) => setNewModuleName(e.target.value)} />
                    </div>
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">2. Base Database Columns</Label>
                        <MultiSelect 
                          options={availableColumns.map(c => c.label)}
                          selected={selectedBaseColsLabels}
                          onChange={setSelectedBaseColsLabels}
                          placeholder="Select employee fields..."
                          label="Base Columns"
                        />
                    </div>
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">3. Custom Data Columns</Label>
                        <div className="flex gap-2">
                           <Input placeholder="E.G., STATUS..." className="h-14 bg-slate-50 border-none font-bold text-xs rounded-2xl shadow-inner uppercase" value={currentColInput} onChange={(e) => setCurrentColInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addColumn()} />
                           <Button className="h-14 w-14 bg-slate-900 rounded-2xl shadow-xl hover:bg-primary transition-all" onClick={addColumn}><Plus className="h-5 w-5" /></Button>
                        </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 min-h-[60px] p-6 bg-slate-50/50 rounded-2xl border-2 border-dotted border-slate-100">
                     {newModuleCols.length === 0 && <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest m-auto">No columns defined yet</span>}
                     {newModuleCols.map((col, i) => (
                       <Badge key={i} className="bg-white border-2 border-slate-200 text-slate-700 h-10 px-4 rounded-xl font-black text-[10px] uppercase gap-2">
                         {col} <X className="h-3 w-3 text-rose-400 cursor-pointer hover:text-rose-600" onClick={() => setNewModuleCols(newModuleCols.filter((_, idx) => idx !== i))} />
                       </Badge>
                     ))}
                  </div>

                  <Button 
                    className="w-full h-16 font-black uppercase text-sm tracking-widest rounded-2xl shadow-2xl bg-slate-900 hover:bg-emerald-600 transition-all shadow-emerald-500/20" 
                    disabled={!newModuleName} 
                    onClick={() => {
                        const baseIds = availableColumns.filter(c => selectedBaseColsLabels.includes(c.label)).map(c => c.id);
                        createModuleMutation.mutate({ 
                            title: newModuleName, 
                            columns: {
                                base: baseIds,
                                custom: newModuleCols
                            } 
                        });
                    }}
                  >
                     Construct & Deploy Module
                  </Button>
               </CardContent>
            </Card>
          )}

          {!activeModule && !showConfig && (
            <div className="py-40 text-center flex flex-col items-center justify-center opacity-20 group">
               <Layout className="h-24 w-24 mb-6 group-hover:scale-110 transition-transform duration-700" />
               <p className="font-black text-2xl uppercase tracking-[0.5em]">System Idle</p>
               <p className="text-xs font-bold uppercase mt-2">Select a deployment or construct a new registry</p>
            </div>
          )}

          {activeModule && !showConfig && (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
              <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden border border-slate-100 print:shadow-none print:border-none print:rounded-none">
                <CardHeader className="bg-slate-900 text-white p-6 flex flex-col md:flex-row items-center justify-between rounded-t-3xl gap-4 print:hidden">
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="hover:bg-slate-800 text-white rounded-full" onClick={() => setActiveModule(null)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center italic text-primary">
                            <History className="h-5 w-5 mr-3" /> {activeModule.title} Registry
                        </CardTitle>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                            Total Records: {mergedData.length}
                        </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input placeholder="Search by name..." className="pl-9 bg-slate-800 border-none text-white placeholder:text-slate-500 h-9 rounded-xl text-xs uppercase" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <Button variant="ghost" size="icon" className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10" onClick={() => exportData('excel')}><Download className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10" onClick={() => exportData('pdf')}><FileText className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10" onClick={() => exportData('print')}><Printer className="h-4 w-4" /></Button>
                    <Button variant="ghost" className="text-rose-400 hover:text-rose-500 hover:bg-rose-500/10 h-9" onClick={() => {setActiveFilters({}); setSearchTerm('');}}>
                        <RotateCcw className="h-4 w-4 mr-2" /> Clear
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6 print:p-0">
                    {/* Filters Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 print:hidden">
                        {['officer_official', 'hq_field', 'post_status'].map(col => (
                            <div key={`builtin-${col}`} className="space-y-1.5">
                                <Label className="text-[9px] font-bold text-amber-600 uppercase">{getLabel(col)}</Label>
                                <MultiSelect 
                                    options={getUniqueOptions(col, false)}
                                    selected={activeFilters[col] || []}
                                    onChange={(vals) => handleFilterChange(col, vals)}
                                    placeholder={`Filter ${getLabel(col)}...`}
                                    label={getLabel(col)}
                                />
                            </div>
                        ))}
                        {(activeModule.columns?.base || []).filter((c: string) => !['officer_official', 'hq_field', 'post_status'].includes(c)).map((col: string) => (
                            <div key={col} className="space-y-1.5">
                                <Label className="text-[9px] font-bold text-slate-500 uppercase">{getLabel(col)}</Label>
                                <MultiSelect 
                                    options={getUniqueOptions(col, false)}
                                    selected={activeFilters[col] || []}
                                    onChange={(vals) => handleFilterChange(col, vals)}
                                    placeholder={`Filter ${getLabel(col)}...`}
                                    label={getLabel(col)}
                                />
                            </div>
                        ))}
                        {(activeModule.columns?.custom || []).map((col: string) => (
                            <div key={col} className="space-y-1.5">
                                <Label className="text-[9px] font-bold text-primary uppercase">{col}</Label>
                                <MultiSelect 
                                    options={getUniqueOptions(col, true)}
                                    selected={activeFilters[col] || []}
                                    onChange={(vals) => handleFilterChange(col, vals)}
                                    placeholder={`Filter ${col}...`}
                                    label={col}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Table */}
                    <div className="rounded-xl border border-slate-200 overflow-x-auto max-h-[600px] custom-scrollbar print:max-h-none print:border-none print:overflow-visible">
                        <Table>
                            <TableHeader className="bg-slate-50 sticky top-0 z-20 print:static">
                                <TableRow className="h-12 border-none">
                                    {(activeModule.columns?.base || []).map((col: string) => (
                                        <TableHead key={col} className="font-black text-slate-700 text-[10px] uppercase p-4 text-center whitespace-nowrap">{getLabel(col)}</TableHead>
                                    ))}
                                    {(activeModule.columns?.custom || []).map((col: string) => (
                                        <TableHead key={col} className="font-black text-primary text-[10px] uppercase p-4 text-center whitespace-nowrap bg-primary/5">{col}</TableHead>
                                    ))}
                                    <TableHead className="text-right text-slate-700 font-black text-[10px] uppercase p-4 whitespace-nowrap sticky right-0 bg-slate-50 z-30 print:hidden">Manage</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {allEmpLoading || dataLoading ? (
                                    <TableRow><TableCell colSpan={99} className="text-center py-20"><Skeleton className="h-10 w-full max-w-md mx-auto opacity-30" /></TableCell></TableRow>
                                ) : mergedData.length === 0 ? (
                                    <TableRow><TableCell colSpan={99} className="text-center py-20 text-slate-300 font-black uppercase text-[10px] italic">No records found</TableCell></TableRow>
                                ) : (
                                    mergedData.map((emp: any) => (
                                        <TableRow key={emp.id} className="h-14 hover:bg-slate-50/50 transition-colors group">
                                            {(activeModule.columns?.base || []).map((col: string) => (
                                                <TableCell key={col} className="p-4 text-center text-[10px] font-bold text-slate-600 uppercase tabular-nums whitespace-nowrap">
                                                    {emp[col] || "—"}
                                                </TableCell>
                                            ))}
                                            {(activeModule.columns?.custom || []).map((col: string) => (
                                                <TableCell key={col} className="p-4 text-center text-[10px] font-black text-primary uppercase tabular-nums whitespace-nowrap bg-primary/[0.02]">
                                                    {emp.customData[col] || "—"}
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-right p-4 whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 z-10 border-l border-slate-100 print:hidden">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-8 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary hover:text-white transition-all"
                                                    onClick={() => {
                                                        setEditingEmp(emp);
                                                        setEditingData(emp.customData || {});
                                                    }}
                                                >
                                                    <Edit2 className="h-3 w-3 mr-2" /> Edit
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!editingEmp} onOpenChange={(open) => !open && setEditingEmp(null)}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl border-none shadow-2xl">
          <DialogHeader className="bg-slate-900 p-6 -m-6 mb-6 rounded-t-3xl">
            <DialogTitle className="text-white font-black uppercase tracking-widest text-sm flex items-center">
              <Edit2 className="h-4 w-4 mr-3 text-primary" /> Edit Custom Data
            </DialogTitle>
            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">
                {editingEmp?.name} - {editingEmp?.post_name}
            </p>
          </DialogHeader>
          <div className="space-y-4 px-2">
            {(activeModule?.columns?.custom || []).map((col: string) => (
                <div key={col} className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{col}</Label>
                    <Input 
                        className="h-12 bg-slate-50 border-none font-bold text-xs uppercase rounded-xl shadow-inner" 
                        value={editingData[col] || ''} 
                        onChange={(e) => setEditingData({...editingData, [col]: e.target.value})} 
                    />
                </div>
            ))}
          </div>
          <DialogFooter className="mt-8 px-2 pb-2">
            <Button variant="ghost" onClick={() => setEditingEmp(null)} className="h-12 uppercase text-xs font-black tracking-widest text-slate-500">Cancel</Button>
            <Button 
                className="h-12 px-8 uppercase text-xs font-black tracking-widest rounded-xl bg-slate-900 hover:bg-primary shadow-xl"
                onClick={() => {
                    saveDataMutation.mutate({ employee_id: editingEmp.id, data: editingData });
                    setEditingEmp(null);
                }}
            >
                <Save className="h-4 w-4 mr-2" /> Save Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
