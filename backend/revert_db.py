import os
import sys
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from app.db.database import engine

def revert_migration():
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        print("Reverting column types back to VARCHAR...")
        columns_to_varchar = ["dob", "joining_date", "place_of_posting", "joining_present_post", "separation_date", "probation_till_date"]
        for col in columns_to_varchar:
            print(f"Altering {col} to VARCHAR...")
            db.execute(text(f"ALTER TABLE employees ALTER COLUMN {col} TYPE VARCHAR USING {col}::varchar;"))
            
        print("Altering bs to VARCHAR...")
        db.execute(text("ALTER TABLE employees ALTER COLUMN bs TYPE VARCHAR USING bs::varchar;"))
        
        db.commit()
        print("Revert complete!")
    except Exception as e:
        db.rollback()
        print(f"Revert failed: {e}")
    finally:
        db.close()

if __name__ == '__main__':
    revert_migration()
