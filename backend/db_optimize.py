import sys
import os
from sqlalchemy import text
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from app.db.database import engine, SessionLocal
from app import models

def optimize_db():
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # 1. Create Composite Indexes
        # PostgreSQL syntax
        print("Creating Composite Indexes...")
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_dashboard_stats ON employees (hq_field, officer_official, post_status, employment_status);"))
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_hq_officer ON employees (hq_field, officer_official);"))
        
        # 2. Re-create Foreign Keys with ON DELETE CASCADE
        print("Updating Foreign Key constraints to CASCADE...")
        
        # We need to get the constraint names first to drop them
        # This queries PostgreSQL's information_schema
        def get_fk_name(table_name, column_name):
            query = f"""
                SELECT tc.constraint_name
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY' 
                  AND tc.table_name='{table_name}'
                  AND kcu.column_name='{column_name}';
            """
            res = db.execute(text(query)).fetchone()
            return res[0] if res else None
            
        def recreate_fk(table, column, ref_table, ref_column):
            fk_name = get_fk_name(table, column)
            if fk_name:
                print(f"Dropping existing FK {fk_name} on {table}")
                db.execute(text(f"ALTER TABLE {table} DROP CONSTRAINT {fk_name};"))
            
            # Create new constraint
            new_fk_name = f"fk_{table}_{column}_cascade"
            print(f"Adding CASCADE FK to {table}.{column} -> {ref_table}.{ref_column}")
            db.execute(text(f"ALTER TABLE {table} ADD CONSTRAINT {new_fk_name} FOREIGN KEY ({column}) REFERENCES {ref_table}({ref_column}) ON DELETE CASCADE;"))

        recreate_fk("transfer_history", "employee_id", "employees", "id")
        recreate_fk("leave_records", "employee_id", "employees", "id")
        recreate_fk("acr_reports", "employee_id", "employees", "id")
        recreate_fk("acr_report_periods", "acr_report_id", "acr_reports", "id")
        
        db.commit()
        print("Database Optimization and Constraints setup successful!")
    except Exception as e:
        print(f"Error during optimization: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == '__main__':
    optimize_db()
