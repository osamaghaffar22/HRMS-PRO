from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_
from typing import List, Optional
import models, schemas
from database import get_db

# Unified router with base prefix /api/acr
router = APIRouter(prefix="/api/acr", tags=["acr"])

@router.get("/")
def get_acr_records(
    search: Optional[str] = None,
    category: Optional[str] = None, 
    year: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Employee).options(
        joinedload(models.Employee.reports).joinedload(models.ACRReport.periods)
    ).filter(
        and_(
            ~models.Employee.post_status.ilike('%Vacant%'),
            models.Employee.name.isnot(None),
            models.Employee.name != ''
        )
    )
    
    if category == 'Officer':
        query = query.filter(
            and_(
                models.Employee.officer_official == 'Officer',
                ~models.Employee.post_name.ilike('%Senior Personal Assistant%')
            )
        )
    elif category == 'Official':
        query = query.filter(
            and_(
                models.Employee.officer_official == 'Official',
                ~models.Employee.post_name.ilike('%Naib Qasid%'),
                ~models.Employee.post_name.ilike('%Chowkidar%'),
                ~models.Employee.post_name.ilike('%Mali%'),
                ~models.Employee.post_name.ilike('%Sweeper%')
            )
        )

    if search:
        search_filter = f"%{search}%"
        query = query.filter(or_(
            models.Employee.name.ilike(search_filter),
            models.Employee.cnic.ilike(search_filter)
        ))

    employees = query.all()
    
    result = []
    for emp in employees:
        # Filter reports by year in Python
        acr_reports = emp.reports
        if year:
            acr_reports = [r for r in acr_reports if r.year == year]
        
        enriched_reports = []
        for r in acr_reports:
            enriched_reports.append({
                "id": r.id,
                "year": r.year,
                "status": r.status,
                "is_manually_completed": r.is_manually_completed,
                "periods": [{"id": p.id, "from": p.from_date, "to": p.to_date, "status": p.status, "ga": p.ga, "promotion": p.promotion, "remarks": p.remarks, "fitness_after_25_years": p.fitness_after_25_years} for p in r.periods]
            })
            
        result.append({
            "id": emp.id,
            "name": emp.name,
            "post_name": emp.post_name,
            "branch_office": emp.branch_office,
            "bs": emp.bs,
            "cnic": emp.cnic,
            "reports": enriched_reports
        })
        
    return result

@router.patch("/report/{report_id}/toggle-complete")
def toggle_acr_report_completion(report_id: int, db: Session = Depends(get_db)):
    report = db.query(models.ACRReport).filter(models.ACRReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    report.is_manually_completed = not report.is_manually_completed
    db.commit()
    return {"is_manually_completed": report.is_manually_completed}

@router.delete("/period/{period_id}")
def delete_acr_period(period_id: int, db: Session = Depends(get_db)):
    db.query(models.ACRReportPeriod).filter(models.ACRReportPeriod.id == period_id).delete()
    db.commit()
    return {"message": "Deleted"}

@router.patch("/period/{period_id}")
def update_acr_period_status(period_id: int, data: dict, db: Session = Depends(get_db)):
    period = db.query(models.ACRReportPeriod).filter(models.ACRReportPeriod.id == period_id).first()
    if period:
        if 'status' in data: period.status = data['status']
        if 'ga' in data: period.ga = data['ga']
        if 'promotion' in data: period.promotion = data['promotion']
        if 'remarks' in data: period.remarks = data['remarks']
        if 'fitness_after_25_years' in data: period.fitness_after_25_years = data['fitness_after_25_years']
        db.commit()
    return {"message": "Updated"}

@router.post("/report")
def save_acr_report(
    report_data: dict,
    db: Session = Depends(get_db)
):
    data = report_data.get('report_data', report_data)
    report = models.ACRReport(**data)
    db.add(report)
    db.commit()
    db.refresh(report)
    return report

import calendar
from datetime import datetime

@router.post("/period")
def save_acr_period(
    period_data: dict,
    db: Session = Depends(get_db)
):
    try:
        data = period_data.get('period_data', period_data)
        
        report_id = data.get('acr_report_id')
        # Fetch the report to get its year
        report = db.query(models.ACRReport).filter(models.ACRReport.id == report_id).first()
        if not report:
            raise HTTPException(status_code=404, detail="ACR Report not found")
            
        target_year = report.year
        new_from = datetime.strptime(data.get('from_date'), '%Y-%m-%d')
        new_to = datetime.strptime(data.get('to_date'), '%Y-%m-%d')
        
        # 1. Strict Year Check
        if str(new_from.year) != target_year or str(new_to.year) != target_year:
            raise HTTPException(
                status_code=400, 
                detail=f"Year Mismatch: You selected year {target_year}, but your dates ({new_from.year} to {new_to.year}) do not match. Please enter dates within {target_year}."
            )

        if new_from > new_to:
            raise HTTPException(status_code=400, detail="From date cannot be after To date")

        # Get existing periods for this report
        existing_periods = db.query(models.ACRReportPeriod).filter(models.ACRReportPeriod.acr_report_id == report_id).all()
        
        total_days = 0
        for p in existing_periods:
            p_from = datetime.strptime(p.from_date, '%Y-%m-%d')
            p_to = datetime.strptime(p.to_date, '%Y-%m-%d')
            
            # Check overlap
            if not (new_to < p_from or new_from > p_to):
                raise HTTPException(status_code=400, detail=f"Date range overlaps with existing period ({p.from_date} to {p.to_date})")
            
            total_days += (p_to - p_from).days + 1
            
        # 2. Dynamic Leap Year Check
        # Set limit based on whether the target year is a leap year
        limit = 366 if calendar.isleap(int(target_year)) else 365
        
        new_period_days = (new_to - new_from).days + 1
        
        if total_days + new_period_days > limit:
            raise HTTPException(
                status_code=400, 
                detail=f"Limit Exceeded for {target_year}: This entry ({new_period_days} days) + Existing ({total_days} days) = {total_days + new_period_days} days. Total cannot exceed {limit} days for this year."
            )
            
        period = models.ACRReportPeriod(**data)
        db.add(period)
        db.commit()
        db.refresh(period)
        return period
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
