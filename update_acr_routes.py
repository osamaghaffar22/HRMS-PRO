import re
file_path = 'd:/HRMS Pro/backend/app/api/routes_acr.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

export_endpoint = '''
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
            models.Employee.name != ''
        )
    )

    if emp_id:
        query = query.filter(models.Employee.id == emp_id)

    if category:
        if category == 'Form':
            query = query.filter(models.Employee.officer_official == 'Officer')
        else:
            query = query.filter(models.Employee.officer_official == category)

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
                    'Period From': p.period_from.strftime('%Y-%m-%d') if p.period_from else '',
                    'Period To': p.period_to.strftime('%Y-%m-%d') if p.period_to else '',
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
'''

content += '\n' + export_endpoint

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Added export endpoint to routes_acr.py')
