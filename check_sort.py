import sys
import os

sys.path.append(os.path.abspath("backend"))

from backend.app.db.database import SessionLocal
from backend.app.models import Employee
from sqlalchemy import cast, Integer

db = SessionLocal()
emps = db.query(Employee).filter(Employee.employment_status == 'Active').order_by(
    cast(Employee.s_no, Integer).asc(),
    cast(Employee.bs, Integer).desc(),
    Employee.id.asc()
).limit(20).all()

for e in emps:
    print(f"ID: {e.id}, S_NO: {e.s_no}, BS: {e.bs}, NAME: {e.name}")
