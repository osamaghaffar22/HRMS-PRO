import sqlite3
import pandas as pd

conn = sqlite3.connect('hrms_v2.db')
query = "SELECT id, name, branch_office, post_name, bs FROM employees WHERE name LIKE '%Vacant%' AND branch_office LIKE '%Establishment%'"
df = pd.read_sql_query(query, conn)
print("Vacant seats in Est:", df.to_string())
