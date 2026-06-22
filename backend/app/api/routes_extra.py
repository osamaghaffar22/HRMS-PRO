from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from typing import List, Optional
from app import models, schemas
from app.db.database import get_db
from app.core.auth_utils import PermissionChecker

router = APIRouter(prefix="/api/extra", tags=["extra"], dependencies=[Depends(PermissionChecker(["employees"]))])

@router.get("/", response_model=List[schemas.ExtraResponse])
def get_extra(
    search: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = None,
    skip: int = 0,
    limit: Optional[int] = 100,
    response: Response = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Extra)

    if search and search.strip():
        search_filter = f"%{search.strip()}%"
        query = query.filter(or_(
            models.Extra.name.ilike(search_filter),
            models.Extra.post_name.ilike(search_filter),
            models.Extra.bs.ilike(search_filter),
            models.Extra.branch_office.ilike(search_filter)
        ))

    if sort_by and sort_order in ['asc', 'desc']:
        order_fn = asc if sort_order == 'asc' else desc
        if hasattr(models.Extra, sort_by):
            query = query.order_by(order_fn(getattr(models.Extra, sort_by)))
        else:
            query = query.order_by(desc(models.Extra.id))
    else:
        query = query.order_by(desc(models.Extra.id))

    total_count = query.count()
    if response:
        response.headers["X-Total-Count"] = str(total_count)
        
    if skip and skip > 0:
        query = query.offset(skip)
    if limit and limit > 0:
        query = query.limit(limit)

    return query.all()

@router.post("/", response_model=schemas.ExtraResponse)
def create_extra(item: schemas.ExtraCreate, db: Session = Depends(get_db)):
    db_item = models.Extra(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.put("/{item_id}", response_model=schemas.ExtraResponse)
def update_extra(item_id: int, item: schemas.ExtraUpdate, db: Session = Depends(get_db)):
    db_item = db.query(models.Extra).filter(models.Extra.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Not found")
        
    update_data = item.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(db_item, k, v)
        
    db.commit()
    db.refresh(db_item)
    return db_item

@router.post("/{item_id}/revert")
def revert_extra(
    item_id: int, 
    db: Session = Depends(get_db),
    current_user=Depends(PermissionChecker(["employees"]))
):
    pool_item = db.query(models.Extra).filter(models.Extra.id == item_id).first()
    if not pool_item:
        raise HTTPException(status_code=404, detail="Extra record not found")

    if not pool_item.original_data:
        raise HTTPException(status_code=400, detail="Cannot revert: original employee data is missing")

    orig = pool_item.original_data
    emp = db.query(models.Employee).filter(
        models.Employee.id == orig.get("id"),
        models.Employee.name.ilike('%Vacant%')
    ).first()

    if not emp:
        emp = db.query(models.Employee).filter(
            models.Employee.post_name == orig.get("post_name"),
            models.Employee.branch_office == orig.get("branch_office"),
            models.Employee.name.ilike('%Vacant%')
        ).first()

    if not emp:
        emp = models.Employee()
        db.add(emp)

    for key, value in orig.items():
        if key != "id" and hasattr(emp, key):
            setattr(emp, key, value)
    
    emp.employment_status = "Active"
    
    db.delete(pool_item)
    db.commit()
    
    return {"message": "Employee reverted successfully"}

@router.delete("/{item_id}")
def delete_extra(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.Extra).filter(models.Extra.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Not found")
    
    db.delete(db_item)
    db.commit()
    return {"message": "Deleted successfully"}
