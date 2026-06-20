from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
from app import models, schemas
from app.db import database
from app.db.database import get_db
from datetime import datetime

from app.core.auth import get_current_user
from app.core.auth_utils import PermissionChecker

router = APIRouter(prefix="/api/leaves", tags=["leaves"], dependencies=[Depends(PermissionChecker(["leaves"]))])

@router.post("/", response_model=schemas.LeaveRecord)
def create_leave_record(
    leave: schemas.LeaveRecordCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        # Fetch employee first to ensure it exists
        emp = db.query(models.Employee).filter(models.Employee.id == leave.employee_id).first()
        if not emp:
            raise HTTPException(status_code=404, detail="Employee not found")

        # Check for overlapping leave records
        existing_leave = db.query(models.LeaveRecord).filter(
            models.LeaveRecord.employee_id == leave.employee_id,
            models.LeaveRecord.from_date <= leave.to_date,
            models.LeaveRecord.to_date >= leave.from_date
        ).first()

        if existing_leave:
            raise HTTPException(status_code=400, detail="Leave record already exists for these dates.")

        d1 = datetime.strptime(leave.from_date, "%Y-%m-%d")
        d2 = datetime.strptime(leave.to_date, "%Y-%m-%d")
        delta = (d2 - d1).days + 1
        
        leave_data = leave.model_dump()
        leave_data['total_days'] = delta
        db_leave = models.LeaveRecord(**leave_data)
        db.add(db_leave)
        db.commit()
        db.refresh(db_leave)
        
        # Populate schema fields manually using fetched employee
        db_leave.employee_name = emp.name
        db_leave.employee_post = emp.post_name
        
        return db_leave
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[schemas.LeaveRecord])
def get_leaves(
    status: str = None, 
    employee_id: int = None, 
    search: str = None,
    db: Session = Depends(get_db)
):
    query = db.query(
        models.LeaveRecord.id,
        models.LeaveRecord.employee_id,
        models.Employee.name.label("employee_name"),
        models.Employee.post_name.label("employee_post"),
        models.Employee.bs.label("employee_bs"),
        models.LeaveRecord.from_date,
        models.LeaveRecord.to_date,
        models.LeaveRecord.total_days,
        models.LeaveRecord.status,
        models.LeaveRecord.remarks,
        models.LeaveRecord.created_at
    ).outerjoin(models.Employee, models.LeaveRecord.employee_id == models.Employee.id)
    
    if status and status != 'all':
        query = query.filter(models.LeaveRecord.status == status)
    if employee_id:
        query = query.filter(models.LeaveRecord.employee_id == employee_id)
    if search:
        f = f"%{search}%"
        query = query.filter(or_(models.Employee.name.ilike(f), models.Employee.code.ilike(f)))
    
    return query.order_by(models.LeaveRecord.created_at.desc()).all()

@router.put("/{leave_id}", response_model=schemas.LeaveRecord)
def update_leave(leave_id: int, leave_update: schemas.LeaveRecordCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    db_leave = db.query(models.LeaveRecord).filter(models.LeaveRecord.id == leave_id).first()
    if not db_leave: raise HTTPException(status_code=404)
    
    try:
        d1 = datetime.strptime(leave_update.from_date, "%Y-%m-%d")
        d2 = datetime.strptime(leave_update.to_date, "%Y-%m-%d")
        delta = (d2 - d1).days + 1
        db_leave.total_days = delta
    except: pass

    for k, v in leave_update.model_dump().items():
        setattr(db_leave, k, v)
    
    db.commit()
    db.refresh(db_leave)
    
    # Attach for response
    db_leave.employee_name = db_leave.employee.name
    db_leave.employee_post = db_leave.employee.post_name
    
    return db_leave

@router.delete("/{leave_id}")
def delete_leave(leave_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    leave = db.query(models.LeaveRecord).filter(models.LeaveRecord.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Not found")
    
    db.delete(leave)
    db.commit()
    return {"message": "Deleted"}
