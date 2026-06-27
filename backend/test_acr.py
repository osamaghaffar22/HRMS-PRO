import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app.api.routes_acr import get_acr_records

db = SessionLocal()
try:
    print("Testing category=Officer...")
    # call the function
    # def get_acr_records(search, category, year, emp_id, skip, limit, response, db)
    employees = get_acr_records(search=None, category='Officer', year=None, emp_id=None, skip=0, limit=10, response=None, db=db)
    print("Found Officer count:", len(employees))
    
    print("Testing category=Official...")
    employees2 = get_acr_records(search=None, category='Official', year=None, emp_id=None, skip=0, limit=10, response=None, db=db)
    print("Found Official count:", len(employees2))
    
except Exception as e:
    print("ERROR:", e)
finally:
    db.close()
