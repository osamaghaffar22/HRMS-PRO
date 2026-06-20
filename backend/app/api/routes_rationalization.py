from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Integer
from typing import List
from app import models, schemas
from app.db.database import get_db
from app.core.auth_utils import PermissionChecker

router = APIRouter(prefix="/api/rationalization", tags=["rationalization"], dependencies=[Depends(PermissionChecker(["rationalization"]))])

@router.get("/", response_model=List[schemas.Rationalization])
def get_rationalizations(db: Session = Depends(get_db)):
    return db.query(models.Rationalization).order_by(cast(models.Rationalization.s_no, Integer).asc(), cast(models.Rationalization.bs, Integer).desc(), models.Rationalization.id.asc()).all()

@router.get("/status")
def get_rationalization_status(db: Session = Depends(get_db)):
    """
    Returns the list of rationalizations along with the current count of active employees
    in those branches/posts to display in the UI.
    """
    rationalizations = db.query(models.Rationalization).order_by(cast(models.Rationalization.s_no, Integer).asc(), cast(models.Rationalization.bs, Integer).desc(), models.Rationalization.id.asc()).all()
    
    # We need to count active employees per branch_office and post_name
    # Assuming 'Active' implies they are not retired/resigned, but in our system 
    # post_status might be 'Filled' or similar. We will just count all employees for that branch/post.
    # To be safe, we can just group by branch_office and post_name.
    
    is_not_hr_pool = ~(
        (models.Employee.branch_office.ilike('%HR POOL%')) | 
        (models.Employee.hq_field.ilike('%HR POOL%'))
    )
    
    emp_counts = db.query(
        models.Employee.branch_office,
        models.Employee.post_name,
        func.count(models.Employee.id).label("current_count")
    ).filter(models.Employee.post_status != 'Vacant', is_not_hr_pool).group_by(models.Employee.branch_office, models.Employee.post_name).all()
    
    # Create a dictionary for quick lookup
    count_map = {}
    for branch, post, count in emp_counts:
        count_map[(branch, post)] = count
        
    result = []
    for r in rationalizations:
        current_count = count_map.get((r.branch_office, r.post_name), 0)
        result.append({
            "id": r.id,
            "wing_division": r.wing_division,
            "region": r.region,
            "branch_office": r.branch_office,
            "post_name": r.post_name,
            "allocated_posts": r.allocated_posts,
            "current_count": current_count,
            "vacant": r.allocated_posts - current_count
        })
        
    return result

@router.post("/", response_model=schemas.Rationalization)
def create_rationalization(data: schemas.RationalizationCreate, db: Session = Depends(get_db)):
    # Check for duplicates
    existing = db.query(models.Rationalization).filter(
        models.Rationalization.branch_office == data.branch_office,
        models.Rationalization.post_name == data.post_name
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="A quota for this branch and post already exists.")
        
    db_item = models.Rationalization(**data.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.put("/{item_id}", response_model=schemas.Rationalization)
def update_rationalization(item_id: int, data: schemas.RationalizationUpdate, db: Session = Depends(get_db)):
    db_item = db.query(models.Rationalization).filter(models.Rationalization.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Not found")
        
    update_data = data.model_dump(exclude_unset=True)
    
    # Check duplicates if branch or post is changing
    new_branch = update_data.get("branch_office", db_item.branch_office)
    new_post = update_data.get("post_name", db_item.post_name)
    
    if new_branch != db_item.branch_office or new_post != db_item.post_name:
        existing = db.query(models.Rationalization).filter(
            models.Rationalization.branch_office == new_branch,
            models.Rationalization.post_name == new_post,
            models.Rationalization.id != item_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="A quota for this branch and post already exists.")
            
    for k, v in update_data.items():
        setattr(db_item, k, v)
        
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/{item_id}")
def delete_rationalization(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.Rationalization).filter(models.Rationalization.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Not found")
        
    db.delete(db_item)
    db.commit()
    return {"message": "Deleted"}
