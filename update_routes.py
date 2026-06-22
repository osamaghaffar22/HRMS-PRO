import re
file_path = 'd:/HRMS Pro/backend/app/api/routes_employees.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

export_endpoint = '''
from fastapi.responses import StreamingResponse
import pandas as pd
import io

@router.get("/export/excel")
def export_employees_excel(
    search: Optional[str] = None,
    officer_official: Optional[str] = None,
    hq_field: Optional[str] = None,
    region: Optional[str] = None,
    branch_office: Optional[str] = None,
    post_name: Optional[str] = None,
    post_status: Optional[str] = None,
    domicile: Optional[str] = None,
    hr_pool_only: Optional[bool] = False,
    db: Session = Depends(get_db)
):
    query = db.query(models.Employee).filter((models.Employee.employment_status == 'Active') | (models.Employee.employment_status == None))

    is_hr_pool = (models.Employee.branch_office.ilike('%HR POOL%')) | (models.Employee.hq_field.ilike('%HR POOL%'))
    if hr_pool_only:
        query = query.filter(is_hr_pool)
    else:
        query = query.filter(~is_hr_pool)

    def apply_multi_filter(q, col, val):
        if not val or val.lower() == 'all': return q
        vals = [v for v in val.split(',') if v]
        if not vals: return q
        return q.filter(col.in_(vals))

    query = apply_multi_filter(query, models.Employee.officer_official, officer_official)
    query = apply_multi_filter(query, models.Employee.hq_field, hq_field)
    query = apply_multi_filter(query, models.Employee.section_district, region) 
    query = apply_multi_filter(query, models.Employee.branch_office, branch_office)
    query = apply_multi_filter(query, models.Employee.post_name, post_name)
    query = apply_multi_filter(query, models.Employee.post_status, post_status)
    query = apply_multi_filter(query, models.Employee.domicile, domicile)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                models.Employee.name.ilike(search_filter),
                models.Employee.code.ilike(search_filter),
                models.Employee.cnic.ilike(search_filter)
            )
        )

    query = query.order_by(models.Employee.s_no.asc(), models.Employee.bs.desc())
    employees = query.all()

    data = []
    for i, emp in enumerate(employees):
        data.append({
            'S.No': i + 1,
            'Name': emp.name,
            'Designation': emp.post_name,
            'BPS': emp.bs,
            'Office': emp.branch_office,
            'CNIC': emp.cnic,
            'Domicile': emp.domicile,
            'Status': emp.employment_status
        })

    df = pd.DataFrame(data)
    stream = io.BytesIO()
    with pd.ExcelWriter(stream, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Employees')
    stream.seek(0)

    headers = {
        'Content-Disposition': 'attachment; filename="employees_export.xlsx"',
        'Access-Control-Expose-Headers': 'Content-Disposition'
    }
    return StreamingResponse(stream, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers=headers)
'''

content += '\n' + export_endpoint

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Added export endpoint to routes_employees.py')
