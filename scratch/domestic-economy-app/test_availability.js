import { calculateDetailedAvailability } from './src/utils/financeUtils.js';

const expenses = [];
const extraIncomes = [];
const rolloverIncomes = [];
const allocations = [];
const recurringExpenses = [
    {
        id: 'rec1',
        description: 'Netflix',
        amount: 50,
        active: true,
        frequency: 'monthly'
    }
];

const fixedIncomes = [
    {
        id: 'inc1',
        name: 'Salary',
        amount: 2000,
        active: true
    }
];

// Current month is (say) March (2). We calculate for February (1).
const result = calculateDetailedAvailability(2026, 1, {
    extraIncomes,
    fixedIncomes,
    expenses,
    allocations,
    recurringExpenses,
    rolloverIncomes
});

console.log('Result for past month (Feb):', result);

const resultCurrent = calculateDetailedAvailability(2026, 2, {
    extraIncomes,
    fixedIncomes,
    expenses,
    allocations,
    recurringExpenses,
    rolloverIncomes
});

console.log('Result for current month (Mar):', resultCurrent);
