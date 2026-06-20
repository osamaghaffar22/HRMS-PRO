import re

with open('frontend/src/app/(dashboard)/employees/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Personal Info
content = content.replace("{ key: 'dob', label: 'Date of Birth' }", "{ key: 'dob', label: 'Date of Birth', type: 'date' }")

# Service Details
content = content.replace("{ key: 'entry_govt', label: 'Govt Entry Date' }", "{ key: 'entry_govt', label: 'Govt Entry Date', type: 'date' }")
content = content.replace("{ key: 'joining_date', label: 'Appointment Date' }", "{ key: 'joining_date', label: 'Appointment Date', type: 'date' }")
content = content.replace("{ key: 'probation_till_date', label: 'Probation Till Date' }", "{ key: 'probation_till_date', label: 'Probation Till Date', type: 'date' }")

# Posting Location
content = content.replace("{ key: 'joining_present_post', label: 'Joined Present Post' }", "{ key: 'joining_present_post', label: 'Joined Present Post', type: 'date' }")
content = content.replace("{ key: 'place_of_posting', label: 'Current Station DOJ' }", "{ key: 'place_of_posting', label: 'Current Station DOJ', type: 'date' }")

with open('frontend/src/app/(dashboard)/employees/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Dates updated")
