import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("PG_DATABASE_URL") or os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def run_migration():
    with engine.connect() as conn:
        try:
            # Check if remarks exists
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='acr_report_periods' AND column_name='remarks';
            """))
            has_remarks = result.fetchone() is not None

            if has_remarks:
                print("Renaming 'remarks' to 'ro_remarks'...")
                conn.execute(text("ALTER TABLE acr_report_periods RENAME COLUMN remarks TO ro_remarks;"))
            else:
                print("'remarks' column not found, checking if 'ro_remarks' exists...")

            # Check if co_remarks exists
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='acr_report_periods' AND column_name='co_remarks';
            """))
            has_co_remarks = result.fetchone() is not None

            if not has_co_remarks:
                print("Adding 'co_remarks' column...")
                conn.execute(text("ALTER TABLE acr_report_periods ADD COLUMN co_remarks VARCHAR DEFAULT '';"))
            else:
                print("'co_remarks' already exists.")

            conn.commit()
            print("Migration completed successfully.")
        except Exception as e:
            print(f"Migration failed: {e}")

if __name__ == "__main__":
    run_migration()
