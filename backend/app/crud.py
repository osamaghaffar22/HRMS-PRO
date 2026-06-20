from sqlalchemy.orm import Session
from sqlalchemy import or_
from app import models, schemas
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

    # 1. Removed Static Dates Lock as requested by user
    
    # Exclude locked fields from the general update loop
    locked_fields = []
    
    # 2. Refined Transfer Logging
    # Check if station (branch_office) changed or relieving date is provided
    relieving_date = new_data.get('relieving_date')
    order_date = new_data.get('order_date')
    order_number = new_data.get('order_number')
    branch_changed = db_employee.branch_office != new_data.get('branch_office')
    post_changed = db_employee.post_name != new_data.get('post_name')

    if branch_changed or post_changed:
        new_branch = new_data.get('branch_office', db_employee.branch_office)
        new_post = new_data.get('post_name', db_employee.post_name)
        if new_branch and new_post:
            quota = db.query(models.Rationalization).filter(
                models.Rationalization.branch_office == new_branch,
                models.Rationalization.post_name == new_post
            ).first()
            if quota and quota.allocated_posts > 0:
                current_count = db.query(models.Employee).filter(
                    models.Employee.branch_office == new_branch,
                    models.Employee.post_name == new_post,
                    models.Employee.id != employee_id
                ).count()
                if current_count >= quota.allocated_posts:
                    from fastapi import HTTPException
                    raise HTTPException(status_code=400, detail=f"Action blocked: The seat quota of {quota.allocated_posts} for '{new_post}' in '{new_branch}' is already full.")

    print(f"DEBUG: Checking for transfer. Old branch: {db_employee.branch_office}, New branch: {new_data.get('branch_office')}, Relieving date: {relieving_date}")
    if branch_changed or relieving_date:
        # Check if a history record for this relieving date already exists for this employee to prevent duplicates
        duplicate = False
        if relieving_date:
            duplicate = db.query(models.TransferHistory).filter(
                models.TransferHistory.employee_id == db_employee.id,
                models.TransferHistory.relieving_date == relieving_date,
                models.TransferHistory.previous_branch_office == db_employee.branch_office
            ).first() is not None

        if not duplicate:
            print("DEBUG: Creating transfer record.")
            from app.api.routes_transfers import calculate_duration
            duration = calculate_duration(
                db_employee.place_of_posting or db_employee.joining_date or datetime.utcnow().strftime('%Y-%m-%d'),
                relieving_date or datetime.utcnow().strftime('%Y-%m-%d')
            )
            history = models.TransferHistory(
                employee_id=db_employee.id,
                previous_branch_office=db_employee.branch_office,
                previous_region=db_employee.section_district,
                new_branch_office=new_data.get('branch_office') or db_employee.branch_office,
                new_region=new_data.get('section_district') or db_employee.section_district,
                joining_date=db_employee.place_of_posting or db_employee.joining_date,
                relieving_date=relieving_date or datetime.utcnow().strftime('%d-%m-%Y'),
                order_number=order_number,
                order_date=order_date,
                duration_spent=duration,
                remarks="Auto-registered via edit form"
            )
            db.add(history)
            print("DEBUG: Transfer record added to DB.")
        else:
            print("DEBUG: Duplicate transfer record check hit. Skipping creation.")
    else:
        print("DEBUG: No branch office change and no relieving date. Skipping transfer record.")

    # 3. Apply Updates
    for key, value in new_data.items():
        if key not in locked_fields and hasattr(db_employee, key):
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

def update_transfer(db: Session, transfer_id: int, transfer_update: schemas.TransferHistoryUpdate, user_id: int):
    db_transfer = db.query(models.TransferHistory).filter(models.TransferHistory.id == transfer_id).first()
    if not db_transfer:
        return None
    
    update_data = transfer_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if hasattr(db_transfer, key):
            setattr(db_transfer, key, value)
            
    db.commit()
    db.refresh(db_transfer)
    return db_transfer

def delete_transfer(db: Session, transfer_id: int, user_id: int):
    db_transfer = db.query(models.TransferHistory).filter(models.TransferHistory.id == transfer_id).first()
    if not db_transfer:
        return False
        
    db.delete(db_transfer)
    db.commit()
    return True
