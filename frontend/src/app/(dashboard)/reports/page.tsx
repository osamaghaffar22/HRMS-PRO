'use client';

import { useState, useMemo } from 'react';
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
import { Label } from '@/components/ui/label';
import { 
  FileSpreadsheet, 
  Printer, 
  Filter,
  CheckCircle2,
  Search,
  FileText,
  RotateCcw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MultiSelect } from '@/components/ui/multi-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

export default function ReportsPage() {
  const [selectedCols, setSelectedCols] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>('personal');
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['report-data'],
    queryFn: async () => {
      const res = await api.get('/api/employees'); 
      return res.data;
    }
  });

  const toggleColumn = (id: string) => {
    setSelectedCols(prev => {
      if (prev.includes(id)) {
        const newFilters = { ...filters };
        delete newFilters[id];
        setFilters(newFilters);
        return prev.filter(c => c !== id);
      }
      return [...prev, id];
    });
  };

  const handleFilterChange = (id: string, values: string[]) => {
    setFilters(prev => ({ ...prev, [id]: values }));
  };

  const resetFilters = () => {
    setFilters({});
  };

  const getUniqueOptions = (colId: string): string[] => {
    if (!reportData) return [];
    const values = reportData.map((emp: any) => String(emp[colId] || '')).filter(Boolean);
    return Array.from(new Set(values)).sort() as string[];
  };

  const filteredData = useMemo(() => {
    if (!reportData) return [];
    return reportData.filter((emp: any) => {
      return selectedCols.every(colId => {
        const activeFilters = filters[colId] || [];
        if (activeFilters.length === 0) return true;
        const empValue = String(emp[colId] || '');
        return activeFilters.includes(empValue);
      });
    });
  }, [reportData, selectedCols, filters]);

  const handlePrint = () => window.print();

  const handleExport = (type: 'excel' | 'pdf') => {
    if (!filteredData.length || !selectedCols.length) {
      alert("No data or columns selected to export!");
      return;
    }
    
    const activeColumns = availableColumns.filter(c => selectedCols.includes(c.id));
    
    if (type === 'excel') {
        const wsData = filteredData.map((emp: any, index: number) => {
            const row: any = { 'S.No': index + 1 };
            activeColumns.forEach(col => {
                row[col.label] = emp[col.id] || "—";
            });
            return row;
        });
        const ws = XLSX.utils.json_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Custom Report");
        XLSX.writeFile(wb, `Custom_Report_${new Date().getTime()}.xlsx`);
    } else {
        const doc = new jsPDF('landscape');
        doc.text("Custom Personnel Report", 14, 15);
        
        const head = [['#', ...activeColumns.map(c => c.label)]];
        const body = filteredData.map((emp: any, index: number) => [
            index + 1,
            ...activeColumns.map(col => emp[col.id] || "—")
        ]);

        autoTable(doc, {
            startY: 20,
            head: head,
            body: body,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [15, 23, 42] }
        });
        doc.save(`Custom_Report_${new Date().getTime()}.pdf`);
    }
  };

  return (
    <div className="space-y-8 print:p-0">
      <div className="flex justify-between items-center print:hidden flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">Advanced Reporting</h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1 opacity-70">Custom Data Generation & Export</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="font-black text-[10px] uppercase shadow-sm border-slate-200" onClick={handlePrint}>
            <Printer className="h-3 w-3 mr-2 text-slate-400" /> Print
          </Button>
          <Button variant="outline" className="font-black text-[10px] uppercase shadow-sm border-emerald-100 text-emerald-600 hover:bg-emerald-50" onClick={() => handleExport('excel')}>
            <FileSpreadsheet className="h-3 w-3 mr-2" /> Excel Export
          </Button>
          <Button variant="outline" className="font-black text-[10px] uppercase shadow-sm border-rose-100 text-rose-600 hover:bg-rose-50" onClick={() => handleExport('pdf')}>
            <FileText className="h-3 w-3 mr-2" /> PDF Export
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm print:hidden bg-white overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
          <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center italic">
            <Filter className="h-3 w-3 mr-2" /> Configure Report Layout
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-2 lg:grid-cols-4 bg-slate-100/50 p-1 rounded-xl mb-4 h-auto">
              {columnGroups.map(group => (
                <TabsTrigger 
                  key={group.id} 
                  value={group.id}
                  className="text-[10px] font-black uppercase tracking-widest py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                >
                  {group.title}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {columnGroups.map(group => (
                <TabsContent key={group.id} value={group.id} className="mt-0 outline-none">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-3 p-1">
                    {group.columns.map(col => (
                      <div key={col.id} className="flex items-center space-x-3 group cursor-pointer bg-slate-50/50 hover:bg-slate-100 p-2 rounded-xl transition-all border border-transparent hover:border-slate-200" onClick={() => toggleColumn(col.id)}>
                        <div className={cn(
                          "h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all duration-300 flex-shrink-0",
                          selectedCols.includes(col.id) ? "bg-primary border-primary rotate-0" : "border-slate-300 group-hover:border-primary rotate-45 group-hover:rotate-0"
                        )}>
                          {selectedCols.includes(col.id) && <CheckCircle2 className="h-3 w-3 text-white" />}
                        </div>
                        <Label className="text-[10px] font-black text-slate-700 cursor-pointer group-hover:text-primary transition-colors uppercase tracking-tight truncate" title={col.label}>
                          {col.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {selectedCols.length > 0 && (
        <Card className="border-none shadow-sm print:hidden bg-white overflow-visible z-50">
          <CardHeader className="bg-slate-50 border-b border-slate-100 py-3 flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center italic m-0">
              <Search className="h-3 w-3 mr-2" /> Apply Filters
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-6 text-[9px] font-black uppercase text-slate-500 hover:text-slate-900">
              <RotateCcw className="h-3 w-3 mr-1" /> Reset Filters
            </Button>
          </CardHeader>
          <CardContent className="p-4 overflow-visible">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
              {availableColumns.filter(c => selectedCols.includes(c.id)).map(col => (
                <div key={col.id} className="flex flex-col gap-1.5 w-full">
                  <Label className="text-[9px] font-bold text-slate-500 uppercase">{col.label}</Label>
                  <MultiSelect 
                    options={getUniqueOptions(col.id)}
                    selected={filters[col.id] || []}
                    onChange={(values) => handleFilterChange(col.id, values)}
                    placeholder={`Select ${col.label}...`}
                    label={col.label}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-2xl bg-white overflow-hidden rounded-3xl border border-slate-100 min-h-[500px]">
        <div className="overflow-x-auto custom-scrollbar">
          <Table>
            <TableHeader className="bg-slate-900 h-16">
              <TableRow className="border-none">
                <TableHead className="w-12 text-white font-black text-[10px] uppercase p-4 text-center whitespace-nowrap">#</TableHead>
                {availableColumns.filter(c => selectedCols.includes(c.id)).map(col => (
                  <TableHead key={col.id} className="text-white font-black text-[10px] uppercase p-4 whitespace-nowrap">{col.label}</TableHead>
                ))}
                {selectedCols.length === 0 && (
                  <TableHead className="text-white font-black text-[10px] uppercase p-4 text-center italic opacity-40">No columns selected for generation</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                 <TableRow><TableCell colSpan={selectedCols.length + 1} className="py-20 text-center text-slate-400 font-bold animate-pulse">Assembling dossier data...</TableCell></TableRow>
              ) : filteredData?.length === 0 ? (
                 <TableRow><TableCell colSpan={selectedCols.length + 1} className="py-20 text-center text-slate-300 font-black uppercase text-xs italic">No matching registry data found</TableCell></TableRow>
              ) : (
                 filteredData?.map((emp: any, idx: number) => (
                   <TableRow key={emp.id} className="h-14 border-b-slate-50 hover:bg-slate-50 transition-colors">
                      <TableCell className="text-center font-black text-slate-300 text-[10px]">{idx + 1}</TableCell>
                      {availableColumns.filter(c => selectedCols.includes(c.id)).map(col => (
                          <TableCell key={col.id} className="p-4 text-[11px] font-bold text-slate-600 uppercase tabular-nums whitespace-nowrap">
                              {emp[col.id] || "—"}
                          </TableCell>
                      ))}
                   </TableRow>
                 ))
              )}
            </TableBody>
          </Table>
        </div>

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
