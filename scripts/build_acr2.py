import re

with open("tmp_acr_head.tsx", "r", encoding="utf-8") as f:
    old = f.read()

with open("frontend/src/app/(dashboard)/acr/page.tsx", "r", encoding="utf-8") as f:
    new = f.read()

# Grab the new Form block
form_start = new.find('<TabsContent value="Form"')
form_end = new.find('{/* --- OFFICERS TAB --- */}')
new_form = new[form_start:form_end]

# Grab the old Form block
old_form_start = old.find('<TabsContent value="Form"')
old_form_end = old.find('<TabsContent value={category === \'Form\' ? \'Officer\' : category}')
old_form = old[old_form_start:old_form_end]

# Merge the UI
merged_ui = old.replace(old_form, new_form)

# Now, we must update the state variables and helper functions at the top.
# We will inject the new Form states right after "const [designationFilter, setDesignationFilter] = useState<string[]>([]);"
new_states_start = new.find('// Form States')
new_states_end = new.find('// --- Effects ---')
new_states = new[new_states_start:new_states_end]

# Inject states into merged_ui
state_injection_point = merged_ui.find('const [designationFilter')
state_injection_end = merged_ui.find('\n', state_injection_point) + 1
merged_ui = merged_ui[:state_injection_end] + "\n" + new_states + "\n" + merged_ui[state_injection_end:]

# Inject mutations and effects
mutations_start = new.find('// --- Mutations ---')
mutations_end = new.find('// --- Navigation Logic ---')
new_mutations = new[mutations_start:mutations_end]

nav_logic_start = new.find('// --- Navigation Logic ---')
nav_logic_end = new.find('const calculateGaps')
new_nav_logic = new[nav_logic_start:nav_logic_end]

# We must replace old handleFormSave and add these.
old_mutations_point = merged_ui.find('const handleExportExcel')

merged_ui = merged_ui[:old_mutations_point] + new_mutations + "\n" + new_nav_logic + "\n" + merged_ui[old_mutations_point:]

# Wait, `handleFormSave` is duplicated. We will remove the old `handleFormSave`.
# We'll also remove the old `addPeriod` since the new one uses `addPeriodMutation.mutate`... Wait, the old table uses `addPeriod`. Let's keep `addPeriod` for the old table, and the new form uses `addPeriodMutation`.

# Now replace the entire file content.
with open("frontend/src/app/(dashboard)/acr/page.tsx", "w", encoding="utf-8") as f:
    f.write(merged_ui)
