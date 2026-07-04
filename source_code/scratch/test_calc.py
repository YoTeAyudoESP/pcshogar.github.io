import json
import datetime

# Load data
with open(r"C:\Users\pablo\Dropbox\Economia Domestica\pcshogar_data.json", encoding="utf-8") as f:
    data = json.load(f)

fixed_incomes = data.get("incomes", [])
extra_incomes = data.get("incomes", [])
expenses = data.get("expenses", [])
allocations = data.get("allocations", [])
savings = data.get("savings", [])
recurring_expenses = data.get("recurring_expenses", [])
overrides = data.get("overrides", [])
cards = data.get("cards", [])

# Apply Migration to allocations in memory
for alloc in allocations:
    if alloc.get("type") == "automatic" and "budgetMonth" not in alloc:
        alloc_time = alloc.get("date") or alloc.get("updatedAt") or 0
        for inc in fixed_incomes:
            inc_time = inc.get("createdAt") or inc.get("updatedAt") or 0
            if abs(inc_time - alloc_time) < 60000:
                alloc["budgetMonth"] = inc.get("budgetMonth")
                alloc["budgetYear"] = inc.get("budgetYear")
                break

TARGET_YEAR = 2026
TARGET_MONTH = 5 # June

def is_item_in_month_and_year(item, month, year):
    if "budgetMonth" in item and "budgetYear" in item:
        return item["budgetMonth"] == month and item["budgetYear"] == year
    if "period" in item and isinstance(item["period"], str):
        parts = item["period"].split("-")
        y = int(parts[0])
        m = int(parts[1])
        return y == year and (m - 1) == month
    timestamp = item.get("receivedDate") or item.get("date") or item.get("updatedAt") or item.get("createdAt")
    if not timestamp:
        return False
    dt = datetime.datetime.fromtimestamp(timestamp / 1000.0, datetime.timezone.utc)
    return dt.year == year and dt.month - 1 == month

def is_recurring_active_in_month(frequency, payment_month, target_month, target_year, start_timestamp):
    if frequency in ('monthly', 'weekly'):
        return True
    
    start_date = datetime.datetime.fromtimestamp(start_timestamp / 1000.0, datetime.timezone.utc)
    start_month = start_date.month - 1
    start_year = start_date.year
    
    reference_month = (payment_month - 1) if payment_month is not None else start_month
    
    if frequency == 'yearly':
        return target_month == reference_month
        
    diff_months = (target_year - start_year) * 12 + (target_month - reference_month)
    if diff_months < 0:
        return False
        
    if frequency == 'bi-monthly': return diff_months % 2 == 0
    if frequency == 'quarterly': return diff_months % 3 == 0
    if frequency == 'four-monthly': return diff_months % 4 == 0
    if frequency == 'five-monthly': return diff_months % 5 == 0
    if frequency == 'semi-annually': return diff_months % 6 == 0
    if frequency == 'seven-monthly': return diff_months % 7 == 0
    if frequency == 'eight-monthly': return diff_months % 8 == 0
    if frequency == 'nine-monthly': return diff_months % 9 == 0
    if frequency == 'ten-monthly': return diff_months % 10 == 0
    if frequency == 'eleven-monthly': return diff_months % 11 == 0
    return False

def calculate(include_non_budget_savings=False):
    period = f"{TARGET_YEAR}-{(TARGET_MONTH + 1):02d}"
    month_start = datetime.datetime(TARGET_YEAR, TARGET_MONTH + 1, 1, tzinfo=datetime.timezone.utc).timestamp() * 1000
    if TARGET_MONTH == 11:
        month_end = datetime.datetime(TARGET_YEAR + 1, 1, 1, tzinfo=datetime.timezone.utc).timestamp() * 1000 - 1
    else:
        month_end = datetime.datetime(TARGET_YEAR, TARGET_MONTH + 2, 1, tzinfo=datetime.timezone.utc).timestamp() * 1000 - 1

    # Incomes
    extra_incomes_received = 0
    pending_fixed_incomes = 0
    total_projected_fixed_incomes = 0

    for inc in fixed_incomes:
        if inc.get("type") != "fixed":
            continue
        if not inc.get("active", True):
            continue
        start = inc.get("effectiveDate") or inc.get("createdAt") or 0
        end = inc.get("expirationDate") or 253402214400000
        ignored_periods = inc.get("ignoredPeriods") or []
        is_ignored = period in ignored_periods

        if start <= month_end and end >= month_start and not is_ignored:
            payment_month = inc.get("paymentMonth")
            if is_recurring_active_in_month(inc.get("frequency"), payment_month, TARGET_MONTH, TARGET_YEAR, start):
                total_projected_fixed_incomes += inc["amount"]
                
                is_confirmed = False
                for ei in extra_incomes:
                    if ei.get("type") == "extra" and ei.get("period") == period and ei.get("fixedIncomeId") == inc["id"]:
                        is_confirmed = True
                        break
                if not is_confirmed and inc.get("status") != "received":
                    pending_fixed_incomes += inc["amount"]

    for inc in extra_incomes:
        if inc.get("type") == "rollover":
            continue
        if inc.get("status") == "pending":
            continue
        if inc.get("excludeFromBudget"):
            continue
        if is_item_in_month_and_year(inc, TARGET_MONTH, TARGET_YEAR) and inc.get("type") == "extra":
            extra_incomes_received += inc["amount"]

    total_month_income = extra_incomes_received + pending_fixed_incomes

    # Expenses
    total_month_expenses = 0
    variable_expenses_paid = 0
    fixed_expenses_deviations = 0

    for exp in expenses:
        if is_item_in_month_and_year(exp, TARGET_MONTH, TARGET_YEAR):
            if exp.get("excludeFromBudget"):
                continue
            if exp.get("amount", 0) < 0 and exp.get("status") == "pending":
                continue
            if exp.get("linkedSavingGoalId"):
                continue
            
            total_month_expenses += exp["amount"]

            if exp.get("isFixed"):
                re_match = None
                for re in recurring_expenses:
                    if re["id"] == exp.get("recurringExpenseId"):
                        re_match = re
                        break
                if re_match:
                    fixed_expenses_deviations += (exp["amount"] - re_match["amount"])
                else:
                    variable_expenses_paid += exp["amount"]
            else:
                variable_expenses_paid += exp["amount"]

    # Projected Fixed Expenses
    total_projected_fixed_expenses = 0
    for re in recurring_expenses:
        if not re.get("active", True):
            continue
        start = re.get("createdAt") or re.get("updatedAt") or 0
        if start > month_end:
            continue
        ignored_periods = re.get("ignoredPeriods") or []
        is_ignored = period in ignored_periods

        if not is_ignored:
            payment_month = re.get("paymentMonth")
            if is_recurring_active_in_month(re["frequency"], payment_month, TARGET_MONTH, TARGET_YEAR, start):
                total_projected_fixed_expenses += re["amount"]

    # Allocations
    total_month_allocations = 0
    for alloc in allocations:
        if is_item_in_month_and_year(alloc, TARGET_MONTH, TARGET_YEAR) and alloc.get("type") in ('manual', 'automatic'):
            goal_match = None
            for s in savings:
                if s["id"] == alloc["goalId"]:
                    goal_match = s
                    break
            if not goal_match or include_non_budget_savings or goal_match.get("accountInBudget") != False:
                total_month_allocations += alloc["amount"]

    # Remanente
    remanente = 0
    for inc in extra_incomes:
        if inc.get("type") == "rollover" and is_item_in_month_and_year(inc, TARGET_MONTH, TARGET_YEAR):
            remanente += inc["amount"]

    # Pending Savings
    pending_savings = 0
    for s in savings:
        monthly_saving = s.get("monthlySavingAmount") or 0
        if monthly_saving > 0:
            if not include_non_budget_savings and s.get("accountInBudget") == False:
                continue
            
            start = s.get("createdAt") or 0
            if start <= month_end:
                # FIXED: Check if the linked fixed income is active OR has been confirmed (received) in this month
                is_linked_income_active = True
                linked_id = s.get("linkedFixedIncomeId")
                if linked_id:
                    linked_income = None
                    for inc in fixed_incomes:
                        if inc["id"] == linked_id:
                            linked_income = inc
                            break
                    if linked_income and linked_income.get("active", True):
                        # Template active check
                        inc_start = linked_income.get("effectiveDate") or linked_income.get("createdAt") or 0
                        inc_end = linked_income.get("expirationDate") or 253402214400000
                        ignored_periods = linked_income.get("ignoredPeriods") or []
                        is_ignored = period in ignored_periods
                        is_template_active = False
                        if inc_start <= month_end and inc_end >= month_start and not is_ignored:
                            payment_month = linked_income.get("paymentMonth")
                            is_template_active = is_recurring_active_in_month(linked_income["frequency"], payment_month, TARGET_MONTH, TARGET_YEAR, inc_start)
                        
                        # Confirmed income check
                        is_confirmed = False
                        for ei in extra_incomes:
                            if ei.get("type") == "extra" and ei.get("fixedIncomeId") == linked_id and is_item_in_month_and_year(ei, TARGET_MONTH, TARGET_YEAR):
                                is_confirmed = True
                                break
                        
                        is_linked_income_active = is_template_active or is_confirmed
                    else:
                        is_linked_income_active = False

                if is_linked_income_active:
                    # Allocations for this hucha in this month
                    allocs_for_hucha = 0
                    for alloc in allocations:
                        if alloc["goalId"] == s["id"] and is_item_in_month_and_year(alloc, TARGET_MONTH, TARGET_YEAR) and alloc.get("type") in ('manual', 'automatic'):
                            allocs_for_hucha += alloc["amount"]
                    pending_savings += max(0, monthly_saving - allocs_for_hucha)

    available_to_spend = (extra_incomes_received + pending_fixed_incomes) - (
        total_projected_fixed_expenses + variable_expenses_paid + fixed_expenses_deviations + total_month_allocations + pending_savings
    ) + remanente

    print(f"Option Include Non-Budget Savings = {include_non_budget_savings}")
    print(f"  Total Incomes: {total_month_income:.2f}")
    print(f"  Projected Fixed Expenses: {total_projected_fixed_expenses:.2f}")
    print(f"  Month Allocations: {total_month_allocations:.2f}")
    print(f"  Pending Savings: {pending_savings:.2f}")
    print(f"  Available to Spend: {available_to_spend:.2f}")

print("=== CALCULATIONS FOR JUNE 2026 WITH MIGRATION AND FIXED LOGIC ===")
calculate(include_non_budget_savings=True)
