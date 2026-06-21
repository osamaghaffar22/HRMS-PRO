from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import or_, text, case, cast, Integer, desc, asc
from typing import List, Optional
from app import models, schemas, crud
from app.services import excel_sync
from app.db.database import get_db
from app.core.auth import get_current_user
from app.core.auth_utils import PermissionChecker

router = APIRouter(prefix="/api/employees", tags=["employees"])

@router.get("/filter-options")
def get_filter_options(db: Session = Depends(get_db), current_user=Depends(PermissionChecker(["employees", "reports", "transfers", "leaves", "acr", "custom"]))):
    def get_distinct(field):
        return sorted([r[0] for r in db.query(field).distinct().all() if r[0]])
    
    response = {
        "officer_official": ["Officer", "Official"],
        "hq_field": ["HQ", "Field"],
        "wing_division": get_distinct(models.Employee.wing_division),
        "region": get_distinct(models.Employee.section_district),
        "section_district": get_distinct(models.Employee.section_district),
        "branch_office": get_distinct(models.Employee.branch_office),
        "post_name": get_distinct(models.Employee.post_name),
        "post_status": ["Filled", "Vacant"],
        "domicile": get_distinct(models.Employee.domicile),
        
        # Additional Options for Form
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

    # Add hierarchy
    hierarchy = {}
    mappings = db.query(
        models.Employee.wing_division, 
        models.Employee.section_district, 
        models.Employee.branch_office
    ).distinct().all()
    
    for w, r, b in mappings:
        if not w or not r or not b: continue
        if w not in hierarchy:
            hierarchy[w] = {}
        if r not in hierarchy[w]:
            hierarchy[w][r] = []
        if b not in hierarchy[w][r]:
            hierarchy[w][r].append(b)
            
    response["hierarchy"] = hierarchy
    
    return response

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
    sort_order: Optional[str] = None,
    hr_pool_only: Optional[bool] = False,
    limit: Optional[int] = 500,
    db: Session = Depends(get_db),
    current_user=Depends(PermissionChecker(["employees", "reports", "transfers", "leaves", "acr", "custom"]))
):
    query = db.query(models.Employee).filter((models.Employee.employment_status == 'Active') | (models.Employee.employment_status == None))

    is_hr_pool = (models.Employee.branch_office.ilike('%HR POOL%')) | (models.Employee.hq_field.ilike('%HR POOL%'))
    if hr_pool_only:
        query = query.filter(is_hr_pool)
    else:
        query = query.filter(~is_hr_pool)

    def apply_multi_filter(q, col, val):
        if not val or val.lower() == 'all': return q
        # Split by comma but do NOT strip, as the options come exactly from the DB
        vals = [v for v in val.split(',') if v]
        if not vals: return q
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
    if search and search.strip():
        search_filter = f"%{search.strip()}%"
        query = query.filter(or_(
            models.Employee.name.ilike(search_filter),
            models.Employee.branch_office.ilike(search_filter),
            models.Employee.post_name.ilike(search_filter),
            models.Employee.cnic.ilike(search_filter),
            models.Employee.bs.ilike(search_filter),
            models.Employee.code.ilike(search_filter)
        ))

    # Default Sorting logic or Dynamic Sorting
    if sort_by and sort_order in ['asc', 'desc']:
        order_fn = asc if sort_order == 'asc' else desc
        if sort_by == 'name': query = query.order_by(order_fn(models.Employee.name))
        elif sort_by in ['post_name', 'bs']: query = query.order_by(order_fn(cast(models.Employee.bs, Integer)))
        elif sort_by == 'branch_office': query = query.order_by(order_fn(models.Employee.branch_office))
        elif sort_by == 'domicile': query = query.order_by(order_fn(models.Employee.domicile))
        else: query = query.order_by(cast(models.Employee.s_no, Integer).asc(), cast(models.Employee.bs, Integer).desc())
    else:
        query = query.order_by(cast(models.Employee.s_no, Integer).asc(), cast(models.Employee.bs, Integer).desc(), models.Employee.id.asc())

    if limit and limit > 0:
        query = query.limit(limit)
    return query.all()

@router.get("/{emp_id}", response_model=schemas.Employee)
def get_employee(emp_id: int, db: Session = Depends(get_db), current_user=Depends(PermissionChecker(["employees", "reports", "transfers", "leaves", "acr", "custom"]))):
    emp = db.query(models.Employee).filter(models.Employee.id == emp_id).first()
    if not emp: raise HTTPException(status_code=404)
    return emp

@router.put("/{emp_id}")
def update_employee(emp_id: int, emp_data: schemas.EmployeeCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user=Depends(PermissionChecker(["employees_form"]))):
    emp = crud.update_employee(db, emp_id, emp_data, current_user.id if current_user else 1) # Fallback to admin id 1
    if not emp: raise HTTPException(status_code=404)
    return emp

@router.delete("/{emp_id}")
def delete_employee(emp_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user=Depends(PermissionChecker(["employees_form"]))):
    emp = db.query(models.Employee).filter(models.Employee.id == emp_id).first()
    if not emp: raise HTTPException(status_code=404)
    db.delete(emp)
    db.commit()
    return {"message": "Deleted"}

@router.get("/discrepancies/officials", response_model=List[schemas.EmployeeDiscrepancy])
def get_officials_discrepancies(db: Session = Depends(get_db), current_user=Depends(PermissionChecker(["employees", "reports"]))):
    is_not_hr_pool = ~(
        (models.Employee.branch_office.ilike('%HR POOL%')) | 
        (models.Employee.hq_field.ilike('%HR POOL%'))
    )
    is_filled = (
        (models.Employee.name != None) & 
        (models.Employee.name != '') & 
        (~models.Employee.name.ilike('%vacant%')) &
        (~models.Employee.post_status.ilike('%vacant%')) &
        (models.Employee.officer_official.ilike('%official%'))
    )

    employees = db.query(models.Employee).filter(is_filled, is_not_hr_pool).order_by(
        cast(models.Employee.s_no, Integer).asc(),
        cast(models.Employee.bs, Integer).desc(),
        models.Employee.id.asc()
    ).all()
    discrepancies_list = []
    
    for emp in employees:
        issues = []
        if not emp.domicile or emp.domicile.strip() == "" or "not match" in emp.domicile.lower():
            issues.append("Invalid/Missing Domicile")
        if not emp.joining_date or emp.joining_date.strip() == "":
            issues.append("Missing Appointment Date")
        if not emp.place_of_posting or emp.place_of_posting.strip() == "":
            issues.append("Missing Current Station Joining Date")
            
        if issues:
            discrepancies_list.append({
                "employee": emp,
                "issues": issues
            })
            
    return discrepancies_list

@router.get("/discrepancies/rationalization", response_model=List[schemas.EmployeeDiscrepancy])
def get_rationalization_errors(db: Session = Depends(get_db), current_user=Depends(PermissionChecker(["employees", "reports"]))):
    is_not_hr_pool = ~(
        (models.Employee.branch_office.ilike('%HR POOL%')) | 
        (models.Employee.hq_field.ilike('%HR POOL%'))
    )
    is_filled = (
        (models.Employee.name != None) & 
        (models.Employee.name != '') & 
        (~models.Employee.name.ilike('%vacant%')) &
        (~models.Employee.post_status.ilike('%vacant%'))
    )

    from sqlalchemy import func
    emp_counts = db.query(
        models.Employee.branch_office,
        models.Employee.post_name,
        func.count(models.Employee.id).label("current_count")
    ).filter(is_filled, is_not_hr_pool).group_by(models.Employee.branch_office, models.Employee.post_name).all()
    
    count_map = {}
    for branch, post, count in emp_counts:
        count_map[(branch, post)] = count
        
    rationalizations = db.query(models.Rationalization).all()
    overstaffed_branches_posts = {}
    
    for r in rationalizations:
        current_count = count_map.get((r.branch_office, r.post_name), 0)
        if current_count > r.allocated_posts:
            overstaffed_branches_posts[(r.branch_office, r.post_name)] = f"Sanctioned: {r.allocated_posts}, Actual: {current_count}"

    if not overstaffed_branches_posts:
        return []

    # Fetch all employees in these overstaffed branches/posts
    employees = db.query(models.Employee).filter(is_filled, is_not_hr_pool).order_by(
        cast(models.Employee.s_no, Integer).asc(),
        cast(models.Employee.bs, Integer).desc(),
        models.Employee.id.asc()
    ).all()
    
    discrepancies_list = []
    for emp in employees:
        key = (emp.branch_office, emp.post_name)
        if key in overstaffed_branches_posts:
            discrepancies_list.append({
                "employee": emp,
                "issues": [f"Rationalization Issue: Overstaffing ({overstaffed_branches_posts[key]})"]
            })
            
    return discrepancies_list

from pydantic import BaseModel
class SeparateRequest(BaseModel):
    separation_type: str
    separation_date: str = None

@router.post("/{employee_id}/separate")
def separate_employee(
    employee_id: int, 
    request: SeparateRequest,
    db: Session = Depends(get_db), 
    current_user=Depends(PermissionChecker(["employees"]))
):
    emp = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Update current employee status
    emp.employment_status = request.separation_type
    emp.separation_date = request.separation_date

    # Duplicate the seat structure
    new_seat = models.Employee(
        code=emp.code,
        s_no=emp.s_no,
        officer_official=emp.officer_official,
        hq_field=emp.hq_field,
        head_office=emp.head_office,
        wing_division=emp.wing_division,
        section_district=emp.section_district,
        branch_office=emp.branch_office,
        bs=emp.bs,
        post_name=emp.post_name,
        cadre_type=emp.cadre_type,
        name="Vacant",
        post_status="Vacant",
        employment_status="Active"
    )
    db.add(new_seat)
    db.commit()
    return {"message": "Employee separated and seat vacated"}

@router.get("/extra/all", response_model=List[schemas.Employee])
def get_extra_employees(
    db: Session = Depends(get_db),
    current_user=Depends(PermissionChecker(["employees", "reports"]))
):
    query = db.query(models.Employee).filter(
        models.Employee.employment_status != 'Active',
        models.Employee.employment_status != None
    ).order_by(
        cast(models.Employee.s_no, Integer).asc(),
        cast(models.Employee.bs, Integer).desc(),
        models.Employee.id.asc()
    )
    if limit and limit > 0:
        query = query.limit(limit)
    return query.all()
