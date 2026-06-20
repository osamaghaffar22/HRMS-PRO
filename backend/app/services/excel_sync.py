import pandas as pd
from sqlalchemy.orm import Session
from app import models
import os
from app.db.database import SessionLocal
import logging
from datetime import datetime

logger = logging.getLogger("HRMS_SYNC")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Navigate up from backend/app/services to F:\HRMS Pro
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(BASE_DIR)))
EXCEL_PATH = os.path.join(PROJECT_ROOT, "Database.xlsx")

COL_MAP_INV = {
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

def clean_val(val):
    if pd.isna(val) or val is None:
        return ""
    if isinstance(val, (pd.Timestamp, datetime)):
        # Format as 2-Feb-2023
        return val.strftime('%d-%b-%Y').replace('0', '', 1) if val.day < 10 else val.strftime('%d-%b-%Y')
    s = str(val).strip()
    if s.endswith(".0"):
        s = s[:-2]
    return s

import io

def generate_excel_bytes():
    db = SessionLocal()
    try:
        from sqlalchemy import cast, Integer
        employees = db.query(models.Employee).order_by(
            cast(models.Employee.s_no, Integer).asc(),
            cast(models.Employee.bs, Integer).desc(),
            models.Employee.id.asc()
        ).all()
        data = []
        for e in employees:
            row_data = {}
            for model_attr, excel_header in COL_MAP_INV.items():
                val = getattr(e, model_attr, None)
                row_data[excel_header] = clean_val(val)
            data.append(row_data)
        
        if not data: return None
        df = pd.DataFrame(data)
        ordered_headers = list(COL_MAP_INV.values())
        df = df[ordered_headers]
        
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False)
        
        output.seek(0)
        return output
    except Exception as e:
        logger.error(f"Excel generation failed: {e}")
        return None
    finally:
        db.close()
