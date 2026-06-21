'use client';

import { useQuery } from '@tanstack/react-query';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, AlertCircle, Edit2, Users, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RejectionsPage() {
  const router = useRouter();

  const { data: officialsData, isLoading: isLoadingOfficials } = useQuery({
    queryKey: ['employee-discrepancies-officials'],
    queryFn: async () => {
      const res = await api.get(`/api/employees/discrepancies/officials`);
      return res.data;
    }
  });

  const { data: rationalizationData, isLoading: isLoadingRationalization } = useQuery({
    queryKey: ['employee-discrepancies-rationalization'],
    queryFn: async () => {
      const res = await api.get(`/api/employees/discrepancies/rationalization`);
      return res.data;
    }
  });

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr || dateStr.toLowerCase().includes('not match')) return "---";
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

  return (
    <div className="space-y-6 w-full pb-10">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
        <div className="bg-red-100 p-3 rounded-2xl">
          <ShieldAlert className="h-8 w-8 text-red-600" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Rejections & <span className="text-red-600">Discrepancies</span></h1>
          <p className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wide">Registry records requiring immediate attention</p>
        </div>
      </div>

      <Tabs defaultValue="officials" className="w-full">
        <TabsList className="grid w-full max-w-[500px] grid-cols-2 p-1 bg-slate-100 rounded-xl mb-6">
          <TabsTrigger value="officials" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm text-xs font-black uppercase h-9"><Users className="w-4 h-4 mr-2" /> Officials Data Issues</TabsTrigger>
          <TabsTrigger value="rationalization" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-rose-600 data-[state=active]:shadow-sm text-xs font-black uppercase h-9"><Scale className="w-4 h-4 mr-2" /> Rationalization Errors</TabsTrigger>
        </TabsList>
        
        <TabsContent value="officials" className="mt-0 outline-none">
          <Card className="border-none shadow-xl overflow-hidden bg-white rounded-3xl border border-slate-100">
            <Table className="table-fixed w-full">
              <TableHeader className="bg-[#405189]">
                <TableRow className="border-none h-14">
                  <TableHead className="w-[4%] text-white font-black text-[10px] uppercase p-3 text-center">S.No</TableHead>
                  <TableHead className="w-[18%] text-white font-black text-[11px] uppercase p-3">Name</TableHead>
                  <TableHead className="w-[18%] text-white font-black text-[11px] uppercase p-3">Designation & Office</TableHead>
                  <TableHead className="w-[10%] text-white font-black text-[11px] uppercase p-3 text-center">Domicile</TableHead>
                  <TableHead className="w-[10%] text-white font-black text-[11px] uppercase p-3 text-center">Appt. Date</TableHead>
                  <TableHead className="w-[10%] text-white font-black text-[11px] uppercase p-3 text-center">Station DOJ</TableHead>
                  <TableHead className="w-[30%] text-white font-black text-[11px] uppercase p-3">Identified Issues</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingOfficials ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-20"><Skeleton className="h-12 w-full opacity-30" /></TableCell></TableRow>
                ) : !officialsData || officialsData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-32 text-emerald-500 font-black uppercase text-sm italic bg-emerald-50/30">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <ShieldAlert className="h-12 w-12 text-emerald-300" />
                        No officials found with missing data!
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  officialsData.map((d: any, i: number) => {
                    const e = d.employee;
                    const isDomicileMissing = !e.domicile || e.domicile.toLowerCase().includes('not match');
                    const isApptDateMissing = !e.joining_date;
                    const isStationDOJMissing = !e.place_of_posting;

                    return (
                      <TableRow 
                        key={e.id} 
                        className="hover:bg-red-50/50 border-b-slate-100 min-h-20 transition-all cursor-pointer group"
                        onDoubleClick={() => router.push(`/employees?search=${e.cnic || e.name}&editId=${e.id}`)}
                        title="Double click to edit employee record"
                      >
                        <TableCell className="text-center font-black text-slate-400 text-[11px] p-3">
                          <div className="flex items-center justify-center gap-2">
                            {i + 1}
                            <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                          </div>
                        </TableCell>
                        
                        <TableCell className="p-3 whitespace-normal break-words">
                          <span className="font-black text-slate-900 text-[14px] uppercase tracking-tight leading-tight">{e.name}</span>
                        </TableCell>
                        
                        <TableCell className="p-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-[12px] font-bold text-slate-700 uppercase leading-tight">{e.post_name} (BPS-{e.bs})</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase leading-tight">{e.branch_office}</span>
                          </div>
                        </TableCell>
                        
                        <TableCell className="p-3 text-center">
                          {isDomicileMissing ? (
                            <div className="bg-red-100 text-red-700 border border-red-200 rounded px-2 py-1 flex items-center justify-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              <span className="text-[10px] font-black uppercase">Missing</span>
                            </div>
                          ) : (
                            <span className="text-[11px] font-bold text-slate-600 uppercase">{e.domicile}</span>
                          )}
                        </TableCell>
                        
                        <TableCell className="p-3 text-center">
                          {isApptDateMissing ? (
                            <div className="bg-red-100 text-red-700 border border-red-200 rounded px-2 py-1 flex items-center justify-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              <span className="text-[10px] font-black uppercase">Missing</span>
                            </div>
                          ) : (
                            <span className="text-[11px] font-bold text-slate-600 uppercase">{formatDisplayDate(e.joining_date)}</span>
                          )}
                        </TableCell>
                        
                        <TableCell className="p-3 text-center">
                          {isStationDOJMissing ? (
                            <div className="bg-red-100 text-red-700 border border-red-200 rounded px-2 py-1 flex items-center justify-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              <span className="text-[10px] font-black uppercase">Missing</span>
                            </div>
                          ) : (
                            <span className="text-[11px] font-bold text-slate-600 uppercase">{formatDisplayDate(e.place_of_posting)}</span>
                          )}
                        </TableCell>
                        
                        <TableCell className="p-3">
                          <div className="flex flex-wrap gap-2">
                            {d.issues?.map((issue: string, idx: number) => (
                              <Badge key={idx} variant="destructive" className="bg-red-500 hover:bg-red-600 text-[10px] uppercase tracking-wider font-black px-2 py-1 whitespace-normal break-words">
                                {issue}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="rationalization" className="mt-0 outline-none">
          <Card className="border-none shadow-xl overflow-hidden bg-white rounded-3xl border border-slate-100">
            <Table className="table-fixed w-full">
              <TableHeader className="bg-[#405189]">
                <TableRow className="border-none h-14">
                  <TableHead className="w-[5%] text-white font-black text-[10px] uppercase p-3 text-center">S.No</TableHead>
                  <TableHead className="w-[20%] text-white font-black text-[11px] uppercase p-3">Name</TableHead>
                  <TableHead className="w-[30%] text-white font-black text-[11px] uppercase p-3">Designation & Office</TableHead>
                  <TableHead className="w-[15%] text-white font-black text-[11px] uppercase p-3 text-center">Duration</TableHead>
                  <TableHead className="w-[30%] text-white font-black text-[11px] uppercase p-3">Identified Issues</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingRationalization ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-20"><Skeleton className="h-12 w-full opacity-30" /></TableCell></TableRow>
                ) : !rationalizationData || rationalizationData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-32 text-emerald-500 font-black uppercase text-sm italic bg-emerald-50/30">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Scale className="h-12 w-12 text-emerald-300" />
                        No rationalization errors found. All staffing is within quota!
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  rationalizationData.map((d: any, i: number) => {
                    const e = d.employee;

                    return (
                      <TableRow 
                        key={e.id} 
                        className="hover:bg-rose-50/50 border-b-slate-100 min-h-20 transition-all cursor-pointer group"
                        onDoubleClick={() => router.push(`/employees?search=${e.cnic || e.name}&editId=${e.id}`)}
                        title="Double click to edit employee record"
                      >
                        <TableCell className="text-center font-black text-slate-400 text-[11px] p-3">
                          <div className="flex items-center justify-center gap-2">
                            {i + 1}
                            <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                          </div>
                        </TableCell>
                        
                        <TableCell className="p-3 whitespace-normal break-words">
                          <span className="font-black text-slate-900 text-[14px] uppercase tracking-tight leading-tight">{e.name}</span>
                          {e.officer_official === 'Officer' && (
                            <Badge className="ml-2 bg-amber-100 text-amber-800 hover:bg-amber-100 text-[9px] uppercase">Officer</Badge>
                          )}
                        </TableCell>
                        
                        <TableCell className="p-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-[12px] font-bold text-slate-700 uppercase leading-tight">{e.post_name} (BPS-{e.bs})</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase leading-tight">{e.branch_office}</span>
                          </div>
                        </TableCell>
                        
                        <TableCell className="p-3 text-center">
                           <span className="text-[11px] font-bold text-slate-600 uppercase">{formatDisplayDate(e.place_of_posting)}</span>
                        </TableCell>
                        
                        <TableCell className="p-3">
                          <div className="flex flex-wrap gap-2">
                            {d.issues?.map((issue: string, idx: number) => (
                              <Badge key={idx} variant="destructive" className="bg-rose-500 hover:bg-rose-600 text-[10px] uppercase tracking-wider font-black px-2 py-1 whitespace-normal break-words">
                                <Scale className="w-3 h-3 mr-1" /> {issue}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
