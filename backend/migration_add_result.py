import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("No DATABASE_URL found")
    exit(1)

engine = create_engine(db_url)
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE acr_report_periods ADD COLUMN IF NOT EXISTS co_date VARCHAR DEFAULT '';"))
        conn.execute(text("ALTER TABLE acr_report_periods ADD COLUMN IF NOT EXISTS result VARCHAR DEFAULT '';"))
        conn.commit()
    print("Successfully added co_date and result columns to acr_report_periods!")
except Exception as e:
    print("Error:", e)
