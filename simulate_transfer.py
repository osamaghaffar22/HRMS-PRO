import sys
sys.path.append('d:/HRMS Pro/backend')
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models

db = SessionLocal()

emp_post = 'Data Entry Operator'

# Let's check Target Vacant in Korangi
target_vacant = db.query(models.Employee).filter(
    models.Employee.branch_office == 'DEC Office Korangi',
    models.Employee.post_name == emp_post,
    # models.Employee.bs == emp_bs,  <-- I WILL REMOVE THIS IN THE FIX
    models.Employee.name.in_(['Vacant', '()'])
).first()

if target_vacant:
    print(f"Found Target Vacant: {target_vacant.id} - BS: {target_vacant.bs}")
else:
    print("No target vacant found!")

# Let's check Quota in Establishment
sanctioned = db.query(models.Rationalization).filter(
    models.Rationalization.branch_office == 'Establishment Branch',
    models.Rationalization.post_name == emp_post
).first()
quota = sanctioned.allocated_posts if sanctioned else 0

total_source_seats = db.query(models.Employee).filter(
    models.Employee.branch_office == 'Establishment Branch',
    models.Employee.post_name == emp_post,
    models.Employee.employment_status == 'Active'
).count()

is_overstaffed = total_source_seats > quota
print(f"Source Seats: {total_source_seats}, Quota: {quota}, Overstaffed: {is_overstaffed}")

