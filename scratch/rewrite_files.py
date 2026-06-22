import os

file_content = """'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Trash2, Edit2, FileText, History } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function FileTrackingPage() {
  const [search, setSearch] = useState('');
  const [isAddRegistryOpen, setIsAddRegistryOpen] = useState(false);
  const [editingRegistry, setEditingRegistry] = useState<any>(null);
  const [selectedRegistry, setSelectedRegistry] = useState<any>(null);
  const [isAddTrackingOpen, setIsAddTrackingOpen] = useState(false);
  const [editingTracking, setEditingTracking] = useState<any>(null);

  const [registryForm, setRegistryForm] = useState({ file_name: '', file_number: '', subject: '' });
  const [trackingForm, setTrackingForm] = useState({
    reason: '', put_up: '', put_up_date: new Date().toISOString().split('T')[0],
    mark_branch: '', receiver_name: '', receiving_date: new Date().toISOString().split('T')[0],
    return_date: '', status: 'In Progress'
  });

  const queryClient = useQueryClient();

  const { data: registries, isLoading } = useQuery({
    queryKey: ['file-registries'],
    queryFn: async () => {
      const res = await api.get('/api/files/registry');
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
      return branch.includes("establishment") && !name.includes("vacant") && !postName.includes("naib qasid");
    });
  }, [employees]);

  const allBranches = useMemo(() => {
    if (!employees) return [];
    const hqEmployees = employees.filter((e: any) => e.hq_field === 'HQ');
    const branches = Array.from(new Set(hqEmployees.map((e: any) => e.branch_office).filter(Boolean))) as string[];
    return branches.sort();
  }, [employees]);

  // Registry Mutations
  const createRegMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/files/registry', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['file-registries'] }); setIsAddRegistryOpen(false); }
  });
  const updateRegMutation = useMutation({
    mutationFn: (data: { id: number, updates: any }) => api.put(`/api/files/registry/${data.id}`, data.updates),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['file-registries'] }); setIsAddRegistryOpen(false); }
  });
  const deleteRegMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/files/registry/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['file-registries'] }); setSelectedRegistry(null); }
  });

  // Tracking Mutations
  const createTrackMutation = useMutation({
    mutationFn: (data: any) => api.post(`/api/files/tracking?registry_id=${selectedRegistry.id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['file-registries'] }); setIsAddTrackingOpen(false); }
  });
  const updateTrackMutation = useMutation({
    mutationFn: (data: { id: number, updates: any }) => api.put(`/api/files/tracking/${data.id}`, data.updates),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['file-registries'] }); setIsAddTrackingOpen(false); }
  });

  const handleRegistrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRegistry) updateRegMutation.mutate({ id: editingRegistry.id, updates: registryForm });
    else createRegMutation.mutate(registryForm);
  };

  const handleTrackingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTracking) updateTrackMutation.mutate({ id: editingTracking.id, updates: trackingForm });
    else createTrackMutation.mutate(trackingForm);
  };

  const filteredRegistries = useMemo(() => {
    if (!registries) return [];
    if (!search) return registries;
    const s = search.toLowerCase();
    return registries.filter((r: any) => 
      (r.file_name && r.file_name.toLowerCase().includes(s)) ||
      (r.file_number && r.file_number.toLowerCase().includes(s)) ||
      (r.subject && r.subject.toLowerCase().includes(s))
    );
  }, [registries, search]);

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr.toLowerCase().includes('not match')) return "—";
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const parts = dateStr.split('-');
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <div className="space-y-6 w-full pb-10">
      <div className="flex justify-between items-center px-2">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">File <span className="text-primary">Registry</span></h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.4em] mt-1 opacity-70">Master Registry & Movement Tracking</p>
        </div>
        <Button className="h-12 px-6 font-black uppercase text-xs tracking-widest rounded-xl bg-[#405189]" onClick={() => { setEditingRegistry(null); setRegistryForm({ file_name: '', file_number: '', subject: '' }); setIsAddRegistryOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Registry
        </Button>
      </div>

      <Dialog open={isAddRegistryOpen} onOpenChange={setIsAddRegistryOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle className="font-black uppercase tracking-widest text-slate-700">{editingRegistry ? 'Edit Registry' : 'New Registry'}</DialogTitle></DialogHeader>
          <form onSubmit={handleRegistrySubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">File Name</Label>
              <Input required value={registryForm.file_name} onChange={e => setRegistryForm({...registryForm, file_name: e.target.value})} className="h-10 bg-slate-100 font-bold" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">File Number</Label>
              <Input required value={registryForm.file_number} onChange={e => setRegistryForm({...registryForm, file_number: e.target.value})} className="h-10 bg-slate-100 font-bold" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Subject</Label>
              <Input required value={registryForm.subject} onChange={e => setRegistryForm({...registryForm, subject: e.target.value})} className="h-10 bg-slate-100 font-bold" />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsAddRegistryOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-primary text-white">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden min-h-[600px]">
            <CardHeader className="bg-[#405189] p-5">
              <Input placeholder="SEARCH REGISTRIES..." value={search} onChange={e => setSearch(e.target.value)} className="bg-white/10 border-none text-white font-bold" />
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto max-h-[700px]">
              {filteredRegistries.map((r: any) => (
                <div key={r.id} onClick={() => setSelectedRegistry(r)} className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-all ${selectedRegistry?.id === r.id ? 'bg-slate-100 border-l-4 border-l-primary' : ''}`}>
                  <h3 className="font-black text-sm text-slate-800">{r.file_number}</h3>
                  <p className="text-xs font-bold text-primary mt-1">{r.file_name}</p>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold truncate">{r.subject}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {selectedRegistry ? (
            <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden min-h-[600px]">
              <CardHeader className="bg-slate-50 border-b border-slate-100 p-6 flex flex-row justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">{selectedRegistry.file_name} <span className="text-sm font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded ml-2">{selectedRegistry.file_number}</span></h2>
                  <p className="text-xs font-bold text-slate-500 uppercase mt-2">{selectedRegistry.subject}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setEditingRegistry(selectedRegistry); setRegistryForm({ file_name: selectedRegistry.file_name, file_number: selectedRegistry.file_number, subject: selectedRegistry.subject }); setIsAddRegistryOpen(true); }}><Edit2 className="h-4 w-4 mr-2"/> Edit</Button>
                  <Button className="bg-primary text-white" onClick={() => { setEditingTracking(null); setTrackingForm({ reason: '', put_up: '', put_up_date: new Date().toISOString().split('T')[0], mark_branch: '', receiver_name: '', receiving_date: new Date().toISOString().split('T')[0], return_date: '', status: 'In Progress' }); setIsAddTrackingOpen(true); }}><Plus className="h-4 w-4 mr-2"/> Add Movement</Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-100">
                      <TableHead className="font-black text-xs uppercase p-4">Reason</TableHead>
                      <TableHead className="font-black text-xs uppercase p-4">Put Up By</TableHead>
                      <TableHead className="font-black text-xs uppercase p-4">To Branch</TableHead>
                      <TableHead className="font-black text-xs uppercase p-4 text-center">Status</TableHead>
                      <TableHead className="font-black text-xs uppercase p-4 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedRegistry.trackings && selectedRegistry.trackings.length > 0 ? (
                      selectedRegistry.trackings.sort((a:any,b:any)=>b.id-a.id).map((t: any) => (
                        <TableRow key={t.id} className="hover:bg-slate-50">
                          <TableCell className="p-4">
                            <p className="text-xs font-bold text-slate-800">{t.reason}</p>
                            <p className="text-[10px] text-slate-400 font-semibold">{formatDate(t.receiving_date)}</p>
                          </TableCell>
                          <TableCell className="p-4 text-xs font-bold text-slate-600 uppercase">{t.put_up}</TableCell>
                          <TableCell className="p-4 text-xs font-bold text-slate-600 uppercase">{t.mark_branch}</TableCell>
                          <TableCell className="p-4 text-center">
                            <span className={`text-[10px] px-2 py-1 rounded font-black uppercase ${t.status === 'Closed' ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-700'}`}>{t.status}</span>
                          </TableCell>
                          <TableCell className="p-4 text-right">
                            <Button variant="ghost" size="sm" onClick={() => { setEditingTracking(t); setTrackingForm({ reason: t.reason||'', put_up: t.put_up||'', put_up_date: t.put_up_date||'', mark_branch: t.mark_branch||'', receiver_name: t.receiver_name||'', receiving_date: t.receiving_date||'', return_date: t.return_date||'', status: t.status||'In Progress' }); setIsAddTrackingOpen(true); }}><Edit2 className="h-4 w-4"/></Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-400 font-bold uppercase text-xs">No movements recorded</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[600px] border-2 border-dashed border-slate-200 rounded-3xl">
              <FileText className="h-16 w-16 text-slate-200 mb-4" />
              <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Select a registry to view its history</p>
            </div>
          )}
        </div>
      </div>

      {/* Tracking Dialog */}
      <Dialog open={isAddTrackingOpen} onOpenChange={setIsAddTrackingOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader><DialogTitle className="font-black uppercase tracking-widest text-slate-700">{editingTracking ? 'Edit Movement' : 'Record Movement'}</DialogTitle></DialogHeader>
          <form onSubmit={handleTrackingSubmit} className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Reason / Case</Label><Input required value={trackingForm.reason} onChange={e => setTrackingForm({...trackingForm, reason: e.target.value})} className="h-10 bg-slate-100 font-bold text-xs" /></div>
            <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Put Up By</Label><select required value={trackingForm.put_up} onChange={e => setTrackingForm({...trackingForm, put_up: e.target.value})} className="w-full h-10 bg-slate-100 rounded-md font-bold text-xs uppercase px-3"><option value="">-- SELECT OFFICIAL --</option>{establishmentOfficials.map((o: any) => (<option key={o.id} value={o.name}>{o.name}</option>))}</select></div>
            <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Put Up Date</Label><Input required type="date" value={trackingForm.put_up_date} onChange={e => setTrackingForm({...trackingForm, put_up_date: e.target.value})} className="h-10 bg-slate-100 font-bold text-xs" /></div>
            <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Mark Branch (To)</Label><select required value={trackingForm.mark_branch} onChange={e => setTrackingForm({...trackingForm, mark_branch: e.target.value})} className="w-full h-10 bg-slate-100 rounded-md font-bold text-xs uppercase px-3"><option value="">-- SELECT BRANCH --</option>{allBranches.map((b: any) => (<option key={b} value={b}>{b}</option>))}</select></div>
            <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Receiver Name</Label><Input required value={trackingForm.receiver_name} onChange={e => setTrackingForm({...trackingForm, receiver_name: e.target.value})} className="h-10 bg-slate-100 font-bold text-xs" /></div>
            <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Receiving Date</Label><Input required type="date" value={trackingForm.receiving_date} onChange={e => setTrackingForm({...trackingForm, receiving_date: e.target.value})} className="h-10 bg-slate-100 font-bold text-xs" /></div>
            <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Return Date</Label><Input type="date" value={trackingForm.return_date} onChange={e => setTrackingForm({...trackingForm, return_date: e.target.value})} className="h-10 bg-slate-100 font-bold text-xs" /></div>
            <div className="col-span-2 space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Status</Label><select value={trackingForm.status} onChange={e => setTrackingForm({...trackingForm, status: e.target.value})} className="w-full h-10 bg-slate-100 rounded-md font-bold text-xs uppercase px-3"><option value="In Progress">In Progress</option><option value="Completed">Completed</option><option value="Returned">Returned</option><option value="Closed">Closed</option></select></div>
            <DialogFooter className="col-span-2 pt-4 border-t border-slate-200/60"><Button type="button" variant="ghost" onClick={() => setIsAddTrackingOpen(false)}>Cancel</Button><Button type="submit" className="bg-primary text-white">Save</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
"""

with open("d:\\HRMS Pro\\frontend\\src\\app\\(dashboard)\\files\\page.tsx", "w", encoding="utf-8") as f:
    f.write(file_content)

print("Overwritten files/page.tsx with utf-8 encoding")
