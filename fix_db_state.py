import sqlite3

conn = sqlite3.connect('hrms_v2.db')
cursor = conn.cursor()

# 1. Get structural fields of Arifa (Establishment Branch DEO) to use for the new Vacant seat
cursor.execute("SELECT hq_field, head_office, wing_division, section_district FROM employees WHERE branch_office='Establishment Branch' AND post_name='Data Entry Operator' AND name!='Vacant' LIMIT 1")
row = cursor.fetchone()
if row:
    hq, ho, wd, sd = row
else:
    hq, ho, wd, sd = ('Headquarters', 'PEC Sindh', 'Estt', 'Karachi')

# 2. Update the Vacant DEO seat in Korangi to be the Vacant DEO seat in Establishment
cursor.execute("UPDATE employees SET branch_office='Establishment Branch', hq_field=?, head_office=?, wing_division=?, section_district=? WHERE branch_office='DEC Office Korangi' AND post_name='Data Entry Operator' AND name IN ('Vacant', '()')", (hq, ho, wd, sd))

conn.commit()
print("Fixed DB state: Vacant seat moved from Korangi to Establishment.")
