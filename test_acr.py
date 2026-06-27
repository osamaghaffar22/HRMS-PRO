import sys
import os
sys.path.append(os.path.abspath('backend'))
from app.db.database import SessionLocal
from app import models
from sqlalchemy import func

db = SessionLocal()
try:
    print("--- Searching for Post Names ---")
    posts = db.query(models.Employee.post_name, func.count(models.Employee.id)).group_by(models.Employee.post_name).all()
    print("\n--- Posts with exactly 7 seats ---")
    for p, c in posts:
        if c == 7:
            print(f"Post: {p}, Count: {c}")

except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
