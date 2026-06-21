from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas, crud
from app.db import database
from app.services import excel_sync
from app.db.database import get_db
from app.core.auth import get_current_user
from app.core.auth_utils import PermissionChecker
from datetime import datetime

router = APIRouter(prefix="/api/transfers", tags=["transfers"], dependencies=[Depends(PermissionChecker(["transfers"]))])

def calculate_duration(start_date_str, end_date_str):
    try:
        from dateutil.relativedelta import relativedelta
        def parse_date(d_str):
            for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"):
                try:
                    return datetime.strptime(d_str, fmt)
                except ValueError:
                    continue
            raise ValueError(f"Could not parse date: {d_str}")

        d1 = parse_date(start_date_str)
        d2 = parse_date(end_date_str)
        diff = relativedelta(d2, d1)
        return f"{diff.years}Y, {diff.months}M, {diff.days}D"
    except Exception as e:
        print(f"Duration Calc Error: {e}")
        return "N/A"

@router.post("/", response_model=schemas.TransferHistory)
def create_transfer(
    transfer: schemas.TransferHistoryCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    emp = db.query(models.Employee).filter(models.Employee.id == transfer.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    calculated_duration = calculate_duration(emp.place_of_posting or emp.joining_date, transfer.relieving_date)
    
    order_num = transfer.order_number or transfer.transfer_order
    prev_office = transfer.previous_branch_office or transfer.previous_office or emp.branch_office
    new_off = transfer.new_branch_office or transfer.new_office
    new_reg = transfer.new_region or emp.section_district

    # Rationalization Check
    if new_off and new_off != emp.branch_office:
        # We no longer block transfers when quota is full. The UI will indicate the excess count instead.
        pass


    prev_stint = models.TransferHistory(
        employee_id=emp.id,
        order_number=order_num,
        order_date=transfer.order_date,
        previous_branch_office=prev_office,
        previous_region=emp.section_district,
        new_branch_office=new_off,
        new_region=new_reg,
        joining_date=emp.place_of_posting or emp.joining_date,
        relieving_date=transfer.relieving_date,
        duration_spent=calculated_duration,
        remarks=transfer.remarks
    )
    db.add(prev_stint)

    emp.branch_office = new_off
    if new_reg:
        emp.section_district = new_reg
    if transfer.joining_date:
        emp.place_of_posting = transfer.joining_date
        emp.joining_date = transfer.joining_date 
    emp.tenure_current_station = "0Y, 0M, 0D"
    
    db.commit()
    db.refresh(prev_stint)
    return prev_stint

@router.get("/{employee_id}", response_model=List[schemas.TransferHistory])
def get_employee_transfer_history(employee_id: int, db: Session = Depends(get_db)):
    return db.query(models.TransferHistory).filter(models.TransferHistory.employee_id == employee_id).order_by(models.TransferHistory.created_at.desc()).all()

@router.put("/{transfer_id}", response_model=schemas.TransferHistory)
def update_transfer_history(
    transfer_id: int,
    transfer_update: schemas.TransferHistoryUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    updated = crud.update_transfer(db, transfer_id, transfer_update, current_user.id)
    if not updated:
        raise HTTPException(status_code=404, detail="Transfer history not found")
    return updated

@router.delete("/{transfer_id}")
def delete_transfer_history(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    deleted = crud.delete_transfer(db, transfer_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Transfer history not found")
    return {"status": "success", "detail": "Transfer history deleted"}
