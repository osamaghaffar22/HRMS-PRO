import os

file_path = "backend/app/api/routes_employees.py"
with open(file_path, "r") as f:
    content = f.read()

# Fix get_employees query
content = content.replace("query = db.query(models.Employee)", "query = db.query(models.Employee).filter((models.Employee.employment_status == 'Active') | (models.Employee.employment_status == None))")

endpoints = """
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

    employees = db.query(models.Employee).filter(is_filled, is_not_hr_pool).all()
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
    employees = db.query(models.Employee).filter(is_filled, is_not_hr_pool).all()
    
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
        officer_official=emp.officer_official,
        hq_field=emp.hq_field,
        head_office=emp.head_office,
        wing_division=emp.wing_division,
        section_district=emp.section_district,
        branch_office=emp.branch_office,
        bs=emp.bs,
        post_name=emp.post_name,
        cadre_type=emp.cadre_type,
        name="()",
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
    )
    return query.all()
"""

if 'def get_officials_discrepancies' not in content:
    content += endpoints

with open(file_path, "w") as f:
    f.write(content)
