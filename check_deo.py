import sqlite3
import pandas as pd

conn = sqlite3.connect('hrms_v2.db')
query = "SELECT id, name, branch_office, post_name, bs, employment_status FROM employees WHERE post_name = 'Data Entry Operator'"
df = pd.read_sql_query(query, conn)
print(df.to_string())
