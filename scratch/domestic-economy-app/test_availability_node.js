// Mocked calculateMonthAvailability logic
const isRecurringExpenseDue = (expense, month) => {
    return true; // Simplified for test
};

const isRecurringExpenseConfirmed = (expenseId, month, year, paidExpenses) => {
    return false; // Simplified
};

const calculateDetailedAvailability = (year, month, data) => {
    const { extraIncomes, fixedIncomes, expenses, allocations, recurringExpenses, rolloverIncomes } = data;

    const isPastMonth = (year < new Date().getFullYear()) || (year === new Date().getFullYear() && month < new Date().getMonth());

    const pendingFixedExpenses = isPastMonth ? 0 : recurringExpenses
        .filter(rec => isRecurringExpenseDue(rec, month) && !isRecurringExpenseConfirmed(rec.id, month, year, expenses))
        .reduce((sum, rec) => sum + Number(rec.amount), 0);

    const projectedFixedIncomes = isPastMonth ? [] : fixedIncomes;

    const projectedFixedTotal = projectedFixedIncomes.reduce((sum, inc) => sum + Number(inc.amount), 0);

    const monthConfirmedExpenses = 0;
    const monthAllocations = 0;
    const rolloverTotal = 0;
    const extraIncomeTotal = 0;
    const confirmedFixedTotal = 0;

    const monthIncome = extraIncomeTotal + projectedFixedTotal + confirmedFixedTotal + rolloverTotal;
    const automaticSavings = 0;

    const baseAmount = monthIncome - monthConfirmedExpenses - monthAllocations - pendingFixedExpenses - automaticSavings;

    return {
        isPastMonth,
        available: baseAmount,
        pendingFixedExpenses,
        projectedFixedTotal
    };
};

const expenses = [];
const extraIncomes = [];
const rolloverIncomes = [];
const allocations = [];
const recurringExpenses = [
    { id: 'rec1', amount: 500 }
];
const fixedIncomes = [
    { id: 'inc1', amount: 2000 }
];

const currentMonth = new Date().getMonth();
const currentYear = new Date().getFullYear();

let prevMonth = currentMonth - 1;
let prevYear = currentYear;
if (prevMonth < 0) {
    prevMonth = 11;
    prevYear -= 1;
}

console.log("Current Date:", new Date());
console.log("Testing Past Month:", prevMonth, prevYear);

const resultPast = calculateDetailedAvailability(prevYear, prevMonth, {
    extraIncomes, fixedIncomes, expenses, allocations, recurringExpenses, rolloverIncomes
});
console.log('Result for PAST month:', resultPast);

const resultCurrent = calculateDetailedAvailability(currentYear, currentMonth, {
    extraIncomes, fixedIncomes, expenses, allocations, recurringExpenses, rolloverIncomes
});
console.log('Result for CURRENT month:', resultCurrent);
