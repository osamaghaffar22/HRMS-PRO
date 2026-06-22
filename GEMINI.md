# HRMS Enterprise Pro Documentation

## Project Overview
HRMS (Human Resource Management System) is a FastAPI-based application designed to manage employee records, synchronize data with Excel, and provide dynamic dashboard statistics and reporting.

## Directory Structure
- `main.py`: FastAPI application entry point, API routes, and Excel synchronization logic.
- `models.py`: SQLAlchemy database models (Updated for Database.xlsx).
- `schemas.py`: Pydantic models for data validation.
- `database.py`: Database connection and session management.
- `static/`: Frontend files.
    - `index.html`: Main UI layout.
    - `css/style.css`: Custom styling.
    - `js/app.js`: Frontend logic and API integration.
- `Database.xlsx`: The master Excel data file synchronized with the system.
- `PostgreSQL`: Used as the master scalable database (configured via backend/.env) instead of SQLite, due to the need to handle millions of records.

## Key Features
1. **Dynamic Dashboard**: Summary cards for Total Seats, Employees, Vacancies, and Officer/Official classification.
2. **Two-Way Excel Sync**: Changes in the UI automatically update `Database.xlsx`, and manual sync imports Excel data to the DB.
3. **Employees Section**: Full CRUD operations with 45+ detailed fields and duration calculations.
4. **Advanced Reports**: Comprehensive filtering across all fields with Excel/PDF export and A4 printing.
5. **Customization**: Create unlimited dynamic modules (e.g., Degree Verification) with custom columns.

## Rules & Logic

### Officer vs. Official Definitions (System Wide)
- **Officers**: BPS 17 and above, PLUS BPS 16 with designations: "Senior Personal Assistant" (SPA) or "Deputy Assistant Director (Accounts)" (DADA).
- **Officials**: All remaining BPS 16 and below.
- *CRITICAL EXCEPTION*: **ONLY** in the **ACR Section**, "Senior Personal Assistant" (SPA) is treated as an **Official** because their ACR does not go to Islamabad. Everywhere else, they are Officers.

### Dashboard Calculations & Definitions
All dashboard calculations must strictly follow these definitions:
1. **All Staff Directory**: Total seats, filled, and vacant for the entire active staff.
2. **Officers (17 and Plus)**: All Officers (BPS 17+ and SPA/DADA). Total seats, filled, vacant.
3. **Officials (16 and Below)**: All Officials (excluding SPA/DADA). Total seats, filled, vacant.
4. **Headquarter Officers**: Officers (including SPA/DADA) assigned to HQ. Total seats, filled, vacant.
5. **Field Officers**: Officers (including SPA/DADA) assigned to Field. Total seats, filled, vacant.
6. **Headquarter Officials**: Officials (16 and below, excluding SPA/DADA) assigned to HQ. Total seats, filled, vacant.
7. **Field Officials**: Officials (16 and below, excluding SPA/DADA) assigned to Field. Total seats, filled, vacant.

### HR Strategical Pool
- **Purpose**: A separate list/table exclusively for record-keeping of employees on deputation/lien who have moved to other departments.
- **Isolation**: They have NO relationship with the `Employee` list.
- **Exclusions**: They MUST NOT be counted in Dashboard statistics, Employee Lists, ACRs, Leaves, or Transfer Postings. They are purely for the separate HR Pool table.

### Filled vs. Vacant
- **Filled**: Name column has a value and does not contain "Vacant".
- **Vacant**: Name column is empty, null, or contains the word "Vacant".

### Headquarters vs. Field
- **Headquarters**: Office/Branch matches "PEC Sindh".
- **Field**: All other Office/Branch values.

### Data Aggregation & Calculations (CRITICAL)
- **Backend First**: ALL statistical counts, aggregations, and totals MUST be calculated directly from the Database (Backend).
- **No Frontend Math**: NEVER rely on frontend data arrays (like using `.reduce()` or `.length`) for critical metrics. Frontend data can be hidden, paginated, or filtered out, leading to inaccurate totals.
- **Database Extensibility**: If a new metric or clearer counting logic is required, you are permitted to add new columns to the database tables rather than creating complex frontend workarounds.

## Future Update Notes
- Implement user authentication and role-based access.
- Add document attachment support for employee records.
- Enhance custom modules with specific data types (Date, Checkbox, etc.).
- Add automated email notifications for probation completion or promotions.
