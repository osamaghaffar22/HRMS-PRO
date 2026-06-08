from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import get_db
import json

from auth import get_current_user

router = APIRouter(prefix="/api/custom-modules", tags=["custom-modules"])

@router.get("/", response_model=List[schemas.CustomModule])
def get_modules(db: Session = Depends(get_db)):
    return db.query(models.CustomModule).all()

@router.post("/", response_model=schemas.CustomModule)
def create_module(mod: schemas.CustomModuleCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    db_mod = models.CustomModule(title=mod.title, columns=mod.columns)
    db.add(db_mod)
    db.commit()
    db.refresh(db_mod)
    return db_mod

@router.delete("/{mod_id}")
def delete_module(mod_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    db.query(models.CustomModuleData).filter(models.CustomModuleData.module_id == mod_id).delete()
    db.query(models.CustomModule).filter(models.CustomModule.id == mod_id).delete()
    db.commit()
    return {"message": "Deleted"}

@router.get("/{mod_id}/data")
def get_module_data(mod_id: int, db: Session = Depends(get_db)):
    data = db.query(models.CustomModuleData).filter(models.CustomModuleData.module_id == mod_id).all()
    return [{"employee_id": d.employee_id, "data": d.data} for d in data]

@router.post("/data")
def update_module_data(req: schemas.CustomModuleDataUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    existing = db.query(models.CustomModuleData).filter(
        models.CustomModuleData.module_id == req.module_id,
        models.CustomModuleData.employee_id == req.employee_id
    ).first()
    
    if existing:
        existing.data = req.data
    else:
        db.add(models.CustomModuleData(module_id=req.module_id, employee_id=req.employee_id, data=req.data))
    
    db.commit()
    return {"message": "Success"}
