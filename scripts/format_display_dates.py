import re

with open('frontend/src/app/(dashboard)/employees/page.tsx', 'r', encoding='utf-8') as f:
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

  const calculateDuration ="""

content = content.replace('  const calculateDuration =', helper)

# Table cells
content = content.replace('{e.joining_date || "---"}', '{formatDisplayDate(e.joining_date)}')
content = content.replace('{e.place_of_posting || "---"}', '{formatDisplayDate(e.place_of_posting)}')

# Export Excel
content = content.replace("'Appointment Date': e.joining_date,", "'Appointment Date': formatDisplayDate(e.joining_date),")
content = content.replace("'Current Station DOJ': e.place_of_posting,", "'Current Station DOJ': formatDisplayDate(e.place_of_posting),")

# Export PDF
content = content.replace("e.joining_date, \n                e.place_of_posting,", "formatDisplayDate(e.joining_date), \n                formatDisplayDate(e.place_of_posting),")
content = content.replace("e.joining_date, \r\n                e.place_of_posting,", "formatDisplayDate(e.joining_date), \r\n                formatDisplayDate(e.place_of_posting),")
content = content.replace("e.joining_date, \n                e.place_of_posting", "formatDisplayDate(e.joining_date), \n                formatDisplayDate(e.place_of_posting)")

with open('frontend/src/app/(dashboard)/employees/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Employees page display dates")
