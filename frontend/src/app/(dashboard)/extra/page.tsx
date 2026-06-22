'use client';

import { useState, useEffect } from 'react';
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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Save, UserMinus, ShieldAlert, Edit2 } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

export default function ExtraPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [separationType, setSeparationType] = useState<string>('');
  const [separationDate, setSeparationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [page, setPage] = useState(1);

  // Search active employees
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['employees-search', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return [];
      const res = await api.get(`/api/employees`, { params: { search: debouncedSearch } });
      // Only show filled active seats
      return res.data.filter((e: any) => e.name && e.name.toLowerCase() !== 'vacant');
    },
    enabled: debouncedSearch.length >= 2,
  });

  // Fetch extra/separated employees
  const { data: extraData, isLoading: isLoadingExtra, refetch: refetchExtra } = useQuery({
    queryKey: ['extra-employees', page],
    queryFn: async () => {
      const res = await api.get(`/api/extra?skip=${(page - 1) * 100}&limit=100`);
      return {
        data: res.data,
        totalCount: parseInt(res.headers['x-total-count'] || '0')
      };
    }
  });

  const extraEmployees = extraData?.data || [];
  const totalCount = extraData?.totalCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / 100));

  const separateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEmployee || !separationType) throw new Error("Please select an employee and reason");
      const res = await api.post(`/api/employees/${selectedEmployee.id}/separate`, {
        separation_type: separationType,
        separation_date: separationDate
      });
      return res.data;
    },
    onSuccess: () => {
      alert("Employee successfully separated and moved to Extra");
      refetchExtra();
      setSelectedEmployee(null);
      setSearchTerm('');
      setSeparationType("");
      setSeparationDate("");
    }
  });

  const revertMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post(`/api/extra/${id}/revert`);
      return res.data;
    },
    onSuccess: () => {
      alert("Employee successfully reverted to active seat");
      refetchExtra();
    }
  });

  const handleSeparate = () => {
    if (!selectedEmployee) return alert("Select an employee first");
    if (!separationType) return alert("Select a separation reason");
    if (confirm(`Are you sure you want to mark ${selectedEmployee.name} as ${separationType}? This will create a vacant seat in their place.`)) {
      separateMutation.mutate();
    }
  };

  return (
    <div className="space-y-6 w-full pb-10">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
        <div className="bg-rose-100 p-3 rounded-2xl">
          <UserMinus className="h-8 w-8 text-rose-600" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Extra <span className="text-rose-600">Employees</span></h1>
          <p className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wide">Manage separated, retired, and resigned personnel</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Separation Form */}
        <Card className="lg:col-span-1 shadow-xl rounded-3xl border-slate-100 h-fit bg-white border">
          <CardHeader className="bg-[#405189] rounded-t-3xl border-b border-[#405189] py-4 flex items-center justify-center">
            <CardTitle className="text-base font-black uppercase text-white tracking-widest">Process Separation</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            
            {/* Search */}
            <div className="space-y-2 relative">
              <label className="text-xs font-bold text-slate-500 uppercase">Search Employee</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Type name or CNIC..." 
                  className="pl-9 bg-slate-50 border-slate-200/50 h-10 font-medium"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (selectedEmployee) setSelectedEmployee(null); // reset selection on new typing
                  }}
                />
              </div>

              {/* Search Results Dropdown */}
              {!selectedEmployee && searchTerm.length >= 2 && searchResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((emp: any) => (
                    <div 
                      key={emp.id} 
                      className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                      onClick={() => {
                        setSelectedEmployee(emp);
                        setSearchTerm(emp.name);
                      }}
                    >
                      <div className="font-bold text-sm">{emp.name}</div>
                      <div className="text-xs text-slate-500">{emp.post_name} (BPS-{emp.bs}) • {emp.branch_office}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Employee Details */}
            {selectedEmployee && (
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-black text-slate-900 text-sm uppercase">{selectedEmployee.name}</h3>
                    <p className="text-xs font-bold text-slate-500 uppercase mt-1">{selectedEmployee.post_name} (BPS-{selectedEmployee.bs})</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[10px] uppercase">{selectedEmployee.officer_official}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Office</span>
                    <span className="font-semibold text-slate-700">{selectedEmployee.branch_office}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">CNIC</span>
                    <span className="font-semibold text-slate-700">{selectedEmployee.cnic || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Dropdown and Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-xs font-black text-[#405189] uppercase tracking-wide">Separation Reason</label>
                <Select value={separationType} onValueChange={setSeparationType}>
                  <SelectTrigger className="border-slate-200/50 w-full h-10 bg-slate-50">
                    <SelectValue placeholder="Select Reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Resigned">Resigned</SelectItem>
                    <SelectItem value="Retired">Retired</SelectItem>
                    <SelectItem value="Death in Service">Death in Service</SelectItem>
                    <SelectItem value="Compulsory Retired">Compulsory Retired</SelectItem>
                    <SelectItem value="Removed from Service">Removed from Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black text-[#405189] uppercase tracking-wide">Separation Date</label>
                <Input 
                  type="date" 
                  value={separationDate} 
                  onChange={(e) => setSeparationDate(e.target.value)} 
                  className="h-10 bg-slate-50"
                />
              </div>
            </div>

            <Button 
              className="w-full h-10 font-black uppercase tracking-wider bg-[#405189] hover:bg-[#405189]"
              disabled={!selectedEmployee || !separationType || separateMutation.isPending}
              onClick={handleSeparate}
            >
              {separateMutation.isPending ? "Processing..." : (
                <><Save className="w-4 h-4 mr-2" /> Confirm Separation</>
              )}
            </Button>

          </CardContent>
        </Card>

        {/* Extra Employees List */}
        <Card className="lg:col-span-2 shadow-xl rounded-3xl border-slate-100 bg-white border overflow-hidden">
          <div className="p-5 bg-[#405189] flex justify-between items-center">
            <h2 className="text-sm font-black uppercase tracking-widest text-white">Separated Personnel Registry</h2>
            <Badge className="bg-[#405189] text-slate-300 border-none uppercase text-[10px]">
              {extraEmployees?.length || 0} Records
            </Badge>
          </div>
          <Table className="table-fixed w-full">
            <TableHeader className="bg-slate-50 border-b border-slate-200">
              <TableRow className="border-none h-12">
                <TableHead className="w-[25%] text-white font-black text-[10px] uppercase p-3">Name</TableHead>
                <TableHead className="w-[30%] text-white font-black text-[10px] uppercase p-3">Last Designation & Office</TableHead>
                <TableHead className="w-[20%] text-white font-black text-[10px] uppercase p-3 text-center">Date</TableHead>
                <TableHead className="w-[20%] text-white font-black text-[10px] uppercase p-3 text-center">Status / Reason</TableHead>
                <TableHead className="w-[5%] text-white font-black text-[10px] uppercase p-3 text-center"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingExtra ? (
                <TableRow><TableCell colSpan={5} className="text-center py-20"><Skeleton className="h-12 w-full opacity-30" /></TableCell></TableRow>
              ) : !extraEmployees || extraEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 text-slate-400 font-bold uppercase text-sm italic bg-slate-50/50">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <ShieldAlert className="h-12 w-12 text-slate-200" />
                      No separated employees found
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                extraEmployees.map((e: any) => (
                  <TableRow 
                    key={e.id} 
                    className="hover:bg-slate-50/80 border-b-slate-100 min-h-16 transition-all"
                  >
                    <TableCell className="p-3">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 text-xs uppercase">{e.name}</span>
                        <span className="text-[10px] font-bold text-slate-400 mt-0.5">{e.cnic || '---'}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell className="p-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-bold text-slate-700 uppercase leading-tight">{e.post_name} (BPS-{e.bs})</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase leading-tight">{e.branch_office}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell className="p-3 text-center">
                      <span className="text-[11px] font-bold text-slate-700">{e.date_of_action || 'N/A'}</span>
                    </TableCell>

                    <TableCell className="p-3 text-center">
                      <Badge variant="destructive" className="bg-rose-500 hover:bg-rose-600 text-[10px] uppercase tracking-wider font-black px-2 py-1">
                        {e.reason || 'N/A'}
                      </Badge>
                    </TableCell>

                    <TableCell className="p-3 text-center">
                      <Button variant="outline" size="sm" onClick={() => { if(window.confirm('Are you sure you want to revert this employee?')) revertMutation.mutate(e.id); }} className="h-8 hover:bg-emerald-50 text-emerald-600 border-emerald-200">
                        Revert
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {totalCount > 100 && (
            <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-100 rounded-b-3xl">
              <div className="text-xs font-bold text-slate-500">
                Showing {(page - 1) * 100 + 1} to {Math.min(page * 100, totalCount)} of {totalCount} records
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 mr-2">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
