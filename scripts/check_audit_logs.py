import os
import sys
from datetime import datetime

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from database import SessionLocal
import models
from sqlalchemy import and_

db = SessionLocal()

# Osama Ghaffar's employee ID is 2153 (found from previous API call)
emp_id = 2153

logs = db.query(models.AuditLog).filter(
    and_(
        models.AuditLog.table_name == 'employees',
        models.AuditLog.record_id == emp_id
    )
).order_by(models.AuditLog.timestamp.desc()).all()

if not logs:
    print("No audit logs found for this employee.")
else:
    for log in logs:
        print(f"Time: {log.timestamp}")
        print(f"Action: {log.action}")
        print(f"Old: {log.old_data}")
        print(f"New: {log.new_data}")
        print("-" * 20)

db.close()
