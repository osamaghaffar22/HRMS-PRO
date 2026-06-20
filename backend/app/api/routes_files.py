from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..db.database import get_db
from .. import models, schemas
from ..core.auth_utils import get_current_user, PermissionChecker
import json
from datetime import datetime

router = APIRouter(prefix="/api/files", tags=["files"], dependencies=[Depends(PermissionChecker(["files"]))])

@router.get("/", response_model=List[schemas.FileTracking])
def get_files(db: Session = Depends(get_db)):
    files = db.query(models.FileTracking).order_by(models.FileTracking.id.desc()).all()
    return files

@router.post("/", response_model=schemas.FileTracking)
def create_file(file_data: schemas.FileTrackingCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if file_data.case_subject:
        db.query(models.FileTracking).filter(
            models.FileTracking.case_subject == file_data.case_subject,
            models.FileTracking.status == 'Closed'
        ).delete(synchronize_session=False)
    
    db_file = models.FileTracking(**file_data.model_dump())
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    
    # Audit log
    audit_log = models.AuditLog(
        user_id=current_user.id,
        action="CREATE",
        table_name="file_tracking",
        record_id=db_file.id,
        new_data=file_data.model_dump()
    )
    db.add(audit_log)
    db.commit()
    
    return db_file

@router.put("/{file_id}", response_model=schemas.FileTracking)
def update_file(file_id: int, file_data: schemas.FileTrackingUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_file = db.query(models.FileTracking).filter(models.FileTracking.id == file_id).first()
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
        
    old_data = {
        "file_name": db_file.file_name,
        "case_subject": db_file.case_subject,
        "reason": db_file.reason,
        "put_up": db_file.put_up,
        "put_up_date": db_file.put_up_date,
        "mark_branch": db_file.mark_branch,
        "receiver_name": db_file.receiver_name,
        "receiving_date": db_file.receiving_date,
        "return_date": db_file.return_date,
        "status": db_file.status
    }
    
    for key, value in file_data.model_dump(exclude_unset=True).items():
        setattr(db_file, key, value)
        
    db.commit()
    db.refresh(db_file)
    
    # Audit log
    audit_log = models.AuditLog(
        user_id=current_user.id,
        action="UPDATE",
        table_name="file_tracking",
        record_id=db_file.id,
        old_data=old_data,
        new_data=file_data.model_dump(exclude_unset=True)
    )
    db.add(audit_log)
    db.commit()
    
    return db_file

@router.delete("/{file_id}")
def delete_file(file_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_file = db.query(models.FileTracking).filter(models.FileTracking.id == file_id).first()
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
        
    old_data = {
        "file_name": db_file.file_name,
        "case_subject": db_file.case_subject
    }
        
    db.delete(db_file)
    
    # Audit log
    audit_log = models.AuditLog(
        user_id=current_user.id,
        action="DELETE",
        table_name="file_tracking",
        record_id=file_id,
        old_data=old_data
    )
    db.add(audit_log)
    db.commit()
    
    return {"message": "File deleted successfully"}
