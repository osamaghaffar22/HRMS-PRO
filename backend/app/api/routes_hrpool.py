from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from typing import List, Optional
from app import models, schemas
from app.db.database import get_db
from app.core.auth_utils import PermissionChecker

router = APIRouter(prefix="/api/hr-pool", tags=["hr-pool"], dependencies=[Depends(PermissionChecker(["employees"]))])

@router.get("/", response_model=List[schemas.HRPoolResponse])
def get_hr_pool(
    search: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.HRPool)

    if search and search.strip():
        search_filter = f"%{search.strip()}%"
        query = query.filter(or_(
            models.HRPool.name.ilike(search_filter),
            models.HRPool.post_name.ilike(search_filter),
            models.HRPool.bs.ilike(search_filter),
            models.HRPool.branch_office.ilike(search_filter)
        ))

    if sort_by and sort_order in ['asc', 'desc']:
        order_fn = asc if sort_order == 'asc' else desc
        if hasattr(models.HRPool, sort_by):
            query = query.order_by(order_fn(getattr(models.HRPool, sort_by)))
        else:
            query = query.order_by(desc(models.HRPool.id))
    else:
        query = query.order_by(desc(models.HRPool.id))

    return query.all()

@router.post("/", response_model=schemas.HRPoolResponse)
def create_hr_pool(item: schemas.HRPoolCreate, db: Session = Depends(get_db)):
    db_item = models.HRPool(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.put("/{item_id}", response_model=schemas.HRPoolResponse)
def update_hr_pool(item_id: int, item: schemas.HRPoolUpdate, db: Session = Depends(get_db)):
    db_item = db.query(models.HRPool).filter(models.HRPool.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Not found")
        
    update_data = item.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(db_item, k, v)
        
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/{item_id}")
def delete_hr_pool(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.HRPool).filter(models.HRPool.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Not found")
    
    db.delete(db_item)
    db.commit()
    return {"message": "Deleted successfully"}
