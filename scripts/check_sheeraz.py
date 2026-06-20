import os
import sys

# Add backend to path so we can import from it
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from database import SessionLocal
import models
from sqlalchemy import or_, and_

db = SessionLocal()

emp = db.query(models.Employee).filter(models.Employee.name.ilike('%Sheeraz%')).first()
if emp:
    print(f"Name: {emp.name}")
    print(f"Joining Date: {emp.joining_date}")
    try:
        from datetime import datetime
        j_year = datetime.fromisoformat(emp.joining_date.split('T')[0]).year if emp.joining_date else 'None'
        print(f"Joining Year: {j_year}")
    except:
        print(f"Joining Year: Could not parse {emp.joining_date}")
else:
    print("Sheeraz not found")

db.close()
