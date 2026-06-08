from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
import models, schemas, database, crud, excel_sync
from database import get_db
from auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/api/transfers", tags=["transfers"])

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

    calculated_duration = calculate_duration(emp.joining_date, transfer.relieving_date)
    
    prev_stint = models.TransferHistory(
        employee_id=emp.id,
        transfer_order=transfer.transfer_order,
        previous_office=emp.branch_office,
        new_office=transfer.new_office,
        joining_date=emp.joining_date,
        relieving_date=transfer.relieving_date,
        duration_spent=calculated_duration
    )
    db.add(prev_stint)

    emp.branch_office = transfer.new_office
    emp.joining_date = transfer.joining_date 
    emp.place_of_posting = transfer.joining_date
    emp.tenure_current_station = "0Y, 0M, 0D"
    
    db.commit()
    background_tasks.add_task(excel_sync.sync_db_to_excel)
    db.refresh(prev_stint)
    return prev_stint

@router.get("/{employee_id}", response_model=List[schemas.TransferHistory])
def get_employee_transfer_history(employee_id: int, db: Session = Depends(get_db)):
    return db.query(models.TransferHistory).filter(models.TransferHistory.employee_id == employee_id).order_by(models.TransferHistory.created_at.desc()).all()
