'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Command as CommandPrimitive } from 'cmdk';

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  label: string;
}

export function MultiSelect({ options = [], selected = [], onChange, placeholder, label }: MultiSelectProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = inputRef.current;
    if (input) {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (input.value === '' && (selected || []).length > 0) {
          const lastValue = selected[selected.length - 1];
          removeValue(lastValue);
        }
      }
      if (e.key === 'Escape') {
        input.blur();
      }
    }
  };

  return (
    <Command 
      className="overflow-visible bg-transparent w-full relative"
      onKeyDown={handleKeyDown}
    >
      <div
        className={cn(
          "flex min-h-[40px] w-full flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm transition-all cursor-text",
          open ? "ring-2 ring-primary/20 bg-white border-primary/30" : "hover:border-slate-300"
        )}
        onClick={() => {
          inputRef.current?.focus();
          setOpen(true);
        }}
      >
        {(selected || []).map((val) => (
          <Badge
            key={val}
            variant="secondary"
            className="text-[10px] min-h-6 h-auto py-1 px-2 bg-primary/10 text-primary border-none font-bold hover:bg-primary/20 flex items-center justify-between gap-1 rounded-md max-w-full"
          >
            <span className="whitespace-normal break-words text-left leading-tight">{val}</span>
            <div
              className="h-4 w-4 shrink-0 flex items-center justify-center rounded-sm hover:bg-primary/20 cursor-pointer ml-1 -mr-1"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                removeValue(val);
              }}
            >
              <X className="h-3 w-3" />
            </div>
          </Badge>
        ))}
        <div className="flex-1 min-w-[60px] flex items-center h-6">
            <CommandPrimitive.Input
              ref={inputRef}
              value={inputValue}
              onValueChange={setInputValue}
              onBlur={() => setOpen(false)}
              onFocus={() => setOpen(true)}
              placeholder={(selected || []).length === 0 ? placeholder : ''}
              className="w-full bg-transparent outline-none placeholder:text-slate-400 text-xs font-bold text-slate-700 h-full"
            />
        </div>
        {!open && (selected || []).length === 0 && (
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-40 ml-auto" />
        )}
      </div>

      <div className="relative w-full z-[100]">
        {open ? (
          <div className="absolute top-2 z-[100] w-full rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xl outline-none animate-in fade-in-0 zoom-in-95">
            <CommandList className="max-h-[300px] overflow-auto custom-scrollbar p-1">
              <CommandEmpty className="py-4 px-4 text-xs text-slate-500 font-bold text-center">No results found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onMouseDown={(e) => {
                      e.preventDefault(); // prevent blur
                      e.stopPropagation();
                    }}
                    onSelect={() => {
                      setInputValue("");
                      toggleOption(option);
                      setOpen(false);
                      inputRef.current?.blur();
                    }}
                    className="text-xs font-bold py-2.5 px-3 cursor-pointer flex items-start rounded-lg data-[selected=true]:bg-slate-100/80 data-[selected=true]:text-slate-900 whitespace-normal break-words leading-tight"
                  >
                    <div className={cn(
                      "mr-3 mt-0.5 shrink-0 flex h-[14px] w-[14px] items-center justify-center rounded-[4px] border-2 transition-colors",
                      (selected || []).includes(option) ? "bg-primary border-primary text-white" : "border-slate-300"
                    )}>
                      {(selected || []).includes(option) && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                    </div>
                    <span className="flex-1 text-left">{option}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </div>
        ) : null}
      </div>
    </Command>
  );
}
