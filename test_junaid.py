import sys
import os
sys.path.append(os.path.abspath('backend'))
from app.db.database import SessionLocal
from app import models
import json

db = SessionLocal()
try:
    print("--- Searching for Junaid ---")
    junaids = db.query(models.Employee).filter(models.Employee.name.ilike('%Junaid%')).all()
    for j in junaids:
        print(f"ID: {j.id}, Name: {j.name}, Post: {j.post_name}, Branch: {j.branch_office}, Status: {j.employment_status}")

    from sqlalchemy import func
    total_rat = db.query(func.sum(models.Rationalization.allocated_posts)).scalar()
    print("Total Allocated Posts in Rationalization:", total_rat)

    total_emp = db.query(models.Employee).count()
    print("Total Rows in Employee table:", total_emp)


except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
