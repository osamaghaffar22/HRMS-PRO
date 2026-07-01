from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from datetime import datetime

# --- User & Auth ---
from pydantic import BaseModel, ConfigDict, field_validator
import json
from typing import Optional

class UserBase(BaseModel):
    username: str
    full_name: Optional[str] = None
    role: str
    permissions: Optional[dict] = None

    @field_validator('permissions', mode='before')
    @classmethod
    def parse_permissions(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except:
                return {}
        return v

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

from datetime import date
import re

# --- Employee ---
class EmployeeBase(BaseModel):
    personal_file_no: Optional[str] = None
    code: Optional[str] = None
    s_no: Optional[str] = None
    officer_official: Optional[str] = None
    hq_field: Optional[str] = None
    employee_no: Optional[str] = None
    cnic: Optional[str] = None
    seniority_no: Optional[str] = None
    name: Optional[str] = None
    father_name: Optional[str] = None
    dob: Optional[date] = None
    total_age: Optional[str] = None
    youth_adult: Optional[str] = None
    religion: Optional[str] = None
    nationality: Optional[str] = None
    gender: Optional[str] = None
    marital_status: Optional[str] = None
    home_province: Optional[str] = None
    home_district: Optional[str] = None
    domicile: Optional[str] = None
    rural_urban: Optional[str] = None
    entry_govt: Optional[str] = None
    joining_date: Optional[date] = None
    total_service: Optional[str] = None
    place_of_posting: Optional[date] = None
    tenure_current_station: Optional[str] = None
    head_office: Optional[str] = None
    wing_division: Optional[str] = None
    section_district: Optional[str] = None
    branch_office: Optional[str] = None
    bs: Optional[int] = None
    post_name: Optional[str] = None
    cadre_type: Optional[str] = None
    job_type: Optional[str] = None
    direct_promotion: Optional[str] = None
    joining_present_post: Optional[date] = None
    tenure_current_scale: Optional[str] = None
    qualification: Optional[str] = None
    disability: Optional[str] = None
    dual_nationality: Optional[str] = None
    passport_noc: Optional[str] = None
    blood_group: Optional[str] = None
    area_expertise: Optional[str] = None
    email: Optional[str] = None
    mobile_no: Optional[str] = None
    probation_status: Optional[str] = None
    probation_till_date: Optional[date] = None
    temp_address: Optional[str] = None
    perm_address: Optional[str] = None
    post_status: Optional[str] = None
    order_number: Optional[str] = None
    order_date: Optional[str] = None
    relieving_date: Optional[str] = None
    employment_status: Optional[str] = "Active"
    separation_date: Optional[date] = None

    @field_validator('dob', 'joining_date', 'place_of_posting', 'joining_present_post', 'probation_till_date', 'separation_date', mode='before')
    @classmethod
    def parse_dates(cls, v):
        if not v or str(v).strip() == "" or "not match" in str(v).lower() or "n/a" in str(v).lower():
            return None
        return v
        
    @field_validator('bs', mode='before')
    @classmethod
    def parse_bs_val(cls, v):
        if not v or str(v).strip() == "":
            return None
        digits = re.sub(r'\D', '', str(v))
        return int(digits) if digits else None

class EmployeeCreate(EmployeeBase):
    pass

from pydantic import model_validator

class Employee(EmployeeBase):
    id: int
    leaves: List['LeaveRecord'] = []
    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode='after')
    def compute_durations(self):
        from datetime import date
        today = date.today()
        
        def calculate_duration(start_date):
            if not start_date: return "---"
            try:
                years = today.year - start_date.year
                months = today.month - start_date.month
                days = today.day - start_date.day
                if days < 0:
                    months -= 1
                    days += 30
                if months < 0:
                    years -= 1
                    months += 12
                return f"{years}Y, {months}M, {days}D"
            except:
                return "---"

        if self.dob: self.total_age = calculate_duration(self.dob)
        if self.joining_date: self.total_service = calculate_duration(self.joining_date)
        if self.place_of_posting: self.tenure_current_station = calculate_duration(self.place_of_posting)
        
        return self

class EmployeeDiscrepancy(BaseModel):
    employee: Employee
    issues: List[str]

# --- Transfer ---
class TransferHistoryBase(BaseModel):
    employee_id: int
    transfer_order: Optional[str] = None
    order_number: Optional[str] = None
    order_date: Optional[str] = None
    previous_office: Optional[str] = None
    previous_branch_office: Optional[str] = None
    new_office: Optional[str] = None
    new_branch_office: Optional[str] = None
    new_region: Optional[str] = None
    joining_date: Optional[str] = None
    relieving_date: Optional[str] = None
    duration_spent: Optional[str] = None
    remarks: Optional[str] = None

class TransferHistoryCreate(TransferHistoryBase):
    pass

class TransferHistoryUpdate(BaseModel):
    transfer_order: Optional[str] = None
    order_number: Optional[str] = None
    order_date: Optional[str] = None
    previous_office: Optional[str] = None
    previous_branch_office: Optional[str] = None
    new_office: Optional[str] = None
    new_branch_office: Optional[str] = None
    new_region: Optional[str] = None
    joining_date: Optional[str] = None
    relieving_date: Optional[str] = None
    duration_spent: Optional[str] = None
    remarks: Optional[str] = None

class TransferHistory(TransferHistoryBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Leave ---
class LeaveRecordBase(BaseModel):
    employee_id: int
    from_date: Optional[str] = None
    to_date: Optional[str] = None
    total_days: Optional[int] = None
    status: Optional[str] = None
    remarks: Optional[str] = None

class LeaveRecordCreate(LeaveRecordBase):
    pass

class LeaveRecord(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    employee_post: Optional[str] = None
    employee_bs: Optional[str] = None
    from_date: Optional[str] = None
    to_date: Optional[str] = None
    total_days: Optional[int] = None
    status: Optional[str] = None
    remarks: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Custom Modules ---
class CustomModuleBase(BaseModel):
    title: str
    columns: dict

class CustomModuleCreate(CustomModuleBase):
    pass

class CustomModule(CustomModuleBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class CustomModuleDataUpdate(BaseModel):
    module_id: int
    employee_id: int
    data: dict

# --- ACR ---
class ACRReportCreate(BaseModel):
    employee_id: int
    year: str
    status: str

class ACRReportPeriodCreate(BaseModel):
    acr_report_id: int
    from_date: str
    to_date: str
    status: Optional[str] = "Pending"
    ga: Optional[str] = ""
    promotion: Optional[str] = ""
    remarks: Optional[str] = ""
    fitness_after_25_years: Optional[str] = ""
    ro_name: Optional[str] = ""
    ro_date: Optional[str] = ""
    co_name: Optional[str] = ""
    co_date: Optional[str] = ""
    result: Optional[str] = ""
    ga: Optional[str] = ""
    promotion: Optional[str] = ""
    remarks: Optional[str] = ""
    fitness_after_25_years: Optional[str] = ""
    ro_name: Optional[str] = ""
    ro_date: Optional[str] = ""
    co_name: Optional[str] = ""
    co_date: Optional[str] = ""
    result: Optional[str] = ""

# --- Audit ---
class AuditLog(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: str
    table_name: str
    record_id: int
    old_data: Optional[Any] = None
    new_data: Optional[Any] = None
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

# --- File Tracking ---
class FileTrackingBase(BaseModel):
    file_name: Optional[str] = None
    case_subject: Optional[str] = None
    reason: Optional[str] = None
    put_up: Optional[str] = None
    put_up_date: Optional[str] = None
    mark_branch: Optional[str] = None
    receiver_name: Optional[str] = None
    receiving_date: Optional[str] = None
    return_date: Optional[str] = None
    status: Optional[str] = None

class FileTrackingCreate(FileTrackingBase):
    pass

class FileTrackingUpdate(FileTrackingBase):
    pass

class FileTracking(FileTrackingBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Rationalization ---
class RationalizationBase(BaseModel):
    wing_division: Optional[str] = None
    region: Optional[str] = None
    branch_office: str
    post_name: str
    s_no: Optional[str] = None
    bs: Optional[str] = None
    allocated_posts: int

class RationalizationCreate(RationalizationBase):
    pass

class RationalizationUpdate(BaseModel):
    wing_division: Optional[str] = None
    region: Optional[str] = None
    branch_office: Optional[str] = None
    post_name: Optional[str] = None
    s_no: Optional[str] = None
    bs: Optional[str] = None
    allocated_posts: Optional[int] = None

class Rationalization(RationalizationBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- HR Pool ---
class HRPoolBase(BaseModel):
    s_no: Optional[str] = None
    name: Optional[str] = None
    post_name: Optional[str] = None
    bs: Optional[str] = None
    branch_office: Optional[str] = None
    domicile: Optional[str] = None
    joining_date: Optional[str] = None
    lien_start_date: Optional[str] = None
    lien_end_date: Optional[str] = None
    lien_approved_time: Optional[str] = None
    original_data: Optional[dict] = None

class HRPoolCreate(HRPoolBase):
    pass

class HRPoolUpdate(HRPoolBase):
    pass

class HRPoolResponse(HRPoolBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# --- Extra Pool ---
class ExtraBase(BaseModel):
    s_no: Optional[str] = None
    name: Optional[str] = None
    post_name: Optional[str] = None
    bs: Optional[str] = None
    branch_office: Optional[str] = None
    domicile: Optional[str] = None
    joining_date: Optional[str] = None
    reason: Optional[str] = None
    date_of_action: Optional[str] = None
    original_data: Optional[dict] = None

class ExtraCreate(ExtraBase):
    pass

class ExtraUpdate(ExtraBase):
    pass

class ExtraResponse(ExtraBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

Employee.model_rebuild()
