import sys

file_path = "backend/app/crud.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target = """        target_vacant = db.query(models.Employee).filter(
            models.Employee.branch_office == new_branch,
            models.Employee.post_name == emp_post,
            models.Employee.bs == emp_bs,
            models.Employee.name.in_(['Vacant', '()'])
        ).first()"""

replacement = """        target_vacant = db.query(models.Employee).filter(
            models.Employee.branch_office == new_branch,
            models.Employee.post_name == emp_post,
            models.Employee.name.in_(['Vacant', '()'])
        ).first()"""

content = content.replace(target, replacement)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed target_vacant query in crud.py")
