import type { 
    Expense, SavingGoal, SavingAllocation,
    RecurringExpense, MonthOverride, CreditCard,
    Account, Loan
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
    // IMPORTANTE: updatedAt NO se usa como fuente de timestamp.
    // updatedAt es cuándo se modificó el registro, no cuándo ocurrió el gasto/ingreso.
    // Usarlo causaba que gastos de meses pasados editados en el mes actual
    // aparecieran incorrectamente en la gráfica del mes actual.
    const timestamp = item.receivedDate || item.effectiveDate || item.date || item.createdAt;
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
        const accountForNext = inc.accountForNextMonth || (inc as any).countForNextMonth;
        let actionMonth = month;
        let actionYear = year;
        
        if (accountForNext) {
            actionMonth -= 1;
            if (actionMonth < 0) {
                actionMonth = 11;
                actionYear -= 1;
            }
        }
        
        const actionPeriod = `${actionYear}-${(actionMonth + 1).toString().padStart(2, '0')}`;
        const actionMonthStart = new Date(actionYear, actionMonth, 1).getTime();
        const actionMonthEnd = new Date(actionYear, actionMonth + 1, 0).getTime();
        
        const start = inc.effectiveDate || inc.createdAt || 0;
        const end = inc.expirationDate || new Date(9999, 11, 31).getTime();
        const isIgnored = inc.ignoredPeriods?.includes(actionPeriod);

        if (start <= actionMonthEnd && end >= actionMonthStart && !isIgnored) {
            if (isRecurringActiveInMonth(inc.frequency, inc.paymentMonth, actionMonth, actionYear, start)) {
                totalProjectedFixedIncomes += inc.amount;
                
                const expectedPeriod = `${year}-${(month + 1).toString().padStart(2, '0')}`;
                
                // Check if actually confirmed/received
                const isConfirmed = extraIncomes.some(ei => {
                    if ((ei as any).fixedIncomeId !== inc.id) return false;
                    
                    // Matches expected budget period
                    if (ei.period === expectedPeriod) return true;
                    if (ei.budgetMonth !== undefined && ei.budgetYear !== undefined) {
                        if (ei.budgetMonth === month && ei.budgetYear === year) return true;
                    }
                    
                    return false;
                });
                
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
    let grossAccountExpenses = 0;
    let grossCardExpenses = 0;
    let grossCashExpenses = 0;
    let variableExpensesPaid = 0;
    let fixedExpensesDeviations = 0;
    const paidFixedExpensesByReId: Record<string, number> = {};

    expenses
        .filter(exp => isItemInMonthAndYear(exp, month, year))
        .filter(exp => !exp.excludeFromBudget)
        .filter(exp => !(exp.amount < 0 && exp.status === 'pending'))
        .forEach(exp => {
            // Calculate how much of this expense is funded by huchas
            let fundedAmount = 0;
            if (exp.savingGoalFunding && exp.savingGoalFunding.length > 0) {
                fundedAmount = exp.savingGoalFunding.reduce((sum, f) => sum + f.amount, 0);
            } else if (exp.linkedSavingGoalId) {
                fundedAmount = exp.amount;
            }

            const netAmount = exp.amount - fundedAmount;
            totalMonthExpenses += netAmount;

            if (exp.isFixed) {
                if (exp.recurringExpenseId) {
                    paidFixedExpensesByReId[exp.recurringExpenseId] = (paidFixedExpensesByReId[exp.recurringExpenseId] || 0) + netAmount;
                } else {
                    variableExpensesPaid += netAmount;
                }
            } else {
                variableExpensesPaid += netAmount;
            }

        });

    // Calculate method totals based on real date
    expenses
        .filter(exp => {
            if (exp.excludeFromBudget) return false;
            if (exp.amount < 0 && exp.status === 'pending') return false;
            return isItemInMonthAndYear(exp, month, year);
        })
        .forEach(exp => {
            let fundedAmount = 0;
            if (exp.savingGoalFunding && exp.savingGoalFunding.length > 0) {
                fundedAmount = exp.savingGoalFunding.reduce((sum, f) => sum + f.amount, 0);
            } else if (exp.linkedSavingGoalId) {
                fundedAmount = exp.amount;
            }

            const netAmount = exp.amount - fundedAmount;

            const method = exp.paymentMethod || { type: 'cash' };
            const methodType = typeof method === 'string' ? method : method.type;
            
            if (methodType === 'cash') {
                totalCashExpenses += netAmount;
                grossCashExpenses += exp.amount;
            } else if (methodType === 'account') {
                totalAccountExpenses += netAmount;
                grossAccountExpenses += exp.amount;
            } else if (methodType === 'card') {
                const cardId = typeof method === 'string' ? null : (method as any).cardId;
                const card = cardId ? (cards || []).find(c => c.id === cardId) : null;
                if (card && card.type === 'debit') {
                    totalAccountExpenses += netAmount;
                    grossAccountExpenses += exp.amount;
                } else {
                    totalCardExpenses += netAmount;
                    grossCardExpenses += exp.amount;
                }
            }
        });

    // Calculate Projected Fixed Expenses
    let totalProjectedFixedExpenses = 0;
    let pendingFixedExpenses = 0;

    // Track virtual remaining balances for huchas used to finance recurring expenses
    const virtualHuchaBalances: Record<string, number> = {};
    savings.forEach(s => {
        virtualHuchaBalances[s.id] = s.currentAmount || 0;
    });

    recurringExpenses.forEach(re => {
        if (!re.active) return;
        const start = re.createdAt || re.updatedAt || 0;
        if (start > monthEnd) return;
        const isIgnored = re.ignoredPeriods?.includes(period);
        
        if (!isIgnored && isRecurringActiveInMonth(re.frequency, re.paymentMonth, month, year, start)) {
            let netProjectedAmount = re.amount;

            // Check if this recurring expense is financed by a Piggy Bank / Hucha
            const goalId = re.financingSavingGoalId;
            if (goalId && virtualHuchaBalances[goalId] !== undefined) {
                const availableInHucha = Math.max(0, virtualHuchaBalances[goalId]);
                const coveredByHucha = Math.min(re.amount, availableInHucha);
                virtualHuchaBalances[goalId] -= coveredByHucha;
                netProjectedAmount = Math.max(0, re.amount - coveredByHucha);
            }

            totalProjectedFixedExpenses += netProjectedAmount;
            
            // For the 'Pending' report specifically
            const isPaid = expenses.some(e => e.recurringExpenseId === re.id && isItemInMonthAndYear(e, month, year));
            if (!isPaid) {
                pendingFixedExpenses += netProjectedAmount;
            }
        }
    });

    Object.entries(paidFixedExpensesByReId).forEach(([reId, totalPaid]) => {
        const re = recurringExpenses.find(r => r.id === reId);
        if (re) {
            const start = re.createdAt || re.updatedAt || 0;
            const isIgnored = re.ignoredPeriods?.includes(period);
            const isProjected = re.active && start <= monthEnd && !isIgnored && isRecurringActiveInMonth(re.frequency, re.paymentMonth, month, year, start);
            
            let projectedAmount = 0;
            if (isProjected) {
                projectedAmount = re.amount;
                const goalId = re.financingSavingGoalId;
                if (goalId) {
                    const hucha = savings.find(s => s.id === goalId);
                    const huchaBalance = hucha ? (hucha.currentAmount || 0) : 0;
                    const covered = Math.min(re.amount, Math.max(0, huchaBalance));
                    projectedAmount = Math.max(0, re.amount - covered);
                }
            }
            fixedExpensesDeviations += (totalPaid - projectedAmount);
        } else {
            // Re-assign to variable expenses since RE doesn't exist
            variableExpensesPaid += totalPaid;
        }
    });

    // Calculate Allocations
    let totalMonthAllocations = 0;
    allocations
        .filter(alloc => isItemInMonthAndYear(alloc, month, year) && (alloc.type === 'manual' || alloc.type === 'automatic'))
        .forEach(alloc => {
            totalMonthAllocations += alloc.amount;
        });

    // Remanente
    let remanente = 0;
    extraIncomes.filter(inc => inc.type === 'rollover' && isItemInMonthAndYear(inc, month, year)).forEach(inc => {
        remanente += inc.amount;
    });

    // Calculate pending savings per hucha
    let pendingSavings = 0;
    
    savings
        .filter(s => (s.monthlySavingAmount || 0) > 0)
        .forEach(s => {
            const start = s.createdAt || 0;
            if (start <= monthEnd) {
                // If it is linked to a fixed income, check if that fixed income is active or confirmed in this month
                let isLinkedIncomeActive = true;
                let projectedAmount = s.monthlySavingAmount || 0;

                if (s.incomeSources && s.incomeSources.length > 0) {
                    projectedAmount = 0;
                    for (const src of s.incomeSources) {
                        const linkedIncome = fixedIncomes.find(inc => inc.id === src.fixedIncomeId);
                        if (linkedIncome && linkedIncome.active) {
                            const incStart = linkedIncome.effectiveDate || linkedIncome.createdAt || 0;
                            const incEnd = linkedIncome.expirationDate || new Date(9999, 11, 31).getTime();
                            const isIgnored = linkedIncome.ignoredPeriods?.includes(period);
                            let isTemplateActive = false;
                            if (incStart <= monthEnd && incEnd >= monthStart && !isIgnored) {
                                isTemplateActive = isRecurringActiveInMonth(linkedIncome.frequency, linkedIncome.paymentMonth, month, year, incStart);
                            }
                            const isConfirmed = extraIncomes.some(ei => ei.fixedIncomeId === src.fixedIncomeId && isItemInMonthAndYear(ei, month, year));
                            if (isTemplateActive || isConfirmed) {
                                projectedAmount += (src.monthlyAmount || 0);
                            }
                        }
                    }
                } else if (s.linkedFixedIncomeId) {
                    const linkedIncome = fixedIncomes.find(inc => inc.id === s.linkedFixedIncomeId);
                    if (linkedIncome && linkedIncome.active) {
                        const incStart = linkedIncome.effectiveDate || linkedIncome.createdAt || 0;
                        const incEnd = linkedIncome.expirationDate || new Date(9999, 11, 31).getTime();
                        const isIgnored = linkedIncome.ignoredPeriods?.includes(period);
                        let isTemplateActive = false;
                        if (incStart <= monthEnd && incEnd >= monthStart && !isIgnored) {
                            isTemplateActive = isRecurringActiveInMonth(linkedIncome.frequency, linkedIncome.paymentMonth, month, year, incStart);
                        }
                        const isConfirmed = extraIncomes.some(ei => ei.fixedIncomeId === s.linkedFixedIncomeId && isItemInMonthAndYear(ei, month, year));
                        isLinkedIncomeActive = isTemplateActive || isConfirmed;
                    } else {
                        isLinkedIncomeActive = false;
                    }
                    if (!isLinkedIncomeActive) projectedAmount = 0;
                }

                if (projectedAmount > 0) {
                    // Find actual allocations to this hucha in this month
                    const allocationsForThisHucha = allocations
                        .filter(alloc => alloc.goalId === s.id && isItemInMonthAndYear(alloc, month, year) && (alloc.type === 'manual' || alloc.type === 'automatic'))
                        .reduce((sum, alloc) => sum + alloc.amount, 0);

                    pendingSavings += Math.max(0, projectedAmount - allocationsForThisHucha);
                }
            }
        });

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
        extraIncomesReceived,
        totalMonthExpenses,
        totalAccountExpenses,
        totalCardExpenses,
        totalCashExpenses,
        grossAccountExpenses,
        grossCardExpenses,
        grossCashExpenses,
        totalMonthAllocations,
        remanente,
        pendingFixedExpenses,
        pendingFixedIncomes: 0, // Simplified for now as fixed incomes are also in the 'projected' pool
        pendingSavings,
        activeOverride
    };

    if (activeOverride) {
        if (activeOverride.delta !== undefined) {
            return {
                ...summary,
                availableToSpend: availableToSpend + activeOverride.delta
            };
        }

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

        const paidFixedDeviationsByReIdAfter: Record<string, number> = {};
        expenses.filter(exp => {
            if (!exp.isFixed || exp.excludeFromBudget) return false;
            if (exp.amount < 0 && exp.status === 'pending') return false;
            const t = Number(exp.updatedAt || exp.date || (exp as any).createdAt || 0);
            return isItemInMonthAndYear(exp, month, year) && t > overrideTime;
        }).forEach(exp => {
            if (exp.recurringExpenseId) {
                paidFixedDeviationsByReIdAfter[exp.recurringExpenseId] = (paidFixedDeviationsByReIdAfter[exp.recurringExpenseId] || 0) + exp.amount;
            }
        });

        let fixedDeviationsAfter = 0;
        Object.entries(paidFixedDeviationsByReIdAfter).forEach(([reId, totalPaid]) => {
            const re = recurringExpenses.find(r => r.id === reId);
            let projectedAmount = 0;
            if (re) {
                const start = re.createdAt || re.updatedAt || 0;
                const isIgnored = re.ignoredPeriods?.includes(period);
                const isProjected = re.active && start <= monthEnd && !isIgnored && isRecurringActiveInMonth(re.frequency, re.paymentMonth, month, year, start);
                projectedAmount = isProjected ? re.amount : 0;
            }
            fixedDeviationsAfter += (totalPaid - projectedAmount);
        });

        const allocationsAfter = allocations.filter(alloc => {
            const t = Number(alloc.updatedAt || (alloc as any).date || (alloc as any).createdAt || 0);
            return isItemInMonthAndYear(alloc, month, year) && t > overrideTime && (alloc.type === 'manual' || alloc.type === 'automatic');
        }).reduce((sum, alloc) => {
            return sum + alloc.amount;
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

export function calculateCardCycleDates(card: CreditCard) {
    const cutoffDay = card.cutoffDay || 1;
    const paymentDay = card.paymentDay || 1;
    
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();

    let activeCutoff: Date;
    let activeStart: Date;
    let activePayment: Date;

    let pendingCutoff: Date;
    let pendingStart: Date;
    let pendingPayment: Date;

    if (day > cutoffDay) {
        activeCutoff = new Date(year, month + 1, cutoffDay, 23, 59, 59);
        activeStart = new Date(year, month, cutoffDay + 1, 0, 0, 0);
        activePayment = new Date(year, month + 1, paymentDay, 12, 0, 0);
        if (paymentDay <= cutoffDay) activePayment = new Date(year, month + 2, paymentDay, 12, 0, 0);

        pendingCutoff = new Date(year, month, cutoffDay, 23, 59, 59);
        pendingStart = new Date(year, month - 1, cutoffDay + 1, 0, 0, 0);
        pendingPayment = new Date(year, month, paymentDay, 12, 0, 0);
        if (paymentDay <= cutoffDay) pendingPayment = new Date(year, month + 1, paymentDay, 12, 0, 0);
    } else {
        activeCutoff = new Date(year, month, cutoffDay, 23, 59, 59);
        activeStart = new Date(year, month - 1, cutoffDay + 1, 0, 0, 0);
        activePayment = new Date(year, month, paymentDay, 12, 0, 0);
        if (paymentDay <= cutoffDay) activePayment = new Date(year, month + 1, paymentDay, 12, 0, 0);

        pendingCutoff = new Date(year, month - 1, cutoffDay, 23, 59, 59);
        pendingStart = new Date(year, month - 2, cutoffDay + 1, 0, 0, 0);
        pendingPayment = new Date(year, month - 1, paymentDay, 12, 0, 0);
        if (paymentDay <= cutoffDay) pendingPayment = new Date(year, month, paymentDay, 12, 0, 0);
    }

    return {
        active: { start: activeStart, cutoff: activeCutoff, payment: activePayment },
        pending: { start: pendingStart, cutoff: pendingCutoff, payment: pendingPayment }
    };
}

export const round2 = (num: number) => Math.round(num * 100) / 100;

export function formatMoney(amount: number | undefined | null, includeSymbol: boolean = true): string {
    try {
        const saved = localStorage.getItem('pcshogar_settings');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.privacyMode) {
                return includeSymbol ? '•••• €' : '••••';
            }
        }
    } catch (e) {}

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
    try {
        const saved = localStorage.getItem('pcshogar_settings');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.privacyMode) {
                return '•••• €';
            }
        }
    } catch (e) {}

    if (amount === undefined || amount === null || isNaN(amount)) {
        return '0,00€';
    }
    const sign = amount > 0 ? '+' : amount < 0 ? '-' : '';
    const fixedVal = Math.abs(amount).toFixed(2);
    const [integerPart, decimalPart] = fixedVal.split('.');
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${sign}${formattedInteger},${decimalPart}€`;
}

/**
 * Calculates the discrepancy between real free money and what is allocated in savings.
 *
 * Formula:
 *   dineroReal      = Σ account.balance  (all bank + cash accounts)
 *   compromisos     = pending expenses of the current real month that will leave
 *                     real money (paymentMethod = account | cash | debit card)
 *                   + Σ currentBalance of open credit/virtual card cycles
 *                     (these will be charged to the linked bank at cycle close)
 *   dineroLibreReal = dineroReal - compromisos
 *   desajuste       = dineroLibreReal - dineroEnHuchas
 *
 * Notes:
 *  - Settlement expenses (closed cycle payments) have type='account' + status='pending',
 *    so they are captured by the first rule without double-counting.
 *  - Debit card paid expenses already reduced account.balance; pending debit
 *    expenses are captured by the debit-card rule.
 *  - THRESHOLD: differences below 0.50€ are ignored to avoid rounding noise.
 */
export function calculateBalanceDiscrepancy(
    accounts: Account[],
    savings: SavingGoal[],
    expenses: Expense[],
    cards: CreditCard[],
    recurringExpenses: RecurringExpense[] = [],
    disponibleDelMes: number = 0,
    threshold: number = 0.50,
    incomes: Income[] = [],
    allocations: SavingAllocation[] = []
): {
    dineroReal: number;
    dineroLibreReal: number;
    compromisoGastos: number;
    compromisoTarjetas: number;
    compromisos: number;
    dineroEnHuchas: number;
    desajuste: number;
    isOverdraft: boolean;
    hasSignificantDiscrepancy: boolean;
    mesActual: string;
} {
    // ── Real money ───────────────────────────────────────────────────────────
    const dineroReal = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);

    // ── Current real month (never the navigated month) ───────────────────────
    const now = new Date();
    const mesActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // ── Build a quick card-type lookup ───────────────────────────────────────
    const cardTypeMap = new Map<string, string>();
    cards.forEach(c => cardTypeMap.set(c.id, c.type));

    // ── Pending expenses of the current month that will reduce real money ─────
    // Includes: account payments, cash payments, debit-card payments
    // Excludes: credit/virtual card payments (those go into the cycle balance)
    const gastosPendientes = expenses.filter(exp => {
        if (exp.status !== 'pending') return false;

        // Match by period field or by the expense date falling in current month
        const expPeriod = exp.period ?? `${new Date(exp.date).getFullYear()}-${String(new Date(exp.date).getMonth() + 1).padStart(2, '0')}`;
        if (expPeriod !== mesActual) return false;

        const pm = exp.paymentMethod;
        if (pm.type === 'account' || pm.type === 'cash') return true;
        if (pm.type === 'card') {
            return cardTypeMap.get(pm.cardId) === 'debit';
        }
        return false;
    });

    // ── Pending fixed expenses of the current month ───────────────────────────
    let pendingFixedExpenses = 0;
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    recurringExpenses.forEach(re => {
        if (!re.active) return;
        const start = re.createdAt || re.updatedAt || 0;
        const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999).getTime();
        if (start > monthEnd) return;
        const isIgnored = re.ignoredPeriods?.includes(mesActual);
        
        if (!isIgnored && isRecurringActiveInMonth(re.frequency, re.paymentMonth, currentMonth, currentYear, start)) {
            const isRegistered = expenses.some(e => e.recurringExpenseId === re.id && isItemInMonthAndYear(e, currentMonth, currentYear));
            if (!isRegistered) {
                pendingFixedExpenses += re.amount;
            }
        }
    });

    const compromisoGastos = gastosPendientes.reduce((sum, e) => sum + (e.amount || 0), 0) + pendingFixedExpenses;

    // ── Open credit / virtual card cycles ────────────────────────────────────
    const compromisoTarjetas = cards
        .filter(c => c.type === 'credit' || c.type === 'virtual')
        .reduce((sum, c) => sum + (c.currentBalance || 0), 0);

    // ── Future-budgeted received incomes ──────────────────────────────────────
    let futureIncomesTotal = 0;

    const futureMonthMap = new Map<string, { year: number; month: number; totalIncomes: number; autoSavings: number }>();

    (incomes || []).forEach(inc => {
        if (inc.status !== 'received' || inc.type === 'rollover') return;
        
        let incMonth = inc.budgetMonth;
        let incYear = inc.budgetYear;
        
        if (incMonth === undefined || incYear === undefined) {
            if (inc.period && typeof inc.period === 'string') {
                const [y, m] = inc.period.split('-').map(Number);
                incMonth = m - 1;
                incYear = y;
            } else {
                const timestamp = inc.effectiveDate || (inc as any).receivedDate || (inc as any).date || inc.updatedAt || inc.createdAt;
                if (timestamp) {
                    const d = new Date(timestamp);
                    incMonth = d.getMonth();
                    incYear = d.getFullYear();
                }
            }
        }
        
        if (incMonth !== undefined && incYear !== undefined) {
            const incPeriodNum = incYear * 12 + incMonth;
            const currentPeriodNum = now.getFullYear() * 12 + now.getMonth();
            if (incPeriodNum > currentPeriodNum) {
                const key = `${incYear}-${incMonth}`;
                if (!futureMonthMap.has(key)) {
                    futureMonthMap.set(key, { year: incYear, month: incMonth, totalIncomes: 0, autoSavings: 0 });
                }
                const entry = futureMonthMap.get(key)!;
                entry.totalIncomes += (inc.amount || 0);

                if (inc.fixedIncomeId) {
                    const autoSaved = (savings || [])
                        .filter(s => s.linkedFixedIncomeId === inc.fixedIncomeId)
                        .reduce((sum, s) => sum + (s.monthlySavingAmount || 0), 0);
                    entry.autoSavings += autoSaved;
                }

                if ((inc as any).allocationTarget === 'hucha' || (inc as any).savingGoalId) {
                    entry.autoSavings += (inc.amount || 0);
                }
            }
        }
    });

    futureMonthMap.forEach((val) => {
        const allocsForMonth = (allocations || [])
            .filter(a => a.budgetMonth === val.month && a.budgetYear === val.year && a.amount > 0);
        const transfersToHuchas = allocsForMonth.reduce((sum, a) => sum + a.amount, 0);

        const totalSavedToHuchas = Math.max(val.autoSavings, transfersToHuchas);
        const netFutureIncome = Math.max(0, val.totalIncomes - totalSavedToHuchas);
        futureIncomesTotal += netFutureIncome;
    });

    // ── Final calculation ─────────────────────────────────────────────────────
    const compromisos = compromisoGastos + compromisoTarjetas;
    const dineroEnHuchas = savings.reduce((sum, s) => sum + (s.currentAmount || 0), 0);
    const dineroLibreReal = dineroReal - compromisos;
    const desajuste = dineroLibreReal - (dineroEnHuchas + disponibleDelMes + futureIncomesTotal);
    const isOverdraft = dineroReal < -threshold;
    const hasSignificantDiscrepancy = Math.abs(desajuste) >= threshold;

    return {
        dineroReal,
        dineroLibreReal,
    compromisoGastos,
        compromisoTarjetas,
        compromisos,
        dineroEnHuchas,
        desajuste,
        isOverdraft,
        hasSignificantDiscrepancy,
        mesActual
    };
}

/**
 * Calculates the TAE given the TIN (%), the borrowed amount, the duration in months, 
 * and the total upfront commissions/expenses (€).
 */
export function computeTae(amount: number, months: number, tin: number, commissions: number): number {
    if (amount <= 0 || months <= 0 || tin < 0 || commissions < 0 || commissions >= amount) {
        return 0;
    }
    
    // Formula cuota mensual sistema francés
    const monthlyRate = (tin / 100) / 12;
    let pmt = 0;
    if (monthlyRate === 0) {
        pmt = amount / months;
    } else {
        pmt = amount * (monthlyRate / (1 - Math.pow(1 + monthlyRate, -months)));
    }
    
    const netReceived = amount - commissions;
    
    // Búsqueda binaria de la TIR mensual
    let low = 0;
    let high = 1.0; // 100% mensual
    let iter = 0;
    let r = 0;
    
    while (low <= high && iter < 100) {
        r = (low + high) / 2;
        // Calcula el valor presente de los pagos con tasa r
        let pv = 0;
        if (r === 0) {
            pv = pmt * months;
        } else {
            pv = pmt * ((1 - Math.pow(1 + r, -months)) / r);
        }
        
        if (Math.abs(pv - netReceived) < 0.001) {
            break;
        }
        
        if (pv > netReceived) {
            // Tasa demasiado baja (pv muy alto)
            low = r;
        } else {
            // Tasa demasiado alta (pv muy bajo)
            high = r;
        }
        iter++;
    }
    
    const tae = (Math.pow(1 + r, 12) - 1) * 100;
    return round2(tae);
}

/**
 * Calculates the upfront commissions given the TIN (%), TAE (%), 
 * the borrowed amount, and the duration in months.
 */
export function computeCommissionsFromTae(amount: number, months: number, tin: number, tae: number): number {
    if (amount <= 0 || months <= 0 || tin < 0 || tae < tin) {
        return 0;
    }
    
    const monthlyRate = (tin / 100) / 12;
    let pmt = 0;
    if (monthlyRate === 0) {
        pmt = amount / months;
    } else {
        pmt = amount * (monthlyRate / (1 - Math.pow(1 + monthlyRate, -months)));
    }
    
    const r = Math.pow(1 + tae / 100, 1 / 12) - 1;
    
    let pv = 0;
    if (r === 0) {
        pv = pmt * months;
    } else {
        pv = pmt * ((1 - Math.pow(1 + r, -months)) / r);
    }
    
    const commissions = amount - pv;
    return round2(Math.max(0, commissions));
}

export function getCardAvailableCredit(card: CreditCard, expenses: Expense[], loans: any[] = []): number {
    if (!card || card.type === 'debit') return Infinity;
    if (card.type === 'virtual') return card.currentBalance;
    if (card.limit <= 0) return 0;

    const cycleDates = calculateCardCycleDates(card);
    
    const activeExpenses = (expenses || []).filter(exp => {
        if (!exp?.paymentMethod) return false;
        const isCard = exp.paymentMethod.type === 'card' && exp.paymentMethod.cardId === card.id;
        if (!isCard || exp.isSettled) return false;
        if (exp.status === 'pending') return false;
        const expDate = getEffectiveSettlementDate(exp);
        return expDate >= cycleDates.active.start && expDate <= cycleDates.active.cutoff;
    });
    const activeTotal = activeExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    const pendingExpenses = (expenses || []).filter(exp => {
        if (!exp?.paymentMethod) return false;
        const isCard = exp.paymentMethod.type === 'card' && exp.paymentMethod.cardId === card.id;
        if (!isCard || exp.isSettled) return false;
        if (exp.status === 'pending') return false;
        const expDate = getEffectiveSettlementDate(exp);
        return expDate >= cycleDates.pending.start && expDate <= cycleDates.pending.cutoff;
    });
    const pendingTotal = pendingExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    const todayDay = new Date().getDate();
    const cutoff = card.cutoffDay || 1;
    const pay = card.paymentDay || 1;
    const isHoldingPreviousCycle = card.holdCreditUntilPayment && (
        (cutoff < pay && todayDay > cutoff && todayDay < pay) ||
        (cutoff > pay && (todayDay > cutoff || todayDay < pay))
    );
    const extraHold = isHoldingPreviousCycle ? pendingTotal : 0;

    const supportedLoansCapital = (loans || [])
        .filter(l => l.status === 'active' && l.supportedByCardId === card.id)
        .reduce((sum, l) => sum + (l.currentDebt || 0), 0);
    const limitToDeduct = card.hasAdditionalFinanceLimit ? 0 : supportedLoansCapital;

    return Math.max(0, card.limit - activeTotal - limitToDeduct - extraHold);
}

export interface AmortizationScheduleRow {
    installmentNumber: number;
    date: Date;
    payment: number;
    capital: number;
    interest: number;
    remainingCapital: number;
    isPaid: boolean;
    isCurrent: boolean;
}

export function calculateLoanAmortization(loan: Loan) {
    const totalAmount = loan.totalAmount || 0;
    const tin = loan.tin || loan.tae || 0;
    const monthlyPayment = loan.monthlyPayment || loan.monthlyInstallment || 0;
    const startDate = loan.startDate ? new Date(loan.startDate) : new Date();
    const mode = loan.amountMode || 'principal';

    if (totalAmount <= 0 || monthlyPayment <= 0) {
        return null;
    }

    const r = (tin / 100) / 12;
    
    // If mode is 'total_cost' and tin > 0, extract true principal P from total cost
    let principalP = totalAmount;
    if (mode === 'total_cost' && tin > 0 && r > 0) {
        const approxN = Math.max(1, Math.round(totalAmount / monthlyPayment));
        principalP = monthlyPayment * ((1 - Math.pow(1 + r, -approxN)) / r);
        principalP = Math.min(totalAmount, Math.max(1, principalP));
    }

    let remaining = principalP;
    const schedule: AmortizationScheduleRow[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let monthCount = 0;
    let accumulatedInterest = 0;

    while (remaining > 0.01 && monthCount < 1200) {
        monthCount++;
        const instDate = new Date(startDate);
        instDate.setMonth(startDate.getMonth() + (monthCount - 1));

        const isPast = instDate.getFullYear() < currentYear || 
            (instDate.getFullYear() === currentYear && instDate.getMonth() < currentMonth);
        const isCurr = instDate.getFullYear() === currentYear && instDate.getMonth() === currentMonth;

        let interestComp = r > 0 ? Math.round((remaining * r) * 100) / 100 : 0;
        let currentPayment = monthlyPayment;
        if (monthCount === 1) {
            if (loan.firstInstallmentAmount && loan.firstInstallmentAmount > 0) {
                currentPayment = loan.firstInstallmentAmount;
            }
            if (loan.firstInstallmentInterestOnly) {
                interestComp = currentPayment;
            }
        }

        let capitalComp = (loan.firstInstallmentInterestOnly && monthCount === 1) 
            ? 0 
            : Math.max(0, Math.round((currentPayment - interestComp) * 100) / 100);

        if (remaining - capitalComp < 0.01) {
            capitalComp = remaining;
            if (loan.lastInstallmentAmount && loan.lastInstallmentAmount > 0) {
                currentPayment = loan.lastInstallmentAmount;
            } else {
                currentPayment = Math.round((capitalComp + interestComp) * 100) / 100;
            }
            remaining = 0;
        } else {
            remaining = Math.round((remaining - capitalComp) * 100) / 100;
        }

        accumulatedInterest += interestComp;

        schedule.push({
            installmentNumber: monthCount,
            date: instDate,
            payment: currentPayment,
            capital: capitalComp,
            interest: interestComp,
            remainingCapital: remaining,
            isPaid: isPast,
            isCurrent: isCurr
        });
    }

    const totalCost = principalP + accumulatedInterest;
    
    let paidCapital = 0;
    let paidInterest = 0;
    let paidTotal = 0;

    schedule.forEach(row => {
        if (row.isPaid || row.isCurrent) {
            paidCapital += row.capital;
            paidInterest += row.interest;
            paidTotal += row.payment;
        }
    });

    const remainingCapital = Math.max(0, principalP - paidCapital);
    const remainingInterest = Math.max(0, accumulatedInterest - paidInterest);

    return {
        principal: Math.round(principalP * 100) / 100,
        totalInterest: Math.round(accumulatedInterest * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        paidCapital: Math.round(paidCapital * 100) / 100,
        paidInterest: Math.round(paidInterest * 100) / 100,
        paidTotal: Math.round(paidTotal * 100) / 100,
        remainingCapital: Math.round(remainingCapital * 100) / 100,
        remainingInterest: Math.round(remainingInterest * 100) / 100,
        schedule
    };
}
