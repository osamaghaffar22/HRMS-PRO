# HRMS Enterprise Pro: ULTIMATE RECONSTRUCTION MASTERPLAN

This is an exhaustive technical document. If all project files are deleted, this guide contains the exact logic, mappings, and schemas required to rebuild the system line-by-line.

---

## 1. BACKEND ARCHITECTURE (Python / FastAPI)

### A. Database Connection (`database.py`)
- **Engine:** SQLite (`sqlite:///hrms_v2.db`)
- **Config:** `check_same_thread=False` (required for FastAPI async sessions).
- **Session:** `SessionLocal` via `sessionmaker`.
- **Base:** `declarative_base()` for SQLAlchemy models.

### B. Database Schema (`models.py`)
1. **`Employee` Table:**
   - Primary: `id` (Int)
   - Indexed: `code` (Unique), `name`, `cnic`.
   - All other 30+ columns are `String` type to handle Excel data flexibly.
2. **`CustomModule` Table:**
   - `id`, `title` (Unique), `columns` (JSON String e.g., `["Degree", "NOC Status"]`).
3. **`CustomModuleData` Table:**
   - `id`, `module_id`, `employee_id`, `data` (JSON String e.g., `{"Degree": "Verified"}`).

### C. Excel Mapping Logic (`main.py`)
The system uses a strict dictionary to bridge Excel and Database. 
- **Mapping Key (Database Field) -> Value (List of possible Excel Headers):**
  - `name`: `['Names', 'Name', 'Full Name']`
  - `code`: `['Code', 'Emp Code', 'ID']`
  - `branch_office`: `['Branch / Office', 'Office', 'Place of Posting']`
  - `bs`: `['BS', 'BPS', 'Scale']`
  - `post_name`: `['Name of Post', 'Designation']`
  - *(And so on for all 34 fields)*

### D. Critical Calculation Rules
1. **Officer/Official Logic:**
   ```python
   # Logic: 
   if BPS >= 17: "Officer"
   elif BPS == 16 AND (Designation == "SPA" or Designation == "DADA"): "Officer"
   else: "Official"
   ```
2. **Data Cleaning:** 
   - A helper function `clean_val()` is used during sync to strip whitespace and remove `.0` artifacts (e.g., converting "23.0" to "23") which often occur when Pandas reads Excel numbers.

---

## 2. FRONTEND ENGINE (HTML/CSS/JS)

### A. Dynamic Dashboard Logic
- The dashboard fetches data from `/api/stats/overall`.
- It calculates "Active Percentage" = `(Filled / Total) * 100`.
- It displays summary cards for: Total Seats, Filled, Vacant, Officers, Officials, HQ, and Field.

### B. Advanced Filtering Logic (`app.js`)
- **Multi-Select:** Uses a custom `initMultiSelect` function that injects a checkbox-based menu into the DOM.
- **Query Building:** It collects all checked items and joins them with commas (e.g., `bs=17,18,19`).
- **Real-time Search:** A `searchTimer` (400ms delay) triggers the API call as you type to prevent server lag.

### C. Service Duration Formula
```javascript
// Function: calculateDuration(joiningDate)
// 1. Get current date (end) and joining date (start).
// 2. Calculate difference in Years, then Months, then Days.
// 3. Handle negative days (borrow from previous month).
// 4. Return string: "X Years, Y Months, Z Days".
```

### D. Printing & Export
- **Print:** Uses `@media print` CSS to hide sidebars and resize tables to fit A4 width.
- **Excel Export:** Converts the visible HTML table into a CSV Blob and triggers a download with `.csv` extension.

---

## 3. FILE SYSTEM & DIRECTORY STRUCTURE
```text
/HRMS
├── main.py              # FastAPI Routes & Excel Logic
├── models.py            # SQLAlchemy Table Definitions
├── database.py          # SQLite Connection Logic
├── schemas.py           # Pydantic Data Models (Input Validation)
├── hrms_v2.db           # The SQLite Data File
├── Employees.xlsx       # The Master Excel File
└── /static
    ├── index.html       # The UI Skeleton
    ├── /css
    │   └── style.css    # Full Styling (Indigo Theme)
    └── /js
        └── app.js       # The "Brain" (API Calls & UI Updates)
```

---

## 4. REBUILDING INSTRUCTIONS (Step-by-Step)
1. **Setup:** Install Python 3.10.
2. **Install Libraries:** `pip install fastapi uvicorn sqlalchemy pandas openpyxl python-multipart`.
3. **Database:** Copy `models.py` and `database.py`. Running `main.py` will recreate the database.
4. **Data Restoration:** Put your `Employees.xlsx` in the folder and hit **"Sync Excel"** in the dashboard.
5. **UI:** Copy the HTML/CSS/JS code from the backup into the `/static` folder.

---
*This document contains every critical setting and logic used in the HRMS Enterprise Pro.*
