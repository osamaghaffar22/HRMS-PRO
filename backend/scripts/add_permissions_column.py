import sys
import os
import json

# Adjust python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.db.database import engine
from sqlalchemy import text

def run_migration():
    with engine.connect() as conn:
        print("Checking if 'permissions' column exists in 'users' table...")
        
        # Check columns of 'users' table
        result = conn.execute(text("PRAGMA table_info(users);")).fetchall()
        column_names = [col[1] for col in result]
        
        if "permissions" not in column_names:
            print("Adding 'permissions' column...")
            conn.execute(text("ALTER TABLE users ADD COLUMN permissions TEXT;"))
            conn.commit()
            print("Column 'permissions' added successfully.")
        else:
            print("Column 'permissions' already exists.")
        
        # Update existing Admin user if they exist
        print("Updating default permissions for admin user...")
        default_permissions = {
            "employees": True,
            "employees_form": True,
            "transfers": True,
            "acr": True,
            "leaves": True,
            "files": True,
            "reports": True,
            "custom": True,
            "data_exchange": True
        }
        permissions_json = json.dumps(default_permissions)
        conn.execute(
            text("UPDATE users SET permissions = :perms WHERE role = 'Admin';"),
            {"perms": permissions_json}
        )
        conn.commit()
        print("Admin user permissions updated.")

if __name__ == "__main__":
    run_migration()
