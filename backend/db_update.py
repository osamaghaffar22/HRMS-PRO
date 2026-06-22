from app.db.database import engine
from app.models import Base
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE hr_pool ADD COLUMN original_data JSONB;"))
    except Exception as e:
        print("hr_pool original_data might already exist or error:", e)
    conn.commit()

Base.metadata.create_all(bind=engine)
print("Database schema updated.")
