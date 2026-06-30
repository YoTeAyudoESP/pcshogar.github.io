
import fs from 'fs';

const path = 'C:\\Users\\pablo\\Dropbox\\Economia Domestica\\pcshogar_data.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const year = 2026;
const month = 4; // May
const period = '2026-05';

function isItemInMonthAndYear(item, m, y) {
    if (item.period === period) return true;
    const timestamp = item.date || item.updatedAt || item.createdAt;
    if (!timestamp) return false;
    const d = new Date(timestamp);
    return d.getFullYear() === y && d.getMonth() === m;
}

const override = data.overrides.find(o => o.id === period);
const overrideTime = override ? override.updatedAt : 0;

console.log('Override Amount:', override?.amount);
console.log('Override Time:', new Date(overrideTime).toISOString());

const extraIncomeAfter = data.incomes.filter(inc => {
    if (inc.type === 'rollover') return false;
    const t = inc.updatedAt || inc.effectiveDate || inc.date || 0;
    return isItemInMonthAndYear(inc, month, year) && t > overrideTime;
});
console.log('Extra Incomes After:', extraIncomeAfter.reduce((s, i) => s + i.amount, 0));

const varExpensesAfter = data.expenses.filter(exp => {
    if (exp.linkedSavingGoalId || exp.isFixed || exp.excludeFromBudget) return false;
    const t = exp.updatedAt || exp.date || 0;
    return isItemInMonthAndYear(exp, month, year) && t > overrideTime;
});
console.log('Var Expenses After:', varExpensesAfter.reduce((s, e) => s + e.amount, 0));

const fixedDeviationsAfter = data.expenses.filter(exp => {
    if (!exp.isFixed || exp.excludeFromBudget) return false;
    const t = exp.updatedAt || exp.date || 0;
    return isItemInMonthAndYear(exp, month, year) && t > overrideTime;
}).reduce((sum, exp) => {
    const re = data.recurring_expenses.find(r => r.id === exp.recurringExpenseId);
    return sum + (exp.amount - (re?.amount || 0));
}, 0);
console.log('Fixed Deviations After:', fixedDeviationsAfter);

const allocationsAfter = data.allocations.filter(alloc => {
    const t = alloc.updatedAt || alloc.date || 0;
    return isItemInMonthAndYear(alloc, month, year) && t > overrideTime && (alloc.type === 'manual' || alloc.type === 'automatic');
});
console.log('Allocations After:', allocationsAfter.reduce((s, a) => s + a.amount, 0));

// Pending Fixed Expenses
let pendingFixedExpenses = 0;
data.recurring_expenses.forEach(re => {
    if (!re.active) return;
    const isIgnored = re.ignoredPeriods?.includes(period);
    if (!isIgnored) {
        const isPaid = data.expenses.some(e => e.recurringExpenseId === re.id && isItemInMonthAndYear(e, month, year));
        if (!isPaid) {
            pendingFixedExpenses += re.amount;
            console.log('Pending:', re.description, re.amount);
        }
    }
});
console.log('Total Pending Fixed Expenses:', pendingFixedExpenses);

// Pending Savings
const projectedTotalSavings = data.savings.reduce((sum, s) => sum + (s.monthlySavingAmount || 0), 0);
const totalAllocations = data.allocations.filter(a => isItemInMonthAndYear(a, month, year) && (a.type === 'manual' || a.type === 'automatic')).reduce((s, a) => s + a.amount, 0);
const pendingSavings = Math.max(0, projectedTotalSavings - totalAllocations);
console.log('Projected Savings:', projectedTotalSavings);
console.log('Total Allocations (all month):', totalAllocations);
console.log('Pending Savings:', pendingSavings);

const final = (override?.amount || 0) + 0 - varExpensesAfter.reduce((s, e) => s + e.amount, 0) - fixedDeviationsAfter - allocationsAfter.reduce((s, a) => s + a.amount, 0) - pendingFixedExpenses - pendingSavings;
console.log('\nFINAL CALCULATED:', final);
