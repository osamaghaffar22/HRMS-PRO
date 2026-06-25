import sys
import os
sys.path.append(os.path.abspath('backend'))
from app.db.database import SessionLocal
from app import models

db = SessionLocal()
try:
    total = db.query(models.Employee).count()
    vacant = db.query(models.Employee).filter(models.Employee.name.ilike('%Vacant%') | (models.Employee.name == None)).count()
    print("Total Employees in DB:", total)
    print("Vacant Employees in DB:", vacant)
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
