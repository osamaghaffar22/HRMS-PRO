'use client';

import { useState } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  FileSpreadsheet, 
  FileText, 
  Printer, 
  Filter,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const availableColumns = [
  { id: 'name', label: 'Employee Name' },
  { id: 'father_name', label: 'Father Name' },
  { id: 'cnic', label: 'CNIC Number' },
  { id: 'personnel_number', label: 'Personnel #' },
  { id: 'bs', label: 'BPS / Grade' },
  { id: 'post_name', label: 'Designation' },
  { id: 'branch_office', label: 'Office/Branch' },
  { id: 'region', label: 'Region' },
  { id: 'date_of_birth', label: 'Date of Birth' },
  { id: 'date_of_appointment', label: 'Appointment Date' },
  { id: 'domicile', label: 'Domicile District' },
  { id: 'contact_number', label: 'Contact Details' },
];

export default function ReportsPage() {
  const [selectedCols, setSelectedCols] = useState<string[]>([]);
  
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['report-data'],
    queryFn: async () => {
      const res = await api.get('/api/employees'); 
      return res.data;
    }
  });

  const toggleColumn = (id: string) => {
    setSelectedCols(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handlePrint = () => window.print();

  return (
    <div className="space-y-8 print:p-0">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">Advanced Reporting</h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1 opacity-70">Custom Data Generation & Export</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="font-black text-[10px] uppercase shadow-sm border-slate-200" onClick={handlePrint}>
            <Printer className="h-3 w-3 mr-2 text-slate-400" /> Print Report
          </Button>
          <Button variant="outline" className="font-black text-[10px] uppercase shadow-sm border-emerald-100 text-emerald-600 hover:bg-emerald-50">
            <FileSpreadsheet className="h-3 w-3 mr-2" /> Excel Export
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm print:hidden bg-white overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100">
          <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center italic">
            <Filter className="h-3 w-3 mr-2" /> Configure Report Layout
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {availableColumns.map(col => (
              <div key={col.id} className="flex items-center space-x-3 group cursor-pointer" onClick={() => toggleColumn(col.id)}>
                <div className={cn(
                  "h-5 w-5 rounded border-2 flex items-center justify-center transition-all duration-300",
                  selectedCols.includes(col.id) ? "bg-primary border-primary rotate-0" : "border-slate-200 group-hover:border-primary rotate-45 group-hover:rotate-0"
                )}>
                  {selectedCols.includes(col.id) && <CheckCircle2 className="h-3 w-3 text-white" />}
                </div>
                <Label className="text-[11px] font-black text-slate-600 cursor-pointer group-hover:text-primary transition-colors uppercase tracking-tight">
                  {col.label}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-2xl bg-white overflow-hidden rounded-3xl border border-slate-100 min-h-[500px]">
        <Table>
          <TableHeader className="bg-slate-900 h-16">
            <TableRow className="border-none">
              <TableHead className="w-12 text-white font-black text-[10px] uppercase p-4 text-center">#</TableHead>
              {availableColumns.filter(c => selectedCols.includes(c.id)).map(col => (
                <TableHead key={col.id} className="text-white font-black text-[10px] uppercase p-4">{col.label}</TableHead>
              ))}
              {selectedCols.length === 0 && (
                <TableHead className="text-white font-black text-[10px] uppercase p-4 text-center italic opacity-40">No columns selected for generation</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow><TableCell colSpan={selectedCols.length + 1} className="py-20 text-center text-slate-400 font-bold animate-pulse">Assembling dossier data...</TableCell></TableRow>
            ) : reportData?.length === 0 ? (
               <TableRow><TableCell colSpan={selectedCols.length + 1} className="py-20 text-center text-slate-300 font-black uppercase text-xs italic">No matching registry data found</TableCell></TableRow>
            ) : (
               reportData?.map((emp: any, idx: number) => (
                 <TableRow key={emp.id} className="h-14 border-b-slate-50 hover:bg-slate-50 transition-colors">
                    <TableCell className="text-center font-black text-slate-300 text-[10px]">{idx + 1}</TableCell>
                    {availableColumns.filter(c => selectedCols.includes(c.id)).map(col => (
                        <TableCell key={col.id} className="p-4 text-[11px] font-bold text-slate-600 uppercase tabular-nums">
                            {emp[col.id] || "—"}
                        </TableCell>
                    ))}
                 </TableRow>
               ))
            )}
          </TableBody>
        </Table>

        <div className="hidden print:flex justify-between items-end p-20 mt-20">
          <div className="text-center">
            <div className="h-0.5 w-40 bg-slate-900 mb-2 mx-auto" />
            <p className="text-[9px] font-black uppercase tracking-widest">Office Superintendent</p>
          </div>
          <div className="text-center">
            <div className="h-0.5 w-40 bg-slate-900 mb-2 mx-auto" />
            <p className="text-[9px] font-black uppercase tracking-widest">Accountant Officer</p>
          </div>
          <div className="text-right">
            <div className="h-0.5 w-40 bg-slate-900 ml-auto" />
            <p className="text-[9px] font-black uppercase tracking-widest">Appointing Authority</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
