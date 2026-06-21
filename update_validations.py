import sys

file_path = "frontend/src/app/(dashboard)/files/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update initial useState
content = content.replace(
    "receiving_date: '',",
    "receiving_date: new Date().toISOString().split('T')[0],",
    2  # Replace both in useState and in resetForm
)

# 2. Update handleEdit to fallback to today for receiving_date
content = content.replace(
    "receiving_date: file.receiving_date || '',",
    "receiving_date: file.receiving_date || new Date().toISOString().split('T')[0],"
)

# 3. Add validation to handleSubmit
submit_target = """  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();"""
submit_replacement = """  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const requiredFields = ['file_name', 'case_subject', 'reason', 'put_up', 'put_up_date', 'mark_branch', 'receiver_name', 'receiving_date'];
    const missing = requiredFields.filter(f => !formData[f as keyof typeof formData]);
    if (missing.length > 0) {
      alert("Please fill all required fields before saving. Only Return Date is optional.");
      return;
    }"""
content = content.replace(submit_target, submit_replacement)

# 4. Make all inputs required in HTML (optional but good for native validation)
# The user wants "tamam fields ko fill karna lazmi hai return date ke ilawa"
content = content.replace('<Input value={formData.reason}', '<Input required value={formData.reason}')
content = content.replace('<Input value={formData.put_up}', '<Input required value={formData.put_up}')
content = content.replace('<Input type="date" value={formData.put_up_date}', '<Input required type="date" value={formData.put_up_date}')
content = content.replace('<Input value={formData.mark_branch}', '<Input required value={formData.mark_branch}')
content = content.replace('<Input value={formData.receiver_name}', '<Input required value={formData.receiver_name}')
content = content.replace('<Input type="date" value={formData.receiving_date}', '<Input required type="date" value={formData.receiving_date}')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
