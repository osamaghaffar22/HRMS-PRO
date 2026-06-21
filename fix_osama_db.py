import sqlite3

conn = sqlite3.connect('hrms_v2.db')
cursor = conn.cursor()
cursor.execute("SELECT s_no, hq_field, head_office, wing_division, section_district FROM employees WHERE branch_office='DEC Office Korangi' AND id != 68 LIMIT 1")
row = cursor.fetchone()
if row:
    cursor.execute("UPDATE employees SET s_no=?, hq_field=?, head_office=?, wing_division=?, section_district=? WHERE id=68", row)
    conn.commit()
    print('Fixed Osama Ghaffar structural fields')
