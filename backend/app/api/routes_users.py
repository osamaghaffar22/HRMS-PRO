from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas
from app.db.database import get_db
from app.core import auth
from app.core.auth import get_current_user
from app.core.auth_utils import RoleChecker

router = APIRouter(prefix="/api/users", tags=["users"])

# All routes in this router require "Admin" role
admin_checker = RoleChecker(["Admin"])

@router.get("/", response_model=List[schemas.User])
def get_users(db: Session = Depends(get_db), current_user: models.User = Depends(admin_checker)):
    return db.query(models.User).all()

@router.post("/", response_model=schemas.User)
def create_user(user_in: schemas.UserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(admin_checker)):
    # Check if user already exists
    existing = db.query(models.User).filter(models.User.username == user_in.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    db_user = models.User(
        username=user_in.username,
        hashed_password=auth.get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
        permissions=user_in.permissions
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.put("/{user_id}", response_model=schemas.User)
def update_user(user_id: int, user_in: dict, db: Session = Depends(get_db), current_user: models.User = Depends(admin_checker)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if "username" in user_in:
        # Check uniqueness
        dup = db.query(models.User).filter(models.User.username == user_in["username"], models.User.id != user_id).first()
        if dup:
            raise HTTPException(status_code=400, detail="Username already registered")
        db_user.username = user_in["username"]
        
    if "full_name" in user_in:
        db_user.full_name = user_in["full_name"]
    if "role" in user_in:
        db_user.role = user_in["role"]
    if "permissions" in user_in:
        db_user.permissions = user_in["permissions"]
    if "is_active" in user_in:
        db_user.is_active = user_in["is_active"]
    if "password" in user_in and user_in["password"]:
        db_user.hashed_password = auth.get_password_hash(user_in["password"])
        
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(admin_checker)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if db_user.username == "admin" or db_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete super admin or currently logged in user")
        
    db.delete(db_user)
    db.commit()
    return {"message": "User deleted successfully"}
