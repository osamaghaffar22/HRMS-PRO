# HRMS Enterprise Pro - Migration & Expansion Plan

## 1. Vision & Goals
Transform the current HRMS into a professional, multi-user enterprise application using a modern tech stack.
- **Tech Stack:** Next.js (Frontend) + FastAPI (Backend) + PostgreSQL (Database).
- **Security:** JWT Authentication + Role-Based Access Control (RBAC).
- **Audit:** Complete history of data changes.
- **Enhanced Modules:** Dashboard drill-down, Advanced Transfer logic, Redesigned Leave Management.

## 2. Database Schema (PostgreSQL)

### Core Tables
- `users`: id, username, password_hash, role (Admin/Editor/Viewer), created_at.
- `employees`: id, personal_file_no, code, s_no, officer_official, hq_field, employee_no, cnic, seniority_no, name, father_name, dob, religion, nationality, gender, marital_status, home_province, home_district, domicile, rural_urban, entry_govt, joining_date, total_service, place_of_posting, tenure_current_station, head_office, wing_division, section_district, branch_office, bs (Grade), post_name, cadre_type, job_type, direct_promotion, joining_present_post, tenure_current_scale, qualification, disability, dual_nationality, passport_noc, blood_group, area_expertise, email, mobile_no, probation_status, probation_till_date, temp_address, perm_address, post_status.
- `transfer_history`: id, employee_id, transfer_order, previous_office, new_office, order_date, joining_date, relieving_date, duration_spent, remarks.
- `leave_records`: id, employee_id, from_date, to_date, total_days, status (Approved/Pending/Rejected), created_at.
- `acr_data`: id, employee_id, year, assessment, promotion, remarks.
- `audit_logs`: id, user_id, action (Create/Update/Delete), table_name, record_id, old_data (JSON), new_data (JSON), timestamp.

## 3. Module Specific Requirements (per Details.docx)

### Dashboard Update
- Professional, modern cards with drill-down capability.
- Clicking any stat (e.g., "Filled Posts") opens a filtered view of relevant records.

### Employee Management
- **Filters:** Officer/Official, HQ/Field, Region, Branch/Office, Designation, Post Status.
- **Tenure Filter:** Dropdown (1 Year+, 2 Years+, etc.) to find long-staying employees.
- **Actions:** Remove "Delete" for users; only "Edit" remains. Edit opens full form.

### Reports Section
- **Dynamic Columns:** User selects filters -> Report shows fixed columns (S.No, Name, Desig, BPS, Office) + ONLY the columns related to selected filters.
- **Export Consistency:** Same dynamic logic for Print, Excel, and PDF.

### Transfer Posting Logic
- **Auto-Sync:** Processing a transfer must automatically:
    1. Update the main `employees` record (Current Posting, Joining Date).
    2. Reset "Current Posting Tenure".
    3. Finalize and archive the previous stint in `transfer_history`.

### Leave Management Redesign
- Search Employee -> Select -> Enter From/To Dates -> Auto-calculate Days.
- Status workflow (Approved/Under Process/Rejected).
- Exportable history table with status filters.

### ACR Module UI
- Optimize table width for Name, Designation, and Office to prevent horizontal overflow.
- Ensure readability of all assessment years.

## 4. Execution Steps

### Phase 1: Environment Setup
- [x] Create `docker-compose.yml` for PostgreSQL.
- [x] Initialize Next.js project in `/frontend`.
- [x] Initialize FastAPI project in `/backend`.
- [x] Setup shadcn/ui and core frontend libraries.

### Phase 2: Backend Development
- [x] Database connection & Model definitions (PostgreSQL).
- [x] Authentication system (Login/JWT/Bcrypt).
- [x] CRUD APIs with Audit Logging.
- [x] Advanced logic for Tenure and Transfer Sync.

### Phase 3: Frontend Development
- [x] Setup global Auth state (Zustand).
- [x] Professional Login Page.
- [x] Dashboard Layout & Sidebar.
- [x] Clickable Dashboard Cards (Drill-down ready).
- [x] Employee Management Filters & Search.
- [x] Redesigned Transfer Posting Module (Logic + UI).
- [x] Redesigned Leave Management Module (Logic + UI).
- [x] Dynamic Reports Module (Custom columns + Exports).
- [x] ACR UI Optimization (Space efficient).

### Phase 4: Data Migration
- [x] Export/Import script for PostgreSQL.
- [x] 636 records successfully imported.
- [x] Default Admin created (admin/admin123).
