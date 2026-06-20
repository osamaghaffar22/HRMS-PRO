import pandas as pd

file1 = 'Database.xlsx'
file2 = 'Database 1.xlsx'

# Load both sheets
try:
    df1 = pd.read_excel(file1)
    df2 = pd.read_excel(file2)
except Exception as e:
    print(f"Error reading files: {e}")
    exit()

# Ensure we compare based on a unique ID if possible (e.g., Code/Personal File No)
# Assuming 'Code' exists as a unique identifier
if 'Code' in df1.columns and 'Code' in df2.columns:
    df1 = df1.set_index('Code')
    df2 = df2.set_index('Code')
else:
    print("Column 'Code' not found. Comparing by index.")

# Ensure identically labeled
df1, df2 = df1.align(df2, join='inner')

# Find differences
diff = df1.compare(df2)

if diff.empty:
    print("No differences found between the two files.")
else:
    print("Differences found:")
    print(diff)
    diff.to_csv('differences.csv')
    print("\nDifferences saved to differences.csv")
