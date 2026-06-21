import sys

file_path = "frontend/src/app/(dashboard)/files/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

days_ago_func = """
  const getDaysAgoInfo = (dateStr: string, status: string) => {
    if (!dateStr) return { text: '—', isRed: false };
    if (['Closed', 'Completed', 'Returned'].includes(status)) return { text: '—', isRed: false };
    
    const putUpDate = new Date(dateStr);
    putUpDate.setHours(0,0,0,0);
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const diffTime = today.getTime() - putUpDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return { text: 'Today', isRed: false };
    if (diffDays === 1) return { text: '1 day ago', isRed: false };
    if (diffDays < 0) return { text: '—', isRed: false };
    
    return { text: `${diffDays} days ago`, isRed: diffDays >= 2 };
  };
"""

# Insert getDaysAgoInfo just before "return ("
content = content.replace("return (", days_ago_func + "\n  return (", 1)

# Add TableHead
table_head_target = '<TableHead className="w-32 text-white font-black text-[12px] uppercase p-3 text-center">Put Up Date</TableHead>'
table_head_replacement = table_head_target + '\n                <TableHead className="w-32 text-white font-black text-[12px] uppercase p-3 text-center">Days Ago</TableHead>'
content = content.replace(table_head_target, table_head_replacement)

# Adjust ColSpan
content = content.replace('colSpan={12}', 'colSpan={13}')

# Add TableCell
table_cell_target = '<TableCell className="p-3 text-[11px] font-bold text-primary text-center bg-primary/5">{formatDate(f.put_up_date)}</TableCell>'
table_cell_replacement = table_cell_target + '\n                    <TableCell className={cn("p-3 text-[11px] font-black text-center whitespace-nowrap transition-colors", getDaysAgoInfo(f.put_up_date, f.status).isRed ? "text-white bg-rose-500 animate-pulse" : "text-slate-500")}>{getDaysAgoInfo(f.put_up_date, f.status).text}</TableCell>'
content = content.replace(table_cell_target, table_cell_replacement)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
