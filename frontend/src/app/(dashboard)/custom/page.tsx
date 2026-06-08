'use client';

import { useState } from 'react';
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
  CheckCircle2
} from 'lucide-react';

export default function CustomModulesPage() {
  const queryClient = useQueryClient();
  
  // Tab/Module Selection
  const [activeModule, setActiveModule] = useState<any>(null);
  const [showConfig, setShowModuleConfig] = useState(false);

  // New Module Creation State
  const [newModuleName, setNewModuleName] = useState('');
  const [newModuleCols, setNewModuleCols] = useState<string[]>([]);
  const [currentColInput, setCurrentColInput] = useState('');

  // Data Entry State
  const [empSearch, setEmpSearch] = useState('');
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [customData, setCustomData] = useState<any>({});

  // Queries
  const { data: modules, isLoading: modulesLoading } = useQuery({
    queryKey: ['custom-modules'],
    queryFn: async () => {
      const res = await api.get('/api/custom-modules/');
      return res.data;
    }
  });

  const { data: employees } = useQuery({
    queryKey: ['employees-search-custom', empSearch],
    queryFn: async () => {
      if (!empSearch || empSearch.length < 2) return [];
      const res = await api.get(`/api/employees?search=${empSearch}`);
      return res.data;
    },
    enabled: empSearch.length >= 2
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

  // Mutations
  const createModuleMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/custom-modules/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-modules'] });
      setNewModuleName('');
      setNewModuleCols([]);
      setShowModuleConfig(false);
    }
  });

  const saveDataMutation = useMutation({
    mutationFn: (data: any) => api.post(`/api/custom-modules/${activeModule.id}/data`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-data', activeModule.id] });
      setSelectedEmp(null);
      setCustomData({});
      setEmpSearch('');
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
                    <p className={cn("font-black uppercase text-xs tracking-tight", activeModule?.id === m.id ? "text-primary" : "text-slate-700")}>{m.name}</p>
                    <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{m.columns.length} Defined Segments</p>
                </div>
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-8 w-8 text-rose-300 hover:text-rose-500 transition-all rounded-lg" onClick={(e) => { e.stopPropagation(); if(confirm("Destroy Module?")) deleteModuleMutation.mutate(m.id); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Main Workspace */}
        <div className="xl:col-span-9 space-y-8">
          {showConfig && (
            <Card className="border-none shadow-2xl bg-white rounded-3xl overflow-hidden border-2 border-dashed border-slate-200 animate-in slide-in-from-top-4 duration-500">
               <CardHeader className="bg-slate-50 p-8 border-b border-slate-100">
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center italic text-slate-800">
                    <Settings2 className="h-5 w-5 mr-3 text-primary" /> Registry Blueprint Designer
                  </CardTitle>
               </CardHeader>
               <CardContent className="p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Module Identity</Label>
                        <Input placeholder="E.G., DEGREE VERIFICATION..." className="h-14 bg-slate-50 border-none font-black text-sm rounded-2xl shadow-inner uppercase" value={newModuleName} onChange={(e) => setNewModuleName(e.target.value)} />
                    </div>
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Segment Definition</Label>
                        <div className="flex gap-2">
                           <Input placeholder="COLUMN NAME..." className="h-14 bg-slate-50 border-none font-bold text-xs rounded-2xl shadow-inner uppercase" value={currentColInput} onChange={(e) => setCurrentColInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addColumn()} />
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

                  <Button className="w-full h-16 font-black uppercase text-sm tracking-widest rounded-2xl shadow-2xl bg-slate-900 hover:bg-emerald-600 transition-all shadow-emerald-500/20" disabled={!newModuleName || newModuleCols.length === 0} onClick={() => createModuleMutation.mutate({ name: newModuleName, columns: newModuleCols })}>
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
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <Card className="lg:col-span-4 border-none shadow-2xl bg-white rounded-3xl border border-slate-100">
                  <CardHeader className="bg-slate-900 text-white p-8 rounded-t-3xl">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center italic text-primary">
                        <Plus className="h-4 w-4 mr-3" /> Insert Entry 
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    {/* Emp Search */}
                    <div className="space-y-2">
                      <Label className="text-xs font-black text-slate-400 uppercase">1. Select Employee</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input 
                          placeholder="Search..." 
                          className="pl-10"
                          value={empSearch}
                          onChange={(e) => setEmpSearch(e.target.value)}
                        />
                        {employees && employees.length > 0 && !selectedEmp && (
                          <div className="absolute w-full mt-1 border rounded-md shadow-xl max-h-48 overflow-y-auto bg-white z-50 border-slate-200">
                            {employees.map((e: any) => (
                              <div key={e.id} className="p-3 hover:bg-slate-50 cursor-pointer border-b last:border-0" onClick={() => setSelectedEmp(e)}>
                                <p className="font-bold text-xs uppercase">{e.name}</p>
                                <p className="text-[10px] text-slate-400">{e.post_name}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedEmp && (
                      <div className="bg-primary/5 p-5 rounded-2xl border-2 border-dashed border-primary/20 flex flex-col items-center text-center animate-in zoom-in-95">
                         <Badge className="bg-primary text-white mb-2 font-black text-[9px] h-6 px-3">{selectedEmp.bs}</Badge>
                         <p className="font-black uppercase text-xs text-slate-900">{selectedEmp.name}</p>
                         <p className="text-[8px] font-bold text-slate-500 uppercase mt-1 tracking-widest">{selectedEmp.post_name}</p>
                         <Button variant="ghost" className="h-6 text-[9px] font-black text-rose-500 mt-4 uppercase p-0" onClick={() => setSelectedEmp(null)}>Reset</Button>
                      </div>
                    )}

                    <div className="space-y-4 pt-4 border-t border-slate-50">
                        <Label className="text-xs font-black text-slate-400 uppercase">2. Define Parameters</Label>
                        {activeModule.columns.map((col: string) => (
                          <div key={col} className="space-y-1.5">
                             <Label className="text-[10px] font-bold text-slate-600 ml-1 uppercase">{col}</Label>
                             <Input className="h-11 bg-slate-50 border-none font-bold text-xs uppercase rounded-xl shadow-inner" value={customData[col] || ''} onChange={(e) => setCustomData({...customData, [col]: e.target.value})} />
                          </div>
                        ))}
                    </div>

                    <Button className="w-full h-14 font-black uppercase text-xs tracking-widest rounded-2xl bg-slate-900 hover:bg-primary shadow-xl transition-all" disabled={!selectedEmp} onClick={() => saveDataMutation.mutate({ employee_id: selectedEmp.id, data: customData })}>
                        <Save className="h-4 w-4 mr-2" /> Commit to Registry
                    </Button>
                  </CardContent>
                </Card>

                <div className="lg:col-span-8 space-y-6">
                    <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm flex items-center italic px-2">
                        <History className="h-4 w-4 mr-3 text-primary" /> {activeModule.name} Registry
                    </h3>
                    <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden border border-slate-100">
                        <Table>
                            <TableHeader className="bg-slate-900">
                                <TableRow className="h-14 border-none hover:bg-slate-900">
                                    <TableHead className="font-black text-white text-[9px] uppercase p-4">Identity</TableHead>
                                    {activeModule.columns.map((col: string) => (
                                        <TableHead key={col} className="font-black text-white text-[9px] uppercase p-4 text-center">{col}</TableHead>
                                    ))}
                                    <TableHead className="text-right text-white font-black text-[9px] uppercase p-4">Manage</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dataLoading ? (
                                    <TableRow><TableCell colSpan={activeModule.columns.length + 2} className="text-center py-20"><Skeleton className="h-10 w-full opacity-30" /></TableCell></TableRow>
                                ) : moduleData?.length === 0 ? (
                                    <TableRow><TableCell colSpan={activeModule.columns.length + 2} className="text-center py-20 text-slate-300 font-black uppercase text-[10px] italic">Registry currently empty</TableCell></TableRow>
                                ) : (
                                    moduleData?.map((r: any) => (
                                        <TableRow key={r.id} className="h-16 hover:bg-slate-50/50 border-b-slate-50 transition-colors group">
                                            <TableCell className="p-4">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-900 text-xs uppercase leading-none">{r.employee_name}</span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase mt-1">{r.employee_post}</span>
                                                </div>
                                            </TableCell>
                                            {activeModule.columns.map((col: string) => (
                                                <TableCell key={col} className="p-4 text-center text-[10px] font-bold text-slate-600 uppercase tabular-nums">
                                                    {r.data[col] || "—"}
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-right p-4">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-200 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100" onClick={() => { if(confirm("Purge record?")) deleteRecordMutation.mutate(r.id); }}><Trash2 className="h-4 w-4" /></Button>
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
          )}
        </div>
      </div>
    </div>
  );
}
