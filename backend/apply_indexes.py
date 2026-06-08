from database import engine
from sqlalchemy import text

indexes = [
    "CREATE INDEX IF NOT EXISTS idx_post_status ON employees (post_status)",
    "CREATE INDEX IF NOT EXISTS idx_officer_official ON employees (officer_official)",
    "CREATE INDEX IF NOT EXISTS idx_hq_field ON employees (hq_field)",
    "CREATE INDEX IF NOT EXISTS idx_post_name ON employees (post_name)",
    "CREATE INDEX IF NOT EXISTS idx_branch_office ON employees (branch_office)",
    "CREATE INDEX IF NOT EXISTS idx_bs ON employees (bs)"
]

with engine.connect() as conn:
    for idx in indexes:
        print(f"Applying: {idx}")
        conn.execute(text(idx))
    conn.commit()
print("Indexes applied successfully!")
