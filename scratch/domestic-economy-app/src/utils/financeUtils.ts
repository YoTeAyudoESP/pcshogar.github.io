import type { Expense, RecurringExpense, SavingAllocation, MonthOverride, SavingGoal } from '../types/finance';
import type { FixedIncome, ExtraIncome, RolloverIncome } from '../types/income';

/**
 * Checks if a recurring expense is due in the given month and year.
 */
export const isRecurringExpenseDue = (expense: RecurringExpense, month: number): boolean => {
    if (!expense.active) return false;

    const { frequency, paymentMonth, splitStartMonth } = expense;

    switch (frequency) {
        case 'monthly':
            return true;
        case 'bi-monthly':
            // Bi-monthly: every 2 months starting from reference month
            const startM = paymentMonth || 0;
            return (month - startM) % 2 === 0;
        case 'quarterly':
            // Quarterly: every 3 months starting from reference month
            const startQ = paymentMonth || 0;
            return (month - startQ) % 3 === 0;
        case 'half-yearly':
            // Half-yearly: every 6 months starting from reference month
            const startH = paymentMonth || 0;
            return (month - startH) % 6 === 0;
        case 'yearly':
            // Yearly: only in the reference month
            return month === (paymentMonth || 0);
        case 'split-annual':
            // Split-annual: 3 consecutive months starting from splitStartMonth
            const startS = splitStartMonth || 0;
            const monthsCovered = [startS, (startS + 1) % 12, (startS + 2) % 12];
            return monthsCovered.includes(month);
        default:
            return false;
    }
};

/**
 * Checks if a recurring expense has already been confirmed/recorded as a paid expense for the period.
 */
export const isRecurringExpenseConfirmed = (
    expenseId: string,
    month: number,
    year: number,
    paidExpenses: Expense[]
): boolean => {
    const period = `${year}-${String(month + 1).padStart(2, '0')}`;
    return paidExpenses.some(exp =>
        exp.recurringExpenseId === expenseId &&
        exp.period === period &&
        exp.status === 'paid'
    );
};

export interface CalculationOptions {
    extraIncomes: ExtraIncome[];
    fixedIncomes?: FixedIncome[];
    expenses: Expense[];
    allocations: SavingAllocation[];
    recurringExpenses: RecurringExpense[];
    overrides?: MonthOverride[];
    savings?: SavingGoal[];
    rolloverIncomes?: RolloverIncome[];
    isClosed?: boolean;
    rolloverAction?: 'save' | 'carry' | 'cover' | 'deduct' | 'dismiss';
}

export interface CalculationBreakdown {
    available: number;
    income: {
        total: number;
        extra: number;
        fixed: number; // Sum of confirmed and projected
        confirmedFixed: number;
        projectedFixed: number;
        unmaterializedFixed: number;
        rollover: number;
        relevantRolloverIds: string[];
    };
    expenses: {
        total: number;
        paid: number;
        pending: number;
        unmaterializedPending: number;
    };
    savings: {
        total: number;
        allocations: number;
        projected: number;
    };
    adjustment?: {
        amount: number;
        isManual: boolean;
        targetAmount?: number;
    };
}

/**
 * Calculates the available amount to spend for a specific month.
 * This includes confirmed incomes/expenses and projected (pending) fixed expenses.
 */
export const calculateMonthAvailability = (
    year: number,
    month: number,
    data: CalculationOptions
): number => {
    return calculateDetailedAvailability(year, month, data).available;
};

export const calculateDetailedAvailability = (
    year: number,
    month: number,
    data: CalculationOptions
): CalculationBreakdown => {
    const { extraIncomes, fixedIncomes, expenses, allocations, recurringExpenses, overrides, savings, rolloverIncomes } = data;

    // 1. Calculate Monthly Income: Confirmed ExtraIncomes + Projected FixedIncomes + RolloverIncomes
    const confirmedExtraIncomes = extraIncomes
        .filter(inc => {
            if (inc.status && inc.status !== 'received') return false;
            if (inc.linkedSavingGoalId) return false; // Ignore direct savings
            const m = inc.budgetMonth !== undefined ? inc.budgetMonth : new Date(inc.receivedDate).getMonth();
            const y = inc.budgetYear !== undefined ? inc.budgetYear : new Date(inc.receivedDate).getFullYear();
            return m === month && y === year;
        });

    const isPastMonth = (year < new Date().getFullYear()) || (year === new Date().getFullYear() && month < new Date().getMonth());

    const projectedFixedIncomes = isPastMonth ? [] : (fixedIncomes || [])
        .filter(inc => inc.active)
        .filter(inc => !inc.expirationDate || inc.expirationDate > new Date(year, month).getTime())
        .filter(inc => {
            const periodStr = `${year}-${String(month + 1).padStart(2, '0')}`;
            if (inc.ignoredPeriods?.includes(periodStr)) return false;

            return !confirmedExtraIncomes.some(extra => {
                if (extra.fixedIncomeId === inc.id) return true;
                if (extra.fixedIncomeId === undefined) {
                    const nameMatches = extra.name.toLowerCase().includes(inc.name.toLowerCase());
                    const isConfirmationCategory = extra.category === 'Ingreso Fijo Confirmado';
                    if (nameMatches && isConfirmationCategory) return true;
                    if (nameMatches && Math.abs(Number(extra.amount) - Number(inc.amount)) < 1.0) return true;
                }
                return false;
            });
        });

    const unmaterializedFixedIncomes = !isPastMonth ? [] : (fixedIncomes || [])
        .filter(inc => inc.active)
        .filter(inc => !inc.expirationDate || inc.expirationDate > new Date(year, month).getTime())
        .filter(inc => {
            const periodStr = `${year}-${String(month + 1).padStart(2, '0')}`;
            if (inc.ignoredPeriods?.includes(periodStr)) return false;

            return !confirmedExtraIncomes.some(extra => {
                if (extra.fixedIncomeId === inc.id) return true;
                if (extra.fixedIncomeId === undefined) {
                    const nameMatches = extra.name.toLowerCase().includes(inc.name.toLowerCase());
                    const isConfirmationCategory = extra.category === 'Ingreso Fijo Confirmado';
                    if (nameMatches && isConfirmationCategory) return true;
                    if (nameMatches && Math.abs(Number(extra.amount) - Number(inc.amount)) < 1.0) return true;
                }
                return false;
            });
        });

    const relevantRollovers = (rolloverIncomes || [])
        .filter(inc => Number(inc.budgetMonth) === Number(month) && Number(inc.budgetYear) === Number(year));

    const confirmedFixedIncomes = confirmedExtraIncomes.filter(extra => {
        if (extra.fixedIncomeId) return true;
        const isConfirmationCategory = extra.category === 'Ingreso Fijo Confirmado';
        if (isConfirmationCategory) return true;
        // Check if it matches a projected fixed income profile
        return (fixedIncomes || []).some(inc => {
            const nameMatches = extra.name.toLowerCase().includes(inc.name.toLowerCase());
            return nameMatches && Math.abs(Number(extra.amount) - Number(inc.amount)) < 1.0;
        });
    });

    const realExtraIncomes = confirmedExtraIncomes.filter(extra => !confirmedFixedIncomes.includes(extra));

    const confirmedFixedTotal = confirmedFixedIncomes.reduce((sum, inc) => sum + Number(inc.amount), 0);
    const extraIncomeTotal = realExtraIncomes.reduce((sum, inc) => sum + Number(inc.amount), 0);
    const projectedFixedTotal = projectedFixedIncomes.reduce((sum, inc) => sum + Number(inc.amount), 0);
    const unmaterializedFixedTotal = unmaterializedFixedIncomes.reduce((sum, inc) => sum + Number(inc.amount), 0);

    const rolloverTotal = relevantRollovers.reduce((sum, inc) => sum + Number(inc.amount), 0);
    const relevantRolloverIds = relevantRollovers.map(r => r.id);
    const monthIncome = extraIncomeTotal + projectedFixedTotal + confirmedFixedTotal + rolloverTotal;

    // 2. Confirmed/Paid Expenses (excluding settlements)
    const monthConfirmedExpenses = expenses
        .filter(exp => {
            if (exp.period) {
                const [pYear, pMonth] = exp.period.split('-').map(Number);
                const isTarget = pYear === year && (pMonth - 1) === month;
                return isTarget && exp.status === 'paid' && !exp.description.startsWith('[LIQUIDACION]') && !exp.linkedSavingGoalId;
            }
            const d = new Date(exp.date);
            const isTargetMonth = d.getFullYear() === year && d.getMonth() === month;
            return isTargetMonth && exp.status === 'paid' && !exp.description.startsWith('[LIQUIDACION]') && !exp.linkedSavingGoalId;
        })
        .reduce((sum, exp) => sum + Number(exp.amount), 0);

    // 3. Allocations to savings
    const monthAllocations = allocations
        .filter(alloc => {
            const d = new Date(alloc.date);
            return d.getFullYear() === year && d.getMonth() === month;
        })
        .reduce((sum, alloc) => sum + Number(alloc.amount), 0);

    // 4. Pending Fixed Expenses (not yet confirmed)
    const pendingFixedExpenses = isPastMonth ? 0 : recurringExpenses
        .filter(rec => {
            const periodStr = `${year}-${String(month + 1).padStart(2, '0')}`;
            if (rec.ignoredPeriods?.includes(periodStr)) return false;

            return isRecurringExpenseDue(rec, month) &&
                !isRecurringExpenseConfirmed(rec.id, month, year, expenses);
        })
        .reduce((sum, rec) => sum + Number(rec.amount), 0);

    const unmaterializedPendingExpenses = !isPastMonth ? 0 : recurringExpenses
        .filter(rec => {
            const periodStr = `${year}-${String(month + 1).padStart(2, '0')}`;
            if (rec.ignoredPeriods?.includes(periodStr)) return false;

            return isRecurringExpenseDue(rec, month) &&
                !isRecurringExpenseConfirmed(rec.id, month, year, expenses);
        })
        .reduce((sum, rec) => sum + Number(rec.amount), 0);

    // 5. Automatic Monthly Savings (Projected)
    const skipProjected = data.isClosed && data.rolloverAction !== 'dismiss';
    const automaticSavings = skipProjected ? 0 : (savings || [])
        .reduce((sum, goal) => {
            const goalAllocationsThisMonth = allocations
                .filter(a => a.goalId === goal.id)
                .filter(a => {
                    const d = new Date(a.date);
                    return d.getFullYear() === year && d.getMonth() === month;
                })
                .reduce((s, a) => s + Number(a.amount || 0), 0);

            const remaining = Math.max(0, (goal.monthlySavingAmount || 0) - goalAllocationsThisMonth);
            return sum + remaining;
        }, 0);

    const baseAmount = monthIncome - monthConfirmedExpenses - monthAllocations - pendingFixedExpenses - automaticSavings;

    // 6. Manual Override (Adjustment)
    const manualOverride = overrides?.find(o =>
        Number(o.year) === Number(year) &&
        Number(o.month) === Number(month) &&
        o.isManual
    );

    let finalAvailable = baseAmount;
    if (manualOverride) {
        // If targetAmount is explicitly set, it means the user wants EXACTLY that amount available.
        if (manualOverride.targetAmount !== undefined) {
            finalAvailable = Number(manualOverride.targetAmount);
        } else {
            finalAvailable = baseAmount + Number(manualOverride.amount);
        }
    }

    return {
        available: finalAvailable,
        income: {
            total: monthIncome,
            extra: extraIncomeTotal,
            fixed: projectedFixedTotal + confirmedFixedTotal,
            confirmedFixed: confirmedFixedTotal,
            projectedFixed: projectedFixedTotal,
            unmaterializedFixed: unmaterializedFixedTotal,
            rollover: rolloverTotal,
            relevantRolloverIds
        },
        expenses: {
            total: monthConfirmedExpenses + pendingFixedExpenses,
            paid: monthConfirmedExpenses,
            pending: pendingFixedExpenses,
            unmaterializedPending: unmaterializedPendingExpenses
        },
        savings: {
            total: monthAllocations + automaticSavings,
            allocations: monthAllocations,
            projected: automaticSavings
        },
        adjustment: manualOverride ? {
            amount: manualOverride.amount,
            isManual: manualOverride.isManual,
            targetAmount: manualOverride.targetAmount
        } : undefined
    };
};

/**
 * Checks if a goal is reached when applying the monthly saving amount.
 */
export const isGoalReached = (goal: SavingGoal): boolean => {
    if (!goal.targetAmount || !goal.monthlySavingAmount) return false;
    return goal.currentAmount + goal.monthlySavingAmount >= goal.targetAmount;
};

/**
 * Calculates the surplus of a monthly saving that exceeds the target amount.
 */
export const getGoalSavingsImpact = (goal: SavingGoal) => {
    if (!goal.targetAmount || !goal.monthlySavingAmount) {
        return { needed: goal.monthlySavingAmount || 0, surplus: 0 };
    }

    const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
    const amountToApply = goal.monthlySavingAmount;

    if (amountToApply > remaining) {
        return { needed: remaining, surplus: amountToApply - remaining };
    }

    return { needed: amountToApply, surplus: 0 };
};
