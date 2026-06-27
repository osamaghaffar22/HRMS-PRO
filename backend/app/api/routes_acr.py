from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, func, cast, Integer
from typing import List, Optional
from app import models, schemas
from app.db.database import get_db
from app.core.auth_utils import PermissionChecker

# Unified router with base prefix /api/acr
router = APIRouter(prefix="/api/acr", tags=["acr"], dependencies=[Depends(PermissionChecker(["acr"]))])

@router.get("/")
def get_acr_records(
    search: Optional[str] = None,
    category: Optional[str] = None, 
    year: Optional[str] = None,
    emp_id: Optional[int] = None,
    skip: int = 0,
    limit: Optional[int] = 50,
    response: Response = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Employee).options(
        joinedload(models.Employee.reports).joinedload(models.ACRReport.periods)
    ).filter(
        and_(
            ~func.coalesce(models.Employee.post_status, '').ilike('%Vacant%'),
            models.Employee.name.isnot(None),
            models.Employee.name != '',
            or_(models.Employee.employment_status == 'Active', models.Employee.employment_status == None)
        )
    )

    if emp_id:
        query = query.filter(models.Employee.id == emp_id)
    
    # BPS parsing for logic (bs is now Integer)
    bps_val = func.coalesce(models.Employee.bs, 0)
    
    # Base logic for Officer (ACR perspective: SPA is Official)
    is_officer_acr = (
        (bps_val >= 17) |
        func.coalesce(models.Employee.post_name, '').ilike('%Deputy Assistant Director%')
    ) & ~func.coalesce(models.Employee.post_name, '').ilike('%Senior Personal Assistant%')
    
    is_official_acr = ~is_officer_acr
    
    # Exclusion list for lower staff
    is_not_lower_staff = and_(
        ~func.coalesce(models.Employee.post_name, '').ilike('%Naib Qasid%'),
        ~func.coalesce(models.Employee.post_name, '').ilike('%Chowkidar%'),
        ~func.coalesce(models.Employee.post_name, '').ilike('%Mali%'),
        ~func.coalesce(models.Employee.post_name, '').ilike('%Sweeper%')
    )

    if category == 'Officer':
        query = query.filter(is_officer_acr)
    elif category == 'Official':
        query = query.filter(and_(is_official_acr, is_not_lower_staff))
    elif category == 'All':
        query = query.filter(is_not_lower_staff)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(or_(
            models.Employee.name.ilike(search_filter),
            models.Employee.cnic.ilike(search_filter)
        ))

    query = query.order_by(cast(models.Employee.s_no, Integer).asc(), cast(models.Employee.bs, Integer).desc(), models.Employee.id.asc())
    
    total_count = query.count()
    if response:
        response.headers["X-Total-Count"] = str(total_count)

    if skip and skip > 0:
        query = query.offset(skip)
    if limit and limit > 0:
        query = query.limit(limit)
        
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
                "periods": [
                    {
                        "id": p.id, 
                        "from": p.from_date, 
                        "to": p.to_date, 
                        "status": p.status, 
                        "ga": p.ga, 
                        "promotion": p.promotion, 
                        "ro_remarks": p.ro_remarks, 
                        "co_remarks": p.co_remarks, 
                        "fitness_after_25_years": p.fitness_after_25_years,
                        "ro_name": p.ro_name,
                        "ro_date": p.ro_date,
                        "co_name": p.co_name,
                        "co_date": getattr(p, 'co_date', ''),
                        "result": getattr(p, 'result', '')
                    } for p in r.periods
                ]
            })
            
        result.append({
            "id": emp.id,
            "name": emp.name,
            "post_name": emp.post_name,
            "branch_office": emp.branch_office,
            "bs": emp.bs,
            "cnic": emp.cnic,
            "joining_date": emp.joining_date,
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
        fields = ['status', 'ga', 'promotion', 'ro_remarks', 'co_remarks', 'fitness_after_25_years', 'ro_name', 'ro_date', 'co_name', 'co_date', 'result']
        for field in fields:
            if field in data:
                setattr(period, field, data[field])
        db.commit()
    return {"message": "Updated"}

@router.post("/report")
def save_acr_report(
    report_data: dict,
    db: Session = Depends(get_db)
):
    data = report_data.get('report_data', report_data)
    valid_keys = [column.name for column in models.ACRReport.__table__.columns]
    filtered_data = {k: v for k, v in data.items() if k in valid_keys}
    report = models.ACRReport(**filtered_data)
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
            
        # Remove fields not present in model
        valid_keys = [column.name for column in models.ACRReportPeriod.__table__.columns]
        filtered_data = {k: v for k, v in data.items() if k in valid_keys}

        period = models.ACRReportPeriod(**filtered_data)
        db.add(period)
        db.commit()
        db.refresh(period)
        return period
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


from fastapi.responses import StreamingResponse
import pandas as pd
import io

@router.get("/export/excel")
def export_acr_excel(
    search: Optional[str] = None,
    category: Optional[str] = None, 
    year: Optional[str] = None,
    emp_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Employee).options(
        joinedload(models.Employee.reports).joinedload(models.ACRReport.periods)
    ).filter(
        and_(
            ~func.coalesce(models.Employee.post_status, '').ilike('%Vacant%'),
            models.Employee.name.isnot(None),
            models.Employee.name != '',
            or_(models.Employee.employment_status == 'Active', models.Employee.employment_status == None)
        )
    )

    if emp_id:
        query = query.filter(models.Employee.id == emp_id)

    if category == 'Officer' or category == 'Form':
        query = query.filter(
            and_(
                models.Employee.officer_official == 'Officer',
                ~func.coalesce(models.Employee.post_name, '').ilike('%Senior Personal Assistant%')
            )
        )
    elif category == 'Official':
        query = query.filter(
            or_(
                and_(
                    models.Employee.officer_official == 'Official',
                    ~func.coalesce(models.Employee.post_name, '').ilike('%Naib Qasid%'),
                    ~func.coalesce(models.Employee.post_name, '').ilike('%Chowkidar%'),
                    ~func.coalesce(models.Employee.post_name, '').ilike('%Mali%'),
                    ~func.coalesce(models.Employee.post_name, '').ilike('%Sweeper%')
                ),
                func.coalesce(models.Employee.post_name, '').ilike('%Senior Personal Assistant%')
            )
        )
    elif category == 'All':
        query = query.filter(
            ~func.coalesce(models.Employee.post_name, '').ilike('%Naib Qasid%'),
            ~func.coalesce(models.Employee.post_name, '').ilike('%Chowkidar%'),
            ~func.coalesce(models.Employee.post_name, '').ilike('%Mali%'),
            ~func.coalesce(models.Employee.post_name, '').ilike('%Sweeper%')
        )

    if search:
        search_filter = f"%{search}%"
        query = query.filter(or_(
            models.Employee.name.ilike(search_filter),
            models.Employee.cnic.ilike(search_filter)
        ))

    query = query.order_by(cast(models.Employee.s_no, Integer).asc(), cast(models.Employee.bs, Integer).desc(), models.Employee.id.asc())
    employees = query.all()

    data = []
    for emp in employees:
        acr_reports = emp.reports
        if year:
            acr_reports = [r for r in acr_reports if r.year == year]
        
        for r in acr_reports:
            for p in r.periods:
                data.append({
                    'Emp ID': emp.id,
                    'Name': emp.name,
                    'Designation': emp.post_name,
                    'BPS': emp.bs,
                    'Office': emp.branch_office,
                    'Report Year': r.year,
                    'Status': r.status,
                    'Period From': p.from_date if p.from_date else '',
                    'Period To': p.to_date if p.to_date else '',
                    'Fitness': p.fitness,
                    'Promotion': p.fitness_for_promotion,
                    'Remarks': p.adverse_remarks
                })
    
    if not data:
        data.append({'Message': 'No records found'})

    df = pd.DataFrame(data)
    stream = io.BytesIO()
    with pd.ExcelWriter(stream, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='ACR Records')
    stream.seek(0)

    headers = {
        'Content-Disposition': 'attachment; filename="acr_export.xlsx"',
        'Access-Control-Expose-Headers': 'Content-Disposition'
    }
    return StreamingResponse(stream, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers=headers)
