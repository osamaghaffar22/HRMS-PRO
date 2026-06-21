import os
from sqlalchemy import create_engine, inspect, MetaData
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from app.db.database import Base

load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env'))

# Source Database (SQLite)
SQLITE_URL = "sqlite:///../hrms_v2.db"
sqlite_engine = create_engine(SQLITE_URL)
SqliteSession = sessionmaker(bind=sqlite_engine)
sqlite_session = SqliteSession()

# Target Database (PostgreSQL)
# User should add PG_DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/hrms_db to .env
PG_URL = os.getenv("PG_DATABASE_URL")

if not PG_URL:
    print("ERROR: PG_DATABASE_URL is missing in .env file.")
    print("Please add: PG_DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/hrms_db")
    exit(1)

try:
    pg_engine = create_engine(PG_URL)
    # Check connection
    pg_engine.connect()
except Exception as e:
    print(f"ERROR: Could not connect to PostgreSQL database: {e}")
    print("Please make sure PostgreSQL is installed, running, and the credentials in PG_DATABASE_URL are correct.")
    exit(1)

PgSession = sessionmaker(bind=pg_engine)
pg_session = PgSession()

print("Connection to both databases successful!")

# Create all tables in PostgreSQL
print("Creating tables in PostgreSQL...")
Base.metadata.create_all(bind=pg_engine)

# Reflect the tables from SQLite
metadata = MetaData()
metadata.reflect(bind=sqlite_engine)

# Migrate data table by table
for table_name in metadata.tables.keys():
    print(f"Migrating table: {table_name}...")
    table = metadata.tables[table_name]
    
    # Read data from SQLite
    rows = sqlite_session.execute(table.select()).fetchall()
    if not rows:
        print(f" - {table_name} is empty, skipping.")
        continue
        
    print(f" - Found {len(rows)} records. Inserting into PostgreSQL...")
    
    # We must construct a dictionary of insert values for each row
    columns = [col.name for col in table.columns]
    insert_data = [dict(zip(columns, row)) for row in rows]
    
    # Insert in batches to avoid memory overload
    batch_size = 1000
    for i in range(0, len(insert_data), batch_size):
        batch = insert_data[i:i+batch_size]
        pg_engine.execute(table.insert().values(batch))
        
    print(f" - Successfully migrated {table_name}")

print("\nMigration Completed Successfully!")
print("You can now update your DATABASE_URL in .env to point to PostgreSQL.")
