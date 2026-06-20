from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class SystemConfig(Base):
    __tablename__ = "system_config"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(JSON)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    role = Column(String, default="Viewer")
    is_active = Column(Boolean, default=True)
    permissions = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Employee(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True, index=True)
    personal_file_no = Column(String)
    code = Column(String, index=True)
    s_no = Column(String)
    officer_official = Column(String, index=True)
    hq_field = Column(String, index=True)
    employee_no = Column(String)
    cnic = Column(String, index=True)
    seniority_no = Column(String)
    name = Column(String, index=True)
    father_name = Column(String)
    dob = Column(String)
    total_age = Column(String)
    youth_adult = Column(String)
    religion = Column(String)
    nationality = Column(String)
    gender = Column(String)
    marital_status = Column(String)
    home_province = Column(String)
    home_district = Column(String)
    domicile = Column(String)
    rural_urban = Column(String)
    entry_govt = Column(String)
    joining_date = Column(String)
    total_service = Column(String)
    place_of_posting = Column(String)  # This stores the 'Joining Current Station' date
    tenure_current_station = Column(String)
    head_office = Column(String)
    wing_division = Column(String)
    section_district = Column(String)
    branch_office = Column(String, index=True)
    bs = Column(String, index=True)
    post_name = Column(String, index=True)
    cadre_type = Column(String)
    job_type = Column(String)
    direct_promotion = Column(String)
    joining_present_post = Column(String)
    tenure_current_scale = Column(String)
    qualification = Column(String)
    disability = Column(String)
    dual_nationality = Column(String)
    passport_noc = Column(String)
    blood_group = Column(String)
    area_expertise = Column(String)
    email = Column(String)
    mobile_no = Column(String)
    probation_status = Column(String)
    probation_till_date = Column(String)
    temp_address = Column(Text)
    perm_address = Column(Text)
    post_status = Column(String, index=True)
    reports = relationship("ACRReport", backref="employee")

class CustomModule(Base):
    __tablename__ = "custom_modules"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, unique=True, index=True)
    columns = Column(JSON) # ["Col1", "Col2"]

class CustomModuleData(Base):
    __tablename__ = "custom_module_data"
    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("custom_modules.id"), index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), index=True)
    data = Column(JSON) # {"Col1": "Val1", "Col2": "Val2"}

class TransferHistory(Base):
    __tablename__ = "transfer_history"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), index=True)
    order_number = Column(String)
    order_date = Column(String)
    previous_branch_office = Column(String)
    previous_region = Column(String)
    new_branch_office = Column(String)
    new_region = Column(String)
    joining_date = Column(String)
    relieving_date = Column(String)
    duration_spent = Column(String)
    remarks = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    employee = relationship("Employee", backref="transfers")

class LeaveRecord(Base):
    __tablename__ = "leave_records"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), index=True)
    from_date = Column(String)
    to_date = Column(String)
    total_days = Column(Integer)
    status = Column(String, index=True)
    remarks = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    employee = relationship("Employee", backref="leaves")

class ACRData(Base):
    __tablename__ = "acr_data"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), index=True)
    year = Column(String, index=True)
    assessment = Column(String)
    remarks = Column(Text)

class ACRReport(Base):
    __tablename__ = "acr_reports"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), index=True)
    year = Column(String, index=True)
    status = Column(String)  # Pending, Sent to Islamabad
    is_manually_completed = Column(Boolean, default=False)
    periods = relationship("ACRReportPeriod", backref="acr_report")

class ACRReportPeriod(Base):
    __tablename__ = "acr_report_periods"
    id = Column(Integer, primary_key=True, index=True)
    acr_report_id = Column(Integer, ForeignKey("acr_reports.id"), index=True)
    from_date = Column(String)
    to_date = Column(String)
    status = Column(String)  # Pending, Sent
    ga = Column(String, default="")
    promotion = Column(String, default="")
    remarks = Column(String, default="")
    fitness_after_25_years = Column(String, default="")
    ro_name = Column(String, default="")
    ro_date = Column(String, default="")
    co_name = Column(String, default="")
class FileTracking(Base):
    __tablename__ = "file_tracking"
    id = Column(Integer, primary_key=True, index=True)
    file_name = Column(String, index=True)
    case_subject = Column(String)
    reason = Column(String)
    put_up = Column(String)
    put_up_date = Column(String)
    mark_branch = Column(String)
    receiver_name = Column(String)
    receiving_date = Column(String)
    return_date = Column(String)
    status = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    action = Column(String)
    table_name = Column(String)
    record_id = Column(Integer)
    old_data = Column(JSON)
    new_data = Column(JSON)
    timestamp = Column(DateTime, default=datetime.utcnow)

class Rationalization(Base):
    __tablename__ = "rationalization"
    id = Column(Integer, primary_key=True, index=True)
    wing_division = Column(String, index=True, nullable=True)
    region = Column(String, index=True, nullable=True)
    branch_office = Column(String, index=True)
    post_name = Column(String, index=True)
    s_no = Column(String)
    bs = Column(String)
    allocated_posts = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class HRPool(Base):
    __tablename__ = "hr_pool"
    id = Column(Integer, primary_key=True, index=True)
    s_no = Column(String)
    name = Column(String, index=True)
    post_name = Column(String, index=True)
    bs = Column(String, index=True)
    branch_office = Column(String)
    domicile = Column(String)
    joining_date = Column(String)
    
    # LIEN specific columns
    lien_start_date = Column(String)
    lien_end_date = Column(String)
    lien_approved_time = Column(String)
