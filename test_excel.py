import pandas as pd
import sys

try:
    file_path = "d:/HRMS Pro/Database.xlsx"
    df = pd.read_excel(file_path, sheet_name=0) # Read the first sheet
    
    # Let's print columns to understand the structure
    print("Columns in Excel:", df.columns.tolist())
    
    # Filter for GSC
    # The column name might be 'Office / Branch', 'Branch Office', etc.
    # Let's find the branch column and post column dynamically
    branch_col = 'Branch_Office'
    post_col = 'Designation'
    name_col = 'Employee_Name'
    
    print(f"Using Branch Col: {branch_col}, Post Col: {post_col}, Name Col: {name_col}")
    
    if branch_col and post_col:
        # Fill NaN with empty string to avoid errors with .str.contains
        df[branch_col] = df[branch_col].fillna('')
        df[post_col] = df[post_col].fillna('')
        
        gsc_deos = df[df[branch_col].str.contains('GSC', case=False) & df[post_col].str.contains('Data Entry', case=False)]
        
        print("\n--- GSC Data Entry Operators in Excel ---")
        if len(gsc_deos) == 0:
            print("No DEOs found in GSC in Excel.")
        else:
            for index, row in gsc_deos.iterrows():
                print(f"Row {index+2}: Name: {row.get(name_col)}, Branch: {row[branch_col]}, Post: {row[post_col]}")
except Exception as e:
    import traceback
    traceback.print_exc()
