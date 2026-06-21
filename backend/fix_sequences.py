import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv(os.path.join('d:/HRMS Pro/backend', '.env'))
PG_URL = os.getenv('PG_DATABASE_URL')
engine = create_engine(PG_URL)

with engine.begin() as conn:
    tables = conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")).fetchall()
    for (table,) in tables:
        try:
            conn.execute(text(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE(max(id), 0) + 1, false) FROM {table}"))
            print(f'Fixed sequence for {table}')
        except Exception as e:
            pass
print('Sequences updated successfully!')
