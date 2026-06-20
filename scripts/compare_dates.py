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

# Set index to Code if available, otherwise just use numeric index
if 'Code' in df1.columns and 'Code' in df2.columns:
    df1 = df1.set_index('Code')
    df2 = df2.set_index('Code')

# Align dataframes
df1, df2 = df1.align(df2, join='inner')

# Identify specifically requested columns
target_cols = ['Name', 'joining_date', 'entry_govt']
available_cols = [c for c in target_cols if c in df1.columns]

# Subset to columns of interest
df1_subset = df1[available_cols]
df2_subset = df2[available_cols]

# Find differences
diff = df1_subset.compare(df2_subset)

if diff.empty:
    print("No differences found in requested columns.")
else:
    print("Differences found in Joining Dates:")
    # Reset index to show Code as a column in the output
    diff_reset = diff.reset_index()
    print(diff_reset)
    diff_reset.to_csv('date_differences.csv', index=False)
    print("\nDifferences saved to date_differences.csv")
