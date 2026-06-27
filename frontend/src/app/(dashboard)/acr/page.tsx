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
  { name: 'Fitness', width: 'w-24' },
  { name: 'Result', width: 'w-32' },
  { name: 'Duration', width: 'w-24' },
  { name: 'Actions', width: 'w-24' }
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
  { value: 'Recommended for accelerated Promotion', label: 'A - Recommended for accelerated Promotion', key: 'A' },
  { value: 'Fit for Promotion', label: 'B - Fit for Promotion', key: 'B' },
  { value: 'Recently promoted', label: 'C - Recently promoted', key: 'C' },
  { value: 'Assessment for the further promotion in premature', label: 'D - Assessment for the further promotion in premature', key: 'D' },
  { value: 'Not yet fit for promotion but likely to become fit in course of time', label: 'E - Not yet fit for promotion but likely to become fit in course of time', key: 'E' },
  { value: 'Unfit for further promotion', label: 'F - Unfit for further promotion', key: 'F' },
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
  const [page, setPage] = useState(1);
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
      const prevYear = (new Date().getFullYear() - 1).toString();
      const defaultYear = availableYears.includes(prevYear) ? prevYear : availableYears[availableYears.length - 1];
      setTabYearsFilter([defaultYear]);
    }
  }, [availableYears]);

  const [completionFilter, setCompletionFilter] = useState<string[]>([]); 
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [gaFilter, setGaFilter] = useState<string[]>([]);
  const [promotionFilter, setPromotionFilter] = useState<string[]>([]);
  const [resultFilter, setResultFilter] = useState<string[]>([]);
  const [fitnessFilter, setFitnessFilter] = useState<string[]>([]);
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

    fitness_after_25_years: '',
    ro_name: '',
    ro_date: '',
    co_name: '',
    co_date: '', 
    result: '',
    ro_remarks: '',
    co_remarks: '',
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
  const [historyResultFilter, setHistoryResultFilter] = useState<string[]>([]);
  const [historyFitnessFilter, setHistoryFitnessFilter] = useState<string[]>([]);
  const [historyYearFilter, setHistoryYearFilter] = useState<string[]>([]);
  const [historyPage, setHistoryPage] = useState(1);

  const [officerModalOpen, setOfficerModalOpen] = useState(false);
  const [officerModalData, setOfficerModalData] = useState<any>({ emp: null, year: '', from_date: '', to_date: '', status: 'Pending' });
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
  const roRemarksRef = useRef<HTMLInputElement>(null);
  const coRemarksRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, category]);

  const resetFilters = () => {
    const prevYear = (new Date().getFullYear() - 1).toString();
    setTabYearsFilter([prevYear]);
    setStatusFilter([]);
    setGaFilter([]);
    setPromotionFilter([]);
    setResultFilter([]);
    setFitnessFilter([]);
    setDesignationFilter([]);
    setCompletionFilter([]);
    setSearch('');
  };

  const { data: employeesData, isLoading: isLoadingEmployees, refetch: refetchEmployees } = useQuery({
    queryKey: ['acr-employees', deferredSearch, category === 'Form' ? 'Officer' : (category === 'History' ? 'Official' : category), page],
    queryFn: async () => {
      const apiCategory = category === 'Form' ? 'Officer' : (category === 'History' ? 'Official' : category);
      const res = await api.get(`/api/acr?search=${deferredSearch}&category=${apiCategory}&skip=${(page - 1) * 100}&limit=100`);
      return {
        data: res.data,
        totalCount: parseInt(res.headers['x-total-count'] || '0')
      };
    },
  });

  const employees = employeesData?.data || [];
  const totalCount = employeesData?.totalCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / 100));

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
          const res = await api.get(`/api/acr?category=All&limit=10000`);
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
    
    // Add 1 day to end date to make it inclusive (e.g., Jan 1 to Jan 31 is 31 days -> 1 month exactly)
    const end = new Date(d2.getTime());
    end.setDate(end.getDate() + 1);

    let y = end.getFullYear() - d1.getFullYear();
    let m = end.getMonth() - d1.getMonth();
    let d = end.getDate() - d1.getDate();

    if (d < 0) {
        m -= 1;
        const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
        d += prevMonth;
    }
    if (m < 0) {
        y -= 1;
        m += 12;
    }
    
    if (y === 1 && m === 0 && d === 0) return "1 Year";
    if (y === 0 && m === 0 && d === 0) return "0Y 0M 0D";
    return `${y > 0 ? y + 'Y ' : ''}${m}M ${d}D`.trim();
  };

  const getSumTenure = (periods: any[], gaps: any[] = []) => {
    let totalDays = 0;
    let sy = 0, sm = 0, sd = 0;
    
    periods.forEach(p => {
        if (!p.from || !p.to) return;
        const d1 = new Date(p.from);
        const d2 = new Date(p.to);
        totalDays += Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        const dStr = formatTenure(p.from, p.to);
        if (dStr === "1 Year") {
            sy += 1;
        } else {
            const match = dStr.match(/(?:(\d+)Y\s*)?(\d+)M (\d+)D/);
            if (match) {
                sy += parseInt(match[1] || '0');
                sm += parseInt(match[2]);
                sd += parseInt(match[3]);
            }
        }
    });

    sm += Math.floor(sd / 30);
    sd = sd % 30;
    sy += Math.floor(sm / 12);
    sm = sm % 12;

    const isManuallyCompleted = periods.some(p => p.isManuallyCompleted);

    let ry = 0, rm = 0, rd = 0;
    if (isManuallyCompleted) {
        ry = 0;
        rm = 0;
        rd = 0;
    } else if (gaps && gaps.length > 0) {
        gaps.forEach(g => {
            if (!g.from || !g.to) return;
            const dStr = formatTenure(g.from, g.to);
            if (dStr === "1 Year") {
                ry += 1;
            } else {
                const match = dStr.match(/(?:(\d+)Y\s*)?(\d+)M (\d+)D/);
                if (match) {
                    ry += parseInt(match[1] || '0');
                    rm += parseInt(match[2]);
                    rd += parseInt(match[3]);
                }
            }
        });
        rm += Math.floor(rd / 30);
        rd = rd % 30;
        ry += Math.floor(rm / 12);
        rm = rm % 12;
    } else {
        const remainingDays = Math.max(0, 365 - totalDays);
        ry = Math.floor(remainingDays / 365);
        const remT = remainingDays % 365;
        rm = Math.floor(remT / 30.4167);
        rd = Math.round(remT - (rm * 30.4167));
    }

    return { submitted: { y: sy, m: sm, d: sd }, remaining: { y: ry, m: rm, d: rd }, totalDays, isCompleted: totalDays >= 365 || isManuallyCompleted };
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
                const gaps = r.is_manually_completed ? [] : calculateGaps(y, submitted, emp.joining_date).map((g: any, idx: number) => ({
                    id: `gap-${emp.id}-${y}-${idx}`,
                    year: y,
                    report: r,
                    emp,
                    from: g.start.toISOString().split('T')[0],
                    to: g.end.toISOString().split('T')[0],
                    type: 'Missing', 
                    ga: '', promotion: '', fitness_after_25_years: '', ro_name: '', co_name: '', result: '', ro_remarks: '', co_remarks: ''
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
                    ga: '', promotion: '', fitness_after_25_years: '', ro_name: '', co_name: '', result: '', ro_remarks: '', co_remarks: ''
                });
            }
        });
    });

    all = all.filter((p: any) => {
        if (historyTypeFilter !== 'All' && p.type !== historyTypeFilter) return false;

        const matchesGa = historyGaFilter.length === 0 || historyGaFilter.includes(p.ga);
        const matchesPromotion = historyPromotionFilter.length === 0 || historyPromotionFilter.includes(p.promotion);
        const matchesResult = historyResultFilter.length === 0 || historyResultFilter.includes(p.result);
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
        return matchesGa && matchesPromotion && matchesResult && matchesFitness && matchesSearch;
    });

    if (sort.key && sort.order) {
        all.sort((a, b) => {
            let valA = a[sort.key] !== undefined ? a[sort.key] : (a.emp && a.emp[sort.key]) || '';
            let valB = b[sort.key] !== undefined ? b[sort.key] : (b.emp && b.emp[sort.key]) || '';
            if (sort.key === 'bs') {
                const numA = parseInt(valA) || 0;
                const numB = parseInt(valB) || 0;
                return sort.order === 'asc' ? numA - numB : numB - numA;
            }
            if (sort.key === 'from' || sort.key === 'to') {
                return sort.order === 'asc' 
                    ? new Date(valA).getTime() - new Date(valB).getTime()
                    : new Date(valB).getTime() - new Date(valA).getTime();
            }
            valA = valA.toString().toLowerCase();
            valB = valB.toString().toLowerCase();
            if (valA < valB) return sort.order === 'asc' ? -1 : 1;
            if (valA > valB) return sort.order === 'asc' ? 1 : -1;
            return 0;
        });
    } else {
        // Default Sort by Employee Name, then Year, then Date
        all.sort((a, b) => {
            if (a.emp?.name !== b.emp?.name) return (a.emp?.name || '').localeCompare(b.emp?.name || '');
            if (a.year !== b.year) return (a.year || '').localeCompare(b.year || '');
            return new Date(a.from).getTime() - new Date(b.from).getTime();
        });
    }

    return all;
  }, [category, allHistoryData, selectedEmpHistoryData, historyTypeFilter, historySearch, historyGaFilter, historyPromotionFilter, historyResultFilter, historyFitnessFilter, historyYearFilter, availableYears, selectedFormEmp, sort]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historyTypeFilter, historySearch, historyGaFilter, historyPromotionFilter, historyResultFilter, historyFitnessFilter, historyYearFilter]);

  const filteredEmployees = React.useMemo(() => {
    // Optimization: Only compute this if we are on Officer or Official tabs
    if (category !== 'Officer' && category !== 'Official') return [];

    const yearsToProcess = tabYearsFilter.length > 0 ? tabYearsFilter : availableYears;

    let result = employees?.filter((emp: any) => {
      const joiningYear = getYearFromDate(emp.joining_date);

      let allPeriodsForEmp: any[] = [];
      let totalSavedDays = 0;
      let validYears = 0;

      yearsToProcess.forEach((y: string) => {
          if (joiningYear > 0 && parseInt(y) < joiningYear) return;
          validYears++;

          const r = emp.reports?.find((rep: any) => rep.year === y);
          let submittedForYear: any[] = [];
          let isManuallyCompleted = false;
          if (r) {
              isManuallyCompleted = r.is_manually_completed;
              submittedForYear = r.periods?.map((p: any) => ({...p, reportId: r.id, isManuallyCompleted: r.is_manually_completed, type: 'Submitted', year: y})) || [];
          }
          
          const gapsForYear = isManuallyCompleted ? [] : calculateGaps(y, submittedForYear, emp.joining_date).map((g: any, idx: number) => ({ id: `gap-${emp.id}-${y}-${idx}`, year: y, from: g.start.toISOString().split('T')[0], to: g.end.toISOString().split('T')[0], type: 'Remaining', status: 'Pending' }));
          
          allPeriodsForEmp.push(...submittedForYear, ...gapsForYear);
          totalSavedDays += getSumTenure(submittedForYear).totalDays;
      });

      if (allPeriodsForEmp.length === 0 && yearsToProcess.length > 0) return false;

      const isCompleted = allPeriodsForEmp.some((p: any) => p.isManuallyCompleted) || totalSavedDays >= (365 * validYears);
      const matchesCompletion = completionFilter.length === 0 || (completionFilter.includes('Completed') && isCompleted) || (completionFilter.includes('Incomplete') && !isCompleted);
      
      const matchesStatus = statusFilter.length === 0 || allPeriodsForEmp.some((p: any) => statusFilter.includes(p.status));
      const matchesGa = gaFilter.length === 0 || allPeriodsForEmp.some((p: any) => gaFilter.includes(p.ga));
      const matchesPromotion = promotionFilter.length === 0 || allPeriodsForEmp.some((p: any) => promotionFilter.includes(p.promotion));
      const matchesResult = resultFilter.length === 0 || allPeriodsForEmp.some((p: any) => resultFilter.includes(p.result));
      const matchesFitness = fitnessFilter.length === 0 || allPeriodsForEmp.some((p: any) => fitnessFilter.includes(p.fitness_after_25_years));
      const matchesDesignation = designationFilter.length === 0 || designationFilter.includes(emp.post_name || '');
      
      return matchesCompletion && matchesStatus && matchesGa && matchesPromotion && matchesResult && matchesFitness && matchesDesignation;
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
  }, [category, employees, sort, completionFilter, statusFilter, gaFilter, promotionFilter, resultFilter, fitnessFilter, designationFilter, tabYearsFilter, availableYears]);

  // --- Mutations ---
  const addPeriodMutation = useMutation({
    mutationFn: async (data: any) => {
      let tid = data.reportId;
      const periodYear = data.period_data?.from_date ? data.period_data.from_date.split('-')[0] : (new Date().getFullYear() - 1).toString();
      if (!tid) tid = (await api.post('/api/acr/report', { report_data: { employee_id: data.employeeId, year: periodYear, status: 'Pending' } })).data.id;
      return api.post('/api/acr/period', { period_data: { acr_report_id: tid, ...data.period_data, status: data.period_data?.status || "Pending" } });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['acr-employees'] }); queryClient.invalidateQueries({ queryKey: ['acr-selected-history'] }); refetchAllHistory(); }
  });

  const updatePeriodMutation = useMutation({
    mutationFn: async (data: any) => api.patch(`/api/acr/period/${data.id}`, data.fields),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['acr-employees'] }); queryClient.invalidateQueries({ queryKey: ['acr-selected-history'] }); refetchAllHistory(); }
  });

  const deletePeriodMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/acr/period/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['acr-employees'] }); queryClient.invalidateQueries({ queryKey: ['acr-selected-history'] }); refetchAllHistory(); }
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

  const handleSearchKeyDown = (e: React.KeyboardEvent, list: any[], activeIdx: number, setIdx: any, onSelect: (item: any) => void, nextRef?: any) => {
    if (e.key === 'ArrowDown') { if (list && list.length > 0) setIdx((p: number) => Math.min(p + 1, list.length - 1)); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { if (list && list.length > 0) setIdx((p: number) => Math.max(p - 1, 0)); e.preventDefault(); }
    else if (e.key === 'Enter') { 
      if (list && list.length > 0 && list[activeIdx]) { 
        onSelect(list[activeIdx]); 
      } else if (nextRef) {
        setActiveDropdown(null);
        jumpToField(nextRef, null);
      }
      e.preventDefault(); 
    }
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
      ro_remarks: p.ro_remarks || '',
      co_remarks: p.co_remarks || '',
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
    const employee = empRecord || p.emp;
    const cleanDate = (d: string) => d ? d.split('T')[0] : '';
    const year = p.year?.toString() || (new Date().getFullYear() - 1).toString();
    const from_date = cleanDate(p.from);
    const to_date = cleanDate(p.to);

    if (category === 'Officer') {
      setOfficerModalData({ emp: employee, year, from_date, to_date, status: 'Pending' });
      setOfficerModalOpen(true);
      return;
    }

    isJumping.current = true;
    setActiveDropdown(null);
    setEditingPeriodId(null);
    setSelectedFormEmp(employee); 
    setFormEmpSearch(employee?.name || '');
    setRoSearch('');
    setCoSearch('');
    
    setAcrFormData({
      year,
      from_date,
      to_date,
      ga: '',
      promotion: '',

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
      
      setAcrFormData((prev: any) => ({ ...prev, from_date: '', to_date: '', ga: '', promotion: '', ro_remarks: '', co_remarks: '', fitness_after_25_years: '', ro_name: '', ro_date: '', co_name: '', co_date: '', result: '', status: 'Pending' }));
      setRoSearch(''); setCoSearch(''); setSelectedRo(null); setSelectedCo(null); setEditingPeriodId(null);
      refetchAllHistory(); queryClient.invalidateQueries({ queryKey: ['acr-employees'] }); queryClient.invalidateQueries({ queryKey: ['acr-selected-history'] });
      setTimeout(() => personnelSearchRef.current?.focus(), 100);
    } catch (err: any) { alert("Error saving"); }
  };

  const handleOfficerModalSave = async () => {
    if (!officerModalData.from_date || !officerModalData.to_date) {
      alert("Dates are required");
      return;
    }
    try {
      const allRes = await api.get(`/api/acr?search=${encodeURIComponent(officerModalData.emp.name)}&category=All&year=${officerModalData.year}`);
      const empRecord = allRes.data.find((e: any) => e.id === officerModalData.emp.id);
      let tid = empRecord?.reports?.find((r: any) => r.year === officerModalData.year)?.id;
      if (!tid) {
        const res = await api.post('/api/acr/report', { report_data: { employee_id: officerModalData.emp.id, year: officerModalData.year, status: officerModalData.status } });
        tid = res.data.id;
      }
      await api.post('/api/acr/period', { period_data: { acr_report_id: tid, from_date: officerModalData.from_date, to_date: officerModalData.to_date, status: officerModalData.status, ga: '', promotion: '', ro_remarks: '', co_remarks: '', fitness_after_25_years: '', ro_name: '', ro_date: '', co_name: '', co_date: '', result: '' } });
      alert("ACR Period Added!");
      setOfficerModalOpen(false);
      refetchAllHistory(); 
      queryClient.invalidateQueries({ queryKey: ['acr-employees'] }); queryClient.invalidateQueries({ queryKey: ['acr-selected-history'] });
    } catch (e) {
      console.error(e);
      alert("Error adding period");
    }
  };

  
  const [isExporting, setIsExporting] = useState(false);
  const generateDynamicTitle = () => {
      let subject = "ACR Management Report";
      const cat = category === 'Form' ? 'Officers' : (category === 'History' ? 'Officials' : category);
      if (cat) subject += ` (${cat})`;
      
      let parts = [];
      if (tabYearsFilter.length > 0) parts.push(`for Year ${tabYearsFilter[0]}`);
      else parts.push(`for All Years`);
      
      if (completionFilter.length > 0) parts.push(`- ${completionFilter.join(' & ')} only`);
      if (deferredSearch) parts.push(`matching "${deferredSearch}"`);
      
      return `${subject} ${parts.join(' ')}`.trim();
  };

  const handleExport = async (type: 'excel' | 'pdf' | 'print', isComplete: boolean = false) => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      if (deferredSearch) params.append('search', deferredSearch);
      const apiCategory = category === 'Form' ? 'Officer' : (category === 'History' ? 'Official' : category);
      if (category) params.append('category', apiCategory);
      if (tabYearsFilter.length > 0) params.append('year', tabYearsFilter[0]);
      params.append('limit', '10000');
      
      const res = await api.get(`/api/acr?${params.toString()}`);
      let exportEmployees = res.data;

      if (!exportEmployees || exportEmployees.length === 0) {
        alert("No records found for export.");
        return;
      }

      exportEmployees = exportEmployees.filter((emp: any) => {
          const joiningYear = getYearFromDate(emp.joining_date);
          let allPeriodsForEmp: any[] = [];
          let totalSavedDays = 0;
          let validYears = 0;
          const yearsToProcess = tabYearsFilter.length > 0 ? tabYearsFilter : availableYears;

          yearsToProcess.forEach((y: string) => {
              if (joiningYear > 0 && parseInt(y) < joiningYear) return;
              validYears++;

              const r = emp.reports?.find((rep: any) => rep.year === y);
              let submittedForYear: any[] = [];
              let isManuallyCompleted = false;
              if (r) {
                  isManuallyCompleted = r.is_manually_completed;
                  submittedForYear = r.periods?.map((p: any) => ({...p, reportId: r.id, isManuallyCompleted: r.is_manually_completed, type: 'Submitted', year: y})) || [];
              }
              
              const gapsForYear = isManuallyCompleted ? [] : calculateGaps(y, submittedForYear, emp.joining_date).map((g: any, idx: number) => ({ id: `gap-${emp.id}-${y}-${idx}`, year: y, from: g.start.toISOString().split('T')[0], to: g.end.toISOString().split('T')[0], type: 'Remaining', status: 'Pending' }));
              
              allPeriodsForEmp.push(...submittedForYear, ...gapsForYear);
              totalSavedDays += getSumTenure(submittedForYear).totalDays;
          });

          if (allPeriodsForEmp.length === 0 && yearsToProcess.length > 0) return false;

          const isCompleted = allPeriodsForEmp.some((p: any) => p.isManuallyCompleted) || totalSavedDays >= (365 * validYears);
          const matchesCompletion = completionFilter.length === 0 || (completionFilter.includes('Completed') && isCompleted) || (completionFilter.includes('Incomplete') && !isCompleted);
          
          const matchesStatus = statusFilter.length === 0 || allPeriodsForEmp.some((p: any) => statusFilter.includes(p.status));
          const matchesGa = gaFilter.length === 0 || allPeriodsForEmp.some((p: any) => gaFilter.includes(p.ga));
          const matchesPromotion = promotionFilter.length === 0 || allPeriodsForEmp.some((p: any) => promotionFilter.includes(p.promotion));
          const matchesResult = resultFilter.length === 0 || allPeriodsForEmp.some((p: any) => resultFilter.includes(p.result));
          const matchesFitness = fitnessFilter.length === 0 || allPeriodsForEmp.some((p: any) => fitnessFilter.includes(p.fitness_after_25_years));
          const matchesDesignation = designationFilter.length === 0 || designationFilter.includes(emp.post_name);

          return matchesCompletion && matchesStatus && matchesGa && matchesPromotion && matchesResult && matchesFitness && matchesDesignation;
      });

      if (exportEmployees.length === 0) {
        alert("No records found for export after applying filters.");
        setIsExporting(false);
        return;
      }

      if (sort.key && sort.order) {
          exportEmployees = [...exportEmployees].sort((a, b) => {
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

      const tableData: any[] = [];
      exportEmployees.forEach((emp: any, i: number) => {
          const submitted = emp.reports?.flatMap((r: any) => r.periods.map((p: any) => ({...p, year: r.year}))) || [];
          const showSubmitted = completionFilter.length === 0 || completionFilter.includes('Completed');
          const showRemaining = completionFilter.length === 0 || completionFilter.includes('Incomplete');
          let employeeHasRow = false;

          const pushRow = (from: string, to: string, duration: string, p?: any, status?: string) => {
              if (category === 'Official') {
                  if (isComplete) {
                      tableData.push([
                          i + 1, emp.name, emp.post_name, emp.bs, emp.branch_office, from, to, duration, 
                          p?.ga || '-', p?.promotion || '-', p?.fitness_after_25_years || '-', p?.result || '-',
                          p?.ro_name || '-', p?.ro_date ? formatDisplayDate(p.ro_date) : '-',
                          p?.co_name || '-', p?.co_date ? formatDisplayDate(p.co_date) : '-',
                          p?.ro_remarks || '-', p?.co_remarks || '-'
                      ]);
                  } else {
                      tableData.push([i + 1, emp.name, emp.post_name, emp.bs, emp.branch_office, from, to, p?.ga || '-', p?.promotion || '-', p?.fitness_after_25_years || '-', p?.result || '-', duration]);
                  }
              } else {
                  tableData.push([i + 1, emp.name, emp.post_name, emp.bs, emp.branch_office, from, to, duration, status]);
              }
              employeeHasRow = true;
          };

          if (showSubmitted) {
              submitted.forEach((p: any) => {
                  if (tabYearsFilter.length > 0 && !tabYearsFilter.includes(p.year?.toString())) return;
                  pushRow(formatDisplayDate(p.from), formatDisplayDate(p.to), formatTenure(p.from, p.to), p, p.status === 'Sent' ? 'Sent to ECP' : (p.status || 'Pending'));
              });
          }
          if (showRemaining) {
              const yearsToCheck = tabYearsFilter.length > 0 ? tabYearsFilter : [(new Date().getFullYear() - 1).toString()];
              yearsToCheck.forEach(y => {
                  const r = emp.reports?.find((rep: any) => rep.year === y);
                  if (r?.is_manually_completed) return; // Skip if marked manually completed!
                  const gaps = calculateGaps(y, submitted.filter((p: any) => p.year?.toString() === y), emp.joining_date);
                  gaps.forEach((g: any) => {
                      const fromStr = g.start.toISOString().split('T')[0];
                      const toStr = g.end.toISOString().split('T')[0];
                      pushRow(formatDisplayDate(fromStr), formatDisplayDate(toStr), formatTenure(fromStr, toStr), null, 'Remaining');
                  });
              });
          }
          
          if (!employeeHasRow) {
              if (category === 'Official') {
                  if (isComplete) {
                      tableData.push([i + 1, emp.name, emp.post_name, emp.bs, emp.branch_office, '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']);
                  } else {
                      tableData.push([i + 1, emp.name, emp.post_name, emp.bs, emp.branch_office, '-', '-', '-', '-', '-', '-', '-']);
                  }
              } else {
                  tableData.push([i + 1, emp.name, emp.post_name, emp.bs, emp.branch_office, '-', '-', '-', 'Completed']);
              }
          }
      });

      const dynamicTitle = generateDynamicTitle();

      if (type === 'excel') {
          let excelData;
          if (category === 'Official') {
              if (isComplete) {
                  excelData = tableData.map(row => ({
                      'S.No': row[0], 'Name': row[1] || '', 'Designation': row[2] || '', 'BPS': row[3] || '',
                      'Office': row[4] || '', 'From': row[5] || '', 'To': row[6] || '', 'Duration': row[7] || '',
                      'GA': row[8] || '', 'Promotion': row[9] || '', 'Fitness': row[10] || '', 'Result': row[11] || '',
                      'Reporting Officer': row[12] || '', 'RO Date': row[13] || '', 'RO Remarks': row[16] || '',
                      'Counter Signing Officer': row[14] || '', 'CO Date': row[15] || '', 'CO Remarks': row[17] || ''
                  }));
              } else {
                  excelData = tableData.map(row => ({
                      'S.No': row[0], 'Name': row[1] || '', 'Designation': row[2] || '', 'BPS': row[3] || '',
                      'Office': row[4] || '', 'From': row[5] || '', 'To': row[6] || '', 'GA': row[7] || '', 
                      'Promotion': row[8] || '', 'Fitness': row[9] || '', 'Result': row[10] || '', 'Duration': row[11] || ''
                  }));
              }
          } else {
              excelData = tableData.map(row => ({
                  'S.No': row[0], 'Name': row[1] || '', 'Designation': row[2] || '', 'BPS': row[3] || '',
                  'Office': row[4] || '', 'From': row[5] || '', 'To': row[6] || '', 'Duration': row[7] || '', 'Status': row[8] || ''
              }));
          }
          const response = await api.post('/api/export/excel-generic', { title: dynamicTitle, data: excelData }, { responseType: 'blob' });
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `ACR_Report_${new Date().getTime()}.xlsx`);
          document.body.appendChild(link);
          link.click();
          link.remove();
      } else {
          const doc = new jsPDF('landscape', 'pt', 'a4');
          doc.text(dynamicTitle, 40, 40);
          autoTable(doc, {
            startY: 60,
            head: category === 'Official' 
                  ? [['#', 'Name', 'Designation', 'BPS', 'Office', 'From', 'To', 'GA', 'Promotion', 'Fitness', 'Result', 'Duration']]
                  : [['#', 'Name', 'Designation', 'BPS', 'Office', 'From', 'To', 'Duration', 'Status']],
            body: tableData,
            theme: 'grid',
            headStyles: { halign: 'center', valign: 'middle', fillColor: [64, 81, 137], textColor: [255, 255, 255], fontStyle: 'bold' },
            bodyStyles: { halign: 'center', valign: 'middle', fillColor: [255, 255, 255], textColor: [0, 0, 0] },
            alternateRowStyles: { fillColor: [255, 255, 255] },
            columnStyles: { 1: { halign: 'left' } },
            styles: { fontSize: 8 }
          });
          if (type === 'pdf') {
              doc.save(`ACR_Report_${new Date().getTime()}.pdf`);
          } else {
              doc.autoPrint();
              const blob = doc.output('blob');
              window.open(URL.createObjectURL(blob), '_blank');
          }
      }
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleHistoryExport = async (type: 'excel' | 'pdf' | 'print') => {
    if (!flatHistory || flatHistory.length === 0) return;
    try {
        setIsExporting(true);
        const title = selectedFormEmp ? `ACR History - ${selectedFormEmp.name}` : `Global ACR History Tracker`;
        const filename = selectedFormEmp ? `ACR_History_${selectedFormEmp.name}` : `ACR_Global_History`;

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

        if (type === 'excel') {
            const excelData = tableData.map(row => ({
                'S.No': row[0], 'Name': row[1] || '', 'Year': row[2] || '', 'From': row[3] || '',
                'To': row[4] || '', 'GA': row[5] || '', 'Promotion': row[6] || '', 'Fitness': row[7] || '',
                'Result': row[8] || '', 'Duration': row[9] || '', 'Status': row[10] || ''
            }));
            const response = await api.post('/api/export/excel-generic', { title: title, data: excelData }, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${filename}_${new Date().getTime()}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } else {
            const doc = new jsPDF('landscape', 'pt', 'a4');
            doc.text(title, 40, 40);
            autoTable(doc, {
                startY: 60,
                head: [['#', 'Name', 'Year', 'From', 'To', 'GA', 'Promotion', 'Fitness', 'Result', 'Duration', 'Status']],
                body: tableData,
                theme: 'grid',
                headStyles: { halign: 'center', valign: 'middle', fillColor: [64, 81, 137], textColor: [255, 255, 255], fontStyle: 'bold' },
                bodyStyles: { halign: 'center', valign: 'middle', fillColor: [255, 255, 255], textColor: [0, 0, 0] },
                alternateRowStyles: { fillColor: [255, 255, 255] },
                columnStyles: { 1: { halign: 'left' } },
                styles: { fontSize: 7 }
            });
            if (type === 'pdf') {
                doc.save(`${filename}_${new Date().getTime()}.pdf`);
            } else {
                doc.autoPrint();
                const blob = doc.output('blob');
                window.open(URL.createObjectURL(blob), '_blank');
            }
        }
    } catch (error) {
        console.error("Export failed:", error);
        alert("Export failed. Please try again.");
    } finally {
        setIsExporting(false);
    }
  };

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
        queryClient.invalidateQueries({ queryKey: ['acr-employees'] }); queryClient.invalidateQueries({ queryKey: ['acr-selected-history'] });
        refetchAllHistory();
    } catch (error: any) { alert(error.response?.data?.detail || "An error occurred."); }
  };

  const updatePeriodField = async (id: number, field: string, value: string) => {
    const currentCategory = category === 'Form' ? 'Officer' : (category === 'History' ? 'Official' : category);
    const qKey = ['acr-employees', deferredSearch, currentCategory, page];
    const previousEmployees = queryClient.getQueryData(qKey);
    queryClient.setQueryData(qKey, (old: any) => {
        if (!old || !old.data) return old;
        return {
            ...old,
            data: old.data.map((emp: any) => ({
                ...emp,
                reports: emp.reports?.map((r: any) => ({ ...r, periods: r.periods?.map((p: any) => p.id === id ? { ...p, [field]: value } : p) }))
            }))
        };
    });
    try { 
        await api.patch(`/api/acr/period/${id}`, { [field]: value });
        queryClient.invalidateQueries({ queryKey: ['acr-employees'] }); queryClient.invalidateQueries({ queryKey: ['acr-selected-history'] });
    } 
    catch (err) { 
        queryClient.setQueryData(qKey, previousEmployees); 
    }
  };

  const deletePeriod = (id: number) => {
    if (window.confirm("Are you sure you want to delete this record? This action cannot be undone.")) {
      deletePeriodMutation.mutate(id);
    }
  };

  const toggleReportCompletion = async (reportId: number) => {
    const currentCategory = category === 'Form' ? 'Officer' : (category === 'History' ? 'Official' : category);
    const qKey = ['acr-employees', deferredSearch, currentCategory, page];
    const previousEmployees = queryClient.getQueryData(qKey);
    queryClient.setQueryData(qKey, (old: any) => {
        if (!old || !old.data) return old;
        return {
            ...old,
            data: old.data.map((emp: any) => ({
                ...emp,
                reports: emp.reports?.map((r: any) => ({ ...r, is_manually_completed: r.id === reportId ? !r.is_manually_completed : r.is_manually_completed }))
            }))
        };
    });
    try { 
        await api.patch(`/api/acr/report/${reportId}/toggle-complete`); 
        queryClient.invalidateQueries({ queryKey: ['acr-employees'] }); queryClient.invalidateQueries({ queryKey: ['acr-selected-history'] });
    } 
    catch (err) { 
        queryClient.setQueryData(qKey, previousEmployees); 
    }
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
                  <div className="space-y-1"><Label className="text-[10px] font-black text-[#405189] uppercase">From</Label><Input ref={fromDateRef} type="date" className="border-slate-200/50 h-10 bg-slate-50 border-none font-bold text-xs rounded-xl" value={acrFormData.from_date || ''} onChange={(e) => setAcrFormData((p:any) => ({...p, from_date: e.target.value}))} onKeyDown={(e) => e.key === 'Enter' && jumpToField(toDateRef, null)} /></div>
                  <div className="space-y-1"><Label className="text-[10px] font-black text-[#405189] uppercase">To</Label><Input ref={toDateRef} type="date" className="border-slate-200/50 h-10 bg-slate-50 border-none font-bold text-xs rounded-xl" value={acrFormData.to_date || ''} onChange={(e) => setAcrFormData((p:any) => ({...p, to_date: e.target.value}))} onKeyDown={(e) => e.key === 'Enter' && jumpToField(gaInputRef, 'ga')} /></div>
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
                      <Input ref={fitnessInputRef} readOnly className="border-slate-200/50 h-10 bg-slate-50 border-none font-bold text-xs rounded-xl uppercase cursor-pointer focus:ring-2 focus:ring-primary/20" value={FITNESS_OPTIONS.find(o => o.value === acrFormData.fitness_after_25_years)?.label || ''} onFocus={() => !isJumping.current && setActiveDropdown('fitness')} onKeyDown={(e) => handleDropdownKeyDown(e, FITNESS_OPTIONS, 'fitness_after_25_years', resultInputRef, 'result')} />
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    </div>
                    {activeDropdown === 'fitness' && (
                      <div className="absolute w-full border rounded-xl shadow-2xl max-h-48 overflow-y-auto bg-white z-[100] border-slate-100 mt-1">
                        {FITNESS_OPTIONS.map((o: any, i: number) => (
                          <div key={o.value} className={cn("p-2 cursor-pointer border-b last:border-0 text-[10px] font-bold uppercase", dropdownIdx === i ? "bg-primary text-white" : "hover:bg-slate-50")} onMouseDown={() => handleSelection('fitness_after_25_years', o.value, resultInputRef, 'result')}>{o.label}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Result */}
                  <div className="space-y-1 relative acr-nav-group">
                    <Label className="text-[10px] font-black text-[#405189] uppercase">Result</Label>
                    <div className="relative">
                      <Input ref={resultInputRef} readOnly className="border-slate-200/50 h-10 bg-slate-50 border-none font-bold text-xs rounded-xl uppercase cursor-pointer focus:ring-2 focus:ring-primary/20" value={RESULT_OPTIONS.find(o => o.value === acrFormData.result)?.label || ''} onFocus={() => !isJumping.current && setActiveDropdown('result')} onKeyDown={(e) => handleDropdownKeyDown(e, RESULT_OPTIONS, 'result', roSearchRef, 'ro')} />
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    </div>
                    {activeDropdown === 'result' && (
                      <div className="absolute w-full border rounded-xl shadow-2xl max-h-48 overflow-y-auto bg-white z-[100] border-slate-100 mt-1">
                        {RESULT_OPTIONS.map((o: any, i: number) => (
                          <div key={o.value} className={cn("p-2 cursor-pointer border-b last:border-0 text-[10px] font-bold uppercase", dropdownIdx === i ? "bg-primary text-white" : "hover:bg-slate-50")} onMouseDown={() => handleSelection('result', o.value, roSearchRef, 'ro')}>{o.label}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1 relative acr-nav-group">
                    <Label className="text-[10px] font-black text-[#405189] uppercase">RO</Label>
                    <Input ref={roSearchRef} placeholder="SEARCH RO..." className="border-slate-200/50 h-10 bg-slate-50 border-none font-bold text-[10px] rounded-xl uppercase" value={roSearch} onFocus={() => !isJumping.current && setActiveDropdown('ro')} onChange={(e) => { setRoSearch(e.target.value); setAcrFormData((p:any) => ({...p, ro_name: e.target.value})); if(!e.target.value) setSelectedRo(null); setRoIdx(0); }} onKeyDown={(e) => handleSearchKeyDown(e, roSearchEmps || [], roIdx, setRoIdx, selectRo, roDateRef)} />
                    {activeDropdown === 'ro' && roSearchEmps && roSearchEmps.length > 0 && !selectedRo && (
                      <div className="absolute w-full border rounded-xl shadow-2xl max-h-48 overflow-y-auto bg-white z-[100] border-slate-100 mt-1">
                        {roSearchEmps.map((e: any, i: number) => (
                          <div key={e.id} className={cn("p-2 cursor-pointer border-b text-[10px] font-bold uppercase", roIdx === i ? "bg-primary text-white" : "hover:bg-slate-50")} onMouseDown={() => selectRo(e)}>{e.name}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1"><Label className="text-[10px] font-black text-[#405189] uppercase">RO Date</Label><Input ref={roDateRef} type="date" className="border-slate-200/50 h-10 bg-slate-50 border-none font-bold text-[10px] rounded-xl focus:ring-2 focus:ring-primary/20" value={acrFormData.ro_date || ''} onChange={(e) => setAcrFormData((p:any) => ({...p, ro_date: e.target.value}))} onKeyDown={(e) => e.key === 'Enter' && jumpToField(roRemarksRef, null)} /></div>
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-[10px] font-black text-[#405189] uppercase">RO Remarks</Label>
                    <Input 
                      ref={roRemarksRef} 
                      className="border-slate-200/50 h-10 bg-slate-50 border-none font-bold text-xs uppercase rounded-xl focus:ring-2 focus:ring-primary/20" 
                      placeholder="ENTER RO REMARKS..." 
                      value={acrFormData.ro_remarks || ''} 
                      onChange={(e) => setAcrFormData((p:any) => ({...p, ro_remarks: e.target.value}))} 
                      onKeyDown={(e) => e.key === 'Enter' && jumpToField(coSearchRef, 'co')} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1 relative acr-nav-group">
                    <Label className="text-[10px] font-black text-[#405189] uppercase">CO</Label>
                    <Input ref={coSearchRef} placeholder="SEARCH CO..." className="border-slate-200/50 h-10 bg-slate-50 border-none font-bold text-[10px] rounded-xl uppercase" value={coSearch} onFocus={() => !isJumping.current && setActiveDropdown('co')} onChange={(e) => { setCoSearch(e.target.value); setAcrFormData((p:any) => ({...p, co_name: e.target.value})); if(!e.target.value) setSelectedCo(null); setCoIdx(0); }} onKeyDown={(e) => handleSearchKeyDown(e, coSearchEmps || [], coIdx, setCoIdx, selectCo, coDateRef)} />
                    {activeDropdown === 'co' && coSearchEmps && coSearchEmps.length > 0 && !selectedCo && (
                      <div className="absolute w-full border rounded-xl shadow-2xl max-h-48 overflow-y-auto bg-white z-[100] border-slate-100 mt-1">
                        {coSearchEmps.map((e: any, i: number) => (
                          <div key={e.id} className={cn("p-2 cursor-pointer border-b text-[10px] font-bold uppercase", coIdx === i ? "bg-primary text-white" : "hover:bg-slate-50")} onMouseDown={() => selectCo(e)}>{e.name}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1"><Label className="text-[10px] font-black text-[#405189] uppercase">CO Date</Label><Input ref={coDateRef} type="date" className="border-slate-200/50 h-10 bg-slate-50 border-none font-bold text-[10px] rounded-xl focus:ring-2 focus:ring-primary/20" value={acrFormData.co_date || ''} onChange={(e) => setAcrFormData((p:any) => ({...p, co_date: e.target.value}))} onKeyDown={(e) => e.key === 'Enter' && jumpToField(coRemarksRef, null)} /></div>
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-[10px] font-black text-[#405189] uppercase">CO Remarks</Label>
                    <Input 
                      ref={coRemarksRef} 
                      className="border-slate-200/50 h-10 bg-slate-50 border-none font-bold text-xs uppercase rounded-xl focus:ring-2 focus:ring-primary/20" 
                      placeholder="ENTER CO REMARKS..." 
                      value={acrFormData.co_remarks || ''} 
                      onChange={(e) => setAcrFormData((p:any) => ({...p, co_remarks: e.target.value}))} 
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
                    setAcrFormData((prev: any) => ({ ...prev, from_date: '', to_date: '', ga: '', promotion: '', ro_remarks: '', co_remarks: '', fitness_after_25_years: '', ro_name: '', ro_date: '', co_name: '', co_date: '', result: '', status: 'Pending' }));
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
                        <Button variant="ghost" size="sm" className="h-9 px-4 text-[11px] font-black text-slate-600 uppercase rounded-lg flex items-center gap-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all" onClick={() => handleHistoryExport('excel')}><FileDown className="h-4 w-4 text-emerald-600" /> Excel</Button>
                        <div className="w-[1px] h-6 bg-slate-100" />
                        <Button variant="ghost" size="sm" className="h-9 px-4 text-[11px] font-black text-slate-600 uppercase rounded-lg flex items-center gap-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all" onClick={() => handleHistoryExport('pdf')}><FileJson className="h-4 w-4 text-rose-600" /> PDF</Button>
                        <div className="w-[1px] h-6 bg-slate-100" />
                        <Button variant="ghost" size="sm" className="h-9 px-4 text-[11px] font-black text-slate-600 uppercase rounded-lg flex items-center gap-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all" onClick={() => handleHistoryExport('print')}><Printer className="h-4 w-4 text-blue-600" /> Print</Button>
                    </div>
                  </div>
                  <Card className="border-none shadow-2xl bg-white rounded-3xl overflow-hidden min-h-[200px]">
                    <div className="w-full overflow-x-auto">
                        <Table className="w-full whitespace-nowrap">
                            <TableHeader className="bg-[#405189]">
                                <TableRow className="border-none hover:bg-white/5">
                                <TableHead className="font-black text-white text-[9px] uppercase p-3 text-center">S.No</TableHead>
                                <TableHead className="font-black text-white text-[9px] uppercase p-3 text-center cursor-pointer hover:bg-[#405189] transition-colors" onClick={() => handleSort('year')}><div className="flex items-center justify-center gap-1">Year{sort.key === 'year' && <SortIcon column="year" />}</div></TableHead>
                                <TableHead className="font-black text-white text-[9px] uppercase p-3 text-center cursor-pointer hover:bg-[#405189] transition-colors" onClick={() => handleSort('from')}><div className="flex items-center justify-center gap-1">From{sort.key === 'from' && <SortIcon column="from" />}</div></TableHead>
                                <TableHead className="font-black text-white text-[9px] uppercase p-3 text-center cursor-pointer hover:bg-[#405189] transition-colors" onClick={() => handleSort('to')}><div className="flex items-center justify-center gap-1">To{sort.key === 'to' && <SortIcon column="to" />}</div></TableHead>
                                <TableHead className="font-black text-white text-[9px] uppercase p-3 cursor-pointer hover:bg-[#405189] transition-colors" onClick={() => handleSort('ga')}><div className="flex items-center gap-1">GA{sort.key === 'ga' && <SortIcon column="ga" />}</div></TableHead>
                                <TableHead className="font-black text-white text-[9px] uppercase p-3 cursor-pointer hover:bg-[#405189] transition-colors" onClick={() => handleSort('promotion')}><div className="flex items-center gap-1">Promotion{sort.key === 'promotion' && <SortIcon column="promotion" />}</div></TableHead>
                                <TableHead className="font-black text-white text-[9px] uppercase p-3 cursor-pointer hover:bg-[#405189] transition-colors" onClick={() => handleSort('fitness_after_25_years')}><div className="flex items-center gap-1">Fitness{sort.key === 'fitness_after_25_years' && <SortIcon column="fitness_after_25_years" />}</div></TableHead>
                                <TableHead className="font-black text-white text-[9px] uppercase p-3 cursor-pointer hover:bg-[#405189] transition-colors" onClick={() => handleSort('ro_name')}><div className="flex items-center gap-1">RO Name{sort.key === 'ro_name' && <SortIcon column="ro_name" />}</div></TableHead>
                                <TableHead className="font-black text-white text-[9px] uppercase p-3 cursor-pointer hover:bg-[#405189] transition-colors" onClick={() => handleSort('co_name')}><div className="flex items-center gap-1">CO Name{sort.key === 'co_name' && <SortIcon column="co_name" />}</div></TableHead>
                                <TableHead className="font-black text-white text-[9px] uppercase p-3 cursor-pointer hover:bg-[#405189] transition-colors" onClick={() => handleSort('result')}><div className="flex items-center gap-1">Result{sort.key === 'result' && <SortIcon column="result" />}</div></TableHead>
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
                                            <Button variant="ghost" size="sm" className="h-7 w-7 text-rose-300 hover:text-rose-600 transition-colors" onClick={() => deletePeriod(p.id)}>
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
                        {totalCount > 100 && (
                          <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-100">
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
                    <div className="flex bg-white p-2 rounded-2xl gap-3 shadow-sm border border-slate-100 flex-wrap">
                      <div className="flex-1 min-w-[120px]"><MultiSelect label="Type" options={['Submitted', 'Remaining']} selected={historyTypeFilter === 'All' ? [] : [historyTypeFilter]} onChange={(vals) => setHistoryTypeFilter(vals[0] || 'All')} placeholder="Type" /></div>
                      <div className="flex-1 min-w-[120px]"><MultiSelect label="Year" options={availableYears} selected={historyYearFilter} onChange={(vals) => setHistoryYearFilter(vals)} placeholder="Year" /></div>
                      <div className="flex-1 min-w-[120px]"><MultiSelect label="GA" options={['Outstanding', 'Very Good', 'Good', 'Average', 'Below Average', 'Poor']} selected={historyGaFilter} onChange={(vals) => setHistoryGaFilter(vals)} placeholder="GA" /></div>
                      <div className="flex-1 min-w-[150px]"><MultiSelect label="Promotion" options={PROMOTION_OPTIONS.map(o => o.value)} selected={historyPromotionFilter} onChange={(vals) => setHistoryPromotionFilter(vals)} placeholder="Promotion" /></div>
                      <div className="flex-1 min-w-[120px]"><MultiSelect label="Result" options={['Satisfactory', 'Not Satisfactory']} selected={historyResultFilter} onChange={(vals) => setHistoryResultFilter(vals)} placeholder="Result" /></div>
                      <div className="flex-1 min-w-[120px]"><MultiSelect label="Fitness" options={['Fit', 'Unfit']} selected={historyFitnessFilter} onChange={(vals) => setHistoryFitnessFilter(vals)} placeholder="Fitness" /></div>
                      <div className="p-2 flex items-center justify-center">
                        <Button variant="ghost" size="sm" className="h-8 text-[10px] uppercase font-black text-slate-400 hover:text-slate-600" onClick={() => {
                          setHistoryYearFilter([]);
                          setHistoryGaFilter([]);
                          setHistoryPromotionFilter([]);
                          setHistoryResultFilter([]);
                          setHistoryFitnessFilter([]);
                          setHistorySearch('');
                          setHistoryTypeFilter('All');
                        }}>Clear All</Button>
                      </div>
                    </div>
                  </Card>

                  <div className="flex items-center gap-3 no-print">
                    <div className="relative group flex-1 h-12">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                      <Input placeholder="SEARCH HISTORY..." className="border-slate-200/50 h-12 pl-12 bg-white border-none shadow-sm text-[16px] font-bold uppercase tracking-tight placeholder:text-slate-200 focus-visible:ring-1 focus-visible:ring-primary rounded-xl transition-all" value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-100 h-12 px-2">
                        <div className="flex flex-col items-center justify-center px-4 border-r border-slate-100 mr-2">
                            <span className="text-lg font-black text-primary leading-none tabular-nums">{flatHistory.length}</span>
                            <span className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5">Records</span>
                        </div>
                        <Button variant="ghost" size="sm" className="h-9 px-4 text-[11px] font-black text-slate-600 uppercase rounded-lg flex items-center gap-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all" onClick={() => handleHistoryExport('excel')}><FileDown className="h-4 w-4 text-emerald-600" /> Excel</Button>
                        <div className="w-[1px] h-6 bg-slate-100" />
                        <Button variant="ghost" size="sm" className="h-9 px-4 text-[11px] font-black text-slate-600 uppercase rounded-lg flex items-center gap-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all" onClick={() => handleHistoryExport('pdf')}><FileJson className="h-4 w-4 text-rose-600" /> PDF</Button>
                        <div className="w-[1px] h-6 bg-slate-100" />
                        <Button variant="ghost" size="sm" className="h-9 px-4 text-[11px] font-black text-slate-600 uppercase rounded-lg flex items-center gap-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all" onClick={() => handleHistoryExport('print')}><Printer className="h-4 w-4 text-blue-600" /> Print</Button>
                    </div>
                    </div>
                  </div>
                  

                <Card className="border-none shadow-2xl bg-white rounded-3xl overflow-hidden min-h-[300px]">
              <div className="w-full overflow-x-auto">
                <Table className="w-full whitespace-nowrap">
                  <TableHeader className="bg-[#405189]">
                      <TableRow className="border-none hover:bg-white/5">
                      <TableHead className="font-black text-white text-[9px] uppercase p-3 text-center">S.No</TableHead>
                      <TableHead className="font-black text-white text-[9px] uppercase p-3 cursor-pointer hover:bg-[#405189] transition-colors" onClick={() => handleSort('code')}><div className="flex items-center gap-1">Code{sort.key === 'code' && <SortIcon column="code" />}</div></TableHead>
                      <TableHead className="font-black text-white text-[9px] uppercase p-3 cursor-pointer hover:bg-[#405189] transition-colors" onClick={() => handleSort('name')}><div className="flex items-center gap-1">Name{sort.key === 'name' && <SortIcon column="name" />}</div></TableHead>
                      <TableHead className="font-black text-white text-[9px] uppercase p-3 cursor-pointer hover:bg-[#405189] transition-colors" onClick={() => handleSort('bs')}><div className="flex items-center gap-1">BPS{sort.key === 'bs' && <SortIcon column="bs" />}</div></TableHead>
                      <TableHead className="font-black text-white text-[9px] uppercase p-3 cursor-pointer hover:bg-[#405189] transition-colors" onClick={() => handleSort('post_name')}><div className="flex items-center gap-1">Designation{sort.key === 'post_name' && <SortIcon column="post_name" />}</div></TableHead>
                      <TableHead className="font-black text-white text-[9px] uppercase p-3 cursor-pointer hover:bg-[#405189] transition-colors" onClick={() => handleSort('branch_office')}><div className="flex items-center gap-1">Office / Branch{sort.key === 'branch_office' && <SortIcon column="branch_office" />}</div></TableHead>
                      <TableHead className="font-black text-white text-[9px] uppercase p-3 text-center cursor-pointer hover:bg-[#405189] transition-colors" onClick={() => handleSort('year')}><div className="flex items-center justify-center gap-1">Year{sort.key === 'year' && <SortIcon column="year" />}</div></TableHead>
                      <TableHead className="font-black text-white text-[9px] uppercase p-3 text-center cursor-pointer hover:bg-[#405189] transition-colors" onClick={() => handleSort('from')}><div className="flex items-center justify-center gap-1">From{sort.key === 'from' && <SortIcon column="from" />}</div></TableHead>
                      <TableHead className="font-black text-white text-[9px] uppercase p-3 text-center cursor-pointer hover:bg-[#405189] transition-colors" onClick={() => handleSort('to')}><div className="flex items-center justify-center gap-1">To{sort.key === 'to' && <SortIcon column="to" />}</div></TableHead>
                      <TableHead className="font-black text-white text-[9px] uppercase p-3 cursor-pointer hover:bg-[#405189] transition-colors" onClick={() => handleSort('ga')}><div className="flex items-center gap-1">GA{sort.key === 'ga' && <SortIcon column="ga" />}</div></TableHead>
                      <TableHead className="font-black text-white text-[9px] uppercase p-3 cursor-pointer hover:bg-[#405189] transition-colors" onClick={() => handleSort('promotion')}><div className="flex items-center gap-1">Promotion{sort.key === 'promotion' && <SortIcon column="promotion" />}</div></TableHead>
                      <TableHead className="font-black text-white text-[9px] uppercase p-3 cursor-pointer hover:bg-[#405189] transition-colors" onClick={() => handleSort('fitness_after_25_years')}><div className="flex items-center gap-1">Fitness{sort.key === 'fitness_after_25_years' && <SortIcon column="fitness_after_25_years" />}</div></TableHead>
                      <TableHead className="font-black text-white text-[9px] uppercase p-3 cursor-pointer hover:bg-[#405189] transition-colors" onClick={() => handleSort('ro_name')}><div className="flex items-center gap-1">RO Name{sort.key === 'ro_name' && <SortIcon column="ro_name" />}</div></TableHead>
                      <TableHead className="font-black text-white text-[9px] uppercase p-3 cursor-pointer hover:bg-[#405189] transition-colors" onClick={() => handleSort('co_name')}><div className="flex items-center gap-1">CO Name{sort.key === 'co_name' && <SortIcon column="co_name" />}</div></TableHead>
                      <TableHead className="font-black text-white text-[9px] uppercase p-3 cursor-pointer hover:bg-[#405189] transition-colors" onClick={() => handleSort('result')}><div className="flex items-center gap-1">Result{sort.key === 'result' && <SortIcon column="result" />}</div></TableHead>
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
                                  <Button variant="ghost" size="sm" className="h-7 w-7 text-rose-300 hover:text-rose-600 transition-colors" onClick={() => deletePeriod(p.id)}>
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
                    <div className="flex-1 min-w-[150px]"><MultiSelect label="Periods" options={['Pending', 'Sent to ECP']} selected={statusFilter} onChange={(vals) => setStatusFilter(vals)} placeholder="Periods" /></div>
                )}
                <div className="flex-1 min-w-[150px]"><MultiSelect label="Designation" options={Array.from(new Set(employees?.map((e: any) => e.post_name).filter(Boolean)))} selected={designationFilter} onChange={(vals) => setDesignationFilter(vals)} placeholder="Designation" /></div>
                {category === 'Official' && (
                <>
                    <div className="flex-1 min-w-[120px]"><MultiSelect label="GA" options={['Outstanding', 'Very Good', 'Good', 'Average', 'Below Average', 'Poor']} selected={gaFilter} onChange={(vals) => setGaFilter(vals)} placeholder="GA" /></div>
                    <div className="flex-1 min-w-[150px]"><MultiSelect label="Promotion" options={PROMOTION_OPTIONS.map(o => o.value)} selected={promotionFilter} onChange={(vals) => setPromotionFilter(vals)} placeholder="Promotion" /></div>
                    <div className="flex-1 min-w-[120px]"><MultiSelect label="Result" options={['Satisfactory', 'Not Satisfactory']} selected={resultFilter} onChange={(vals) => setResultFilter(vals)} placeholder="Result" /></div>
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
                    <span className="text-lg font-black text-primary leading-none tabular-nums">{totalCount}</span>
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5">Records</span>
                </div>
                <Button variant="ghost" size="sm" className="h-9 px-4 text-[11px] font-black text-slate-600 uppercase rounded-lg flex items-center gap-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all" onClick={() => {
                    if (category === 'Official') {
                        const wantsComplete = window.confirm("Do you want to export COMPLETE DATA (including Reporting & Counter Signing Officers)?\n\nClick 'OK' for Complete Data.\nClick 'Cancel' for Standard Table Data.");
                        handleExport('excel', wantsComplete);
                    } else {
                        handleExport('excel');
                    }
                }}><FileDown className="h-4 w-4 text-emerald-600" /> Excel</Button>
                <div className="w-[1px] h-6 bg-slate-100" />
                <Button variant="ghost" size="sm" className="h-9 px-4 text-[11px] font-black text-slate-600 uppercase rounded-lg flex items-center gap-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all" onClick={() => handleExport('pdf')}><FileJson className="h-4 w-4 text-rose-600" /> PDF</Button>
                <div className="w-[1px] h-6 bg-slate-100" />
                <Button variant="ghost" size="sm" className="h-9 px-4 text-[11px] font-black text-slate-600 uppercase rounded-lg flex items-center gap-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all" onClick={() => handleExport('print')}><Printer className="h-4 w-4 text-blue-600" /> Print</Button>
            </div>
          </div>

          <Card className="border-none shadow-2xl overflow-hidden bg-white rounded-3xl border border-slate-100 min-h-[500px] print-area print:!shadow-none print:!border-none print:!rounded-none">
              <div className="hidden print:block print-header w-full">
                 <h1>{generateDynamicTitle()}</h1>
                 <p>Total Records: {employees?.length}</p>
              </div>
              <div className="w-full overflow-x-auto">
                <Table className="w-full table-fixed">
                  <TableHeader className="bg-[#405189]">
                  <TableRow className="hover:bg-[#405189] border-none h-14">
                    {(category === 'Officer' ? OFFICERS_COLUMNS : OFFICIALS_COLUMNS).map((col) => {
                      const sortKeyMap: any = { 'Name': 'name', 'Designation': 'post_name', 'BPS': 'bs', 'Office': 'branch_office' };
                      const sortKey = sortKeyMap[col.name];
                      const isCentered = ['GA', 'Promotion', 'Fitness', 'Result', 'Remarks', 'Duration', 'Status', 'Actions'].includes(col.name);
                      return (
                        <TableHead key={col.name} className={`${col.width} text-white font-black text-[12px] uppercase p-2 ${isCentered ? 'text-center' : ''} ${sortKey ? 'cursor-pointer hover:bg-[#405189] transition-colors' : ''}`} onClick={() => sortKey && handleSort(sortKey)}>
                          <div className={`flex items-center ${isCentered ? 'justify-center' : ''}`}>
                            {col.name} {sortKey && <SortIcon column={sortKey} />}
                          </div>
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingEmployees ? (
                    <TableRow><TableCell colSpan={category === 'Officer' ? 9 : 12} className="py-10 text-center text-slate-500 font-semibold">Loading data...</TableCell></TableRow>
                  ) : (
                    filteredEmployees?.map((emp: any, i: number) => {
                        const joiningYear = getYearFromDate(emp.joining_date);
                        const yearsToProcess = tabYearsFilter.length > 0 ? tabYearsFilter : availableYears;
                        
                        let displayRows: any[] = [];
                        let allSubmitted: any[] = [];
                        let allGaps: any[] = [];

                        yearsToProcess.forEach((y: string) => {
                            if (joiningYear > 0 && parseInt(y) < joiningYear) return;

                            const r = emp.reports?.find((rep: any) => rep.year === y);
                            let submittedForYear = [];
                            let isManuallyCompleted = false;
                            if (r) {
                                isManuallyCompleted = r.is_manually_completed;
                                submittedForYear = r.periods?.map((p: any) => ({...p, reportId: r.id, isManuallyCompleted: r.is_manually_completed, type: 'Submitted', year: y, report: r, emp: emp})) || [];
                            }
                            
                            const gapsForYear = isManuallyCompleted 
                                ? [] 
                                : calculateGaps(y, submittedForYear, emp.joining_date).map((g: any, idx: number) => ({ id: `gap-${emp.id}-${y}-${idx}`, year: y, from: g.start.toISOString().split('T')[0], to: g.end.toISOString().split('T')[0], type: 'Remaining', status: 'Pending' }));
                            
                            displayRows.push(...submittedForYear, ...gapsForYear);
                            allSubmitted.push(...submittedForYear);
                            allGaps.push(...gapsForYear);
                        });

                        if (displayRows.length === 0) return null;

                        displayRows.sort((a, b) => new Date(a.from).getTime() - new Date(b.from).getTime());
                        const total = getSumTenure(allSubmitted, allGaps);
                        return (
                      <React.Fragment key={emp.id}>
                        {displayRows.length === 0 ? (
                          <TableRow className="border-b border-slate-100 hover:bg-slate-50">
                            <TableCell className="text-[12px] font-black text-slate-300 text-center p-2">{(page - 1) * 100 + i + 1}</TableCell>
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
                                            <TableCell className="text-[12px] font-black text-slate-300 text-center p-2 align-middle" rowSpan={displayRows.length}>{(page - 1) * 100 + i + 1}</TableCell>
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
                                        <TableCell className="p-1 text-center align-middle">{p.type === 'Submitted' ? <div className={cn("mx-auto px-2 py-1.5 font-black rounded-md text-[9px] uppercase max-w-[120px] truncate text-center shadow-sm border", p.result === 'Not Satisfactory' ? "bg-rose-50 border-rose-100 text-rose-700" : "bg-emerald-50 border-emerald-100 text-emerald-700")} title={p.ga}>{p.ga || "-"}</div> : <span className="text-[10px] text-slate-300 font-bold px-2 italic uppercase">Missing</span>}</TableCell>
                                        
                                        {/* Promotion Column */}
                                        <TableCell className="p-1 text-center align-middle">{p.type === 'Submitted' ? <div className={cn("mx-auto px-2 py-1.5 font-black rounded-md text-[9px] uppercase max-w-[150px] truncate text-center shadow-sm border", p.result === 'Not Satisfactory' ? "bg-rose-50 border-rose-100 text-rose-700" : "bg-emerald-50 border-emerald-100 text-emerald-700")} title={p.promotion}>{p.promotion || "-"}</div> : <span className="text-[10px] text-slate-300 font-bold px-2 italic uppercase">Missing</span>}</TableCell>
                                        
                                        {/* Fitness Column */}
                                        <TableCell className="p-1 text-center align-middle">{p.type === 'Submitted' ? <div className={cn("mx-auto px-2 py-1.5 font-black rounded-md text-[9px] uppercase max-w-[120px] truncate text-center shadow-sm border", p.result === 'Not Satisfactory' ? "bg-rose-50 border-rose-100 text-rose-700" : "bg-emerald-50 border-emerald-100 text-emerald-700")} title={p.fitness_after_25_years}>{p.fitness_after_25_years || "-"}</div> : <span className="text-[10px] text-slate-300 font-bold px-2 italic uppercase">Missing</span>}</TableCell>
                                        
                                        {/* Result Column */}
                                        <TableCell className="p-1 text-center align-middle">{p.type === 'Submitted' ? <div className={cn("mx-auto px-2 py-1.5 font-black rounded-md text-[9px] uppercase max-w-[120px] truncate text-center shadow-sm border", p.result === 'Not Satisfactory' ? "bg-rose-50 border-rose-100 text-rose-700" : "bg-emerald-50 border-emerald-100 text-emerald-700")} title={p.result}>{p.result || "-"}</div> : <span className="text-[10px] text-slate-300 font-bold px-2 italic uppercase">Missing</span>}</TableCell>
                                      </>
                                    )}
                                    <TableCell className="text-[11px] text-center text-slate-700 font-black italic">{formatTenure(p.from, p.to)}</TableCell>
                                    {category === 'Officer' && (
                                        <TableCell className="p-1"><div className="flex justify-center">{p.type === 'Submitted' ? (<select className="h-9 border border-slate-200 rounded-lg text-[11px] font-bold uppercase w-32 text-center bg-white focus:border-primary" value={p.status === 'Sent' ? 'Sent to ECP' : (p.status || 'Pending')} onChange={(e) => updatePeriodField(p.id, 'status', e.target.value)}><option value="Pending">Pending</option><option value="Sent to ECP">Sent to ECP</option></select>) : <span className="text-[10px] text-slate-300 font-black uppercase italic tracking-tighter">Missing Record</span>}</div></TableCell>
                                    )}
                                    <TableCell className="flex justify-center items-center gap-1 py-4 align-middle">
                                        {p.type === 'Submitted' ? (
                                            <>
                                                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" checked={p.isManuallyCompleted} onChange={() => toggleReportCompletion(p.reportId)} title="Mark Complete" />
                                                <Button variant="ghost" size="sm" className="h-8 w-8 text-primary hover:bg-primary/10 p-0" onClick={() => startEdit(p.report, p)} title="Edit Period"><Edit2 className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="sm" className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 h-8 w-8 p-0" onClick={() => deletePeriod(p.id)} title="Delete Period"><Trash2 className="h-4 w-4" /></Button>
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
            {totalCount > 100 && (
              <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-100">
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
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={officerModalOpen} onOpenChange={setOfficerModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase text-primary tracking-tight">Add Officer Period</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Officer</label>
              <Input value={officerModalData.emp?.name || ''} disabled className="font-bold bg-slate-50" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">From Date</label>
                <Input type="date" value={officerModalData.from_date} onChange={e => setOfficerModalData({...officerModalData, from_date: e.target.value})} className="font-bold" />
              </div>
              <div className="grid gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">To Date</label>
                <Input type="date" value={officerModalData.to_date} onChange={e => setOfficerModalData({...officerModalData, to_date: e.target.value})} className="font-bold" />
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-bold uppercase ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={officerModalData.status === 'Sent' ? 'Sent to ECP' : (officerModalData.status || 'Pending')} onChange={e => setOfficerModalData({...officerModalData, status: e.target.value})}>
                <option value="Pending">Pending</option>
                <option value="Sent to ECP">Sent to ECP</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOfficerModalOpen(false)}>Cancel</Button>
            <Button className="bg-primary text-white font-black uppercase tracking-widest" onClick={handleOfficerModalSave}>Save Period</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
