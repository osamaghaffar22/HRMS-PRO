import sqlite3
import os

db_path = 'd:/HRMS Pro/backend/hrms_v2.db'
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

indexes = [
    "CREATE INDEX IF NOT EXISTS idx_employees_cnic ON employees(cnic)",
    "CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(name)",
    "CREATE INDEX IF NOT EXISTS idx_employees_branch_office ON employees(branch_office)",
    "CREATE INDEX IF NOT EXISTS idx_employees_bs ON employees(bs)",
    "CREATE INDEX IF NOT EXISTS idx_employees_post_name ON employees(post_name)",
    "CREATE INDEX IF NOT EXISTS idx_employees_employment_status ON employees(employment_status)",
    "CREATE INDEX IF NOT EXISTS idx_employees_officer_official ON employees(officer_official)",
    "CREATE INDEX IF NOT EXISTS idx_employees_hq_field ON employees(hq_field)",
    "CREATE INDEX IF NOT EXISTS idx_transfer_history_target_office ON transfer_history(target_office)"
]

for idx_sql in indexes:
    try:
        cursor.execute(idx_sql)
        print(f"Executed: {idx_sql}")
    except Exception as e:
        print(f"Error executing {idx_sql}: {e}")

conn.commit()
conn.close()
print("Indexes applied to SQLite database directly.")
