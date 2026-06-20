import os
import sys
import json
from datetime import datetime

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from database import SessionLocal
import models

db = SessionLocal()

# Fetch all update logs for employees
logs = db.query(models.AuditLog).filter(
    models.AuditLog.table_name == 'employees',
    models.AuditLog.action == 'UPDATE'
).all()

print(f"Checking {len(logs)} audit logs for date changes...\n")

changed_records = []

for log in logs:
    old_data = log.old_data
    new_data = log.new_data
    
    if not old_data or not new_data:
        continue
        
    changed = False
    details = []
    
    # Check entry_govt
    if old_data.get('entry_govt') != new_data.get('entry_govt'):
        changed = True
        details.append(f"Entry Govt: {old_data.get('entry_govt')} -> {new_data.get('entry_govt')}")
        
    # Check joining_date
    if old_data.get('joining_date') != new_data.get('joining_date'):
        changed = True
        details.append(f"Joining Date: {old_data.get('joining_date')} -> {new_data.get('joining_date')}")
        
    if changed:
        # Get employee name
        emp = db.query(models.Employee).filter(models.Employee.id == log.record_id).first()
        name = emp.name if emp else "Unknown"
        changed_records.append({
            "Time": log.timestamp,
            "Name": name,
            "ID": log.record_id,
            "Changes": details
        })

for record in changed_records:
    print(f"Time: {record['Time']}")
    print(f"Employee: {record['Name']} (ID: {record['ID']})")
    for change in record['Changes']:
        print(f"  - {change}")
    print("-" * 30)

if not changed_records:
    print("No changes found for Entry Govt or Joining Date.")

db.close()
