import pandas as pd
import sys

try:
    file_path1 = "d:/HRMS Pro/Database.xlsx"
    file_path2 = "d:/HRMS Pro/Book1.xlsx"
    
    print(f"Reading {file_path2}...")
    df_book = pd.read_excel(file_path2, header=1)
    
    branch_col = 'Branch / Office'
    post_col = 'Name of Post'
    name_col = 'Names'
    
    df_book[branch_col] = df_book[branch_col].fillna('')
    df_book[post_col] = df_book[post_col].fillna('')
    
    gs_deos = df_book[df_book[branch_col].str.contains('GS', case=False, na=False) & df_book[post_col].str.contains('Data Entry', case=False, na=False)]
    print("\n--- DEOs in GS/GSC Branch in Book1.xlsx ---")
    for index, row in gs_deos.iterrows():
        print(f"Row: Name: {row.get(name_col)}, Branch: {row[branch_col]}, Post: {row[post_col]}")


except Exception as e:
    import traceback
    traceback.print_exc()
