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
    # Auto-register to FileRegistry if new
    if file_data.file_name and file_data.case_subject:
        exists = db.query(models.FileRegistry).filter(
            models.FileRegistry.file_number == file_data.file_name
        ).first()
        if not exists:
            new_reg = models.FileRegistry(
                file_number=file_data.file_name,
                file_name=file_data.case_subject
            )
            db.add(new_reg)
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
        "id": db_file.id,
        "file_name": db_file.file_name,
        "case_subject": db_file.case_subject,
        "reason": db_file.reason,
        "put_up": db_file.put_up,
        "put_up_date": db_file.put_up_date,
        "mark_branch": db_file.mark_branch,
        "receiver_name": db_file.receiver_name,
        "receiving_date": db_file.receiving_date,
        "return_date": db_file.return_date,
        "status": db_file.status,
        "created_at": db_file.created_at
    }
    
    for key, value in file_data.model_dump(exclude_unset=True).items():
        setattr(db_file, key, value)
        
    # If file is closed, move it to FileHistory and remove from active FileTracking
    if file_data.status == 'Closed' and db_file.status == 'Closed':
        history_record = models.FileHistory(
            file_name=db_file.file_name,
            case_subject=db_file.case_subject,
            reason=db_file.reason,
            put_up=db_file.put_up,
            put_up_date=db_file.put_up_date,
            mark_branch=db_file.mark_branch,
            receiver_name=db_file.receiver_name,
            receiving_date=db_file.receiving_date,
            return_date=db_file.return_date,
            status=db_file.status,
            closed_at=datetime.utcnow()
        )
        db.add(history_record)
        db.delete(db_file)
        
    db.commit()
    # Note: If it was closed, db_file is deleted. We cannot refresh it.
    if file_data.status != 'Closed':
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
    
    # If we deleted it because it was closed, return the old data structure
    if file_data.status == 'Closed':
        return old_data
    return db_file

@router.get("/registry")
def get_registry(db: Session = Depends(get_db)):
    return db.query(models.FileRegistry).order_by(models.FileRegistry.id.desc()).all()

@router.get("/history")
def get_history(db: Session = Depends(get_db)):
    return db.query(models.FileHistory).order_by(models.FileHistory.id.desc()).all()

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
