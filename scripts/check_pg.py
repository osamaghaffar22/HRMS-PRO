import os
import sys

# Add backend to path so we can import from it
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from database import SessionLocal
import models
from sqlalchemy import or_, and_

db = SessionLocal()

total = db.query(models.Employee).count()
print(f"Total employees: {total}")

query = db.query(models.Employee).filter(
    and_(
        ~models.Employee.post_status.ilike('%Vacant%'),
        models.Employee.name.isnot(None),
        models.Employee.name != ''
    )
)
filled = query.count()
print(f"Filled employees: {filled}")

officers = query.filter(models.Employee.officer_official == 'Officer').count()
print(f"Officers: {officers}")

officials = query.filter(models.Employee.officer_official == 'Official').count()
print(f"Officials: {officials}")

# Also check how many employees have any ACR reports
with_reports = query.filter(models.Employee.reports.any()).count()
print(f"Filled with reports: {with_reports}")

# What does the /api/acr?category=All route return exactly?
# It returns employees, but wait...
all_query = db.query(models.Employee).filter(
    and_(
        ~models.Employee.post_status.ilike('%Vacant%'),
        models.Employee.name.isnot(None),
        models.Employee.name != ''
    )
)
print(f"Category=All returns: {all_query.count()} employees")

db.close()
