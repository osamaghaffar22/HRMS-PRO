'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  label: string;
}

export function MultiSelect({ options = [], selected = [], onChange, placeholder, label }: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const toggleOption = (value: string) => {
    const safeSelected = selected || [];
    const newSelected = safeSelected.includes(value)
      ? safeSelected.filter((v) => v !== value)
      : [...safeSelected, value];
    onChange(newSelected);
  };

  const removeValue = (value: string) => {
    const safeSelected = selected || [];
    onChange(safeSelected.filter((v) => v !== value));
  };

  const selectedCount = selected?.length || 0;

  return (
    <div className="p-3 space-y-2 flex-1 min-w-[160px] flex flex-col items-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className="w-full h-10 px-3 flex justify-center items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg shadow-sm text-[13px] font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
        >
          <span className="truncate">{selectedCount === 0 ? placeholder : `${selectedCount} Selected`}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0 bg-white border border-slate-200 shadow-xl opacity-100 z-[100]" align="start">
          <Command className="bg-white">
            <CommandInput placeholder={`Search ${label}...`} className="h-10 text-[13px] bg-white" />
            <CommandList className="max-h-[300px]">
              <CommandEmpty className="py-2 px-4 text-[13px] text-slate-500 font-bold">No results found.</CommandEmpty>
              <CommandGroup>
                {options?.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => toggleOption(option)}
                    className="text-[13px] font-bold py-2 cursor-pointer"
                  >
                    <div className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary transition-colors",
                      (selected || []).includes(option) ? "bg-primary text-white" : "opacity-50"
                    )}>
                      {(selected || []).includes(option) && <Check className="h-3 w-3" />}
                    </div>
                    {option}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {selectedCount > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {selected.slice(0, 1).map((val) => (
            <Badge key={val} variant="secondary" className="text-[8px] h-4 px-1 bg-primary/10 text-primary border-none font-bold">
              {val}
              <X className="ml-1 h-2 w-2 cursor-pointer" onClick={() => removeValue(val)} />
            </Badge>
          ))}
          {selectedCount > 1 && (
            <Badge variant="secondary" className="text-[8px] h-4 px-1 bg-slate-100 text-slate-500 border-none font-bold">
              +{selectedCount - 1} more
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
