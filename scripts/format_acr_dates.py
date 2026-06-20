import re

with open('frontend/src/app/(dashboard)/acr/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

helper = """
const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return "---";
  if (typeof dateStr === 'string' && dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  return dateStr;
};

export default function ACRPage() {"""

content = content.replace('export default function ACRPage() {', helper)

content = content.replace('{p.from_date}', '{formatDisplayDate(p.from_date)}')
content = content.replace('{p.to_date}', '{formatDisplayDate(p.to_date)}')
content = content.replace('p.from_date', 'formatDisplayDate(p.from_date)')
content = content.replace('p.to_date', 'formatDisplayDate(p.to_date)')

# Fix nested formatDisplayDate if happened
content = content.replace('formatDisplayDate(formatDisplayDate(', 'formatDisplayDate(').replace('))}', ')}')

with open('frontend/src/app/(dashboard)/acr/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated ACR page display dates")
