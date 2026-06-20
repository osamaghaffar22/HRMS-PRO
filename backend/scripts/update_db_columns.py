from app.db.database import engine
from sqlalchemy import text

def update_db():
    with engine.connect() as conn:
        print("Adding missing columns to acr_report_periods...")
        try: conn.execute(text("ALTER TABLE acr_report_periods ADD COLUMN ro_name VARCHAR;"))
        except: pass
        try: conn.execute(text("ALTER TABLE acr_report_periods ADD COLUMN ro_date VARCHAR;"))
        except: pass
        try: conn.execute(text("ALTER TABLE acr_report_periods ADD COLUMN co_name VARCHAR;"))
        except: pass
        try: conn.execute(text("ALTER TABLE acr_report_periods ADD COLUMN co_date VARCHAR;"))
        except: pass
        try: conn.execute(text("ALTER TABLE acr_report_periods ADD COLUMN result VARCHAR;"))
        except: pass
        conn.commit()
        print("Success!")

if __name__ == "__main__":
    update_db()
