file_path = 'd:/HRMS Pro/backend/app/db/database.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the condition in the listener
old_check = 'if DATABASE_URL.startswith("sqlite"):'
new_check = 'if type(dbapi_connection).__name__ == "Connection" and "sqlite3" in str(type(dbapi_connection)):'

content = content.replace(old_check, new_check)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed SQLite pragma check in database.py')
