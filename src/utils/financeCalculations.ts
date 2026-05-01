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
    const timestamp = item.receivedDate || item.date || item.updatedAt;
    if (!timestamp) return false;
    
    const d = new Date(timestamp);
    return d.getFullYear() === year && d.getMonth() === month;
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
            const start = inc.effectiveDate ? new Date(inc.effectiveDate) : new Date(0);
            const end = inc.expirationDate ? new Date(inc.expirationDate) : new Date(9999, 11, 31);
            const monthStart = new Date(year, month, 1);
            const monthEnd = new Date(year, month + 1, 0);

            const period = `${year}-${(month + 1).toString().padStart(2, '0')}`;
            const isIgnored = inc.ignoredPeriods?.includes(period);

            if (start <= monthEnd && end >= monthStart && !isIgnored) {
                totalMonthIncome += inc.amount;
            }
        }
    });

    // Calculate Expenses
    let totalMonthExpenses = 0;
    let totalAccountExpenses = 0;
    let totalCardExpenses = 0;

    expenses.filter(exp => isItemInMonthAndYear(exp, month, year)).forEach(exp => {
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
    recurringExpenses.forEach(re => {
        if (!re.active) return;
        const isPaid = expenses.some(e => e.recurringExpenseId === re.id && isItemInMonthAndYear(e, month, year));
        const isIgnored = re.ignoredPeriods?.includes(period);
        if (!isPaid && !isIgnored) {
            pendingFixedExpenses += re.amount;
        }
    });

    // Pending Savings
    let projectedTotalSavings = 0;
    savings.filter(s => (s.monthlySavingAmount || 0) > 0).forEach(s => {
        projectedTotalSavings += (s.monthlySavingAmount || 0);
    });
    const pendingSavings = Math.max(0, projectedTotalSavings - totalMonthAllocations);

    // If there's an override, apply override logic
    if (activeOverride) {
        const overrideTime = activeOverride.updatedAt;
        
        const incomeAfter = [...fixedIncomes, ...extraIncomes].filter(inc => {
            if (inc.type === 'rollover') return false;
            // Use updatedAt as the primary source of truth for "after override"
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

        // For manual overrides, the user wants the amount to be the starting "Available"
        // and only subtract/add what arises AFTER that point.
        // We don't subtract pending items here because they are assumed to be 
        // part of the user's manual estimation or will be subtracted when they "arise" (are paid).
        return {
            availableToSpend: activeOverride.amount + incomeAfter - expensesAfter - allocationsAfter,
            totalMonthIncome,
            totalMonthExpenses,
            totalAccountExpenses,
            totalCardExpenses,
            totalMonthAllocations,
            remanente,
            pendingFixedExpenses,
            pendingSavings,
            activeOverride
        };
    }

    return {
        availableToSpend: totalMonthIncome - totalMonthExpenses - totalMonthAllocations + remanente - pendingFixedExpenses - pendingSavings,
        totalMonthIncome,
        totalMonthExpenses,
        totalAccountExpenses,
        totalCardExpenses,
        totalMonthAllocations,
        remanente,
        pendingFixedExpenses,
        pendingSavings,
        activeOverride
    };
}
