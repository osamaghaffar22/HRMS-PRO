import re

with open('frontend/src/app/(dashboard)/acr/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: formSearchEmployees.map
content = content.replace('''                      {formSearchEmployees.map((e: any, i: number) => (
                        <div key={e.id} className={cn("p-3 cursor-pointer border-b last:border-0", personnelIdx === i ? "bg-primary text-white" : "hover:bg-slate-50")} onMouseDown={() => selectPersonnel(e)}>
                          <p className="font-black text-xs uppercase">{e.name}</p>
                          <p className={cn("text-[9px] font-bold uppercase", personnelIdx === i ? "text-primary-foreground/70" : "text-slate-400")}>{e.post_name} (BPS {e.bs})</p>
                        </div>
                      )}''', '''                      {formSearchEmployees.map((e: any, i: number) => (
                        <div key={e.id} className={cn("p-3 cursor-pointer border-b last:border-0", personnelIdx === i ? "bg-primary text-white" : "hover:bg-slate-50")} onMouseDown={() => selectPersonnel(e)}>
                          <p className="font-black text-xs uppercase">{e.name}</p>
                          <p className={cn("text-[9px] font-bold uppercase", personnelIdx === i ? "text-primary-foreground/70" : "text-slate-400")}>{e.post_name} (BPS {e.bs})</p>
                        </div>
                      ))}''')

# Fix 2: availableYears.map inside Dropdown
content = content.replace('''                        {availableYears.map((y: any, i: number) => (
                          <div key={String(y)} className={cn("p-2 cursor-pointer border-b last:border-0 text-[10px] font-bold uppercase", dropdownIdx === i ? "bg-primary text-white" : "hover:bg-slate-50")} onMouseDown={() => handleSelection('year', String(y), fromDateRef, null)}>{y}</div>
                        )}''', '''                        {availableYears.map((y: any, i: number) => (
                          <div key={String(y)} className={cn("p-2 cursor-pointer border-b last:border-0 text-[10px] font-bold uppercase", dropdownIdx === i ? "bg-primary text-white" : "hover:bg-slate-50")} onMouseDown={() => handleSelection('year', String(y), fromDateRef, null)}>{y}</div>
                        ))}''')

# Fix 3: ASSESSMENT_OPTIONS.map
content = content.replace('''                        {ASSESSMENT_OPTIONS.map((o: any, i: number) => (
                          <div key={o.value} className={cn("p-2 cursor-pointer border-b last:border-0 text-[10px] font-bold uppercase", dropdownIdx === i ? "bg-primary text-white" : "hover:bg-slate-50")} onMouseDown={() => handleSelection('ga', o.value, promotionInputRef, 'promotion')}>{o.label}</div>
                        )}''', '''                        {ASSESSMENT_OPTIONS.map((o: any, i: number) => (
                          <div key={o.value} className={cn("p-2 cursor-pointer border-b last:border-0 text-[10px] font-bold uppercase", dropdownIdx === i ? "bg-primary text-white" : "hover:bg-slate-50")} onMouseDown={() => handleSelection('ga', o.value, promotionInputRef, 'promotion')}>{o.label}</div>
                        ))}''')

# Fix 4: PROMOTION_OPTIONS.map
content = content.replace('''                        {PROMOTION_OPTIONS.map((o: any, i: number) => (
                          <div key={o.value} className={cn("p-2 cursor-pointer border-b last:border-0 text-[10px] font-bold uppercase", dropdownIdx === i ? "bg-primary text-white" : "hover:bg-slate-50")} onMouseDown={() => handleSelection('promotion', o.value, fitnessInputRef, 'fitness')}>{o.label}</div>
                        )}''', '''                        {PROMOTION_OPTIONS.map((o: any, i: number) => (
                          <div key={o.value} className={cn("p-2 cursor-pointer border-b last:border-0 text-[10px] font-bold uppercase", dropdownIdx === i ? "bg-primary text-white" : "hover:bg-slate-50")} onMouseDown={() => handleSelection('promotion', o.value, fitnessInputRef, 'fitness')}>{o.label}</div>
                        ))}''')

# Fix 5: FITNESS_OPTIONS.map
content = content.replace('''                        {FITNESS_OPTIONS.map((o: any, i: number) => (
                          <div key={o.value} className={cn("p-2 cursor-pointer border-b last:border-0 text-[10px] font-bold uppercase", dropdownIdx === i ? "bg-primary text-white" : "hover:bg-slate-50")} onMouseDown={() => handleSelection('fitness_after_25_years', o.value, roSearchRef, 'ro')}>{o.label}</div>
                        )}''', '''                        {FITNESS_OPTIONS.map((o: any, i: number) => (
                          <div key={o.value} className={cn("p-2 cursor-pointer border-b last:border-0 text-[10px] font-bold uppercase", dropdownIdx === i ? "bg-primary text-white" : "hover:bg-slate-50")} onMouseDown={() => handleSelection('fitness_after_25_years', o.value, roSearchRef, 'ro')}>{o.label}</div>
                        ))}''')

# Fix 6: roSearchEmps.map
content = content.replace('''                        {roSearchEmps.map((e: any, i: number) => (
                          <div key={e.id} className={cn("p-2 cursor-pointer border-b text-[10px] font-bold uppercase", roIdx === i ? "bg-primary text-white" : "hover:bg-slate-50")} onMouseDown={() => selectRo(e)}>{e.name}</div>
                        )}''', '''                        {roSearchEmps.map((e: any, i: number) => (
                          <div key={e.id} className={cn("p-2 cursor-pointer border-b text-[10px] font-bold uppercase", roIdx === i ? "bg-primary text-white" : "hover:bg-slate-50")} onMouseDown={() => selectRo(e)}>{e.name}</div>
                        ))}''')

# Fix 7: coSearchEmps.map
content = content.replace('''                        {coSearchEmps.map((e: any, i: number) => (
                          <div key={e.id} className={cn("p-2 cursor-pointer border-b text-[10px] font-bold uppercase", coIdx === i ? "bg-primary text-white" : "hover:bg-slate-50")} onMouseDown={() => selectCo(e)}>{e.name}</div>
                        )}''', '''                        {coSearchEmps.map((e: any, i: number) => (
                          <div key={e.id} className={cn("p-2 cursor-pointer border-b text-[10px] font-bold uppercase", coIdx === i ? "bg-primary text-white" : "hover:bg-slate-50")} onMouseDown={() => selectCo(e)}>{e.name}</div>
                        ))}''')

# Fix 8: RESULT_OPTIONS.map
content = content.replace('''                        {RESULT_OPTIONS.map((o: any, i: number) => (
                          <div key={o.value} className={cn("p-2 cursor-pointer border-b last:border-0 text-[10px] font-bold uppercase", dropdownIdx === i ? "bg-primary text-white" : "hover:bg-slate-50")} onMouseDown={() => handleSelection('result', o.value, remarksRef, null)}>{o.label}</div>
                        )}''', '''                        {RESULT_OPTIONS.map((o: any, i: number) => (
                          <div key={o.value} className={cn("p-2 cursor-pointer border-b last:border-0 text-[10px] font-bold uppercase", dropdownIdx === i ? "bg-primary text-white" : "hover:bg-slate-50")} onMouseDown={() => handleSelection('result', o.value, remarksRef, null)}>{o.label}</div>
                        ))}''')


# Fix 9: Array.from(new Set(employees?.map...
content = content.replace('''<MultiSelect label="Designation" options={Array.from(new Set(employees?.map((e: any) => e.post_name).filter(Boolean))} selected={designationFilter} onChange={(vals) => setDesignationFilter(vals)} placeholder="Designation" />''', '''<MultiSelect label="Designation" options={Array.from(new Set(employees?.map((e: any) => e.post_name).filter(Boolean)))} selected={designationFilter} onChange={(vals) => setDesignationFilter(vals)} placeholder="Designation" />''')


with open('frontend/src/app/(dashboard)/acr/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Syntax errors patched")
