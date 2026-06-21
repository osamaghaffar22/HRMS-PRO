import os

file_path = 'd:/HRMS Pro/backend/app/db/database.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

new_content = content.replace(
    'engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})',
    '''engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False, "timeout": 15})

from sqlalchemy import event
from sqlalchemy.engine import Engine

@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if DATABASE_URL.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA cache_size=-64000") # 64MB cache
        cursor.execute("PRAGMA temp_store=MEMORY")
        cursor.execute("PRAGMA mmap_size=30000000000") # Use mmap for faster reads
        cursor.execute("PRAGMA busy_timeout=5000") # Wait 5s before throwing 'database is locked'
        cursor.close()
'''
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Updated database.py with SQLite optimization pragmas for extreme performance')
