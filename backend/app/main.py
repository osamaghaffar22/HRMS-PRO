from fastapi import FastAPI, Depends, HTTPException, status, Security, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, case, text
from datetime import timedelta
from typing import List, Optional
from app import models, schemas
from app.core import auth
from app.db import database
from app.services import excel_sync
from app.db.database import engine, get_db
from app.core.auth import get_current_user
from app.core.auth_utils import RoleChecker
import os

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="HRMS Enterprise Pro API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routers
from app.api import routes_transfers, routes_leaves, routes_custom, routes_employees, routes_sync, routes_acr, routes_files, routes_users, routes_rationalization, routes_hrpool
app.include_router(routes_transfers.router)
app.include_router(routes_leaves.router)
app.include_router(routes_custom.router)
app.include_router(routes_employees.router)
app.include_router(routes_sync.router)
app.include_router(routes_acr.router)
app.include_router(routes_files.router)
app.include_router(routes_users.router)
app.include_router(routes_rationalization.router)
app.include_router(routes_hrpool.router)

@app.get("/admin/test")
async def admin_only_endpoint(current_user: models.User = Depends(RoleChecker(["Admin"]))):
    return {"message": "You are an admin"}

@app.post("/token", response_model=schemas.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.get("/api/stats/overall")
def get_overall_stats(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # HR Pool Definition: If Branch/Office or HQ/Field is HR Pool
    is_hr_pool = (models.Employee.branch_office.ilike('%HR POOL%')) | (models.Employee.hq_field.ilike('%HR POOL%'))
    is_not_hr_pool = ~is_hr_pool

    # Simple logic: 'Vacant' if name contains "Vacant", 'Filled' if it's a real name
    is_vacant = models.Employee.name.ilike('%Vacant%')
    is_filled = (~models.Employee.name.ilike('%Vacant%')) & (models.Employee.name.isnot(None)) & (models.Employee.name != '')

    # Single query to get all counts based on your logic
    res = db.query(
        # All Staff
        func.count(case((is_not_hr_pool, 1))).label('total_all'),
        func.count(case((is_filled & is_not_hr_pool, 1))).label('filled_all'),
        
        # Officers (Filtered by 'Officer' in officer_official column)
        func.count(case(((models.Employee.officer_official == 'Officer') & is_not_hr_pool, 1))).label('total_officers'),
        func.count(case(((models.Employee.officer_official == 'Officer') & is_filled & is_not_hr_pool, 1))).label('filled_officers'),
        
        # Officials (Filtered by 'Official' in officer_official column)
        func.count(case(((models.Employee.officer_official == 'Official') & is_not_hr_pool, 1))).label('total_officials'),
        func.count(case(((models.Employee.officer_official == 'Official') & is_filled & is_not_hr_pool, 1))).label('filled_officials'),
        
        # HQ Officers
        func.count(case(((models.Employee.hq_field == 'HQ') & (models.Employee.officer_official == 'Officer') & is_not_hr_pool, 1))).label('total_hq_officers'),
        func.count(case(((models.Employee.hq_field == 'HQ') & (models.Employee.officer_official == 'Officer') & is_filled & is_not_hr_pool, 1))).label('filled_hq_officers'),
        
        # Field Officers
        func.count(case(((models.Employee.hq_field == 'Field') & (models.Employee.officer_official == 'Officer') & is_not_hr_pool, 1))).label('total_field_officers'),
        func.count(case(((models.Employee.hq_field == 'Field') & (models.Employee.officer_official == 'Officer') & is_filled & is_not_hr_pool, 1))).label('filled_field_officers'),
        
        # HQ Officials
        func.count(case(((models.Employee.hq_field == 'HQ') & (models.Employee.officer_official == 'Official') & is_not_hr_pool, 1))).label('total_hq_officials'),
        func.count(case(((models.Employee.hq_field == 'HQ') & (models.Employee.officer_official == 'Official') & is_filled & is_not_hr_pool, 1))).label('filled_hq_officials'),
        
        # Field Officials
        func.count(case(((models.Employee.hq_field == 'Field') & (models.Employee.officer_official == 'Official') & is_not_hr_pool, 1))).label('total_field_officials'),
        func.count(case(((models.Employee.hq_field == 'Field') & (models.Employee.officer_official == 'Official') & is_filled & is_not_hr_pool, 1))).label('filled_field_officials')
    ).first()

    total_hr_pool = db.query(models.HRPool).count()
    filled_hr_pool = total_hr_pool

    def fmt(total, filled):
        return {"total": total, "filled": filled, "vacant": total - filled}

    return {
        "all_staff": fmt(res.total_all, res.filled_all),
        "officers": fmt(res.total_officers, res.filled_officers),
        "officials": fmt(res.total_officials, res.filled_officials),
        "hq_officers": fmt(res.total_hq_officers, res.filled_hq_officers),
        "field_officers": fmt(res.total_field_officers, res.filled_field_officers),
        "hq_officials": fmt(res.total_hq_officials, res.filled_hq_officials),
        "field_officials": fmt(res.total_field_officials, res.filled_field_officials),
        "hr_pool": fmt(total_hr_pool, filled_hr_pool),
        "active_percent": round((res.filled_all / res.total_all * 100), 1) if res.total_all > 0 else 0
    }

@app.get("/api/stats/designation")
def get_designation_stats(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    is_not_hr_pool = ~(
        (models.Employee.branch_office.ilike('%HR POOL%')) | 
        (models.Employee.hq_field.ilike('%HR POOL%'))
    )
    
    results = db.query(
        models.Employee.post_name,
        func.count(models.Employee.id).label('total'),
        func.count(case((models.Employee.post_status == 'Filled', 1))).label('filled'),
        func.count(case((models.Employee.post_status == 'Vacant', 1))).label('vacant')
    ).filter(is_not_hr_pool).group_by(models.Employee.post_name).order_by(text('total DESC')).all()
    
    return [
        {
            "designation": r[0] or "Unknown",
            "total": r[1],
            "filled": r[2],
            "vacant": r[3]
        } for r in results if r[0]
    ]

from datetime import datetime

@app.get("/api/config/{key}")
def get_config(key: str, db: Session = Depends(get_db)):
    if key == 'acr_years':
        excluded_posts = ['%Naib Qasid%', '%Mali%', '%Sweeper%', '%Chowkidar%', '%Daftary%', '%Sanitary Worker%']
        query = db.query(func.min(models.Employee.joining_date)).filter(
            models.Employee.joining_date.isnot(None),
            models.Employee.joining_date != '',
            models.Employee.joining_date != '---'
        )
        for post in excluded_posts:
            query = query.filter(~func.coalesce(models.Employee.post_name, '').ilike(post))
        
        min_date_str = query.scalar()
        
        start_year = 2008 # Fallback
        if min_date_str:
            try:
                # Support YYYY-MM-DD or DD-MM-YYYY
                if '-' in min_date_str:
                    parts = min_date_str.split('-')
                    if len(parts[0]) == 4:
                        start_year = int(parts[0])
                    elif len(parts[2]) == 4:
                        start_year = int(parts[2])
            except Exception:
                pass
                
        current_year = datetime.now().year
        # Completed year is current year - 1
        end_year = current_year - 1
        if start_year > end_year:
            start_year = end_year
            
        years = [str(y) for y in range(start_year, end_year + 1)]
        return {"value": years}
        
    config = db.query(models.SystemConfig).filter(models.SystemConfig.key == key).first()
    if not config:
        return {"value": None}
    return {"value": config.value}

@app.post("/api/config/{key}")
def update_config(key: str, data: dict, db: Session = Depends(get_db)):
    config = db.query(models.SystemConfig).filter(models.SystemConfig.key == key).first()
    if config:
        config.value = data.get('value')
    else:
        config = models.SystemConfig(key=key, value=data.get('value'))
        db.add(config)
    db.commit()
    return {"message": "Success"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
