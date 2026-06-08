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
- `hrms_v2.db`: SQLite database file.

## Key Features
1. **Dynamic Dashboard**: Summary cards for Total Seats, Employees, Vacancies, and Officer/Official classification.
2. **Two-Way Excel Sync**: Changes in the UI automatically update `Database.xlsx`, and manual sync imports Excel data to the DB.
3. **Employees Section**: Full CRUD operations with 45+ detailed fields and duration calculations.
4. **Advanced Reports**: Comprehensive filtering across all fields with Excel/PDF export and A4 printing.
5. **Customization**: Create unlimited dynamic modules (e.g., Degree Verification) with custom columns.

## Rules & Logic
### Officer vs. Official
- **Officers**:
    - BPS 17 and above.
    - BPS 16 with designations: "Senior Personal Assistant" (SPA) or "Deputy Assistant Director (Accounts)" (DADA).
- **Officials**: All remaining BPS 16 and below.

### Headquarters vs. Field
- **Headquarters**: Office/Branch matches "PEC Sindh".
- **Field**: All other Office/Branch values.

### Filled vs. Vacant
- **Filled**: Name column has a value and does not contain "Vacant".
- **Vacant**: Name column is empty, null, or contains the word "Vacant".

## Future Update Notes
- Implement user authentication and role-based access.
- Add document attachment support for employee records.
- Enhance custom modules with specific data types (Date, Checkbox, etc.).
- Add automated email notifications for probation completion or promotions.
