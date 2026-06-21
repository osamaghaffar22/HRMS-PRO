file_path = 'd:/HRMS Pro/backend/scripts/migrate_sqlite_to_pg.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('print("Creating tables in PostgreSQL...")', 'print("Dropping existing tables in PostgreSQL to start fresh...")\nBase.metadata.drop_all(bind=pg_engine)\nprint("Creating tables in PostgreSQL...")')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Added drop_all to migration script')
