import sqlite3
import pandas as pd

conn = sqlite3.connect('hrms_v2.db')
query = "SELECT id, name, post_name, bs, CAST(bs AS INTEGER) as cast_bs, s_no FROM employees WHERE branch_office='DEC Office Korangi' ORDER BY s_no ASC, cast_bs DESC"
df = pd.read_sql_query(query, conn)
print(df.to_string())
