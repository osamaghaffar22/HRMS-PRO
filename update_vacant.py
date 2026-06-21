import sqlite3

conn = sqlite3.connect('hrms_v2.db')
cursor = conn.cursor()
cursor.execute("UPDATE employees SET name = 'Vacant' WHERE name = '()'")
conn.commit()
print('Updated', cursor.rowcount, 'seats to Vacant')
