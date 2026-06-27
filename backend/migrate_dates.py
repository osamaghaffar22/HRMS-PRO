import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import re

sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from app.db.database import engine

def parse_date(date_str):
    if not date_str or not str(date_str).strip():
        return None
    date_str = str(date_str).strip()
    if 'not match' in date_str.lower() or 'n/a' in date_str.lower():
        return None
        
    parsed = None
    # If already YYYY-MM-DD
    if re.match(r'^\d{4}-\d{2}-\d{2}(\s00:00:00)?$', date_str):
        parsed = date_str[:10]
    # If DD/MM/YYYY or DD-MM-YYYY
    elif match := re.match(r'^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$', date_str):
        day, month, year = match.groups()
        parsed = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
    else:
        # Try parsing python datetime
        try:
            d = datetime.strptime(date_str, '%Y-%m-%d %H:%M:%S')
            parsed = d.strftime('%Y-%m-%d')
        except:
            pass
        if not parsed:
            try:
                d = datetime.strptime(date_str, '%d-%b-%y')
                parsed = d.strftime('%Y-%m-%d')
            except:
                pass

    if parsed:
        # Validate that the date is actually real (e.g., no 1999-02-72)
        try:
            datetime.strptime(parsed, '%Y-%m-%d')
            return parsed
        except ValueError:
            return None
    return None

def parse_bs(bs_str):
    if not bs_str:
        return None
    digits = re.sub(r'\D', '', str(bs_str))
    if digits:
        return int(digits)
    return None

def run_migration():
    Session = sessionmaker(bind=engine)
    db = Session()
    
    print("Phase 1: Normalizing strings...")
    try:
        result = db.execute(text("SELECT id, dob, joining_date, place_of_posting, bs, joining_present_post, separation_date, probation_till_date FROM employees"))
        rows_to_update = []
        for row in result:
            emp_id, dob, joining_date, place_of_posting, bs, joining_present_post, separation_date, probation_till_date = row
            
            new_dob = parse_date(dob)
            new_joining_date = parse_date(joining_date)
            new_pop = parse_date(place_of_posting)
            new_jpp = parse_date(joining_present_post)
            new_sd = parse_date(separation_date)
            new_ptd = parse_date(probation_till_date)
            new_bs = parse_bs(bs)
            
            rows_to_update.append({
                "id": emp_id,
                "dob": new_dob,
                "jd": new_joining_date,
                "pop": new_pop,
                "bs": str(new_bs) if new_bs is not None else None,
                "jpp": new_jpp,
                "sd": new_sd,
                "ptd": new_ptd
            })
            
        print(f"Updating {len(rows_to_update)} rows...")
        for data in rows_to_update:
            db.execute(text("""
                UPDATE employees 
                SET dob = :dob, joining_date = :jd, place_of_posting = :pop, bs = :bs,
                    joining_present_post = :jpp, separation_date = :sd, probation_till_date = :ptd
                WHERE id = :id
            """), data)
            
        db.commit()
        print("Data normalization complete.")
        
        print("Phase 2: Altering Column Types...")
        columns_to_date = ["dob", "joining_date", "place_of_posting", "joining_present_post", "separation_date", "probation_till_date"]
        for col in columns_to_date:
            print(f"Altering {col} to DATE...")
            db.execute(text(f"ALTER TABLE employees ALTER COLUMN {col} TYPE DATE USING {col}::date;"))
            
        print("Altering bs to INTEGER...")
        db.execute(text("ALTER TABLE employees ALTER COLUMN bs TYPE INTEGER USING bs::integer;"))
        
        db.commit()
        print("Migration complete!")
    except Exception as e:
        db.rollback()
        print(f"Migration failed: {e}")
    finally:
        db.close()

if __name__ == '__main__':
    run_migration()
