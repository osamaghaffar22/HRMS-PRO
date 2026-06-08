import pandas as pd
from sqlalchemy.orm import Session
import models, schemas, database
import os
from datetime import datetime
from database import SessionLocal, engine

# Ensure tables are created with new schema
models.Base.metadata.create_all(bind=engine)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EXCEL_PATH = os.path.join(os.path.dirname(BASE_DIR), "Database.xlsx")

def clean_val(val):
    if pd.isna(val) or val is None:
        return ""
    if isinstance(val, (pd.Timestamp, datetime)):
        # Format as 2-Feb-2023
        return val.strftime('%d-%b-%Y').replace('0', '', 1) if val.day < 10 else val.strftime('%d-%b-%Y')
    s = str(val).strip()
    return s

def is_officer(row):
    try:
        # Check BPS/Grade
        bs = clean_val(row.get('Grade', ''))
        num_str = ''.join(filter(str.isdigit, bs))
        if not num_str:
            # Fallback to Excel column if BPS missing
            val = clean_val(row.get('Officer/Official', ''))
            return "Officer" in val
            
        num = int(num_str)
        if num >= 17: return True
        
        # BPS 16 logic
        desig = str(row.get('Designation', '')).upper()
        if num == 16 and any(x in desig for x in ["SENIOR PERSONAL ASSISTANT", "SPA", "DEPUTY ASSISTANT DIRECTOR", "DADA"]):
            return True
            
        return False
    except:
        return False

def import_employees():
    db = SessionLocal()
    try:
        if not os.path.exists(EXCEL_PATH):
            print(f"Error: {EXCEL_PATH} not found")
            return

        # Clear existing data for fresh start (order matters for FK)
        db.query(models.AuditLog).delete()
        db.query(models.TransferHistory).delete()
        db.query(models.LeaveRecord).delete()
        db.query(models.ACRData).delete()
        db.query(models.CustomModuleData).delete()
        db.query(models.Employee).delete()
        db.commit()

        df = pd.read_excel(EXCEL_PATH, engine='openpyxl')
        df.columns = [str(c).strip() for c in df.columns]

        col_map = {
            'personal_file_no': 'Personal_File_No',
            'code': 'Code',
            's_no': 'S.No',
            'officer_official': 'Officer/Official',
            'hq_field': 'HQ/Field',
            'employee_no': 'Employee_No',
            'cnic': 'CNIC',
            'seniority_no': 'Seniority_No',
            'name': 'Employee_Name',
            'father_name': 'Father_Name',
            'dob': 'Date_Of_Birth',
            'total_age': 'Total_Age',
            'youth_adult': 'Youth/Adult',
            'religion': 'Religion',
            'nationality': 'Nationality',
            'gender': 'Gender',
            'marital_status': 'Marital_Status',
            'home_province': 'Home_Province',
            'home_district': 'Home_District',
            'domicile': 'Local/Domicile',
            'rural_urban': 'Rural/Urban',
            'entry_govt': 'Entry_in_Govt_Service',
            'joining_date': 'Joining_Date_in_ECP',
            'total_service': 'Total_Service',
            'place_of_posting': 'Joining_Current_Station',
            'tenure_current_station': 'Tenure_in_Current_Station',
            'head_office': 'Head_Office',
            'wing_division': 'Wing/Division',
            'section_district': 'Section/District',
            'branch_office': 'Branch_Office',
            'bs': 'Grade',
            'post_name': 'Designation',
            'cadre_type': 'Cadre_Type',
            'job_type': 'Job_Type',
            'direct_promotion': 'Direct/Promotion',
            'joining_present_post': 'Date_Of_Joining_At_The_Time_Of_Appointment/Promotion_In_The_Present_Post',
            'tenure_current_scale': 'Tenure_Of_Current_Scale',
            'qualification': 'Qualification',
            'disability': 'Disability',
            'dual_nationality': 'Dual_Nationality',
            'passport_noc': 'Passport_NOC',
            'blood_group': 'Blood_Group',
            'area_expertise': 'Area_of_Expertise',
            'email': 'Email',
            'mobile_no': 'Mobile_No',
            'probation_status': 'Probation/Contract_Status',
            'probation_till_date': 'Probation/Contrac_Till_Date',
            'temp_address': 'Temporary_Address',
            'perm_address': 'Permanent_Address'
        }

        count = 0
        for _, row in df.iterrows():
            emp_data = {}
            for model_attr, excel_header in col_map.items():
                if excel_header in df.columns:
                    emp_data[model_attr] = clean_val(row[excel_header])
            
            # Use strict Officer logic from Details.docx
            if is_officer(row):
                emp_data['officer_official'] = "Officer"
            else:
                emp_data['officer_official'] = "Official"
            
            # Post Status Logic
            name = emp_data.get('name', '')
            if not name or name.strip() == "" or "vacant" in name.lower() or name.strip() == "-":
                emp_data['post_status'] = "Vacant"
            else:
                emp_data['post_status'] = "Filled"

            db_emp = models.Employee(**emp_data)
            db.add(db_emp)
            count += 1
            if count % 100 == 0:
                db.commit()
                print(f"Imported {count} records...")

        db.commit()
        print(f"Success: Imported {count} total records.")

    except Exception as e:
        print(f"Import Failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    import_employees()
