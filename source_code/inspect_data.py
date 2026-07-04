import json

with open(r"C:\Users\pablo\Dropbox\Economia Domestica\pcshogar_data.json", encoding="utf-8") as f:
    data = json.load(f)

print("--- SAVINGS GOALS (HUCHAS) ---")
for s in data.get("savings", []):
    print(f"ID: {s.get('id')}, Name: {s.get('name')}, Monthly: {s.get('monthlySavingAmount')}, Linked: {s.get('linkedFixedIncomeId')}, AccountInBudget: {s.get('accountInBudget')}, Virtual: {s.get('isVirtual')}")

print("\n--- FIXED INCOMES ---")
for inc in data.get("incomes", []):
    if inc.get("type") == "fixed":
        print(f"ID: {inc.get('id')}, Name: {inc.get('name')}, Amount: {inc.get('amount')}, Active: {inc.get('active')}, Exclude: {inc.get('excludeFromBudget')}")

print("\n--- MONTH OVERRIDES ---")
for o in data.get("overrides", []):
    print(o)

print("\n--- RECURRING EXPENSES ---")
for r in data.get("recurringExpenses", []):
    print(f"ID: {r.get('id')}, Description: {r.get('description')}, Amount: {r.get('amount')}, Active: {r.get('active')}")
