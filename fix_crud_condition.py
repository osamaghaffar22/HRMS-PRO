import sys

file_path = "backend/app/crud.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target = "branch_changed = db_employee.branch_office != new_data.get('branch_office')"
replacement = "branch_changed = 'branch_office' in new_data and db_employee.branch_office != new_data['branch_office']"

content = content.replace(target, replacement)

target2 = "post_changed = db_employee.post_name != new_data.get('post_name')"
replacement2 = "post_changed = 'post_name' in new_data and db_employee.post_name != new_data['post_name']"

content = content.replace(target2, replacement2)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed branch_changed and post_changed checks in crud.py")
