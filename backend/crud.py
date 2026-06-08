from sqlalchemy.orm import Session
from sqlalchemy import or_
import models, schemas
import json
from datetime import datetime

def get_employee(db: Session, employee_id: int):
    return db.query(models.Employee).filter(models.Employee.id == employee_id).first()

def get_employees(db: Session, skip: int = 0, limit: int = 100, search: str = None, filters: dict = None):
    query = db.query(models.Employee)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(or_(
            models.Employee.name.ilike(search_filter),
            models.Employee.code.ilike(search_filter),
            models.Employee.cnic.ilike(search_filter),
            models.Employee.post_name.ilike(search_filter)
        ))
    
    if filters:
        for key, value in filters.items():
            if value and hasattr(models.Employee, key):
                if isinstance(value, list):
                    query = query.filter(getattr(models.Employee, key).in_(value))
                else:
                    query = query.filter(getattr(models.Employee, key) == value)
    
    return query.offset(skip).limit(limit).all()

def create_employee(db: Session, employee: schemas.EmployeeCreate, user_id: int):
    db_employee = models.Employee(**employee.model_dump())
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)
    
    # Audit Log
    log = models.AuditLog(
        user_id=user_id,
        action="CREATE",
        table_name="employees",
        record_id=db_employee.id,
        new_data=employee.model_dump()
    )
    db.add(log)
    db.commit()
    
    return db_employee

def update_employee(db: Session, employee_id: int, employee_update: schemas.EmployeeCreate, user_id: int):
    db_employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not db_employee:
        return None
    
    old_data = {c.name: getattr(db_employee, c.name) for c in db_employee.__table__.columns}
    new_data = employee_update.model_dump()

    # Check for Transfer (Office or Posting Place Change)
    if (db_employee.branch_office != new_data.get('branch_office')) or \
       (db_employee.place_of_posting != new_data.get('place_of_posting')):
        
        # Create History Entry for the PREVIOUS posting
        history = models.TransferHistory(
            employee_id=db_employee.id,
            previous_office=db_employee.branch_office,
            new_office=new_data.get('branch_office'),
            joining_date=db_employee.joining_date, # When they joined the PREVIOUS office
            relieving_date=datetime.utcnow().strftime('%d-%m-%Y'), # Relieved today
            duration_spent=db_employee.tenure_current_station # Preserve the tenure they spent there
        )
        db.add(history)

    for key, value in new_data.items():
        setattr(db_employee, key, value)
    
    db.commit()
    db.refresh(db_employee)
    
    # Audit Log
    log = models.AuditLog(
        user_id=user_id,
        action="UPDATE",
        table_name="employees",
        record_id=db_employee.id,
        old_data=old_data,
        new_data=new_data
    )
    db.add(log)
    db.commit()
    
    return db_employee
