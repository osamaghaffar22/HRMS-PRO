from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app import models, schemas
from scripts import import_data
from app.services import excel_sync
from app.db.database import get_db
from app.core.auth import get_current_user
from app.core.auth_utils import PermissionChecker

router = APIRouter(prefix="/api/sync", tags=["sync"], dependencies=[Depends(PermissionChecker(["data_exchange"]))])

@router.post("/import-excel")
async def import_from_excel(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...),
    db: Session = Depends(get_db), 
    user=Depends(get_current_user)
):
    try:
        content = await file.read()
        background_tasks.add_task(import_data.import_employees_from_file, content)
        return {"message": "Excel import started in background"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from fastapi.responses import StreamingResponse

@router.get("/export-excel")
async def export_to_excel(db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        excel_bytes = excel_sync.generate_excel_bytes()
        if not excel_bytes:
            raise HTTPException(status_code=500, detail="Failed to generate Excel file or no data available")
        
        return StreamingResponse(
            excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": "attachment; filename=Employees_Export.xlsx"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
