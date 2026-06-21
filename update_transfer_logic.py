import sys

file_path = "backend/app/crud.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target_marker_start = """    if branch_changed or post_changed:
        new_branch = new_data.get('branch_office', db_employee.branch_office)
        new_post = new_data.get('post_name', db_employee.post_name)
        # We no longer block transfers when quota is full. The UI will indicate the excess count instead."""

replacement = """    if branch_changed:
        new_branch = new_data.get('branch_office')
        old_branch = db_employee.branch_office
        emp_post = db_employee.post_name
        emp_bs = db_employee.bs
        
        # 1. Check if Target Branch has a Vacant Seat
        target_vacant = db.query(models.Employee).filter(
            models.Employee.branch_office == new_branch,
            models.Employee.post_name == emp_post,
            models.Employee.bs == emp_bs,
            models.Employee.name.in_(['Vacant', '()'])
        ).first()

        # 2. Check if Source Branch is Overstaffed
        sanctioned = db.query(models.Rationalization).filter(
            models.Rationalization.branch_office == old_branch,
            models.Rationalization.post_name == emp_post
        ).first()
        quota = sanctioned.allocated_posts if sanctioned else 0
        
        total_source_seats = db.query(models.Employee).filter(
            models.Employee.branch_office == old_branch,
            models.Employee.post_name == emp_post,
            models.Employee.employment_status == 'Active'
        ).count()
        
        is_overstaffed = total_source_seats > quota
        
        if target_vacant:
            if is_overstaffed:
                # Scenario 2: Source Overstaffed, Target has Vacant
                # Delete Target's Vacant Seat. No new Vacant seat in Source.
                db.delete(target_vacant)
            else:
                # Scenario 1: Source Normal, Target has Vacant
                # Swap Structural Fields
                tv_section = target_vacant.section_district
                tv_wing = target_vacant.wing_division
                tv_head = target_vacant.head_office
                tv_hq = target_vacant.hq_field
                tv_sno = target_vacant.s_no
                
                target_vacant.branch_office = old_branch
                target_vacant.section_district = db_employee.section_district
                target_vacant.wing_division = db_employee.wing_division
                target_vacant.head_office = db_employee.head_office
                target_vacant.hq_field = db_employee.hq_field
                target_vacant.s_no = db_employee.s_no
                
                new_data['section_district'] = tv_section
                new_data['wing_division'] = tv_wing
                new_data['head_office'] = tv_head
                new_data['hq_field'] = tv_hq
                new_data['s_no'] = tv_sno
        else:
            if not is_overstaffed:
                # Scenario 3: Source Normal, Target No Vacant
                # Create a new Vacant seat in Source
                new_vacant = models.Employee(
                    code=db_employee.code,
                    s_no=db_employee.s_no,
                    officer_official=db_employee.officer_official,
                    hq_field=db_employee.hq_field,
                    head_office=db_employee.head_office,
                    wing_division=db_employee.wing_division,
                    section_district=db_employee.section_district,
                    branch_office=db_employee.branch_office,
                    bs=db_employee.bs,
                    post_name=db_employee.post_name,
                    cadre_type=db_employee.cadre_type,
                    name="Vacant",
                    post_status="Vacant",
                    employment_status="Active"
                )
                db.add(new_vacant)
            # Scenario 4: Source Overstaffed, Target No Vacant
            # Do nothing, Employee moves and Source loses a seat (fixes overstaffing)."""

content = content.replace(target_marker_start, replacement)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated crud.py with transfer logic.")
