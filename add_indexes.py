import os

file_path = 'd:/HRMS Pro/backend/app/models.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = [
    ('cnic = Column(String)', 'cnic = Column(String, index=True)'),
    ('name = Column(String)', 'name = Column(String, index=True)'),
    ('branch_office = Column(String)', 'branch_office = Column(String, index=True)'),
    ('bs = Column(String)', 'bs = Column(String, index=True)'),
    ('post_name = Column(String)', 'post_name = Column(String, index=True)'),
    ('employment_status = Column(String, default="Active")', 'employment_status = Column(String, default="Active", index=True)'),
    ('officer_official = Column(String)', 'officer_official = Column(String, index=True)'),
    ('hq_field = Column(String)', 'hq_field = Column(String, index=True)'),
    ('status = Column(String, default="Active")', 'status = Column(String, default="Active", index=True)'),
    ('post_status = Column(String)', 'post_status = Column(String, index=True)'),
    ('target_office = Column(String)', 'target_office = Column(String, index=True)'),
]

for old, new in replacements:
    content = content.replace(old, new)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Added indexes to models.py')
