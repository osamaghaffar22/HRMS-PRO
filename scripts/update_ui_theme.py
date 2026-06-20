import re

path = 'frontend/src/app/(dashboard)/employees/page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_render = """const renderField = (field: { key: string, label: string, readOnly?: boolean }) => (
      <div key={field.key} className="space-y-1.5 bg-slate-50/50 p-3 rounded-xl border border-slate-100 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all focus-within:bg-white group">
        <Label className="text-[9px] font-black uppercase text-slate-500 tracking-widest group-focus-within:text-primary transition-colors ml-1">{field.label}</Label>
        <Input 
          value={editingEmp[field.key] || ''} 
          onChange={(e) => setEditingEmp({...editingEmp, [field.key]: e.target.value})} 
          readOnly={field.readOnly}
          className={cn("border-none bg-transparent h-7 text-[11px] font-bold text-slate-900 uppercase focus-visible:ring-0 p-1 shadow-none rounded-none border-b border-transparent focus-visible:border-primary/30", field.readOnly && "opacity-60 cursor-not-allowed")}
          placeholder="---"
        />
      </div>
    );"""

new_render = """const renderField = (field: { key: string, label: string, readOnly?: boolean, type?: string }) => (
      <div key={field.key} className="flex flex-col space-y-1.5">
        <Label className="text-[13px] font-semibold text-slate-700">{field.label}</Label>
        <Input 
          type={field.type || 'text'}
          value={editingEmp[field.key] || ''} 
          onChange={(e) => setEditingEmp({...editingEmp, [field.key]: e.target.value})} 
          readOnly={field.readOnly}
          className={cn(
            "h-10 px-3 bg-white border border-slate-300 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary shadow-sm transition-all", 
            field.readOnly && "bg-slate-50 text-slate-500 cursor-not-allowed"
          )}
          placeholder="Enter value"
        />
      </div>
    );"""

content = content.replace(old_render, new_render)

# Layout adjustments
content = content.replace('bg-slate-50/95 backdrop-blur-2xl', 'bg-slate-50')
content = content.replace('className="shrink-0 bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between"', 'className="shrink-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between"')
content = content.replace('<DialogTitle className="text-2xl font-black uppercase tracking-widest text-slate-900 flex items-center">', '<DialogTitle className="text-xl font-bold text-slate-800 flex items-center">')
content = content.replace('<span className="bg-primary w-2.5 h-7 mr-4 inline-block rounded-full"></span>', '<span className="bg-primary w-1.5 h-6 mr-3 inline-block rounded-sm"></span>')
content = content.replace('<p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mt-2 ml-6">Registry ID:', '<p className="text-[13px] font-medium text-slate-500 mt-1 ml-4">Registry ID:')
content = content.replace('w-72 bg-white/50 border-r border-slate-200 p-6 flex flex-col gap-2 overflow-y-auto custom-scrollbar', 'w-64 bg-slate-50 border-r border-slate-200 p-4 flex flex-col gap-1 overflow-y-auto custom-scrollbar')
content = content.replace('<p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 pl-2">Data Categories</p>', '<p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 pl-2">Categories</p>')
content = content.replace('className="w-full justify-start px-4 py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200/60 border border-transparent transition-all text-slate-500 hover:text-slate-700 hover:bg-white/50"', 'className="w-full justify-start px-3 py-2.5 rounded-md text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm border border-transparent transition-all text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"')
content = content.replace('flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50', 'flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-100/50')
content = content.replace('bg-white p-8 rounded-3xl shadow-sm border border-slate-200/60', 'bg-white p-6 rounded-xl shadow-sm border border-slate-200')
content = content.replace('text-sm font-black uppercase tracking-widest text-slate-900 mb-8 flex items-center', 'text-base font-semibold text-slate-800 border-b border-slate-100 pb-3 mb-6 flex items-center')
content = re.sub(r'<([A-Za-z0-9]+) className="h-5 w-5 mr-3 text-primary p-1 bg-primary/10 rounded-md" />', r'<\1 className="h-5 w-5 mr-2 text-slate-400" />', content)

# Buttons
content = content.replace('className="h-11 px-8 rounded-xl font-black uppercase tracking-widest text-xs bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all"', 'className="h-10 px-6 rounded-md font-medium text-sm bg-primary hover:bg-primary/90 text-white shadow-sm transition-all"')
content = content.replace('className="h-11 px-6 rounded-xl font-bold uppercase tracking-widest text-xs border-slate-200 hover:bg-slate-50"', 'className="h-10 px-4 rounded-md font-medium text-sm border-slate-300 hover:bg-slate-50"')

# Other form inputs (Select/Inputs in sub-tabs)
content = content.replace('className="h-12 bg-slate-50 border-none font-bold text-xs uppercase rounded-xl"', 'className="h-10 px-3 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus-visible:ring-2 focus-visible:ring-primary/20"')
content = content.replace('className="h-12 bg-slate-50 border-none font-bold text-xs rounded-xl"', 'className="h-10 px-3 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus-visible:ring-2 focus-visible:ring-primary/20"')
content = content.replace('className="h-12 bg-slate-50 border-none font-bold text-xs rounded-xl uppercase"', 'className="h-10 px-3 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus-visible:ring-2 focus-visible:ring-primary/20"')

# Labels in sub-tabs
content = content.replace('className="text-[10px] font-black text-slate-400 uppercase"', 'className="text-[13px] font-semibold text-slate-700"')

# Submit buttons in sub-tabs
content = content.replace('className="w-full h-14 mt-8 text-sm font-black shadow-2xl bg-slate-900 hover:bg-primary transition-all rounded-2xl tracking-widest"', 'className="w-full h-10 mt-6 text-sm font-medium shadow-sm bg-slate-900 hover:bg-slate-800 transition-all rounded-md text-white"')


with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
    print("UI update applied successfully.")
