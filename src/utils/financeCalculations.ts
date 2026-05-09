import type { 
    Expense, SavingGoal, SavingAllocation, 
    RecurringExpense, MonthOverride, CreditCard
} from '../types/finance';
import type { Income, FixedIncome } from '../types/income';

export function isItemInMonthAndYear(item: any, month: number, year: number) {
    if (item.budgetMonth !== undefined && item.budgetYear !== undefined) {
        return item.budgetMonth === month && item.budgetYear === year;
    }
    if (item.period && typeof item.period === 'string') {
        const [y, m] = item.period.split('-').map(Number);
        return y === year && (m - 1) === month;
    }
    const timestamp = item.receivedDate || item.date || item.updatedAt || item.createdAt;
    if (!timestamp) return false;
    
    const d = new Date(timestamp);
    return d.getFullYear() === year && d.getMonth() === month;
}

export function isRecurringActiveInMonth(
    frequency: string,
    paymentMonth: number | undefined,
    targetMonth: number, // 0-indexed
    targetYear: number,
    startTimestamp: number
) {
    const startDate = new Date(startTimestamp);
    const startMonth = startDate.getMonth();
    const startYear = startDate.getFullYear();

    if (frequency === 'monthly' || frequency === 'weekly') return true;

    // For frequencies that depend on a specific month
    const referenceMonth = (paymentMonth !== undefined) ? (paymentMonth - 1) : startMonth;
    
    if (frequency === 'yearly') {
        return targetMonth === referenceMonth;
    }

    const diffMonths = (targetYear - startYear) * 12 + (targetMonth - referenceMonth);
    if (diffMonths < 0) return false;

    if (frequency === 'bi-monthly') return diffMonths % 2 === 0;
    if (frequency === 'quarterly') return diffMonths % 3 === 0;
    if (frequency === 'semi-annually') return diffMonths % 6 === 0;

    return false;
}

export function calculateAvailableBalanceForMonth(
    year: number,
    month: number,
    data: {
        fixedIncomes: FixedIncome[],
        extraIncomes: Income[],
        expenses: Expense[],
        allocations: SavingAllocation[],
        savings: SavingGoal[],
        recurringExpenses: RecurringExpense[],
        overrides: MonthOverride[],
        cards: CreditCard[]
    }
) {
    const { 
        fixedIncomes, extraIncomes, expenses, allocations, 
        savings, recurringExpenses, overrides, cards
    } = data;

    // Calculate Monthly Income
    let totalMonthIncome = 0;
    [...fixedIncomes, ...extraIncomes].forEach(inc => {
        if (inc.type === 'rollover') return;

        if (inc.type === 'extra') {
            if (isItemInMonthAndYear(inc, month, year)) {
                totalMonthIncome += inc.amount;
            }
        } else {
            const start = inc.effectiveDate || inc.createdAt || 0;
            const end = inc.expirationDate || new Date(9999, 11, 31).getTime();
            const monthStart = new Date(year, month, 1).getTime();
            const monthEnd = new Date(year, month + 1, 0).getTime();

            const period = `${year}-${(month + 1).toString().padStart(2, '0')}`;
            const isIgnored = inc.ignoredPeriods?.includes(period);

            if (start <= monthEnd && end >= monthStart && !isIgnored) {
                if (isRecurringActiveInMonth(inc.frequency, inc.paymentMonth, month, year, start)) {
                    totalMonthIncome += inc.amount;
                }
            }
        }
    });

    // Calculate Expenses
    let totalMonthExpenses = 0;
    let totalAccountExpenses = 0;
    let totalCardExpenses = 0;

    expenses
        .filter(exp => isItemInMonthAndYear(exp, month, year))
        .filter(exp => !exp.excludeFromBudget)
        .forEach(exp => {
            if (exp.linkedSavingGoalId) return;
            totalMonthExpenses += exp.amount;

        const method = exp.paymentMethod;
        if (method.type === 'account' || method.type === 'cash') {
            totalAccountExpenses += exp.amount;
        } else if (method.type === 'card') {
            const card = cards.find(c => c.id === method.cardId);
            if (card && card.type === 'debit') {
                totalAccountExpenses += exp.amount;
            } else {
                totalCardExpenses += exp.amount;
            }
        }
    });

    // Calculate Allocations
    let totalMonthAllocations = 0;
    allocations.filter(alloc => isItemInMonthAndYear(alloc, month, year) && (alloc.type === 'manual' || alloc.type === 'automatic')).forEach(alloc => {
        totalMonthAllocations += alloc.amount;
    });

    // Remanente
    let remanente = 0;
    extraIncomes.filter(inc => inc.type === 'rollover' && isItemInMonthAndYear(inc, month, year)).forEach(inc => {
        remanente += inc.amount;
    });

    // Active Override
    const overrideId = `${year}-${(month + 1).toString().padStart(2, '0')}`;
    const activeOverride = overrides.find(o => o.id === overrideId);

    // Pending Fixed Expenses
    const period = `${year}-${(month + 1).toString().padStart(2, '0')}`;
    let pendingFixedExpenses = 0;
    const monthStart = new Date(year, month, 1).getTime();
    const monthEnd = new Date(year, month + 1, 0).getTime();

    recurringExpenses.forEach(re => {
        if (!re.active) return;
        
        // Date range check (if updatedAt or createdAt can be used as start)
        const start = re.updatedAt || 0;
        if (start > monthEnd) return;

        const isPaid = expenses.some(e => e.recurringExpenseId === re.id && isItemInMonthAndYear(e, month, year));
        const isIgnored = re.ignoredPeriods?.includes(period);
        
        if (!isPaid && !isIgnored) {
            if (isRecurringActiveInMonth(re.frequency, re.paymentMonth, month, year, start)) {
                pendingFixedExpenses += re.amount;
            }
        }
    });

    // Pending Savings
    let projectedTotalSavings = 0;
    savings.filter(s => (s.monthlySavingAmount || 0) > 0).forEach(s => {
        projectedTotalSavings += (s.monthlySavingAmount || 0);
    });
    const pendingSavings = Math.max(0, projectedTotalSavings - totalMonthAllocations);

    // Pending Fixed Incomes (expected but not received)
    let pendingFixedIncomes = 0;
    fixedIncomes.forEach(inc => {
        const start = inc.effectiveDate || inc.createdAt || 0;
        const end = inc.expirationDate || new Date(9999, 11, 31).getTime();
        const isIgnored = inc.ignoredPeriods?.includes(period);

        if (start <= monthEnd && end >= monthStart && !isIgnored) {
            if (isRecurringActiveInMonth(inc.frequency, inc.paymentMonth, month, year, start)) {
                // Check if received in this month
                const isReceived = extraIncomes.some(ei => ei.period === period && (ei as any).fixedIncomeId === inc.id);
                // Note: The extraIncomes check might need to be more robust depending on how we link them.
                // For now, let's use the status or a linked ID if available.
                // If it's not marked as received, add to pending.
                if (inc.status === 'pending') {
                    pendingFixedIncomes += inc.amount;
                }
            }
        }
    });

    const summary = {
        availableToSpend: totalMonthIncome - totalMonthExpenses - totalMonthAllocations + remanente - pendingFixedExpenses - pendingSavings,
        totalMonthIncome,
        totalMonthExpenses,
        totalAccountExpenses,
        totalCardExpenses,
        totalMonthAllocations,
        remanente,
        pendingFixedExpenses,
        pendingFixedIncomes,
        pendingSavings,
        activeOverride
    };

    if (activeOverride) {
        const overrideTime = activeOverride.updatedAt;
        
        const incomeAfter = [...fixedIncomes, ...extraIncomes].filter(inc => {
            if (inc.type === 'rollover') return false;
            const rawTime = inc.updatedAt || inc.effectiveDate || (inc as any).date || 0;
            const t = Number(rawTime);
            return isItemInMonthAndYear(inc, month, year) && t > overrideTime;
        }).reduce((sum, inc) => sum + inc.amount, 0);

        const expensesAfter = expenses.filter(exp => {
            if (exp.linkedSavingGoalId) return false;
            const rawTime = exp.updatedAt || exp.date || 0;
            const t = Number(rawTime);
            return isItemInMonthAndYear(exp, month, year) && t > overrideTime;
        }).reduce((sum, exp) => sum + exp.amount, 0);

        const allocationsAfter = allocations.filter(alloc => {
            const rawTime = alloc.updatedAt || alloc.date || 0;
            const t = Number(rawTime);
            return isItemInMonthAndYear(alloc, month, year) && t > overrideTime && (alloc.type === 'manual' || alloc.type === 'automatic');
        }).reduce((sum, alloc) => sum + alloc.amount, 0);

        return {
            ...summary,
            availableToSpend: activeOverride.amount + incomeAfter - expensesAfter - allocationsAfter,
        };
    }

    return summary;
}
