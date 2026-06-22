with open('app/api/routes_extra.py', 'r') as f:
    data = f.read()

data = data.replace('HRPool', 'Extra').replace('hr_pool', 'extra')

with open('app/api/routes_extra.py', 'w') as f:
    f.write(data)
