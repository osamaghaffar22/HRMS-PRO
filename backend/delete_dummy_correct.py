import sqlite3
import os

db_path = 'd:/HRMS Pro/hrms_v2.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("DELETE FROM employees WHERE name LIKE 'Dummy User %'")
deleted_count = cursor.rowcount
conn.commit()
conn.close()
print(f'Deleted {deleted_count} dummy entries from correct db.')
