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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  ShieldCheck, 
  User, 
  X, 
  Lock, 
  Settings, 
  Key,
  Check,
  AlertTriangle
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';

const availableSections = [
  { id: 'employees', label: 'Employees Section' },
  { id: 'employees_form', label: 'Employees (Add/Edit Form)' },
  { id: 'transfers', label: 'Transfer Posting' },
  { id: 'acr', label: 'ACR Management' },
  { id: 'rationalization', label: 'Rationalization Section' },
  { id: 'leaves', label: 'Leave Management' },
  { id: 'files', label: 'File Tracking' },
  { id: 'reports', label: 'Reports Generation' },
  { id: 'custom', label: 'Custom Modules' },
  { id: 'data_exchange', label: 'Data Exchange (Import/Export)' },
];

export default function AdminPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  
  // Dialog Open States
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  
  // Create User Form State
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('Official');
  const [newPermissions, setNewPermissions] = useState<Record<string, boolean>>({
    employees: false,
    employees_form: false,
    transfers: false,
    acr: false,
    rationalization: false,
    leaves: false,
    files: false,
    reports: false,
    custom: false,
    data_exchange: false,
  });

  // Edit User Form State
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState(''); // Empty means don't change
  const [editRole, setEditRole] = useState('Official');
  const [editPermissions, setEditPermissions] = useState<Record<string, boolean>>({});
  const [editIsActive, setEditIsActive] = useState(true);

  // Queries
  const { data: users, isLoading } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const res = await api.get('/api/users/');
      return res.data;
    }
  });

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/users/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      // Reset form
      setNewName('');
      setNewUsername('');
      setNewPassword('');
      setNewRole('Official');
      setNewPermissions({
        employees: false,
        employees_form: false,
        transfers: false,
        acr: false,
        rationalization: false,
        leaves: false,
        files: false,
        reports: false,
        custom: false,
        data_exchange: false,
      });
      setShowCreateDialog(false);
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || "Failed to create user");
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.put(`/api/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      setEditingUser(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || "Failed to update user");
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || "Failed to delete user");
    }
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newUsername || !newPassword) {
      alert("Please fill all required fields");
      return;
    }
    createUserMutation.mutate({
      username: newUsername,
      password: newPassword,
      full_name: newName,
      role: newRole,
      permissions: newRole === 'Admin' ? null : newPermissions
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName || !editUsername) {
      alert("Please fill all required fields");
      return;
    }
    
    const updateData: any = {
      full_name: editName,
      username: editUsername,
      role: editRole,
      permissions: editRole === 'Admin' ? null : editPermissions,
      is_active: editIsActive
    };
    if (editPassword) {
      updateData.password = editPassword;
    }

    updateUserMutation.mutate({
      id: editingUser.id,
      data: updateData
    });
  };

  const startEdit = (user: any) => {
    setEditingUser(user);
    setEditName(user.full_name || '');
    setEditUsername(user.username || '');
    setEditPassword('');
    setEditRole(user.role || 'Official');
    setEditIsActive(user.is_active !== false);
    
    const perms: Record<string, boolean> = {};
    availableSections.forEach(s => {
      perms[s.id] = !!user.permissions?.[s.id];
    });
    setEditPermissions(perms);
  };

  const toggleNewPermission = (id: string) => {
    setNewPermissions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleEditPermission = (id: string) => {
    setEditPermissions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6 w-full pb-10">
      <div className="flex justify-between items-center px-2">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">User <span className="text-primary">Management</span></h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.4em] mt-1 opacity-70">Define access rights for officials</p>
        </div>
        <Button 
          className="h-12 px-6 font-black uppercase text-xs tracking-widest rounded-xl shadow-2xl bg-[#405189] hover:bg-primary transition-all group"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="mr-2 h-4 w-4 group-hover:rotate-90 transition-transform" />
          Create Official ID
        </Button>
      </div>

      <Card className="border-none shadow-2xl bg-white rounded-3xl overflow-hidden border border-slate-100 min-h-[400px]">
        <CardHeader className="bg-[#405189] text-white p-6">
          <CardTitle className="text-lg font-black uppercase text-white tracking-[0.2em] flex items-center italic">
            <ShieldCheck className="h-5 w-5 mr-3 text-white" /> Active Personnel Credentials
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#405189]">
                  <TableRow className="h-12 border-none">
                    <TableHead className="font-black text-white text-[11px] uppercase p-4">Full Name</TableHead>
                    <TableHead className="font-black text-white text-[11px] uppercase p-4 text-center">Username</TableHead>
                    <TableHead className="font-black text-white text-[11px] uppercase p-4 text-center">Role</TableHead>
                    <TableHead className="font-black text-white text-[11px] uppercase p-4 text-center">Status</TableHead>
                    <TableHead className="font-black text-white text-[11px] uppercase p-4">Permitted Modules / Sections</TableHead>
                    <TableHead className="text-right text-white font-black text-[11px] uppercase p-4 whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((u: any) => (
                    <TableRow key={u.id} className="h-16 hover:bg-slate-50/50 transition-colors group">
                      <TableCell className="p-4 font-bold text-slate-700 text-xs">{u.full_name}</TableCell>
                      <TableCell className="p-4 text-center font-black text-slate-600 text-[11px] uppercase tracking-wide">{u.username}</TableCell>
                      <TableCell className="p-4 text-center">
                        <Badge className={u.role === 'Admin' ? 'bg-primary text-white font-black' : 'bg-slate-100 text-slate-700 font-bold border'}>
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="p-4 text-center">
                        <Badge className={u.is_active !== false ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'}>
                          {u.is_active !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="p-4">
                        {u.role === 'Admin' ? (
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">ALL SECTIONS (SUPER ADMIN)</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-w-md">
                            {availableSections.filter(s => u.permissions?.[s.id]).map(s => (
                              <Badge key={s.id} variant="secondary" className="text-[9px] font-black uppercase text-slate-600 bg-slate-100" title={s.label}>
                                {s.label.split(' ')[0]}
                              </Badge>
                            ))}
                            {Object.values(u.permissions || {}).filter(Boolean).length === 0 && (
                              <span className="text-[10px] font-bold text-slate-400 italic">No Access Rights</span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right p-4 whitespace-nowrap">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 transition-all"
                            onClick={() => startEdit(u)}
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>
                          {u.username !== 'admin' && u.id !== currentUser?.id && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50"
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete user ${u.full_name}?`)) {
                                  deleteUserMutation.mutate(u.id);
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CREATE USER DIALOG */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg bg-white rounded-3xl border-none shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader className="bg-[#405189] p-6 -m-6 mb-6 rounded-t-3xl text-white">
            <DialogTitle className="font-black uppercase tracking-widest text-sm flex items-center">
              <User className="h-5 w-5 mr-3 text-primary" /> Create Official Account
            </DialogTitle>
            <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-widest">
              Set credentials and specific module privileges
            </p>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-6 px-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Full Name *</Label>
                <Input className="border-slate-200/50 h-12 bg-slate-50 border-none font-bold text-xs rounded-xl shadow-inner uppercase" value={newName} onChange={e => setNewName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Username *</Label>
                <Input className="border-slate-200/50 h-12 bg-slate-50 border-none font-bold text-xs rounded-xl shadow-inner" value={newUsername} onChange={e => setNewUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))} required />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Password *</Label>
                <Input type="password" className="border-slate-200/50 h-12 bg-slate-50 border-none font-bold text-xs rounded-xl shadow-inner" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">System Role *</Label>
                <select 
                  className="w-full h-12 px-3 bg-slate-50 border-none font-bold text-xs rounded-xl shadow-inner outline-none"
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                >
                  <option value="Official">Official (Viewer/Editor)</option>
                  <option value="Admin">System Admin (Full Access)</option>
                </select>
              </div>
            </div>

            {newRole === 'Official' && (
              <div className="space-y-3 pt-2">
                <Label className="text-[10px] font-black text-primary uppercase tracking-widest">Assign Section Access Permissions</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  {availableSections.map(s => (
                    <div 
                      key={s.id} 
                      className="flex items-center space-x-3 cursor-pointer group bg-white hover:bg-slate-100/50 p-2.5 rounded-xl transition-all border"
                      onClick={() => toggleNewPermission(s.id)}
                    >
                      <div className={`h-5 w-5 rounded-md border flex items-center justify-center transition-all ${newPermissions[s.id] ? 'bg-primary border-primary' : 'border-slate-300'}`}>
                        {newPermissions[s.id] && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span className="text-[10px] font-black uppercase text-slate-700 group-hover:text-primary transition-colors">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="mt-8 pt-4 border-t gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowCreateDialog(false)} className="h-12 uppercase text-[10px] font-black tracking-widest text-slate-500">Cancel</Button>
              <Button type="submit" className="h-12 px-8 uppercase text-[10px] font-black tracking-widest rounded-xl bg-[#405189] hover:bg-primary shadow-xl">
                Create Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT USER DIALOG */}
      <Dialog open={!!editingUser} onOpenChange={open => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-lg bg-white rounded-3xl border-none shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader className="bg-[#405189] p-6 -m-6 mb-6 rounded-t-3xl text-white">
            <DialogTitle className="font-black uppercase tracking-widest text-sm flex items-center">
              <Edit2 className="h-5 w-5 mr-3 text-primary" /> Modify Personnel Credentials
            </DialogTitle>
            <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-widest">
              Modify account attributes and toggle section access rights
            </p>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-6 px-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Full Name *</Label>
                <Input className="border-slate-200/50 h-12 bg-slate-50 border-none font-bold text-xs rounded-xl shadow-inner uppercase" value={editName} onChange={e => setEditName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Username *</Label>
                <Input className="border-slate-200/50 h-12 bg-slate-50 border-none font-bold text-xs rounded-xl shadow-inner" value={editUsername} onChange={e => setEditUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))} required disabled={editingUser?.username === 'admin'} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">New Password</Label>
                  <span className="text-[8px] font-bold text-amber-500 uppercase tracking-tight">Leave blank to keep same</span>
                </div>
                <Input type="password" placeholder="••••••••" className="border-slate-200/50 h-12 bg-slate-50 border-none font-bold text-xs rounded-xl shadow-inner" value={editPassword} onChange={e => setEditPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">System Role *</Label>
                <select 
                  className="w-full h-12 px-3 bg-slate-50 border-none font-bold text-xs rounded-xl shadow-inner outline-none"
                  value={editRole}
                  onChange={e => setEditRole(e.target.value)}
                  disabled={editingUser?.username === 'admin'}
                >
                  <option value="Official">Official (Viewer/Editor)</option>
                  <option value="Admin">System Admin (Full Access)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-3 bg-slate-50 p-4 rounded-xl">
              <input 
                type="checkbox" 
                id="editIsActive" 
                checked={editIsActive} 
                onChange={e => setEditIsActive(e.target.checked)} 
                disabled={editingUser?.username === 'admin' || editingUser?.id === currentUser?.id}
                className="h-4.5 w-4.5 accent-primary cursor-pointer"
              />
              <Label htmlFor="editIsActive" className="text-[10px] font-black uppercase text-slate-700 cursor-pointer">Account Status (Active / Allowed Login)</Label>
            </div>

            {editRole === 'Official' && (
              <div className="space-y-3 pt-2">
                <Label className="text-[10px] font-black text-primary uppercase tracking-widest">Assign Section Access Permissions</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  {availableSections.map(s => (
                    <div 
                      key={s.id} 
                      className="flex items-center space-x-3 cursor-pointer group bg-white hover:bg-slate-100/50 p-2.5 rounded-xl transition-all border"
                      onClick={() => toggleEditPermission(s.id)}
                    >
                      <div className={`h-5 w-5 rounded-md border flex items-center justify-center transition-all ${editPermissions[s.id] ? 'bg-primary border-primary' : 'border-slate-300'}`}>
                        {editPermissions[s.id] && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span className="text-[10px] font-black uppercase text-slate-700 group-hover:text-primary transition-colors">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="mt-8 pt-4 border-t gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditingUser(null)} className="h-12 uppercase text-[10px] font-black tracking-widest text-slate-500">Cancel</Button>
              <Button type="submit" className="h-12 px-8 uppercase text-[10px] font-black tracking-widest rounded-xl bg-[#405189] hover:bg-primary shadow-xl">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
