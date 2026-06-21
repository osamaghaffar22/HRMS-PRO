import sys

file_path = "backend/app/crud.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target = """            # Scenario 4: Source Overstaffed, Target No Vacant
            # Do nothing, Employee moves and Source loses a seat (fixes overstaffing)."""

replacement = """            # Scenario 4: Source Overstaffed, Target No Vacant
            # Do nothing, Employee moves and Source loses a seat (fixes overstaffing).
            
            # Since employee is moving to Target but there was no target_vacant to swap with,
            # we MUST fetch the structural fields for the Target Branch from any sibling employee.
            target_sibling = db.query(models.Employee).filter(models.Employee.branch_office == new_branch).first()
            if target_sibling:
                new_data['s_no'] = target_sibling.s_no
                new_data['hq_field'] = target_sibling.hq_field
                new_data['head_office'] = target_sibling.head_office
                new_data['wing_division'] = target_sibling.wing_division
                new_data['section_district'] = target_sibling.section_district"""

content = content.replace(target, replacement)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated crud.py to fetch Target sibling structural fields in Scenario 3/4")
