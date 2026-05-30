import json

with open(r"C:\Users\pablo\Dropbox\Economia Domestica\pcshogar_data.json", encoding="utf-8") as f:
    data = json.load(f)

incomes = data.get("incomes", [])
allocations = data.get("allocations", [])

repaired = 0
for alloc in allocations:
    if alloc.get("type") == "automatic" and "budgetMonth" not in alloc:
        # Find matching income
        matching_income = None
        alloc_time = alloc.get("date") or alloc.get("updatedAt") or 0
        for inc in incomes:
            inc_time = inc.get("createdAt") or inc.get("updatedAt") or 0
            if abs(inc_time - alloc_time) < 60000: # 60 seconds
                matching_income = inc
                break
        
        if matching_income:
            repaired += 1
            print(f"Repaired allocation: {alloc['id']}")
            print(f"  Description: {alloc.get('description')}")
            print(f"  Matched with income: {matching_income.get('name')} ({matching_income.get('amount')} EUR)")
            print(f"  Mapped to budget month: {matching_income.get('budgetMonth')}, year: {matching_income.get('budgetYear')}")

print(f"Total repaired: {repaired}")
