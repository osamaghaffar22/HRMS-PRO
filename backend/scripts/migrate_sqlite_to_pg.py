import os
from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from app.models import Base
import app.models

load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

# Source Database (SQLite)
SQLITE_URL = "sqlite:///../hrms_v2.db"
sqlite_engine = create_engine(SQLITE_URL)
SqliteSession = sessionmaker(bind=sqlite_engine)
sqlite_session = SqliteSession()

# Target Database (PostgreSQL)
PG_URL = os.getenv("PG_DATABASE_URL")

if not PG_URL:
    print("ERROR: PG_DATABASE_URL is missing in .env file.")
    exit(1)

try:
    pg_engine = create_engine(PG_URL)
    with pg_engine.connect() as _:
        pass
except Exception as e:
    print(f"ERROR: Could not connect to PostgreSQL database: {e}")
    exit(1)

print("Connection to both databases successful!")

print("Dropping existing tables in PostgreSQL to start fresh...")
Base.metadata.drop_all(bind=pg_engine)
print("Creating tables in PostgreSQL...")
Base.metadata.create_all(bind=pg_engine)

# Reflect the tables from both databases
sqlite_metadata = MetaData()
sqlite_metadata.reflect(bind=sqlite_engine)

pg_metadata = MetaData()
pg_metadata.reflect(bind=pg_engine)

# Migrate data table by table in topological sorted order (Foreign Key safe)
for sqlite_table in sqlite_metadata.sorted_tables:
    table_name = sqlite_table.name
    print(f"Migrating table: {table_name}...")
    
    # Check if table exists in PG
    if table_name not in pg_metadata.tables:
        print(f" - Warning: {table_name} does not exist in PostgreSQL. Skipping.")
        continue
        
    pg_table = pg_metadata.tables[table_name]
    valid_columns = [col.name for col in pg_table.columns]
    
    # Read data from SQLite
    rows = sqlite_session.execute(sqlite_table.select()).fetchall()
    if not rows:
        print(f" - {table_name} is empty, skipping.")
        continue
        
    print(f" - Found {len(rows)} records. Inserting into PostgreSQL...")
    
    columns = [col.name for col in sqlite_table.columns]
    insert_data = []
    
    for row in rows:
        row_dict = dict(zip(columns, row))
        filtered_dict = {k: v for k, v in row_dict.items() if k in valid_columns}
        insert_data.append(filtered_dict)
    
    # Insert in batches
    batch_size = 1000
    for i in range(0, len(insert_data), batch_size):
        batch = insert_data[i:i+batch_size]
        with pg_engine.begin() as conn:
            conn.execute(pg_table.insert().values(batch))
        
    print(f" - Successfully migrated {table_name}")

print("\nMigration Completed Successfully!")
