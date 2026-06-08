from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from datetime import datetime

# --- User & Auth ---
class UserBase(BaseModel):
    username: str
    full_name: Optional[str] = None
    role: str

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
    dob: Optional[str] = None
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
    joining_date: Optional[str] = None
    total_service: Optional[str] = None
    place_of_posting: Optional[str] = None
    tenure_current_station: Optional[str] = None
    head_office: Optional[str] = None
    wing_division: Optional[str] = None
    section_district: Optional[str] = None
    branch_office: Optional[str] = None
    bs: Optional[str] = None
    post_name: Optional[str] = None
    cadre_type: Optional[str] = None
    job_type: Optional[str] = None
    direct_promotion: Optional[str] = None
    joining_present_post: Optional[str] = None
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
    probation_till_date: Optional[str] = None
    temp_address: Optional[str] = None
    perm_address: Optional[str] = None
    post_status: Optional[str] = None

class EmployeeCreate(EmployeeBase):
    pass

class Employee(EmployeeBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# --- Transfer ---
class TransferHistoryBase(BaseModel):
    employee_id: int
    transfer_order: Optional[str] = None
    order_date: Optional[str] = None
    previous_office: Optional[str] = None
    new_office: Optional[str] = None
    joining_date: Optional[str] = None
    relieving_date: Optional[str] = None
    duration_spent: Optional[str] = None
    remarks: Optional[str] = None

class TransferHistoryCreate(TransferHistoryBase):
    pass

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
    columns: List[str]

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
