import re

with open('frontend/src/app/(dashboard)/files/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_format_date = """  const formatDate = (d: string) => {
    if (!d) return "—";
    try {
        const date = new Date(d);
        if(isNaN(date.getTime())) return d;
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return d;
    }
  };"""

new_format_date = """  const formatDate = (d: string) => {
    if (!d) return "—";
    if (typeof d === 'string' && d.includes('-')) {
      const parts = d.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    return d;
  };"""

content = content.replace(old_format_date, new_format_date)

with open('frontend/src/app/(dashboard)/files/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Files page display dates")
