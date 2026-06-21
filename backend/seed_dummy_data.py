import random
import string
from sqlalchemy.orm import Session
from app.db.database import engine, SessionLocal
from app.models import Employee

def random_string(length=10):
    return ''.join(random.choices(string.ascii_uppercase, k=length))

def seed_data(db: Session, num_records=50000):
    print(f"Seeding {num_records} dummy employees...")
    branches = ["HQ", "Field Office", "Korangi", "Saddar", "Clifton", "Gulshan", "Malir", "Landhi", "Kemari"]
    posts = ["Assistant Director", "Deputy Director", "Director", "Clerk", "Peon", "Manager", "Supervisor"]
    domiciles = ["Karachi", "Lahore", "Islamabad", "Quetta", "Peshawar", "Hyderabad", "Sukkur"]

    batch_size = 5000
    employees = []
    
    for i in range(num_records):
        emp = Employee(
            code=f"EMP-{random.randint(10000, 999999)}",
            name=f"Dummy User {i}",
            cnic=f"{random.randint(10000, 99999)}-{random.randint(1000000, 9999999)}-{random.randint(1, 9)}",
            branch_office=random.choice(branches),
            hq_field="HQ" if random.choice([True, False]) else "Field",
            officer_official="Officer" if random.choice([True, False]) else "Official",
            post_name=random.choice(posts),
            bs=str(random.randint(1, 20)),
            domicile=random.choice(domiciles),
            employment_status="Active"
        )
        employees.append(emp)

        if len(employees) >= batch_size:
            db.bulk_save_objects(employees)
            db.commit()
            print(f"Inserted {i+1} records...")
            employees = []

    if employees:
        db.bulk_save_objects(employees)
        db.commit()
        
    print("Seeding complete!")

if __name__ == "__main__":
    db = SessionLocal()
    seed_data(db)
    db.close()
