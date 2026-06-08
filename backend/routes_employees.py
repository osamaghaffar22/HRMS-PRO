from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import or_, text, case
from typing import List, Optional
import models, schemas, crud, excel_sync
from database import get_db

# Dummy placeholder
def get_current_user():
    return None

router = APIRouter(prefix="/api/employees", tags=["employees"])
@router.get("/", response_model=List[schemas.Employee])
def get_employees(
    search: Optional[str] = None,
    officer_official: Optional[str] = None,
    hq_field: Optional[str] = None,
    region: Optional[str] = None,
    branch_office: Optional[str] = None,
    post_name: Optional[str] = None,
    post_status: Optional[str] = None,
    domicile: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = None, # 'asc', 'desc', or None for default
    tenure: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Employee)
    from sqlalchemy import cast, Integer, desc, asc

    def apply_multi_filter(q, col, val):
        if not val or val == 'all': return q
        vals = val.split(',')
        return q.filter(col.in_(vals))

    # Multi-select Filters
    query = apply_multi_filter(query, models.Employee.officer_official, officer_official)
    query = apply_multi_filter(query, models.Employee.hq_field, hq_field)
    query = apply_multi_filter(query, models.Employee.section_district, region) 
    query = apply_multi_filter(query, models.Employee.branch_office, branch_office)
    query = apply_multi_filter(query, models.Employee.post_name, post_name)
    query = apply_multi_filter(query, models.Employee.post_status, post_status)
    query = apply_multi_filter(query, models.Employee.domicile, domicile)

    # Advanced Search
    if search:
        search_filter = f"%{search}%"
        query = query.filter(or_(
            models.Employee.name.ilike(search_filter),
            models.Employee.branch_office.ilike(search_filter),
            models.Employee.post_name.ilike(search_filter),
            models.Employee.cnic.ilike(search_filter),
            models.Employee.bs.ilike(search_filter),
            models.Employee.code.ilike(search_filter)
        ))

    # Dynamic Sorting
    if sort_by and sort_order in ['asc', 'desc']:
        order_fn = asc if sort_order == 'asc' else desc

        if sort_by == 'name':
            query = query.order_by(order_fn(models.Employee.name))
        elif sort_by == 'post_name' or sort_by == 'bs':
            # Sort by BPS numerically
            query = query.order_by(order_fn(cast(models.Employee.bs, Integer)))
        elif sort_by == 'branch_office':
            query = query.order_by(order_fn(models.Employee.branch_office))
        elif sort_by == 'tenure':
            # Assuming tenure_current_station can be sorted lexicographically or we have a hidden duration
            query = query.order_by(order_fn(models.Employee.tenure_current_station))
        elif sort_by == 'domicile':
            query = query.order_by(order_fn(models.Employee.domicile))
        else:
            # Revert to default if unknown key
            query = query.order_by(cast(models.Employee.s_no, Integer).asc(), cast(models.Employee.bs, Integer).desc())
    else:
        # Default Sorting: S.No (ASC), Grade (DESC)
        query = query.order_by(
            cast(models.Employee.s_no, Integer).asc(),
            cast(models.Employee.bs, Integer).desc(),
            models.Employee.id.asc()
        )

    return query.all()
@router.get("/filters")
def get_filter_options(db: Session = Depends(get_db)):
    def get_distinct(field):
        return sorted([r[0] for r in db.query(field).distinct().all() if r[0]])
    
    return {
        "officer_official": ["Officer", "Official"],
        "hq_field": ["HQ", "Field"],
        "region": get_distinct(models.Employee.section_district),
        "branch_office": get_distinct(models.Employee.branch_office),
        "post_name": get_distinct(models.Employee.post_name),
        "post_status": ["Filled", "Vacant"],
        "domicile": get_distinct(models.Employee.domicile),
        
        # New Dropdown Options for Form
        "religion": get_distinct(models.Employee.religion),
        "nationality": get_distinct(models.Employee.nationality),
        "blood_group": get_distinct(models.Employee.blood_group),
        "bs": sorted(get_distinct(models.Employee.bs), key=lambda x: int(''.join(filter(str.isdigit, x))) if any(c.isdigit() for c in x) else 0),
        "cadre_type": get_distinct(models.Employee.cadre_type),
        "job_type": get_distinct(models.Employee.job_type),
        "direct_promotion": get_distinct(models.Employee.direct_promotion),
        "area_expertise": get_distinct(models.Employee.area_expertise),
        "disability": get_distinct(models.Employee.disability),
        "dual_nationality": get_distinct(models.Employee.dual_nationality),
        "passport_noc": get_distinct(models.Employee.passport_noc),
        "home_province": get_distinct(models.Employee.home_province),
        "home_district": get_distinct(models.Employee.home_district),
        "rural_urban": get_distinct(models.Employee.rural_urban),
        "probation_status": get_distinct(models.Employee.probation_status)
    }

@router.get("/{emp_id}", response_model=schemas.Employee)
def get_employee(emp_id: int, db: Session = Depends(get_db)):
    emp = db.query(models.Employee).filter(models.Employee.id == emp_id).first()
    if not emp: raise HTTPException(status_code=404)
    return emp

@router.put("/{emp_id}")
def update_employee(emp_id: int, emp_data: schemas.EmployeeCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    emp = crud.update_employee(db, emp_id, emp_data, current_user.id)
    if not emp: raise HTTPException(status_code=404)
    
    # Auto-sync to Excel in background
    background_tasks.add_task(excel_sync.sync_db_to_excel)
        
    return emp
