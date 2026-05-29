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
    if (frequency === 'four-monthly') return diffMonths % 4 === 0;
    if (frequency === 'five-monthly') return diffMonths % 5 === 0;
    if (frequency === 'semi-annually') return diffMonths % 6 === 0;
    if (frequency === 'seven-monthly') return diffMonths % 7 === 0;
    if (frequency === 'eight-monthly') return diffMonths % 8 === 0;
    if (frequency === 'nine-monthly') return diffMonths % 9 === 0;
    if (frequency === 'ten-monthly') return diffMonths % 10 === 0;
    if (frequency === 'eleven-monthly') return diffMonths % 11 === 0;

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
        fixedIncomes = [], 
        extraIncomes = [], 
        expenses = [], 
        allocations = [], 
        savings = [], 
        recurringExpenses = [], 
        overrides = [], 
        cards = [] 
    } = data || {};

    // Calculate Incomes
    let extraIncomesReceived = 0;
    let pendingFixedIncomes = 0;
    let totalProjectedFixedIncomes = 0; // Total that should happen

    const period = `${year}-${(month + 1).toString().padStart(2, '0')}`;
    const monthStart = new Date(year, month, 1).getTime();
    const monthEnd = new Date(year, month + 1, 0).getTime();

    // 1. Process Fixed Incomes (Templates)
    fixedIncomes.forEach(inc => {
        if (!inc.active) return;
        const start = inc.effectiveDate || inc.createdAt || 0;
        const end = inc.expirationDate || new Date(9999, 11, 31).getTime();
        const isIgnored = inc.ignoredPeriods?.includes(period);

        if (start <= monthEnd && end >= monthStart && !isIgnored) {
            if (isRecurringActiveInMonth(inc.frequency, inc.paymentMonth, month, year, start)) {
                totalProjectedFixedIncomes += inc.amount;
                
                // Check if actually confirmed/received
                const isConfirmed = extraIncomes.some(ei => ei.period === period && (ei as any).fixedIncomeId === inc.id);
                if (!isConfirmed && inc.status !== 'received') {
                    pendingFixedIncomes += inc.amount;
                }
            }
        }
    });

    // 2. Process Extra Incomes (Actual records)
    extraIncomes.forEach(inc => {
        if (inc.type === 'rollover') return;
        if (inc.status === 'pending') return;
        if (inc.excludeFromBudget) return;
        if (isItemInMonthAndYear(inc, month, year)) {
            extraIncomesReceived += inc.amount;
        }
    });

    const totalMonthIncome = extraIncomesReceived + pendingFixedIncomes;

    // Calculate Expenses
    let totalMonthExpenses = 0;
    let totalAccountExpenses = 0;
    let totalCardExpenses = 0;
    let totalCashExpenses = 0;
    let variableExpensesPaid = 0;
    let fixedExpensesDeviations = 0;

    expenses
        .filter(exp => isItemInMonthAndYear(exp, month, year))
        .filter(exp => !exp.excludeFromBudget)
        .filter(exp => !(exp.amount < 0 && exp.status === 'pending'))
        .forEach(exp => {
            if (exp.linkedSavingGoalId) return;
            totalMonthExpenses += exp.amount;

            if (exp.isFixed) {
                const re = recurringExpenses.find(r => r.id === exp.recurringExpenseId);
                if (re) {
                    fixedExpensesDeviations += (exp.amount - re.amount);
                } else {
                    // If it's fixed but no recurring record found, treat it as a variable expense for budget purposes
                    variableExpensesPaid += exp.amount;
                }
            } else {
                variableExpensesPaid += exp.amount;
            }

            const method = exp.paymentMethod || { type: 'cash' };
            if (method.type === 'cash') {
                totalCashExpenses += exp.amount;
            } else if (method.type === 'account') {
                totalAccountExpenses += exp.amount;
            } else if (method.type === 'card') {
                const card = (cards || []).find(c => c.id === (method as any).cardId);
                if (card && card.type === 'debit') {
                    totalAccountExpenses += exp.amount;
                } else {
                    totalCardExpenses += exp.amount;
                }
            }
        });

    // Calculate Projected Fixed Expenses
    let totalProjectedFixedExpenses = 0;
    let pendingFixedExpenses = 0;

    recurringExpenses.forEach(re => {
        if (!re.active) return;
        const start = re.createdAt || re.updatedAt || 0;
        if (start > monthEnd) return;
        const isIgnored = re.ignoredPeriods?.includes(period);
        
        if (!isIgnored && isRecurringActiveInMonth(re.frequency, re.paymentMonth, month, year, start)) {
            totalProjectedFixedExpenses += re.amount;
            
            // For the 'Pending' report specifically
            const isPaid = expenses.some(e => e.recurringExpenseId === re.id && isItemInMonthAndYear(e, month, year));
            if (!isPaid) {
                pendingFixedExpenses += re.amount;
            }
        }
    });

    // Calculate Allocations
    let totalMonthAllocations = 0;
    allocations
        .filter(alloc => isItemInMonthAndYear(alloc, month, year) && (alloc.type === 'manual' || alloc.type === 'automatic'))
        .forEach(alloc => {
            const goal = savings.find(s => s.id === alloc.goalId);
            if (!goal || goal.accountInBudget !== false) {
                totalMonthAllocations += alloc.amount;
            }
        });

    // Remanente
    let remanente = 0;
    extraIncomes.filter(inc => inc.type === 'rollover' && isItemInMonthAndYear(inc, month, year)).forEach(inc => {
        remanente += inc.amount;
    });

    // Projected Savings
    let projectedTotalSavings = 0;
    savings
        .filter(s => (s.monthlySavingAmount || 0) > 0 && s.accountInBudget !== false)
        .forEach(s => {
            const start = s.createdAt || 0;
            if (start <= monthEnd) {
                projectedTotalSavings += (s.monthlySavingAmount || 0);
            }
        });
    const pendingSavings = Math.max(0, projectedTotalSavings - totalMonthAllocations);

    // Active Override
    const overrideId = `${year}-${(month + 1).toString().padStart(2, '0')}`;
    const activeOverride = overrides.find(o => o.id === overrideId);

    // Formula: Total Received (Extra + Confirmed Fixed) + Pending Fixed - (Projected Fixed Expenses + Variable Paid + Deviations + Allocations + Projected Savings) + Remanente
    const availableToSpend = 
        (extraIncomesReceived + pendingFixedIncomes) 
        - (totalProjectedFixedExpenses + variableExpensesPaid + fixedExpensesDeviations + totalMonthAllocations + pendingSavings)
        + remanente;

    const summary = {
        availableToSpend,
        totalMonthIncome,
        totalMonthExpenses,
        totalAccountExpenses,
        totalCardExpenses,
        totalCashExpenses,
        totalMonthAllocations,
        remanente,
        pendingFixedExpenses,
        pendingFixedIncomes: 0, // Simplified for now as fixed incomes are also in the 'projected' pool
        pendingSavings,
        activeOverride
    };

    if (activeOverride) {
        const overrideTime = activeOverride.updatedAt;
        
        // Correct logic for Override (Budget-First):
        // The user sets the "Starting Available" for the rest of the month.
        // We add Extra Incomes that happen AFTER the override.
        // We subtract Variable Expenses that happen AFTER the override.
        // We subtract the DEVIATION of Fixed Expenses (only the difference from planned).
        // We subtract any Manual Allocations to savings that happen AFTER the override.
        
        const extraIncomeAfter = extraIncomes.filter(inc => {
            if (inc.type === 'rollover') return false;
            if (inc.status === 'pending') return false;
            if (inc.excludeFromBudget) return false;
            const t = Number(inc.updatedAt || inc.effectiveDate || (inc as any).receivedDate || (inc as any).createdAt || 0);
            return isItemInMonthAndYear(inc, month, year) && t > overrideTime;
        }).reduce((sum, inc) => sum + inc.amount, 0);

        const varExpensesAfter = expenses.filter(exp => {
            if (exp.isFixed || exp.excludeFromBudget) return false;
            if (exp.amount < 0 && exp.status === 'pending') return false;
            const t = Number(exp.updatedAt || exp.date || (exp as any).createdAt || 0);
            return isItemInMonthAndYear(exp, month, year) && t > overrideTime;
        }).reduce((sum, exp) => sum + exp.amount, 0);

        const fixedDeviationsAfter = expenses.filter(exp => {
            if (!exp.isFixed || exp.excludeFromBudget) return false;
            if (exp.amount < 0 && exp.status === 'pending') return false;
            const t = Number(exp.updatedAt || exp.date || (exp as any).createdAt || 0);
            return isItemInMonthAndYear(exp, month, year) && t > overrideTime;
        }).reduce((sum, exp) => {
            const re = recurringExpenses.find(r => r.id === exp.recurringExpenseId);
            return sum + (exp.amount - (re?.amount || 0));
        }, 0);

        const allocationsAfter = allocations.filter(alloc => {
            const t = Number(alloc.updatedAt || (alloc as any).date || (alloc as any).createdAt || 0);
            return isItemInMonthAndYear(alloc, month, year) && t > overrideTime && (alloc.type === 'manual' || alloc.type === 'automatic');
        }).reduce((sum, alloc) => {
            const goal = savings.find(s => s.id === alloc.goalId);
            if (!goal || goal.accountInBudget !== false) {
                return sum + alloc.amount;
            }
            return sum;
        }, 0);

        return {
            ...summary,
            availableToSpend: activeOverride.amount + extraIncomeAfter - varExpensesAfter - fixedDeviationsAfter - allocationsAfter,
        };
    }

    return summary;
}

export function getEffectiveSettlementDate(exp: Expense) {
    if (!exp) return new Date();
    const d = new Date(exp.date || Date.now());
    const adjustment = (exp.paymentMethod as any)?.settlementAdjustment || 0;
    if (adjustment !== 0) {
        d.setMonth(d.getMonth() + adjustment);
    }
    return d;
}

export function predictSettlementDate(card: CreditCard, date: number, adjustment: number = 0) {
    const d = new Date(date);
    const cutoffDay = card.cutoffDay || 1;
    const paymentDay = card.paymentDay || 1;
    
    // Apply the user's manual adjustment
    if (adjustment !== 0) {
        d.setMonth(d.getMonth() + adjustment);
    }
    
    const year = d.getFullYear();
    const month = d.getMonth();
    const day = d.getDate();
    
    let settlementMonth = month;
    let settlementYear = year;
    
    if (day > cutoffDay) {
        // Belongs to the next settlement period
        settlementMonth++;
    }
    
    // If payment day is on or before cutoff, it usually pays in the month AFTER the settlement period closes
    if (paymentDay <= cutoffDay) {
        settlementMonth++;
    }
    
    return new Date(settlementYear, settlementMonth, paymentDay);
}

export function formatMoney(amount: number | undefined | null, includeSymbol: boolean = true): string {
    if (amount === undefined || amount === null || isNaN(amount)) {
        return includeSymbol ? '0,00€' : '0,00';
    }
    const isNegative = amount < 0;
    const fixedVal = Math.abs(amount).toFixed(2);
    const [integerPart, decimalPart] = fixedVal.split('.');
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const base = `${isNegative ? '-' : ''}${formattedInteger},${decimalPart}`;
    return includeSymbol ? `${base}€` : base;
}

export function formatMoneySigned(amount: number | undefined | null): string {
    if (amount === undefined || amount === null || isNaN(amount)) {
        return '0,00€';
    }
    const sign = amount > 0 ? '+' : amount < 0 ? '-' : '';
    const fixedVal = Math.abs(amount).toFixed(2);
    const [integerPart, decimalPart] = fixedVal.split('.');
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${sign}${formattedInteger},${decimalPart}€`;
}
