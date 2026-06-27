import sys
import os
sys.path.append(os.path.abspath('backend'))
from app.db.database import SessionLocal
from app import models

db = SessionLocal()
try:
    # Find the vacant seat in GSC Branch for DEO
    vacant_seat = db.query(models.Employee).filter(
        models.Employee.branch_office.ilike('%GSC%'),
        models.Employee.post_name.ilike('%Data Entry%'),
        models.Employee.name.ilike('%Vacant%')
    ).first()

    # Revert 'Engg Branch' to 'LGE Branch'
    vacant_seat = db.query(models.Employee).filter(
        models.Employee.branch_office == 'Engg Branch'
    ).first()

    if vacant_seat:
        vacant_seat.branch_office = 'LGE Branch'
        db.commit()
        print(f"Successfully fixed seat ID {vacant_seat.id} to 'LGE Branch'.")
    else:
        print("Could not find the Engg Branch seat.")

    # Verify LGE Branch DEOs
    lge_deos = db.query(models.Employee).filter(
        models.Employee.branch_office.ilike('%LGE%'),
        models.Employee.post_name.ilike('%Data Entry%')
    ).all()
    print("\nLGE Branch DEOs:")
    for d in lge_deos:
        print(f"ID: {d.id}, Name: {d.name}, Branch: {d.branch_office}")

    # Verify Engg Branch DEOs
    engg_deos = db.query(models.Employee).filter(
        models.Employee.branch_office.ilike('%Engg%'),
        models.Employee.post_name.ilike('%Data Entry%')
    ).all()
    print("\nEngg Branch DEOs:")
    for d in engg_deos:
        print(f"ID: {d.id}, Name: {d.name}, Branch: {d.branch_office}")

except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
