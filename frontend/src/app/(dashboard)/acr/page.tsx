'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
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
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from "@/lib/utils";
import { Search, Plus, Trash2, FileDown, FileJson, Printer, ArrowUpDown, ArrowUp, ArrowDown, User, Calendar, Save, History, Clock, ChevronDown, Edit2 } from 'lucide-react';
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

const ASSESSMENT_OPTIONS = [
  { value: 'Outstanding', label: 'A - Outstanding', key: 'A' },
  { value: 'Very Good', label: 'B - Very Good', key: 'B' },
  { value: 'Good', label: 'C - Good', key: 'C' },
  { value: 'Average', label: 'D - Average', key: 'D' },
  { value: 'Below Average', label: 'E - Below Average', key: 'E' },
  { value: 'Poor', label: 'F - Poor', key: 'F' },
  { value: 'Special Aptitude', label: 'G - Special Aptitude', key: 'G' },
];

const FITNESS_OPTIONS = [
  { value: 'Fit', label: 'A - Fit', key: 'A' },
  { value: 'Unfit', label: 'B - Unfit', key: 'B' },
];

const PROMOTION_OPTIONS = [
  { value: 'Recommended for accelerated Promotion', label: 'A - Accelerated', key: 'A' },
  { value: 'Fit for Promotion', label: 'B - Fit', key: 'B' },
  { value: 'Recently promoted', label: 'C - Recent', key: 'C' },
  { value: 'Assessment for the further promotion in premature', label: 'D - Premature', key: 'D' },
  { value: 'Not yet fit for promotion but likely to become fit in course of time', label: 'E - Not Yet', key: 'E' },
  { value: 'Unfit for further promotion', label: 'F - Unfit', key: 'F' },
];

const RESULT_OPTIONS = [
  { value: 'Satisfactory', label: 'A - Satisfactory', key: 'A' },
  { value: 'Not Satisfactory', label: 'B - Not Satisfactory', key: 'B' },
];

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

export default function ACRPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Form');
  const [activeTab, setActiveTab] = useState('Form');
  const [tabYearsFilter, setTabYearsFilter] = useState<string[]>([]);
  
  const { data: availableYears = ['2023', '2024', '2025', '2026'] } = useQuery({
    queryKey: ['acr-years'],
    queryFn: async () => {
      const res = await api.get('/api/config/acr_years');
      return res.data.value || ['2023', '2024', '2025', '2026'];
    }
  });

  useEffect(() => {
    if (availableYears.length > 0 && tabYearsFilter.length === 0) {
      const lastYear = availableYears[availableYears.length - 1];
      setTabYearsFilter([lastYear]);
    }
  }, [availableYears]);

  const [completionFilter, setCompletionFilter] = useState<string[]>([]); 
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [gaFilter, setGaFilter] = useState<string[]>([]);
  const [remarksFilter, setRemarksFilter] = useState<string[]>([]);
  const [fitnessFilter, setFitnessFilter] = useState<string[]>([]);
  const [promotionFilter, setPromotionFilter] = useState<string[]>([]);
  const [designationFilter, setDesignationFilter] = useState<string[]>([]);

// Form States
  const [formEmpSearch, setFormEmpSearch] = useState('');
  const [selectedFormEmp, setSelectedFormEmp] = useState<any>(null);
  const [acrFormData, setAcrFormData] = useState<any>({
    year: (new Date().getFullYear() - 1).toString(),
    from_date: '',
    to_date: '',
    ga: '',
    promotion: '', 
    remarks: '',
    fitness_after_25_years: '',
    ro_name: '',
    ro_date: '',
    co_name: '',
    co_date: '', 
    result: '',
    status: 'Pending'
  });

  const [roSearch, setRoSearch] = useState('');
  const [coSearch, setCoSearch] = useState('');
  const [selectedRo, setSelectedRo] = useState<any>(null);
  const [selectedCo, setSelectedCo] = useState<any>(null);

  // UI/Nav States
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [dropdownIdx, setDropdownIdx] = useState(0);
  const [personnelIdx, setPersonnelIdx] = useState(0);
  const [roIdx, setRoIdx] = useState(0);
  const [coIdx, setCoIdx] = useState(0);
  const [editingPeriodId, setEditingPeriodId] = useState<number | null>(null);
  const isJumping = useRef(false);

  // History Filter States
  const [historyTypeFilter, setHistoryTypeFilter] = useState<string>('All');
  const [historySearch, setHistorySearch] = useState('');
  const [historyGaFilter, setHistoryGaFilter] = useState<string[]>([]);
  const [historyPromotionFilter, setHistoryPromotionFilter] = useState<string[]>([]);
  const [historyRemarksFilter, setHistoryRemarksFilter] = useState<string[]>([]);
  const [historyFitnessFilter, setHistoryFitnessFilter] = useState<string[]>([]);
  const [historyYearFilter, setHistoryYearFilter] = useState<string[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  // Focus Refs
  const personnelSearchRef = useRef<HTMLInputElement>(null);
  const yearInputRef = useRef<HTMLInputElement>(null);
  const fromDateRef = useRef<HTMLInputElement>(null);
  const toDateRef = useRef<HTMLInputElement>(null);
  const gaInputRef = useRef<HTMLInputElement>(null);
  const promotionInputRef = useRef<HTMLInputElement>(null);
  const fitnessInputRef = useRef<HTMLInputElement>(null);
  const resultInputRef = useRef<HTMLInputElement>(null);
  const roSearchRef = useRef<HTMLInputElement>(null);
  const roDateRef = useRef<HTMLInputElement>(null);
  const coSearchRef = useRef<HTMLInputElement>(null);
  const coDateRef = useRef<HTMLInputElement>(null);
  const remarksRef = useRef<HTMLInputElement>(null);
  const saveBtnRef = useRef<HTMLButtonElement>(null);

  const [sort, setSort] = useState<{ key: string; order: 'asc' | 'desc' | null }>({ key: '', order: null });
  const deferredSearch = React.useDeferredValue(search);
  const deferredFormEmpSearch = React.useDeferredValue(formEmpSearch);

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
    if (newCategory !== 'Form') {
      setSelectedFormEmp(null);
      setFormEmpSearch('');
    }
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
    queryKey: ['acr-employees', deferredSearch, category === 'Form' ? 'Officer' : category],
    queryFn: async () => {
      const res = await api.get(`/api/acr?search=${deferredSearch}&category=${category === 'Form' ? 'Officer' : category}`);
      return res.data;
    }
  });

  const { data: formSearchEmployees } = useQuery({
      queryKey: ['acr-form-search', deferredFormEmpSearch],
      queryFn: async () => {
          if (deferredFormEmpSearch.length < 2) return [];
          const res = await api.get(`/api/employees?search=${deferredFormEmpSearch}`);
          return res.data;
      },
      enabled: deferredFormEmpSearch.length >= 2
  });

  const { data: roSearchEmps } = useQuery({
    queryKey: ['ro-search', roSearch],
    queryFn: async () => {
        if (roSearch.length < 2) return [];
        const res = await api.get(`/api/employees?search=${roSearch}&officer_official=Officer`);
        return res.data;
    },
    enabled: roSearch.length >= 2
  });

  const { data: coSearchEmps } = useQuery({
    queryKey: ['co-search', coSearch],
    queryFn: async () => {
        if (coSearch.length < 2) return [];
        const res = await api.get(`/api/employees?search=${coSearch}&officer_official=Officer`);
        return res.data;
    },
    enabled: coSearch.length >= 2
  });

  // Query for all history - ONLY ENABLED ON HISTORY TAB
  const { data: allHistoryData, isLoading: isLoadingAllHistory, refetch: refetchAllHistory } = useQuery({
      queryKey: ['acr-all-history'],
      queryFn: async () => {
          const res = await api.get(`/api/acr?category=All`);
          return res.data;
      },
      enabled: category === 'History'
  });

  // Query for specific employee history in FORM tab
  const { data: selectedEmpHistoryData } = useQuery({
    queryKey: ['acr-selected-history', selectedFormEmp?.id],
    queryFn: async () => {
        const res = await api.get(`/api/acr?emp_id=${selectedFormEmp.id}&category=All`);
        return res.data;
    },
    enabled: !!selectedFormEmp && category === 'Form'
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month}, ${year}`;
  };

  const getYearFromDate = (d: string) => {
    if (!d) return 0;
    // Check for DD-MM-YYYY
    if (d.includes('-') && d.split('-')[0].length === 2) {
        return parseInt(d.split('-')[2]);
    }
    return new Date(d).getFullYear();
  };

  const filteredFormYears = useMemo(() => {
    if (!selectedFormEmp || !selectedFormEmp.joining_date) return availableYears;
    const joiningYear = getYearFromDate(selectedFormEmp.joining_date);
    if (!joiningYear) return availableYears;
    return availableYears.filter((y: any) => parseInt(y) >= joiningYear);
  }, [availableYears, selectedFormEmp]);

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

  const calculateGaps = (targetYear: string, submittedPeriods: { from: string, to: string }[], joiningDate?: string) => {
    let yearStart = new Date(`${targetYear}-01-01`);
    const yearEnd = new Date(`${targetYear}-12-31`);
    
    if (joiningDate) {
        const jDate = new Date(joiningDate);
        if (jDate.getFullYear().toString() === targetYear) {
            yearStart = jDate;
        } else if (jDate.getFullYear() > parseInt(targetYear)) {
            return []; // Joined after this year, no gaps
        }
    }

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


  const flatHistory = useMemo(() => {
    // Select data source based on current active tab
    const sourceData = category === 'History' ? allHistoryData : (category === 'Form' ? selectedEmpHistoryData : null);
    if (!sourceData) return [];

    let all: any[] = [];
    
    // Optimization: If an employee is selected in the form, only show their history
    // Otherwise, process the whole source (only in History tab)
    const employeesToProcess = selectedFormEmp 
        ? sourceData.filter((e: any) => e.id === selectedFormEmp.id)
        : sourceData;

    employeesToProcess.forEach((emp: any) => {
        const joiningYear = getYearFromDate(emp.joining_date);

        availableYears.forEach((y: string) => {
            const currentYear = parseInt(y);
            if (joiningYear > 0 && currentYear < joiningYear) return; // Skip years before joining

            const r = emp.reports?.find((rep: any) => rep.year === y);
            if (r) {
                const submitted = r.periods?.map((p: any) => ({ ...p, year: y, report: r, emp, type: 'Submitted' })) || [];
                const gaps = calculateGaps(y, submitted, emp.joining_date).map((g: any, idx: number) => ({
                    id: `gap-${emp.id}-${y}-${idx}`,
                    year: y,
                    report: r,
                    emp,
                    from: g.start.toISOString().split('T')[0],
                    to: g.end.toISOString().split('T')[0],
                    type: 'Missing', 
                    ga: '', promotion: '', fitness_after_25_years: '', ro_name: '', co_name: '', result: '', remarks: ''
                }));
                all.push(...submitted, ...gaps);
            } else {
                // Determine starting date for missing year
                let fromDate = `${y}-01-01`;
                if (joiningYear === currentYear && emp.joining_date) {
                    fromDate = emp.joining_date.split('T')[0];
                }

                all.push({
                    id: `missing-${emp.id}-${y}`,
                    year: y,
                    report: null,
                    emp,
                    from: fromDate,
                    to: `${y}-12-31`,
                    type: 'Missing',
                    ga: '', promotion: '', fitness_after_25_years: '', ro_name: '', co_name: '', result: '', remarks: ''
                });
            }
        });
    });

    all = all.filter((p: any) => {
        if (historyTypeFilter !== 'All' && p.type !== historyTypeFilter) return false;

        const matchesGa = historyGaFilter.length === 0 || historyGaFilter.includes(p.ga);
        const matchesPromotion = historyPromotionFilter.length === 0 || historyPromotionFilter.includes(p.promotion);
        const matchesRemarks = historyRemarksFilter.length === 0 || historyRemarksFilter.includes(p.remarks);
        const matchesFitness = historyFitnessFilter.length === 0 || historyFitnessFilter.includes(p.fitness_after_25_years);
        const matchesYear = historyYearFilter.length === 0 || historyYearFilter.includes(p.year?.toString());
        
        let matchesSearch = true;
        if (historySearch) {
            const s = historySearch.toLowerCase();
            matchesSearch = (
                (p.emp?.name && p.emp.name.toLowerCase().includes(s)) ||
                (p.emp?.code && p.emp.code.toString().toLowerCase().includes(s)) ||
                (p.year && p.year.toString().toLowerCase().includes(s)) ||
                (p.ga && p.ga.toLowerCase().includes(s)) ||
                (p.promotion && p.promotion.toLowerCase().includes(s)) ||
                (p.ro_name && p.ro_name.toLowerCase().includes(s)) ||
                (p.co_name && p.co_name.toLowerCase().includes(s)) ||
                (p.result && p.result.toLowerCase().includes(s))
            );
        }
        return matchesGa && matchesPromotion && matchesRemarks && matchesFitness && matchesSearch;
    });

    // Sort by Employee Name, then Year, then Date
    all.sort((a, b) => {
        if (a.emp.name !== b.emp.name) return a.emp.name.localeCompare(b.emp.name);
        if (a.year !== b.year) return a.year.localeCompare(b.year);
        return new Date(a.from).getTime() - new Date(b.from).getTime();
    });

    return all;
  }, [category, allHistoryData, selectedEmpHistoryData, historyTypeFilter, historySearch, historyGaFilter, historyPromotionFilter, historyRemarksFilter, historyFitnessFilter, historyYearFilter, availableYears, selectedFormEmp]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historyTypeFilter, historySearch, historyGaFilter, historyPromotionFilter, historyRemarksFilter, historyFitnessFilter, historyYearFilter]);

  const filteredEmployees = React.useMemo(() => {
    // Optimization: Only compute this if we are on Officer or Official tabs
    if (category !== 'Officer' && category !== 'Official') return [];

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
  }, [category, employees, sort, completionFilter, statusFilter, gaFilter, promotionFilter, remarksFilter, fitnessFilter, designationFilter]);

  // --- Mutations ---
  const addPeriodMutation = useMutation({
    mutationFn: async (data: any) => {
      let tid = data.reportId;
      const periodYear = data.period_data?.from_date ? data.period_data.from_date.split('-')[0] : (new Date().getFullYear() - 1).toString();
      if (!tid) tid = (await api.post('/api/acr/report', { report_data: { employee_id: data.employeeId, year: periodYear, status: 'Pending' } })).data.id;
      return api.post('/api/acr/period', { period_data: { acr_report_id: tid, ...data.period_data, status: data.period_data?.status || "Pending" } });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['acr-employees'] }); refetchAllHistory(); }
  });

  const updatePeriodMutation = useMutation({
    mutationFn: async (data: any) => api.patch(`/api/acr/period/${data.id}`, data.fields),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['acr-employees'] }); refetchAllHistory(); }
  });

  const deletePeriodMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/acr/period/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['acr-employees'] }); refetchAllHistory(); }
  });

  
// --- Navigation Logic ---
  const jumpToField = (nextRef: any, nextDropdownId: string | null) => {
    isJumping.current = true;
    setActiveDropdown(nextDropdownId);
    setDropdownIdx(0);
    if (nextRef?.current) {
      nextRef.current.focus();
    }
    setTimeout(() => { isJumping.current = false; }, 50);
  };

  const handleSelection = (fieldName: string, value: any, nextRef: any, nextDropdownId: string | null) => {
    setAcrFormData((prev: any) => ({ ...prev, [fieldName]: value }));
    jumpToField(nextRef, nextDropdownId);
  };

  const handleDropdownKeyDown = (e: React.KeyboardEvent, options: any[], fieldName: string, nextRef: any, nextDropdownId: string | null) => {
    const key = e.key.toUpperCase();
    const shortcut = options.find(o => o.key === key);
    
    if (shortcut) {
      handleSelection(fieldName, shortcut.value, nextRef, nextDropdownId);
      e.preventDefault();
      return;
    }

    if (e.key === 'ArrowDown') { setDropdownIdx(p => Math.min(p + 1, options.length - 1)); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { setDropdownIdx(p => Math.max(p - 1, 0)); e.preventDefault(); }
    else if (e.key === 'Enter') {
      const sel = options[dropdownIdx];
      if (sel) handleSelection(fieldName, sel.value, nextRef, nextDropdownId);
      e.preventDefault();
    } else if (e.key === 'Tab' || e.key === 'Escape') {
      setActiveDropdown(null);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent, list: any[], activeIdx: number, setIdx: any, onSelect: (item: any) => void) => {
    if (!list || list.length === 0) return;
    if (e.key === 'ArrowDown') { setIdx((p: number) => Math.min(p + 1, list.length - 1)); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { setIdx((p: number) => Math.max(p - 1, 0)); e.preventDefault(); }
    else if (e.key === 'Enter' && list[activeIdx]) { onSelect(list[activeIdx]); e.preventDefault(); }
  };

  const selectPersonnel = (e: any) => { setSelectedFormEmp(e); setFormEmpSearch(e.name); setPersonnelIdx(0); jumpToField(yearInputRef, 'year'); };
  const selectRo = (e: any) => { setSelectedRo(e); setRoSearch(e.name); setAcrFormData((prev:any) => ({...prev, ro_name: e.name})); setRoIdx(0); jumpToField(roDateRef, null); };
  const selectCo = (e: any) => { setSelectedCo(e); setCoSearch(e.name); setAcrFormData((prev:any) => ({...prev, co_name: e.name})); setCoIdx(0); jumpToField(coDateRef, null); };

  const startEdit = (report: any, p: any) => {
    isJumping.current = true;
    setActiveDropdown(null);
    setEditingPeriodId(p.id);
    setSelectedFormEmp(p.emp); 
    setFormEmpSearch(p.emp?.name || '');
    setRoSearch(p.ro_name || '');
    setCoSearch(p.co_name || '');
    
    // Helper to ensure date is in YYYY-MM-DD format for HTML input
    const cleanDate = (d: string) => d ? d.split('T')[0] : '';

    setAcrFormData({
      year: report?.year || p.year?.toString() || (new Date().getFullYear() - 1).toString(),
      from_date: cleanDate(p.from),
      to_date: cleanDate(p.to),
      ga: p.ga || '',
      promotion: p.promotion || '',
      remarks: p.remarks || '',
      fitness_after_25_years: p.fitness_after_25_years || '',
      ro_name: p.ro_name || '',
      ro_date: cleanDate(p.ro_date),
      co_name: p.co_name || '',
      co_date: cleanDate(p.co_date),
      result: p.result || '',
      status: p.status || 'Pending'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCategory('Form');
    setTimeout(() => {
      fromDateRef.current?.focus();
      isJumping.current = false;
    }, 500);
  };

  const startAddMissing = (p: any, empRecord?: any) => {
    isJumping.current = true;
    setActiveDropdown(null);
    const employee = empRecord || p.emp;
    setEditingPeriodId(null);
    setSelectedFormEmp(employee); 
    setFormEmpSearch(employee?.name || '');
    setRoSearch('');
    setCoSearch('');
    
    const cleanDate = (d: string) => d ? d.split('T')[0] : '';

    setAcrFormData({
      year: p.year?.toString() || (new Date().getFullYear() - 1).toString(),
      from_date: cleanDate(p.from),
      to_date: cleanDate(p.to),
      ga: '',
      promotion: '',
      remarks: '',
      fitness_after_25_years: '',
      ro_name: '',
      ro_date: '',
      co_name: '',
      co_date: '',
      result: '',
      status: 'Pending'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCategory('Form');
    setTimeout(() => {
      fromDateRef.current?.focus();
      isJumping.current = false;
    }, 500);
  };

  const handleFormSave = async () => {
    if (!selectedFormEmp || !acrFormData.from_date || !acrFormData.to_date) { alert("Personnel & Dates are required"); return; }
    try {
      if (editingPeriodId) {
        await updatePeriodMutation.mutateAsync({ id: editingPeriodId, fields: acrFormData });
        alert("ACR Entry Updated!");
      } else {
        const allRes = await api.get(`/api/acr?search=${selectedFormEmp.name}&category=All&year=${acrFormData.year}`);
        const empRecord = allRes.data.find((e: any) => e.id === selectedFormEmp.id);
        let tid = empRecord?.reports.find((r: any) => r.year === acrFormData.year)?.id;
        if (!tid) tid = (await api.post('/api/acr/report', { report_data: { employee_id: selectedFormEmp.id, year: acrFormData.year, status: 'Pending' } })).data.id;
        await api.post('/api/acr/period', { period_data: { acr_report_id: tid, ...acrFormData } });
        alert("ACR Entry Saved!");
      }
      
      setAcrFormData((prev: any) => ({ ...prev, from_date: '', to_date: '', ga: '', promotion: '', remarks: '', fitness_after_25_years: '', ro_name: '', ro_date: '', co_name: '', co_date: '', result: '', status: 'Pending' }));
      setRoSearch(''); setCoSearch(''); setSelectedRo(null); setSelectedCo(null); setEditingPeriodId(null);
      refetchAllHistory(); queryClient.invalidateQueries({ queryKey: ['acr-employees'] });
      setTimeout(() => personnelSearchRef.current?.focus(), 100);
    } catch (err: any) { alert("Error saving"); }
  };

  
const handleExportExcel = () => {
    if (!filteredEmployees || filteredEmployees.length === 0) return;
    const rows: any[] = [];
    filteredEmployees.forEach((emp: any, i: number) => {
      const submitted = emp.reports?.flatMap((r: any) => r.periods.map((p: any) => ({...p}))) || [];
      const showSubmitted = completionFilter.length === 0 || completionFilter.includes('Completed');
      const showRemaining = completionFilter.length === 0 || completionFilter.includes('Incomplete');

      if (showSubmitted) {
          submitted.forEach((p: any) => {
              if (tabYearsFilter.length > 0 && !tabYearsFilter.includes(p.year?.toString())) return;
              rows.push({
                  'S.No': i + 1, 'Name': emp.name, 'Designation': emp.post_name, 'BPS': emp.bs, 'Office': emp.branch_office,
                  'From Date': formatDisplayDate(p.from), 'To Date': formatDisplayDate(p.to), 'Duration': formatTenure(p.from, p.to), 'Status': 'Submitted'
              });
          });
      }
      if (showRemaining) {
          const yearsToCheck = tabYearsFilter.length > 0 ? tabYearsFilter : [(new Date().getFullYear() - 1).toString()];
          yearsToCheck.forEach(y => {
              const gaps = calculateGaps(y, submitted.filter((p: any) => p.year?.toString() === y), emp.joining_date);
              gaps.forEach((g: any) => {
                  const fromStr = g.start.toISOString().split('T')[0];
                  const toStr = g.end.toISOString().split('T')[0];
                  rows.push({
                      'S.No': i + 1, 'Name': emp.name, 'Designation': emp.post_name, 'BPS': emp.bs, 'Office': emp.branch_office,
                      'From Date': formatDisplayDate(fromStr), 'To Date': formatDisplayDate(toStr), 'Duration': formatTenure(fromStr, toStr), 'Status': 'Remaining'
                  });
              });
          });
      }
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ACR_Report");
    XLSX.writeFile(wb, `ACR_Report_${tabYearsFilter[0] || 'All'}_${new Date().getTime()}.xlsx`);
  };

  const handleExportPDF = () => {
    if (!filteredEmployees || filteredEmployees.length === 0) return;
    const doc = new jsPDF('landscape', 'pt', 'a4');
    doc.text(`ACR Management Report - ${tabYearsFilter[0] || 'All'} (${category})`, 40, 40);
    const tableData: any[] = [];
    filteredEmployees.forEach((emp: any, i: number) => {
        const submitted = emp.reports?.flatMap((r: any) => r.periods.map((p: any) => ({...p}))) || [];
        const showSubmitted = completionFilter.length === 0 || completionFilter.includes('Completed');
        const showRemaining = completionFilter.length === 0 || completionFilter.includes('Incomplete');
        if (showSubmitted) {
            submitted.forEach((p: any) => {
                if (tabYearsFilter.length > 0 && !tabYearsFilter.includes(p.year?.toString())) return;
                tableData.push([i + 1, emp.name, emp.post_name, emp.bs, emp.branch_office, formatDisplayDate(p.from), formatDisplayDate(p.to), formatTenure(p.from, p.to), 'Submitted']);
            });
        }
        if (showRemaining) {
            const yearsToCheck = tabYearsFilter.length > 0 ? tabYearsFilter : [(new Date().getFullYear() - 1).toString()];
            yearsToCheck.forEach(y => {
                const gaps = calculateGaps(y, submitted.filter((p: any) => p.year?.toString() === y), emp.joining_date);
                gaps.forEach((g: any) => {
                    const fromStr = g.start.toISOString().split('T')[0];
                    const toStr = g.end.toISOString().split('T')[0];
                    tableData.push([i + 1, emp.name, emp.post_name, emp.bs, emp.branch_office, formatDisplayDate(fromStr), formatDisplayDate(toStr), formatTenure(fromStr, toStr), 'Remaining']);
                });
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
    doc.save(`ACR_Report_${tabYearsFilter[0] || 'All'}_${new Date().getTime()}.pdf`);
  };

  const handleHistoryExportExcel = () => {
    if (!flatHistory || flatHistory.length === 0) return;
    const rows = flatHistory.map((p: any, i: number) => ({
      'S.No': i + 1,
      'Code': p.emp?.code || p.emp?.id,
      'Name': p.emp?.name,
      'BPS': p.emp?.bs,
      'Designation': p.emp?.post_name,
      'Office/Branch': p.emp?.branch_office,
      'Year': p.year,
      'From': formatDisplayDate(p.from),
      'To': formatDisplayDate(p.to),
      'GA': p.ga || '-',
      'Promotion': p.promotion || '-',
      'Fitness': p.fitness_after_25_years || '-',
      'RO Name': p.ro_name || '-',
      'CO Name': p.co_name || '-',
      'Result': p.result || '-',
      'Duration': formatTenure(p.from, p.to),
      'Type': p.type
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ACR_History");
    const filename = selectedFormEmp ? `ACR_History_${selectedFormEmp.name}` : `ACR_Global_History`;
    XLSX.writeFile(wb, `${filename}_${new Date().getTime()}.xlsx`);
  };

  const handleHistoryExportPDF = () => {
    if (!flatHistory || flatHistory.length === 0) return;
    const doc = new jsPDF('landscape', 'pt', 'a4');
    const title = selectedFormEmp ? `ACR History - ${selectedFormEmp.name}` : `Global ACR History Tracker`;
    doc.text(title, 40, 40);
    const tableData = flatHistory.map((p: any, i: number) => [
      i + 1,
      p.emp?.name || '-',
      p.year,
      formatDisplayDate(p.from),
      formatDisplayDate(p.to),
      p.ga || '-',
      p.promotion || '-',
      p.fitness_after_25_years || '-',
      p.result || '-',
      formatTenure(p.from, p.to),
      p.type
    ]);
    autoTable(doc, {
      startY: 60,
      head: [['#', 'Name', 'Year', 'From', 'To', 'GA', 'Promotion', 'Fitness', 'Result', 'Duration', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] },
      styles: { fontSize: 7 }
    });
    const filename = selectedFormEmp ? `ACR_History_${selectedFormEmp.name}` : `ACR_Global_History`;
    doc.save(`${filename}_${new Date().getTime()}.pdf`);
  };

  const handlePrint = () => window.print();

  const addPeriod = async (e: React.FormEvent, employeeId: number, reportId: number | null) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const fromDate = formData.get('from_date') as string;
    const periodYear = fromDate ? fromDate.split('-')[0] : (new Date().getFullYear() - 1).toString();
    try {
        let targetReportId = reportId;
        if (!targetReportId) {
            const res = await api.post('/api/acr/report', { report_data: { employee_id: employeeId, year: periodYear, status: 'Pending' } });
            targetReportId = res.data.id;
        }
        await api.post('/api/acr/period', { 
            period_data: { acr_report_id: targetReportId, from_date: fromDate, to_date: formData.get('to_date'), status: "Pending" }
        });
        queryClient.invalidateQueries({ queryKey: ['acr-employees'] });
        refetchAllHistory();
    } catch (error: any) { alert(error.response?.data?.detail || "An error occurred."); }
  };

  const updatePeriodField = async (id: number, field: string, value: string) => {
    const qKey = ['acr-employees', deferredSearch, category === 'Form' ? 'Officer' : category];
    const previousEmployees = queryClient.getQueryData(qKey);
    queryClient.setQueryData(qKey, (old: any) => {
        if (!old) return old;
        return old.map((emp: any) => ({
            ...emp,
            reports: emp.reports?.map((r: any) => ({ ...r, periods: r.periods?.map((p: any) => p.id === id ? { ...p, [field]: value } : p) }))
        }));
    });
    try { await api.patch(`/api/acr/period/${id}`, { [field]: value }); } 
    catch (err) { queryClient.setQueryData(qKey, previousEmployees); }
  };

  const deletePeriod = async (id: number) => {
    await api.delete(`/api/acr/period/${id}`);
    queryClient.invalidateQueries({ queryKey: ['acr-employees'] });
    refetchAllHistory();
  };

  const toggleReportCompletion = async (reportId: number) => {
    const qKey = ['acr-employees', deferredSearch, category === 'Form' ? 'Officer' : category];
    const previousEmployees = queryClient.getQueryData(qKey);
    queryClient.setQueryData(qKey, (old: any) => {
        if (!old) return old;
        return old.map((emp: any) => ({
            ...emp,
            reports: emp.reports?.map((r: any) => ({ ...r, is_manually_completed: r.id === reportId ? !r.is_manually_completed : r.is_manually_completed }))
        }));
    });
    try { await api.patch(`/api/acr/report/${reportId}/toggle-complete`); } 
    catch (err) { queryClient.setQueryData(qKey, previousEmployees); }
  };

  return (
    <div className="space-y-6 w-full pb-10 px-2 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tighter uppercase italic">ACR <span className="text-primary">Management</span></h1>
      </div>
      
      <Tabs value={category} onValueChange={handleCategoryChange}>
        <TabsList className="h-16 p-2 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <TabsTrigger value="Form" className="px-10 py-3 text-lg font-bold rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all italic text-primary font-black uppercase tracking-tighter">ACR Form</TabsTrigger>
          <TabsTrigger value="History" className="px-10 py-3 text-lg font-bold rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all italic font-black uppercase tracking-tighter">ACR History</TabsTrigger>
          <TabsTrigger value="Officer" className="px-10 py-3 text-lg font-bold rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Officers</TabsTrigger>
          <TabsTrigger value="Official" className="px-10 py-3 text-lg font-bold rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Officials</TabsTrigger>
        </TabsList>
        
        <TabsContent value="Form" className="space-y-8 mt-6">
          {category === 'Form' && (
            <>
            <Card className="border-none shadow-2xl bg-white rounded-3xl border border-slate-100 overflow-hidden">
              <CardHeader className="bg-[#405189] text-white p-6"><CardTitle className="text-lg font-black uppercase tracking-widest flex items-center italic text-white"><Calendar className="h-5 w-5 mr-3" /> ACR Entry Form</CardTitle></CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="md:col-span-2 space-y-1 relative acr-nav-group">
                  <Label className="text-[10px] font-black text-[#405189] uppercase tracking-widest">Step 1: Personnel Search</Label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    <Input 
                      ref={personnelSearchRef}
                      placeholder="SEARCH NAME OR CODE..." 
                      className="border-slate-200/50 pl-12 h-10 bg-slate-50 border-none font-bold text-sm rounded-xl shadow-inner uppercase focus:ring-2 focus:ring-primary/20" 
                      value={formEmpSearch || ''} 
                      onFocus={() => !isJumping.current && setActiveDropdown('personnel')} 
                      onChange={(e) => { setFormEmpSearch(e.target.value); if(!e.target.value) setSelectedFormEmp(null); setPersonnelIdx(0); }} 
                      onKeyDown={(e) => handleSearchKeyDown(e, formSearchEmployees || [], personnelIdx, setPersonnelIdx, selectPersonnel)} 
                    />
                    {selectedFormEmp && <Button variant="ghost" size="sm" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 text-[9px] font-black text-rose-500 uppercase p-1 hover:bg-transparent underline" onClick={() => { setSelectedFormEmp(null); setFormEmpSearch(''); }}>Reset</Button>}
                  </div>

                  {activeDropdown === 'personnel' && formSearchEmployees && formSearchEmployees.length > 0 && !selectedFormEmp && (
                    <div className="absolute w-full border rounded-xl shadow-2xl max-h-48 overflow-y-auto bg-white z-[100] border-slate-100 mt-1">
                      {formSearchEmployees.map((e: any, i: number) => (
                        <div key={e.id} className={cn("p-3 cursor-pointer border-b last:border-0", personnelIdx === i ? "bg-primary text-white" : "hover:bg-slate-50")} onMouseDown={() => selectPersonnel(e)}>
                          <p className="font-black text-xs uppercase">{e.name}</p>
                          <p className={cn("text-[9px] font-bold uppercase", personnelIdx === i ? "text-primary-foreground/70" : "text-slate-400")}>{e.post_name} (BPS {e.bs})</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-1"><Label className="text-[9px] text-[#405189] ml-1 uppercase font-bold">Code</Label><Input readOnly placeholder="---" className="border-slate-200/50 h-10 bg-slate-100/50 border-none font-black text-xs uppercase rounded-xl" value={selectedFormEmp?.code || selectedFormEmp?.id || ''} /></div>
                <div className="space-y-1"><Label className="text-[9px] text-[#405189] ml-1 uppercase font-bold">BPS</Label><Input readOnly placeholder="---" className="border-slate-200/50 h-10 bg-slate-100/50 border-none font-black text-xs uppercase rounded-xl" value={selectedFormEmp?.bs || ''} /></div>
                <div className="space-y-1"><Label className="text-[9px] text-[#405189] ml-1 uppercase font-bold">Designation</Label><Input readOnly placeholder="---" className="border-slate-200/50 h-10 bg-slate-100/50 border-none font-black text-xs uppercase rounded-xl" value={selectedFormEmp?.post_name || ''} /></div>
                <div className="md:col-span-5 space-y-1"><Label className="text-[9px] text-[#405189] ml-1 uppercase font-bold">Posting Office</Label><Input readOnly placeholder="OFFICE DETAILS..." className="border-slate-200/50 h-10 bg-slate-100/50 border-none font-black text-xs uppercase rounded-xl" value={selectedFormEmp?.branch_office || ''} /></div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Year */}
                  <div className="space-y-1 relative acr-nav-group">
                    <Label className="text-[10px] font-black text-[#405189] uppercase">Year</Label>
                    <div className="relative">
                      <Input ref={yearInputRef} readOnly className="border-slate-200/50 h-10 bg-slate-50 border-none font-bold text-xs rounded-xl uppercase cursor-pointer focus:ring-2 focus:ring-primary/20" value={acrFormData.year} onFocus={() => !isJumping.current && setActiveDropdown('year')} onKeyDown={(e) => handleDropdownKeyDown(e, filteredFormYears.map((y:any, i:number) => ({ value: String(y), label: String(y), key: String(i+1) })), 'year', fromDateRef, null)} />
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    </div>
                    {activeDropdown === 'year' && (
                      <div className="absolute w-full border rounded-xl shadow-2xl max-h-48 overflow-y-auto bg-white z-[100] border-slate-100 mt-1">
                        {filteredFormYears.map((y: any, i: number) => (
                          <div key={String(y)} className={cn("p-2 cursor-pointer border-b last:border-0 text-[10px] font-bold uppercase", dropdownIdx === i ? "bg-primary text-white" : "hover:bg-slate-50")} onMouseDown={() => handleSelection('year', String(y), fromDateRef, null)}>{y}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1"><Label className="text-[10px] font-black text-[#405189] uppercase">From</Label><Input ref={fromDateRef} type="date" className="border-slate-200/50 h-10 bg-slate-50 border-none font-bold text-xs rounded-xl" value={acrFormData.from_date} onChange={(e) => setAcrFormData((p:any) => ({...p, from_date: e.target.value}))} onKeyDown={(e) => e.key === 'Enter' && jumpToField(toDateRef, null)} /></div>
                  <div className="space-y-1"><Label className="text-[10px] font-black text-[#405189] uppercase">To</Label><Input ref={toDateRef} type="date" className="border-slate-200/50 h-10 bg-slate-50 border-none font-bold text-xs rounded-xl" value={acrFormData.to_date} onChange={(e) => setAcrFormData((p:any) => ({...p, to_date: e.target.value}))} onKeyDown={(e) => e.key === 'Enter' && jumpToField(gaInputRef, 'ga')} /></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* GA */}
                  <div className="space-y-1 relative acr-nav-group">
                    <Label className="text-[10px] font-black text-[#405189] uppercase">GA Assessment</Label>
                    <div className="relative">
                      <Input ref={gaInputRef} readOnly className="border-slate-200/50 h-10 bg-slate-50 border-none font-bold text-xs rounded-xl uppercase cursor-pointer focus:ring-2 focus:ring-primary/20" value={ASSESSMENT_OPTIONS.find(o => o.value === acrFormData.ga)?.label || ''} onFocus={() => !isJumping.current && setActiveDropdown('ga')} onKeyDown={(e) => handleDropdownKeyDown(e, ASSESSMENT_OPTIONS, 'ga', promotionInputRef, 'promotion')} />
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    </div>
                    {activeDropdown === 'ga' && (
                      <div className="absolute w-full border rounded-xl shadow-2xl max-h-48 overflow-y-auto bg-white z-[100] border-slate-100 mt-1">
                        {ASSESSMENT_OPTIONS.map((o: any, i: number) => (
                          <div key={o.value} className={cn("p-2 cursor-pointer border-b last:border-0 text-[10px] font-bold uppercase", dropdownIdx === i ? "bg-primary text-white" : "hover:bg-slate-50")} onMouseDown={() => handleSelection('ga', o.value, promotionInputRef, 'promotion')}>{o.label}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Promotion */}
                  <div className="space-y-1 relative acr-nav-group">
                    <Label className="text-[10px] font-black text-[#405189] uppercase">Promotion Fitness</Label>
                    <div className="relative">
                      <Input ref={promotionInputRef} readOnly className="border-slate-200/50 h-10 bg-slate-50 border-none font-bold text-xs rounded-xl uppercase cursor-pointer focus:ring-2 focus:ring-primary/20" value={PROMOTION_OPTIONS.find(o => o.value === acrFormData.promotion)?.label || ''} onFocus={() => !isJumping.current && setActiveDropdown('promotion')} onKeyDown={(e) => handleDropdownKeyDown(e, PROMOTION_OPTIONS, 'promotion', fitnessInputRef, 'fitness')} />
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    </div>
                    {activeDropdown === 'promotion' && (
                      <div className="absolute w-full border rounded-xl shadow-2xl max-h-48 overflow-y-auto bg-white z-[100] border-slate-100 mt-1">
                        {PROMOTION_OPTIONS.map((o: any, i: number) => (
                          <div key={o.value} className={cn("p-2 cursor-pointer border-b last:border-0 text-[10px] font-bold uppercase", dropdownIdx === i ? "bg-primary text-white" : "hover:bg-slate-50")} onMouseDown={() => handleSelection('promotion', o.value, fitnessInputRef, 'fitness')}>{o.label}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Fitness */}
                  <div className="space-y-1 relative acr-nav-group">
                    <Label className="text-[10px] font-black text-[#405189] uppercase">Fitness (After 25Y)</Label>
                    <div className="relative">
                      <Input ref={fitnessInputRef} readOnly className="border-slate-200/50 h-10 bg-slate-50 border-none font-bold text-xs rounded-xl uppercase cursor-pointer focus:ring-2 focus:ring-primary/20" value={FITNESS_OPTIONS.find(o => o.value === acrFormData.fitness_after_25_years)?.label || ''} onFocus={() => !isJumping.current && setActiveDropdown('fitness')} onKeyDown={(e) => handleDropdownKeyDown(e, FITNESS_OPTIONS, 'fitness_after_25_years', roSearchRef, 'ro')} />
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    </div>
                    {activeDropdown === 'fitness' && (
                      <div className="absolute w-full border rounded-xl shadow-2xl max-h-48 overflow-y-auto bg-white z-[100] border-slate-100 mt-1">
                        {FITNESS_OPTIONS.map((o: any, i: number) => (
                          <div key={o.value} className={cn("p-2 cursor-pointer border-b last:border-0 text-[10px] font-bold uppercase", dropdownIdx === i ? "bg-primary text-white" : "hover:bg-slate-50")} onMouseDown={() => handleSelection('fitness_after_25_years', o.value, roSearchRef, 'ro')}>{o.label}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1 relative acr-nav-group">
                    <Label className="text-[10px] font-black text-[#405189] uppercase">RO</Label>
                    <Input ref={roSearchRef} placeholder="SEARCH RO..." className="border-slate-200/50 h-10 bg-slate-50 border-none font-bold text-[10px] rounded-xl uppercase" value={roSearch} onFocus={() => !isJumping.current && setActiveDropdown('ro')} onChange={(e) => { setRoSearch(e.target.value); if(!e.target.value) setSelectedRo(null); setRoIdx(0); }} onKeyDown={(e) => handleSearchKeyDown(e, roSearchEmps || [], roIdx, setRoIdx, selectRo)} />
                    {activeDropdown === 'ro' && roSearchEmps && roSearchEmps.length > 0 && !selectedRo && (
                      <div className="absolute w-full border rounded-xl shadow-2xl max-h-48 overflow-y-auto bg-white z-[100] border-slate-100 mt-1">
                        {roSearchEmps.map((e: any, i: number) => (
                          <div key={e.id} className={cn("p-2 cursor-pointer border-b text-[10px] font-bold uppercase", roIdx === i ? "bg-primary text-white" : "hover:bg-slate-50")} onMouseDown={() => selectRo(e)}>{e.name}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1"><Label className="text-[10px] font-black text-[#405189] uppercase">RO Date</Label><Input ref={roDateRef} type="date" className="border-slate-200/50 h-10 bg-slate-50 border-none font-bold text-[10px] rounded-xl focus:ring-2 focus:ring-primary/20" value={acrFormData.ro_date} onChange={(e) => setAcrFormData((p:any) => ({...p, ro_date: e.target.value}))} onKeyDown={(e) => e.key === 'Enter' && jumpToField(coSearchRef, 'co')} /></div>
                  <div className="space-y-1 relative acr-nav-group">
                    <Label className="text-[10px] font-black text-[#405189] uppercase">CO</Label>
                    <Input ref={coSearchRef} placeholder="SEARCH CO..." className="border-slate-200/50 h-10 bg-slate-50 border-none font-bold text-[10px] rounded-xl uppercase" value={coSearch} onFocus={() => !isJumping.current && setActiveDropdown('co')} onChange={(e) => { setCoSearch(e.target.value); if(!e.target.value) setSelectedCo(null); setCoIdx(0); }} onKeyDown={(e) => handleSearchKeyDown(e, coSearchEmps || [], coIdx, setCoIdx, selectCo)} />
                    {activeDropdown === 'co' && coSearchEmps && coSearchEmps.length > 0 && !selectedCo && (
                      <div className="absolute w-full border rounded-xl shadow-2xl max-h-48 overflow-y-auto bg-white z-[100] border-slate-100 mt-1">
                        {coSearchEmps.map((e: any, i: number) => (
                          <div key={e.id} className={cn("p-2 cursor-pointer border-b text-[10px] font-bold uppercase", coIdx === i ? "bg-primary text-white" : "hover:bg-slate-50")} onMouseDown={() => selectCo(e)}>{e.name}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1"><Label className="text-[10px] font-black text-[#405189] uppercase">CO Date</Label><Input ref={coDateRef} type="date" className="border-slate-200/50 h-10 bg-slate-50 border-none font-bold text-[10px] rounded-xl focus:ring-2 focus:ring-primary/20" value={acrFormData.co_date} onChange={(e) => setAcrFormData((p:any) => ({...p, co_date: e.target.value}))} onKeyDown={(e) => e.key === 'Enter' && jumpToField(resultInputRef, 'result')} /></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Result */}
                  <div className="space-y-1 relative acr-nav-group">
                    <Label className="text-[10px] font-black text-[#405189] uppercase">Result</Label>
                    <div className="relative">
                      <Input ref={resultInputRef} readOnly className="border-slate-200/50 h-10 bg-slate-50 border-none font-bold text-xs rounded-xl uppercase cursor-pointer focus:ring-2 focus:ring-primary/20" value={RESULT_OPTIONS.find(o => o.value === acrFormData.result)?.label || ''} onFocus={() => !isJumping.current && setActiveDropdown('result')} onKeyDown={(e) => handleDropdownKeyDown(e, RESULT_OPTIONS, 'result', remarksRef, null)} />
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    </div>
                    {activeDropdown === 'result' && (
                      <div className="absolute w-full border rounded-xl shadow-2xl max-h-48 overflow-y-auto bg-white z-[100] border-slate-100 mt-1">
                        {RESULT_OPTIONS.map((o: any, i: number) => (
                          <div key={o.value} className={cn("p-2 cursor-pointer border-b last:border-0 text-[10px] font-bold uppercase", dropdownIdx === i ? "bg-primary text-white" : "hover:bg-slate-50")} onMouseDown={() => handleSelection('result', o.value, remarksRef, null)}>{o.label}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-3 space-y-1">
                    <Label className="text-[10px] font-black text-[#405189] uppercase">Remarks</Label>
                    <Input 
                      ref={remarksRef} 
                      className="border-slate-200/50 h-10 bg-slate-50 border-none font-bold text-xs uppercase rounded-xl focus:ring-2 focus:ring-primary/20" 
                      placeholder="ENTER REMARKS..." 
                      value={acrFormData.remarks} 
                      onChange={(e) => setAcrFormData((p:any) => ({...p, remarks: e.target.value}))} 
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === 'Tab') {
                          saveBtnRef.current?.focus();
                          e.preventDefault();
                        }
                      }} 
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button ref={saveBtnRef} className={cn("flex-1 h-12 text-xs font-black shadow-2xl transition-all rounded-2xl tracking-[0.3em] uppercase", editingPeriodId ? "bg-amber-500 hover:bg-amber-600" : "bg-[#405189] hover:bg-primary")} onClick={handleFormSave} disabled={!selectedFormEmp}>
                  {editingPeriodId ? <Edit2 className="h-4 w-4 mr-3" /> : <Save className="h-4 w-4 mr-3" />}
                  {editingPeriodId ? "Update ACR Entry" : "Save ACR Entry"}
                </Button>
                {editingPeriodId && (
                  <Button variant="outline" className="h-12 px-8 text-xs font-black rounded-2xl uppercase tracking-widest border-slate-200" onClick={() => {
                    setEditingPeriodId(null);
                    setAcrFormData((prev: any) => ({ ...prev, from_date: '', to_date: '', ga: '', promotion: '', remarks: '', fitness_after_25_years: '', ro_name: '', ro_date: '', co_name: '', co_date: '', result: '', status: 'Pending' }));
                  }}>Cancel</Button>
                )}
              </div>
            </CardContent>
          </Card>
          
          {selectedFormEmp && (
               <div className="mt-8 space-y-4">
                  <div className="flex items-center gap-3 no-print">
                    <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100 h-12">
                      <Button variant={historyTypeFilter === 'All' ? 'default' : 'ghost'} size="sm" onClick={() => setHistoryTypeFilter('All')} className="h-full px-6 font-bold text-[11px] uppercase rounded-lg">All</Button>
                      <Button variant={historyTypeFilter === 'Submitted' ? 'default' : 'ghost'} size="sm" onClick={() => setHistoryTypeFilter('Submitted')} className="h-full px-6 font-bold text-[11px] uppercase rounded-lg">Submitted</Button>
                      <Button variant={historyTypeFilter === 'Missing' ? 'default' : 'ghost'} size="sm" onClick={() => setHistoryTypeFilter('Missing')} className="h-full px-6 font-bold text-[11px] uppercase rounded-lg">Missing</Button>
                    </div>
                    <div className="flex-1"></div>
                    <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-100 h-12 px-2">
                        <div className="flex flex-col items-center justify-center px-4 border-r border-slate-100 mr-2">
                            <span className="text-lg font-black text-primary leading-none tabular-nums">{flatHistory.length}</span>
                            <span className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5">Records</span>
                        </div>
                        <Button variant="ghost" size="sm" className="h-9 px-4 text-[11px] font-black text-slate-600 uppercase rounded-lg flex items-center gap-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all" onClick={handleHistoryExportExcel}><FileDown className="h-4 w-4 text-emerald-600" /> Excel</Button>
                        <div className="w-[1px] h-6 bg-slate-100" />
                        <Button variant="ghost" size="sm" className="h-9 px-4 text-[11px] font-black text-slate-600 uppercase rounded-lg flex items-center gap-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all" onClick={handleHistoryExportPDF}><FileJson className="h-4 w-4 text-rose-600" /> PDF</Button>
                        <div className="w-[1px] h-6 bg-slate-100" />
                        <Button variant="ghost" size="sm" className="h-9 px-4 text-[11px] font-black text-slate-600 uppercase rounded-lg flex items-center gap-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all" onClick={handlePrint}><Printer className="h-4 w-4 text-blue-600" /> Print</Button>
                    </div>
                  </div>
                  <Card className="border-none shadow-2xl bg-white rounded-3xl overflow-hidden min-h-[200px]">
                    <div className="w-full overflow-x-auto">
                        <Table className="w-full whitespace-nowrap">
                            <TableHeader className="bg-[#405189]">
                                <TableRow className="border-none hover:bg-white/5">
                                <TableHead className="font-black text-white text-[9px] uppercase p-3 text-center">S.No</TableHead>
                                <TableHead className="font-black text-white text-[9px] uppercase p-3 text-center">Year</TableHead>
                                <TableHead className="font-black text-white text-[9px] uppercase p-3 text-center">From</TableHead>
                                <TableHead className="font-black text-white text-[9px] uppercase p-3 text-center">To</TableHead>
                                <TableHead className="font-black text-white text-[9px] uppercase p-3">GA</TableHead>
                                <TableHead className="font-black text-white text-[9px] uppercase p-3">Promotion</TableHead>
                                <TableHead className="font-black text-white text-[9px] uppercase p-3">Fitness</TableHead>
                                <TableHead className="font-black text-white text-[9px] uppercase p-3">RO Name</TableHead>
                                <TableHead className="font-black text-white text-[9px] uppercase p-3">CO Name</TableHead>
                                <TableHead className="font-black text-white text-[9px] uppercase p-3">Result</TableHead>
                                <TableHead className="font-black text-white text-[9px] uppercase p-3 text-center">Duration</TableHead>
                                <TableHead className="text-center text-white font-black text-[9px] uppercase p-3 sticky right-0 bg-[#405189]">Manage</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {flatHistory.length === 0 ? (
                                <TableRow><TableCell colSpan={12} className="py-20 text-center text-slate-300 font-black uppercase text-[10px] italic tracking-[0.3em]">No records found</TableCell></TableRow>
                                ) : (
                                flatHistory.map((p: any, idx: number) => (
                                    <TableRow key={p.id} className={cn("h-12 transition-colors border-b border-slate-100", p.type === 'Submitted' ? "bg-emerald-50/40 hover:bg-emerald-100/40" : "bg-rose-50/40 hover:bg-rose-100/40")}>
                                    <TableCell className="p-3 text-center font-black text-slate-400 text-[10px]">{idx + 1}</TableCell>
                                    
                                    <TableCell className="p-3 text-center font-black text-primary text-[11px] bg-primary/5">{p.year}</TableCell>
                                    <TableCell colSpan={2} className="p-3 text-center font-bold text-slate-700 text-[10px] tabular-nums uppercase">
                                        <div className="flex flex-col">
                                            <span>{formatDisplayDate(p.from)} - {formatDisplayDate(p.to)}</span>
                                            {p.type === 'Submitted' ? (
                                                <span className="text-[8px] text-emerald-600 font-black uppercase tracking-tighter">Submitted</span>
                                            ) : (
                                                <span className="text-[8px] text-rose-600 font-black uppercase tracking-tighter">Missing / Pending</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    
                                    <TableCell className="p-3 font-black text-slate-800 text-[9px] uppercase max-w-[120px] truncate" title={p.ga}>{p.ga || "-"}</TableCell>
                                    <TableCell className="p-3 font-bold text-slate-600 text-[9px] uppercase max-w-[150px] truncate" title={p.promotion}>{p.promotion || "-"}</TableCell>
                                    <TableCell className="p-3 font-bold text-slate-600 text-[9px] uppercase">{p.fitness_after_25_years || "-"}</TableCell>
                                    <TableCell className="p-3 font-bold text-slate-600 text-[9px] uppercase max-w-[120px] truncate" title={p.ro_name}>{p.ro_name || "-"}</TableCell>
                                    <TableCell className="p-3 font-bold text-slate-600 text-[9px] uppercase max-w-[120px] truncate" title={p.co_name}>{p.co_name || "-"}</TableCell>
                                    <TableCell className="p-3 font-black text-slate-700 text-[9px] uppercase">{p.result || "-"}</TableCell>
                                    
                                    <TableCell className="p-3 text-center font-black text-slate-500 text-[10px] italic">{formatTenure(p.from, p.to)}</TableCell>
                                    
                                    <TableCell className="text-center p-2 sticky right-0 bg-white shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.05)] border-l border-slate-100">
                                        <div className="flex justify-center gap-1">
                                        {p.type === 'Submitted' ? (
                                            <>
                                            <Button variant="ghost" size="sm" className="h-7 w-7 text-primary hover:bg-primary/10 p-0" onClick={() => startEdit(p.report, p)}>
                                                <Edit2 className="h-3 w-3" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-7 w-7 text-rose-300 hover:text-rose-600 transition-colors" onClick={() => deletePeriodMutation.mutate(p.id)}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                            </>
                                        ) : (
                                            <button className="h-7 px-2 text-[7px] font-black uppercase rounded border border-rose-200 text-rose-500 hover:bg-rose-50 tracking-tighter" onClick={() => startAddMissing(p)}>Add</button>
                                        )}
                                        </div>
                                    </TableCell>
                                    </TableRow>
                                ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                  </Card>
               </div>
          )}
            </>
          )}
        </TabsContent>

        <TabsContent value="History" className="space-y-8 mt-6">
          {category === 'History' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 px-2">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm flex items-center italic"><History className="h-4 w-4 mr-3 text-primary" /> All Officials ACR History </h3>
                {selectedFormEmp && <Badge className="bg-primary/10 text-primary border-none font-black px-4 py-1.5 rounded-full uppercase tracking-tighter italic">Filtering by: {selectedFormEmp.name}</Badge>}
              </div>


                  <Card className="border-none shadow-sm bg-white overflow-visible rounded-xl border border-slate-100 no-print z-50">
                    <div className="flex flex-wrap items-center divide-x divide-slate-100 p-0">
                      <div className="flex-1 min-w-[120px]"><MultiSelect label="Year" options={availableYears} selected={historyYearFilter} onChange={(vals) => setHistoryYearFilter(vals)} placeholder="Year" /></div>
                      <div className="flex-1 min-w-[120px]"><MultiSelect label="GA" options={['Outstanding', 'Very Good', 'Good', 'Average', 'Below Average', 'Poor']} selected={historyGaFilter} onChange={(vals) => setHistoryGaFilter(vals)} placeholder="GA" /></div>
                      <div className="flex-1 min-w-[120px]"><MultiSelect label="Promotion" options={['Recommended for accelerated Promotion', 'Fit for Promotion', 'Recently promoted', 'Assessment for the further promotion in premature', 'Not yet fit for promotion but likely to become fit in course of time', 'Unfit for further promotion', 'Has reached his ceiling']} selected={historyPromotionFilter} onChange={(vals) => setHistoryPromotionFilter(vals)} placeholder="Promotion" /></div>
                      <div className="flex-1 min-w-[120px]"><MultiSelect label="Remarks" options={['Satisfactory', 'Not Satisfactory']} selected={historyRemarksFilter} onChange={(vals) => setHistoryRemarksFilter(vals)} placeholder="Remarks" /></div>
                      <div className="flex-1 min-w-[120px]"><MultiSelect label="Fitness" options={['Fit', 'Unfit']} selected={historyFitnessFilter} onChange={(vals) => setHistoryFitnessFilter(vals)} placeholder="Fitness" /></div>
                      <div className="p-2 flex items-center justify-center">
                        <Button variant="ghost" size="sm" className="h-[36px] px-4 w-full text-[10px] font-black text-rose-500 uppercase hover:bg-rose-50 border border-rose-100 rounded-lg" onClick={() => {
                          setHistoryYearFilter([]);
                          setHistoryGaFilter([]);
                          setHistoryPromotionFilter([]);
                          setHistoryRemarksFilter([]);
                          setHistoryFitnessFilter([]);
                          setHistorySearch('');
                          setHistoryTypeFilter('All');
                        }}>Clear All</Button>
                      </div>
                    </div>
                  </Card>

                  <div className="flex items-center gap-3 no-print">
                    <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100 h-12">
                      <Button variant={historyTypeFilter === 'All' ? 'default' : 'ghost'} size="sm" onClick={() => setHistoryTypeFilter('All')} className="h-full px-6 font-bold text-[11px] uppercase rounded-lg">All</Button>
                      <Button variant={historyTypeFilter === 'Submitted' ? 'default' : 'ghost'} size="sm" onClick={() => setHistoryTypeFilter('Submitted')} className="h-full px-6 font-bold text-[11px] uppercase rounded-lg">Submitted</Button>
                      <Button variant={historyTypeFilter === 'Missing' ? 'default' : 'ghost'} size="sm" onClick={() => setHistoryTypeFilter('Missing')} className="h-full px-6 font-bold text-[11px] uppercase rounded-lg">Missing</Button>
                    </div>
                    <div className="relative group flex-1 h-12">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                      <Input placeholder="SEARCH HISTORY..." className="border-slate-200/50 h-12 pl-12 bg-white border-none shadow-sm text-[16px] font-bold uppercase tracking-tight placeholder:text-slate-200 focus-visible:ring-1 focus-visible:ring-primary rounded-xl transition-all" value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-100 h-12 px-2">
                        <div className="flex flex-col items-center justify-center px-4 border-r border-slate-100 mr-2">
                            <span className="text-lg font-black text-primary leading-none tabular-nums">{flatHistory.length}</span>
                            <span className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5">Records</span>
                        </div>
                        <Button variant="ghost" size="sm" className="h-9 px-4 text-[11px] font-black text-slate-600 uppercase rounded-lg flex items-center gap-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all" onClick={handleHistoryExportExcel}><FileDown className="h-4 w-4 text-emerald-600" /> Excel</Button>
                        <div className="w-[1px] h-6 bg-slate-100" />
                        <Button variant="ghost" size="sm" className="h-9 px-4 text-[11px] font-black text-slate-600 uppercase rounded-lg flex items-center gap-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all" onClick={handleHistoryExportPDF}><FileJson className="h-4 w-4 text-rose-600" /> PDF</Button>
                        <div className="w-[1px] h-6 bg-slate-100" />
                        <Button variant="ghost" size="sm" className="h-9 px-4 text-[11px] font-black text-slate-600 uppercase rounded-lg flex items-center gap-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all" onClick={handlePrint}><Printer className="h-4 w-4 text-blue-600" /> Print</Button>
                        </div>
                        </div>
                        </div>

                        <Card className="border-none shadow-2xl bg-white rounded-3xl overflow-hidden min-h-[300px]">
              <div className="w-full overflow-x-auto">
                <Table className="w-full whitespace-nowrap">
                  <TableHeader className="bg-[#405189]">
                    <TableRow className="border-none hover:bg-white/5">
                      <TableHead className="font-black text-white text-[9px] uppercase p-3 text-center">S.No</TableHead>
                      <TableHead className="font-black text-white text-[9px] uppercase p-3">Code</TableHead>
                      <TableHead className="font-black text-white text-[9px] uppercase p-3">Name</TableHead>
                      <TableHead className="font-black text-white text-[9px] uppercase p-3">BPS</TableHead>
                      <TableHead className="font-black text-white text-[9px] uppercase p-3">Designation</TableHead>
                      <TableHead className="font-black text-white text-[9px] uppercase p-3">Office / Branch</TableHead>
                      <TableHead className="font-black text-white text-[9px] uppercase p-3 text-center">Year</TableHead>
                      <TableHead className="font-black text-white text-[9px] uppercase p-3 text-center">From</TableHead>
                      <TableHead className="font-black text-white text-[9px] uppercase p-3 text-center">To</TableHead>
                      <TableHead className="font-black text-white text-[9px] uppercase p-3">GA</TableHead>
                      <TableHead className="font-black text-white text-[9px] uppercase p-3">Promotion</TableHead>
                      <TableHead className="font-black text-white text-[9px] uppercase p-3">Fitness</TableHead>
                      <TableHead className="font-black text-white text-[9px] uppercase p-3">RO Name</TableHead>
                      <TableHead className="font-black text-white text-[9px] uppercase p-3">CO Name</TableHead>
                      <TableHead className="font-black text-white text-[9px] uppercase p-3">Result</TableHead>
                      <TableHead className="font-black text-white text-[9px] uppercase p-3 text-center">Duration</TableHead>
                      <TableHead className="text-center text-white font-black text-[9px] uppercase p-3 sticky right-0 bg-[#405189]">Manage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flatHistory.length === 0 ? (
                      <TableRow><TableCell colSpan={17} className="py-40 text-center text-slate-300 font-black uppercase text-[10px] italic tracking-[0.3em]">No records found</TableCell></TableRow>
                    ) : (
                      flatHistory.slice(0, historyPage * ITEMS_PER_PAGE).map((p: any, idx: number) => (
                        <TableRow key={p.id} className={cn("h-12 transition-colors border-b border-slate-100", p.type === 'Submitted' ? "bg-emerald-50/40 hover:bg-emerald-100/40" : "bg-rose-50/40 hover:bg-rose-100/40")}>
                          <TableCell className="p-3 text-center font-black text-slate-400 text-[10px]">{idx + 1}</TableCell>
                          <TableCell className="p-3 font-bold text-slate-600 text-[10px]">{p.emp?.code || p.emp?.id}</TableCell>
                          <TableCell className="p-3 font-black text-slate-900 text-[11px] uppercase">{p.emp?.name}</TableCell>
                          <TableCell className="p-3 font-black text-primary text-[10px]">{p.emp?.bs}</TableCell>
                          <TableCell className="p-3 font-bold text-slate-600 text-[10px] uppercase max-w-[150px] truncate" title={p.emp?.post_name}>{p.emp?.post_name}</TableCell>
                          <TableCell className="p-3 font-bold text-slate-600 text-[10px] uppercase max-w-[150px] truncate" title={p.emp?.branch_office}>{p.emp?.branch_office}</TableCell>
                          
                          <TableCell className="p-3 text-center font-black text-primary text-[11px] bg-primary/5">{p.year}</TableCell>
                          <TableCell colSpan={2} className="p-3 text-center font-bold text-slate-700 text-[10px] tabular-nums uppercase">
                              <div className="flex flex-col">
                                  <span>{formatDisplayDate(p.from)} - {formatDisplayDate(p.to)}</span>
                                  {p.type === 'Submitted' ? (
                                      <span className="text-[8px] text-emerald-600 font-black uppercase tracking-tighter">Submitted</span>
                                  ) : (
                                      <span className="text-[8px] text-rose-600 font-black uppercase tracking-tighter">Missing / Pending</span>
                                  )}
                              </div>
                          </TableCell>
                          
                          <TableCell className="p-3 font-black text-slate-800 text-[9px] uppercase max-w-[120px] truncate" title={p.ga}>{p.ga || "-"}</TableCell>
                          <TableCell className="p-3 font-bold text-slate-600 text-[9px] uppercase max-w-[150px] truncate" title={p.promotion}>{p.promotion || "-"}</TableCell>
                          <TableCell className="p-3 font-bold text-slate-600 text-[9px] uppercase">{p.fitness_after_25_years || "-"}</TableCell>
                          <TableCell className="p-3 font-bold text-slate-600 text-[9px] uppercase max-w-[120px] truncate" title={p.ro_name}>{p.ro_name || "-"}</TableCell>
                          <TableCell className="p-3 font-bold text-slate-600 text-[9px] uppercase max-w-[120px] truncate" title={p.co_name}>{p.co_name || "-"}</TableCell>
                          <TableCell className="p-3 font-black text-slate-700 text-[9px] uppercase">{p.result || "-"}</TableCell>
                          
                          <TableCell className="p-3 text-center font-black text-slate-500 text-[10px] italic">{formatTenure(p.from, p.to)}</TableCell>
                          
                          <TableCell className="text-center p-2 sticky right-0 bg-white shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.05)] border-l border-slate-100">
                            <div className="flex justify-center gap-1">
                              {p.type === 'Submitted' ? (
                                <>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 text-primary hover:bg-primary/10 p-0" onClick={() => startEdit(p.report, p)}>
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 text-rose-300 hover:text-rose-600 transition-colors" onClick={() => deletePeriodMutation.mutate(p.id)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </>
                              ) : (
                                <button className="h-7 px-2 text-[7px] font-black uppercase rounded border border-rose-200 text-rose-500 hover:bg-rose-50 tracking-tighter" onClick={() => startAddMissing(p)}>Add Missing</button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {flatHistory.length > historyPage * ITEMS_PER_PAGE && (
                <div className="flex justify-center p-6 bg-slate-50 border-t border-slate-100">
                  <Button variant="outline" className="px-8 font-black uppercase text-xs tracking-widest text-primary border-primary hover:bg-primary hover:text-white" onClick={() => setHistoryPage(p => p + 1)}>Load More Records</Button>
                </div>
              )}
            </Card>
          </div>
          )}
        </TabsContent>

        <TabsContent value={category === 'Form' || category === 'History' ? 'Officer' : category} className="space-y-4 mt-6">
          {(category === 'Officer' || category === 'Official') && (
            <div className="space-y-4">
              <Card className="border-none shadow-sm bg-white overflow-visible rounded-xl border border-slate-100 no-print z-50">
                <div className="flex flex-wrap items-center divide-x divide-slate-100 p-0">
                <div className="flex-1 min-w-[150px]"><MultiSelect label="Year" options={availableYears} selected={tabYearsFilter} onChange={(vals) => setTabYearsFilter(vals)} placeholder="Year" /></div>
                <div className="flex-1 min-w-[150px]"><MultiSelect label="Status" options={['Completed', 'Incomplete']} selected={completionFilter} onChange={(vals) => setCompletionFilter(vals)} placeholder="Status" /></div>
                {category === 'Officer' && (
                    <div className="flex-1 min-w-[150px]"><MultiSelect label="Periods" options={['Pending', 'Sent']} selected={statusFilter} onChange={(vals) => setStatusFilter(vals)} placeholder="Periods" /></div>
                )}
                <div className="flex-1 min-w-[150px]"><MultiSelect label="Designation" options={Array.from(new Set(employees?.map((e: any) => e.post_name).filter(Boolean)))} selected={designationFilter} onChange={(vals) => setDesignationFilter(vals)} placeholder="Designation" /></div>
                {category === 'Official' && (
                <>
                    <div className="flex-1 min-w-[120px]"><MultiSelect label="GA" options={['Outstanding', 'Very Good', 'Good', 'Average', 'Below Average', 'Poor']} selected={gaFilter} onChange={(vals) => setGaFilter(vals)} placeholder="GA" /></div>
                    <div className="flex-1 min-w-[120px]"><MultiSelect label="Promotion" options={['Recommended for accelerated Promotion', 'Fit for Promotion', 'Recently promoted', 'Assessment for the further promotion in premature', 'Not yet fit for promotion but likely to become fit in course of time', 'Unfit for further promotion', 'Has reached his ceiling']} selected={promotionFilter} onChange={(vals) => setPromotionFilter(vals)} placeholder="Promotion" /></div>
                    <div className="flex-1 min-w-[120px]"><MultiSelect label="Remarks" options={['Satisfactory', 'Not Satisfactory']} selected={remarksFilter} onChange={(vals) => setRemarksFilter(vals)} placeholder="Remarks" /></div>
                    <div className="flex-1 min-w-[120px]"><MultiSelect label="Fitness" options={['Fit', 'Unfit']} selected={fitnessFilter} onChange={(vals) => setFitnessFilter(vals)} placeholder="Fitness" /></div>
                </>
                )}
                <div className="p-2 flex items-center justify-center">
                    <Button variant="ghost" size="sm" className="h-[36px] px-4 w-full text-[10px] font-black text-rose-500 uppercase hover:bg-rose-50 border border-rose-100 rounded-lg" onClick={resetFilters}>Clear</Button>
                </div>
            </div>
          </Card>

          <div className="flex items-center gap-3 no-print">
            <div className="relative group flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
              <Input placeholder={`SEARCH ${category.toUpperCase()} (NAME, CNIC)...`} className="border-slate-200/50 h-12 pl-12 bg-white border-none shadow-sm text-[16px] font-bold uppercase tracking-tight placeholder:text-slate-200 focus-visible:ring-1 focus-visible:ring-primary rounded-xl transition-all" value={search} onChange={(e) => setSearch(e.target.value)} />
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
                <TableHeader className="bg-[#405189]">
                  <TableRow className="hover:bg-[#405189] border-none h-14">
                    {(category === 'Officer' ? OFFICERS_COLUMNS : OFFICIALS_COLUMNS).map((col) => {
                      const sortKeyMap: any = { 'Name': 'name', 'Designation': 'post_name', 'BPS': 'bs', 'Office': 'branch_office' };
                      const sortKey = sortKeyMap[col.name];
                      return (
                        <TableHead key={col.name} className={`${col.width} text-white font-black text-[12px] uppercase p-2 ${['Duration', 'Status', 'Actions'].includes(col.name) ? 'text-center' : ''} ${sortKey ? 'cursor-pointer hover:bg-[#405189] transition-colors' : ''}`} onClick={() => sortKey && handleSort(sortKey)}>
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
                        const joiningYear = getYearFromDate(emp.joining_date);
                        const yearsToProcess = tabYearsFilter.length > 0 ? tabYearsFilter : availableYears;
                        
                        let displayRows: any[] = [];
                        let allSubmitted: any[] = [];

                        yearsToProcess.forEach((y: string) => {
                            if (joiningYear > 0 && parseInt(y) < joiningYear) return;

                            const r = emp.reports?.find((rep: any) => rep.year === y);
                            let submittedForYear = [];
                            if (r) {
                                submittedForYear = r.periods?.map((p: any) => ({...p, reportId: r.id, isManuallyCompleted: r.is_manually_completed, type: 'Submitted', year: y})) || [];
                            }
                            
                            const gapsForYear = calculateGaps(y, submittedForYear, emp.joining_date).map((g: any, idx: number) => ({ id: `gap-${emp.id}-${y}-${idx}`, year: y, from: g.start.toISOString().split('T')[0], to: g.end.toISOString().split('T')[0], type: 'Remaining', status: 'Pending' }));
                            
                            displayRows.push(...submittedForYear, ...gapsForYear);
                            allSubmitted.push(...submittedForYear);
                        });

                        if (displayRows.length === 0) return null;

                        displayRows.sort((a, b) => new Date(a.from).getTime() - new Date(b.from).getTime());
                        const total = getSumTenure(allSubmitted);
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
                                <button className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 text-xs font-black uppercase rounded-lg border-primary text-primary hover:bg-primary/10 tracking-widest px-3")} onClick={() => startAddMissing({ year: tabYearsFilter[0] || new Date().getFullYear().toString(), from: '', to: '' }, emp)}><Plus className="h-3 w-3 mr-1"/> Add Period</button>
                            </TableCell>
                          </TableRow>
                        ) : (
                            displayRows.map((p: any, pIdx: number) => (
                                <TableRow key={p.id} className={cn("transition-colors border-b border-slate-100", p.type === 'Submitted' ? "bg-emerald-50/40 hover:bg-emerald-100/40" : "bg-rose-50/40 hover:bg-rose-100/40")}>
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
                                            <span>{formatDisplayDate(p.from)} - {formatDisplayDate(p.to)}</span>
                                            {p.type === 'Remaining' && <span className="text-[8px] text-rose-500 font-black uppercase tracking-tighter">Remaining</span>}
                                            {p.type === 'Submitted' && <span className="text-[8px] text-emerald-500 font-black uppercase tracking-tighter">Submitted</span>}
                                        </div>
                                    </TableCell>
                                    {category === 'Official' && (
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
                                                <button className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 w-8 text-primary hover:bg-primary/10 p-0")} onClick={() => startAddMissing({ year: p.year, from: '', to: '' }, emp)}><Plus className="h-4 w-4" /></button>
                                                <Button variant="ghost" size="sm" className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 h-8 w-8 p-0" onClick={() => deletePeriod(p.id)}><Trash2 className="h-4 w-4" /></Button>
                                            </>
                                        ) : (
                                            <button className="h-8 px-2 text-[8px] font-black uppercase rounded border border-rose-200 text-rose-500 hover:bg-rose-50 tracking-tighter" onClick={() => startAddMissing(p, emp)}>Add Missing</button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                        {allSubmitted.length > 0 && (
                            <TableRow className="bg-slate-50 font-bold text-[11px] uppercase border-b border-slate-100">
                                <TableCell colSpan={5} className="text-right border-r border-slate-100 py-3 px-4 font-black text-slate-400">Summary</TableCell>
                                <TableCell colSpan={category === 'Officer' ? 4 : 7} className="text-right py-3 px-6 text-slate-900 tracking-tight">
                                    <span className="text-slate-400 mr-2 italic">Total Duration:</span>
                                    <span className="text-primary font-black mr-4">{`${total.submitted.y}Y ${total.submitted.m}M ${total.submitted.d}D`}</span>
                                    <span className="text-slate-300 mx-2">|</span> 
                                    <span className="text-slate-400 mr-2 italic">Remaining:</span>
                                    <span className="text-rose-500 font-black mr-4">{`${total.remaining.y}Y ${total.remaining.m}M ${total.remaining.d}D`}</span>
                                    <span className="text-slate-300 mx-2">|</span> 
                                    {allSubmitted.some((p: any) => p.isManuallyCompleted) || total.totalDays >= 365 ? (
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
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
