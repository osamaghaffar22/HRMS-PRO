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
    new_data = employee_update.model_dump(exclude_unset=True)

    # 1. Removed Static Dates Lock as requested by user
    
    # Exclude locked fields from the general update loop
    locked_fields = []
    
    # 2. Refined Transfer Logging
    # Check if station (branch_office) changed or relieving date is provided
    relieving_date = new_data.get('relieving_date')
    order_date = new_data.get('order_date')
    order_number = new_data.get('order_number')
    branch_changed = 'branch_office' in new_data and db_employee.branch_office != new_data['branch_office']
    post_changed = 'post_name' in new_data and db_employee.post_name != new_data['post_name']

    if branch_changed:
        new_branch = new_data.get('branch_office')
        old_branch = db_employee.branch_office
        emp_post = db_employee.post_name
        emp_bs = db_employee.bs
        
        # 1. Check if Target Branch has a Vacant Seat
        target_vacant = db.query(models.Employee).filter(
            models.Employee.branch_office == new_branch,
            models.Employee.post_name == emp_post,
            models.Employee.name.in_(['Vacant', '()'])
        ).first()

        # 2. Check if Source Branch is Overstaffed
        sanctioned = db.query(models.Rationalization).filter(
            models.Rationalization.branch_office == old_branch,
            models.Rationalization.post_name == emp_post
        ).first()
        quota = sanctioned.allocated_posts if sanctioned else 0
        
        total_source_seats = db.query(models.Employee).filter(
            models.Employee.branch_office == old_branch,
            models.Employee.post_name == emp_post,
            models.Employee.employment_status == 'Active'
        ).count()
        
        is_overstaffed = total_source_seats > quota
        
        if target_vacant:
            if is_overstaffed:
                # Scenario 2: Source Overstaffed, Target has Vacant
                # Delete Target's Vacant Seat. No new Vacant seat in Source.
                db.delete(target_vacant)
            else:
                # Scenario 1: Source Normal, Target has Vacant
                # Swap Structural Fields
                tv_section = target_vacant.section_district
                tv_wing = target_vacant.wing_division
                tv_head = target_vacant.head_office
                tv_hq = target_vacant.hq_field
                tv_sno = target_vacant.s_no
                
                target_vacant.branch_office = old_branch
                target_vacant.section_district = db_employee.section_district
                target_vacant.wing_division = db_employee.wing_division
                target_vacant.head_office = db_employee.head_office
                target_vacant.hq_field = db_employee.hq_field
                target_vacant.s_no = db_employee.s_no
                
                new_data['section_district'] = tv_section
                new_data['wing_division'] = tv_wing
                new_data['head_office'] = tv_head
                new_data['hq_field'] = tv_hq
                new_data['s_no'] = tv_sno
        else:
            if not is_overstaffed:
                # Scenario 3: Source Normal, Target No Vacant
                # Create a new Vacant seat in Source
                new_vacant = models.Employee(
                    code=db_employee.code,
                    s_no=db_employee.s_no,
                    officer_official=db_employee.officer_official,
                    hq_field=db_employee.hq_field,
                    head_office=db_employee.head_office,
                    wing_division=db_employee.wing_division,
                    section_district=db_employee.section_district,
                    branch_office=db_employee.branch_office,
                    bs=db_employee.bs,
                    post_name=db_employee.post_name,
                    cadre_type=db_employee.cadre_type,
                    name="Vacant",
                    post_status="Vacant",
                    employment_status="Active"
                )
                db.add(new_vacant)
            # Scenario 4: Source Overstaffed, Target No Vacant
            # Do nothing, Employee moves and Source loses a seat (fixes overstaffing).
            
            # Since employee is moving to Target but there was no target_vacant to swap with,
            # we MUST fetch the structural fields for the Target Branch from any sibling employee.
            target_sibling = db.query(models.Employee).filter(models.Employee.branch_office == new_branch).first()
            if target_sibling:
                new_data['s_no'] = target_sibling.s_no
                new_data['hq_field'] = target_sibling.hq_field
                new_data['head_office'] = target_sibling.head_office
                new_data['wing_division'] = target_sibling.wing_division
                new_data['section_district'] = target_sibling.section_district

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
