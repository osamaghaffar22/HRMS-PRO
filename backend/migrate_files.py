import sys
import os
from sqlalchemy import text
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from app.db.database import engine, SessionLocal
from app import models

def migrate():
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # Create missing tables (e.g. file_registry)
        models.Base.metadata.create_all(bind=engine)
        
        # Add registry_id column if it doesn't exist
        try:
            db.execute(text("ALTER TABLE file_tracking ADD COLUMN registry_id INTEGER REFERENCES file_registry(id)"))
            db.commit()
        except Exception as e:
            db.rollback()
            print("Column registry_id might already exist:", e)

        # Use sqlalchemy text()
        result = db.execute(text("SELECT id, file_name, case_subject FROM file_tracking"))
        trackings = result.fetchall()
        
        registry_map = {} 
        
        for t in trackings:
            tid, fname, csubj = t[0], t[1], t[2]
            key = (fname, csubj)
            if key not in registry_map:
                fnum = fname if fname else f"REG-{tid}"
                # Ensure unique file_number
                existing = db.execute(text(f"SELECT id FROM file_registry WHERE file_number = '{fnum}'")).fetchone()
                if existing:
                    fnum = f"{fnum}-{tid}"
                    
                reg = models.FileRegistry(
                    file_name=fname or "Unknown",
                    file_number=fnum,
                    subject=csubj or "Unknown"
                )
                db.add(reg)
                db.flush()
                registry_map[key] = reg.id
            
            db.execute(text(f"UPDATE file_tracking SET registry_id = {registry_map[key]} WHERE id = {tid}"))
            
        db.commit()
        print("Migration successful")
    except Exception as e:
        print(f"Error migrating: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == '__main__':
    migrate()
