import sqlite3

def check_db():
    conn = sqlite3.connect('hrms_v2.db')
    c = conn.cursor()
    
    c.execute('SELECT COUNT(*) FROM employees')
    print("Total:", c.fetchone()[0])
    
    c.execute('SELECT COUNT(*) FROM employees WHERE post_status NOT LIKE "%Vacant%" AND name IS NOT NULL AND name != ""')
    print("Filled:", c.fetchone()[0])
    
    c.execute('SELECT officer_official, COUNT(*) FROM employees WHERE post_status NOT LIKE "%Vacant%" AND name IS NOT NULL AND name != "" GROUP BY officer_official')
    for row in c.fetchall():
        print(f"{row[0]}: {row[1]}")

check_db()
