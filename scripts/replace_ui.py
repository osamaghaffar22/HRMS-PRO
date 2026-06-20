import re

with open('frontend/src/app/(dashboard)/acr/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the history header
content = content.replace(
'''              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm flex items-center italic"><History className="h-4 w-4 mr-3 text-primary" /> Individual ACR History </h3>
                {selectedFormEmp && <Badge className="bg-primary/10 text-primary border-none font-black px-4 py-1.5 rounded-full uppercase tracking-tighter italic">{selectedFormEmp.name}</Badge>}
              </div>

              {selectedFormEmp && (
                <>''',
'''              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm flex items-center italic"><History className="h-4 w-4 mr-3 text-primary" /> All Officials ACR History </h3>
                {selectedFormEmp && <Badge className="bg-primary/10 text-primary border-none font-black px-4 py-1.5 rounded-full uppercase tracking-tighter italic">Filtering by: {selectedFormEmp.name}</Badge>}
              </div>

'''
)

# Insert the toggle buttons
content = content.replace(
'''                  <div className="flex items-center gap-3 no-print">
                    <div className="relative group flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />''',
'''                  <div className="flex items-center gap-3 no-print">
                    <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100 h-12">
                      <Button variant={historyTypeFilter === 'All' ? 'default' : 'ghost'} size="sm" onClick={() => setHistoryTypeFilter('All')} className="h-full px-6 font-bold text-[11px] uppercase rounded-lg">All</Button>
                      <Button variant={historyTypeFilter === 'Submitted' ? 'default' : 'ghost'} size="sm" onClick={() => setHistoryTypeFilter('Submitted')} className="h-full px-6 font-bold text-[11px] uppercase rounded-lg">Submitted</Button>
                      <Button variant={historyTypeFilter === 'Remaining' ? 'default' : 'ghost'} size="sm" onClick={() => setHistoryTypeFilter('Remaining')} className="h-full px-6 font-bold text-[11px] uppercase rounded-lg">Remaining</Button>
                    </div>
                    <div className="relative group flex-1 h-12">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />'''
)

# Update Clear All button
content = content.replace(
'''                          setHistoryFitnessFilter([]);
                          setHistorySearch('');
                        }}>Clear All</Button>''',
'''                          setHistoryFitnessFilter([]);
                          setHistorySearch('');
                          setHistoryTypeFilter('All');
                        }}>Clear All</Button>'''
)

# Remove the closing </>)} before the Table
content = content.replace(
'''                  </>
              )}
            </div>
            
            <Card className="border-none shadow-2xl bg-white rounded-3xl overflow-hidden min-h-[300px]">''',
'''            </div>
            
            <Card className="border-none shadow-2xl bg-white rounded-3xl overflow-hidden min-h-[300px]">'''
)

# Replace the conditional render inside TableBody
content = content.replace(
'''                  <TableBody>
                    {!selectedFormEmp ? (
                      <TableRow><TableCell colSpan={17} className="py-40 text-center text-slate-300 font-black uppercase text-[10px] italic tracking-[0.3em]">Select Personnel above</TableCell></TableRow>
                    ) : (
                      flatHistory.map((p: any, idx: number) => (''',
'''                  <TableBody>
                    {flatHistory.length === 0 ? (
                      <TableRow><TableCell colSpan={17} className="py-40 text-center text-slate-300 font-black uppercase text-[10px] italic tracking-[0.3em]">No records found</TableCell></TableRow>
                    ) : (
                      flatHistory.map((p: any, idx: number) => ('''
)

# Remove the closing )} of the conditional render inside TableBody
content = content.replace(
'''                      ))
                    )}
                  </TableBody>''',
'''                      ))
                    }
                  </TableBody>'''
)

with open('frontend/src/app/(dashboard)/acr/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Replacement successful")
