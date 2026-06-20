from app import models
from app.core import auth
from app.db import database
from app.db.database import SessionLocal

def setup_admin():
    db = SessionLocal()
    try:
        admin_exists = db.query(models.User).filter(models.User.role == "Admin").first()
        if admin_exists:
            print("Admin already exists")
            return
        
        new_admin = models.User(
            username="admin",
            hashed_password=auth.get_password_hash("admin123"),
            full_name="System Admin",
            role="Admin"
        )
        db.add(new_admin)
        db.commit()
        print("Admin created: username='admin', password='admin123'")
    finally:
        db.close()

if __name__ == "__main__":
    setup_admin()
