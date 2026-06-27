from fastapi import APIRouter, Depends, HTTPException, Response
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
    skip: int = 0,
    limit: Optional[int] = 100,
    response: Response = None,
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

    total_count = query.count()
    if response:
        response.headers["X-Total-Count"] = str(total_count)
        
    if skip and skip > 0:
        query = query.offset(skip)
    if limit and limit > 0:
        query = query.limit(limit)

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

from pydantic import BaseModel

class RevertRequest(BaseModel):
    new_branch_office: str
    new_post_name: str
    new_region: str = None
    order_number: str = None
    order_date: str = None
    joining_date: str = None
    remarks: str = None

@router.post("/{item_id}/revert")
def revert_hrpool(
    item_id: int, 
    request: RevertRequest,
    db: Session = Depends(get_db), 
    current_user=Depends(PermissionChecker(["employees"]))
):
    pool_item = db.query(models.HRPool).filter(models.HRPool.id == item_id).first()
    if not pool_item:
        raise HTTPException(status_code=404, detail="HR Pool record not found")

    orig = pool_item.original_data

    # Find Vacant seat matching new placement details
    emp = db.query(models.Employee).filter(
        models.Employee.post_name == request.new_post_name,
        models.Employee.branch_office == request.new_branch_office,
        models.Employee.name.ilike('%Vacant%')
    ).first()

    # If no vacant seat found, create a new active seat
    if not emp:
        emp = models.Employee()
        db.add(emp)

    # Restore original attributes (except id if creating new)
    for key, value in orig.items():
        if key != "id" and hasattr(emp, key):
            setattr(emp, key, value)
    
    # Overwrite with new placement details
    emp.branch_office = request.new_branch_office
    emp.post_name = request.new_post_name
    if request.new_region:
        emp.section_district = request.new_region
    if request.joining_date:
        emp.joining_date = request.joining_date
        emp.place_of_posting = request.joining_date
    emp.employment_status = "Active"
    
    db.flush()

    # Create transfer history record for this revert action
    prev_stint = models.TransferHistory(
        employee_id=emp.id,
        order_number=request.order_number,
        order_date=request.order_date,
        previous_branch_office=orig.get("branch_office"),
        previous_region=orig.get("section_district"),
        new_branch_office=request.new_branch_office,
        new_region=request.new_region,
        joining_date=orig.get("joining_date") or orig.get("place_of_posting"),
        relieving_date=request.joining_date,
        duration_spent="N/A",
        remarks=request.remarks or "Reverted from HR Pool"
    )
    db.add(prev_stint)

    # Remove from HR Pool
    db.delete(pool_item)
    db.commit()
    
    return {"message": "Employee reverted and transferred successfully"}

class SeparateRequest(BaseModel):
    separation_type: str
    separation_date: str = None

@router.post("/{item_id}/separate")
def separate_hrpool(
    item_id: int,
    request: SeparateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(PermissionChecker(["employees"]))
):
    pool_item = db.query(models.HRPool).filter(models.HRPool.id == item_id).first()
    if not pool_item:
        raise HTTPException(status_code=404, detail="HR Pool record not found")

    new_extra_entry = models.Extra(
        s_no=pool_item.s_no,
        name=pool_item.name,
        post_name=pool_item.post_name,
        bs=pool_item.bs,
        branch_office=pool_item.branch_office,
        domicile=pool_item.domicile,
        joining_date=pool_item.joining_date,
        reason=request.separation_type,
        date_of_action=request.separation_date,
        original_data=pool_item.original_data
    )
    db.add(new_extra_entry)
    db.delete(pool_item)
    db.commit()

    return {"message": "HR Pool employee moved to Extra successfully"}
