import os
import sys
import re

# Add backend to path so we can import app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.db.database import SessionLocal
from app import models
from dateutil import parser

def format_date_str(date_str):
    if not date_str: 
        return date_str
    
    date_str = str(date_str).strip()
    
    # If it's a known non-date string, skip parsing
    if date_str.lower() in ['not match', 'vacant', 'none', 'null', 'n/a', '---', '-', 'nil']:
        return date_str
    
    # Check if it's already exactly YYYY-MM-DD
    if re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
        return date_str
        
    try:
        # Parse the irregular date string
        dt = parser.parse(date_str, fuzzy=True)
        return dt.strftime('%Y-%m-%d')
    except Exception:
        # If parsing completely fails, return the original string
        return date_str

def main():
    db = SessionLocal()
    employees = db.query(models.Employee).all()
    
    date_fields = [
        'dob', 
        'entry_govt', 
        'joining_date', 
        'probation_till_date', 
        'joining_present_post', 
        'place_of_posting'
    ]
    
    updated_count = 0
    total_dates_fixed = 0

    for emp in employees:
        changed = False
        for field in date_fields:
            current_val = getattr(emp, field)
            if current_val:
                new_val = format_date_str(current_val)
                if new_val != current_val:
                    setattr(emp, field, new_val)
                    changed = True
                    total_dates_fixed += 1
                    
        if changed:
            updated_count += 1

    db.commit()
    db.close()
    print(f"Success! Formatted {total_dates_fixed} dates across {updated_count} employee records.")

if __name__ == '__main__':
    main()
