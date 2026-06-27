import requests
import json

base_url = 'http://localhost:8000'
# 1. Login
response = requests.post(f"{base_url}/api/auth/token", data={"username": "admin", "password": "password"})
token = response.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# 2. Search
name = "Muhammad Samiullah"
res = requests.get(f"{base_url}/api/employees?search={name}", headers=headers)
print("Status:", res.status_code)
data = res.json()
print("Count:", len(data))
if len(data) > 0:
    print("Found:", data[0].get('name'))
