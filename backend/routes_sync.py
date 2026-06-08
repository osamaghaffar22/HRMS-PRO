from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
import models, schemas, import_data, excel_sync
from database import get_db

# Dummy placeholder
def get_current_user():
    return None

router = APIRouter(prefix="/api/sync", tags=["sync"])

@router.post("/import-excel")
async def import_from_excel(background_tasks: BackgroundTasks, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        # Move long-running task to background
        background_tasks.add_task(import_data.import_employees)
        return {"message": "Excel import started in background"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/export-excel")
async def export_to_excel(background_tasks: BackgroundTasks, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        # Move long-running task to background
        background_tasks.add_task(excel_sync.sync_db_to_excel)
        return {"message": "Excel export started in background"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
