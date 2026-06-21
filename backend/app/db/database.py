from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import os
from dotenv import load_dotenv
from sqlalchemy import event
from sqlalchemy.engine import Engine

load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env'))

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL.startswith("sqlite:///"):
    db_path = DATABASE_URL.replace("sqlite:///", "")
    # Check if the database path is relative (does not start with drive letter / absolute path)
    if not (os.path.isabs(db_path) or (len(db_path) > 1 and db_path[1] == ':')):
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
        abs_db_path = os.path.abspath(os.path.join(project_root, db_path))
        DATABASE_URL = f"sqlite:///{abs_db_path.replace(os.sep, '/')}"

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False, "timeout": 15})
else:
    engine = create_engine(DATABASE_URL)

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

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
