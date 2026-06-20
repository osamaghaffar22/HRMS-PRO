import re

with open('frontend/src/app/(dashboard)/acr/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix setAcrFormData syntax
content = content.replace("e.target.value})}", "e.target.value}))}")

with open('frontend/src/app/(dashboard)/acr/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Syntax errors patched 2")
