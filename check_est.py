import sqlite3
import pandas as pd

conn = sqlite3.connect('hrms_v2.db')
query = "SELECT id, name, branch_office, post_name, bs FROM employees WHERE branch_office='Establishment Branch' AND post_name='Data Entry Operator'"
print(pd.read_sql_query(query, conn).to_string())

query2 = "SELECT allocated_posts FROM rationalization WHERE branch_office='Establishment Branch' AND post_name='Data Entry Operator'"
print('Quota:')
print(pd.read_sql_query(query2, conn).to_string())
