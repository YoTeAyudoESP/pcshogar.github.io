
import fs from 'fs';

const path = 'C:\\Users\\pablo\\Dropbox\\Economia Domestica\\pcshogar_data.json';
const raw = fs.readFileSync(path, 'utf8');
const data = JSON.parse(raw);

console.log('Keys in JSON:', Object.keys(data));

const year = 2026;
const month = 4; // May
const period = '2026-05';

console.log('--- ANALYSIS FOR MAY 2026 ---');

// 1. Overrides
const overrides = data.overrides || data.monthOverrides || [];
const override = overrides.find(o => o.year === year && o.month === month);
console.log('Override:', override);

// 2. Incomes
const incomes = data.incomes?.filter(i => i.period === period);
const totalIncomes = incomes?.reduce((sum, i) => sum + i.amount, 0) || 0;
console.log('Confirmed Incomes:', totalIncomes, '(' + (incomes?.length || 0) + ' items)');

// 3. Fixed Incomes (Masters)
const fixedIncomes = data.fixedIncomes || [];
const projectedFixedIncomes = fixedIncomes.reduce((sum, fi) => {
    if (fi.ignoredPeriods?.includes(period)) return sum;
    return sum + fi.amount;
}, 0);
console.log('Projected Fixed Incomes (Pending):', projectedFixedIncomes);

// 4. Extra Incomes
const extraIncomes = data.extraIncomes || [];
const projectedExtraIncomes = extraIncomes.reduce((sum, ei) => {
    if (ei.year === year && ei.month === month) return sum + ei.amount;
    return sum;
}, 0);
console.log('Projected Extra Incomes:', projectedExtraIncomes);

// 5. Expenses
const expenses = data.expenses?.filter(e => e.period === period);
const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
console.log('Confirmed Fixed Expenses (Paid):', totalExpenses, '(' + (expenses?.length || 0) + ' items)');

// 6. Recurring Expenses (Masters)
const recurringExpenses = data.recurringExpenses || [];
const projectedRecurring = recurringExpenses.reduce((sum, re) => {
    if (re.ignoredPeriods?.includes(period)) return sum;
    return sum + re.amount;
}, 0);
console.log('Projected Fixed Expenses (Pending):', projectedRecurring);

// 7. Savings
const savings = data.savings || [];
const projectedSavings = savings.reduce((sum, s) => sum + (s.monthlyTarget || 0), 0);
console.log('Projected Savings Target:', projectedSavings);

// 8. Rollover
const closings = data.closings || [];
const lastClosing = closings.find(c => c.year === 2026 && c.month === 3);
console.log('April Closing:', lastClosing);

// Calculation Logic (Current)
const incomePool = totalIncomes + projectedFixedIncomes + projectedExtraIncomes;
const expensePool = totalExpenses + projectedRecurring;

const available = incomePool - expensePool - projectedSavings + (override?.amount || 0);
console.log('\n--- CALCULATION ---');
console.log('Income Pool:', incomePool);
console.log('Expense Pool:', expensePool);
console.log('Savings:', projectedSavings);
console.log('Override:', override?.amount || 0);
console.log('Calculated Available:', available);
