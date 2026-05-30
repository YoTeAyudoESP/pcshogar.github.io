import React, { createContext, useContext, useCallback } from 'react';
import { incomeDB } from '../services/db';
import { v4 as uuidv4 } from 'uuid';
import type { SavingAllocation, SavingGoal } from '../types/finance';
import type { RolloverIncome } from '../types/income';
import { useFinance } from './FinanceContext';
import { useIncome } from './IncomeContext';
import { getGoalSavingsImpact, calculateDetailedAvailability } from '../utils/financeUtils';
import { syncToExternalFolder } from '../services/syncService';

interface RolloverAllocation {
    action: 'save' | 'carry' | 'cover' | 'deduct' | 'dismiss';
    amount: number;
    targetId?: string; // piggy bank id if save/cover
}

interface ClosingData {
    year: number;
    month: number;
    finalBalance: number;
    allocations: RolloverAllocation[];
    redirections?: GoalRedirection[];
}

export interface GoalRedirection {
    goalId: string;
    surplusTargetGoalId?: string; // If empty string, means "don't redirect (keep in hucha)". If "stop", means "don't save".
    futureTargetGoalId?: string;
}

interface MonthClosingContextType {
    isMonthClosed: (year: number, month: number) => Promise<boolean>;
    closeMonth: (data: ClosingData) => Promise<void>;
    deleteClosing: (year: number, month: number) => Promise<void>;
    allClosings: any[];
    pendingMonths: any[];
    refreshClosings: () => Promise<void>;
}

const MonthClosingContext = createContext<MonthClosingContextType | undefined>(undefined);

export const MonthClosingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { refreshFinance, expenses, allocations, recurringExpenses, savings, overrides } = useFinance();
    const { refresh: refreshIncomes, fixedIncomes, rolloverIncomes, extraIncomes } = useIncome();

    const [allClosings, setAllClosings] = React.useState<any[]>([]);
    const [pendingMonths, setPendingMonths] = React.useState<any[]>([]);

    const refreshClosings = useCallback(async () => {
        const closings = await incomeDB.getAllClosings();
        setAllClosings(closings);

        // Calculate pending months
        const now = new Date();
        const results = [];
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        // Check last 12 months
        for (let i = 1; i <= 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const y = d.getFullYear();
            const m = d.getMonth();

            const isClosed = closings.some(c => c.year === y && c.month === m);
            if (!isClosed) {
                const options = {
                    extraIncomes, fixedIncomes, expenses, allocations, recurringExpenses, savings, rolloverIncomes, overrides
                } as any;
                const breakdown = calculateDetailedAvailability(y, m, options);
                const amount = breakdown.available;

                // A month is "pending" if it has any income, expenses, allocations, or manual overrides
                const hasActivity = breakdown.income.total !== 0 ||
                    breakdown.expenses.total !== 0 ||
                    breakdown.savings.total !== 0 ||
                    breakdown.adjustment !== undefined;

                if (hasActivity) {
                    results.push({
                        year: y,
                        month: m,
                        name: `${monthNames[m]} ${y}`,
                        amount
                    });
                }
            }
        }
        setPendingMonths(results);
    }, [extraIncomes, fixedIncomes, expenses, allocations, recurringExpenses, savings, rolloverIncomes, overrides]);

    React.useEffect(() => {
        refreshClosings();
    }, [refreshClosings]);

    React.useEffect(() => {
        return incomeDB.onDataImported(() => {
            console.log('MonthClosingContext: Data imported, refreshing...');
            refreshClosings();
        });
    }, [refreshClosings]);

    const isMonthClosed = useCallback(async (year: number, month: number) => {
        const closing = await incomeDB.getClosing(year, month);
        return !!closing;
    }, []);

    const closeMonth = useCallback(async (data: ClosingData) => {
        const { year, month, finalBalance, allocations: rolloverAllocations } = data;

        // 1. Persist the closing record (using the first allocation as "primary" for legacy schema compatibility if needed, 
        // but the DB store might need to be checked. Actually, let's keep it simple for now and store the main amount/action)
        // Finding the "main" action (usually the one with the most amount)
        const mainAlloc = [...rolloverAllocations].sort((a, b) => b.amount - a.amount)[0] || { action: 'dismiss', amount: 0 };

        await incomeDB.addClosing({
            year,
            month,
            closedAt: Date.now(),
            finalBalance,
            rolloverAction: mainAlloc.action,
            rolloverAmount: mainAlloc.amount,
            targetId: mainAlloc.targetId
        });

        // 2. Execute Actions
        for (const alloc of rolloverAllocations) {
            const { action, amount, targetId } = alloc;

            if (action === 'save' && targetId) {
                const closingDate = new Date(year, month + 1, 0).getTime();
                const allocation: SavingAllocation = {
                    id: uuidv4(),
                    goalId: targetId,
                    amount: amount,
                    date: closingDate,
                };
                await incomeDB.allocateSavingsWithTransaction(allocation);
            } else if (action === 'carry') {
                const targetMonth = month === 11 ? 0 : month + 1;
                const targetYear = month === 11 ? year + 1 : year;

                const rolloverIncome: RolloverIncome = {
                    id: uuidv4(),
                    name: `Remanente ${new Date(year, month).toLocaleString('es-ES', { month: 'long' })}`,
                    amount: amount,
                    currency: 'EUR',
                    createdAt: Date.now(),
                    status: 'received',
                    type: 'rollover',
                    originalMonth: month,
                    originalYear: year,
                    budgetMonth: targetMonth,
                    budgetYear: targetYear
                };
                await incomeDB.addIncomeWithTransaction(rolloverIncome);
            } else if (action === 'cover' && targetId) {
                const goal = (await incomeDB.getAllSavings()).find(g => g.id === targetId);
                if (goal) {
                    goal.currentAmount -= amount;
                    await incomeDB.updateSavingGoal(goal);
                }
            } else if (action === 'deduct') {
                const targetMonth = month === 11 ? 0 : month + 1;
                const targetYear = month === 11 ? year + 1 : year;

                const negativeRollover: RolloverIncome = {
                    id: uuidv4(),
                    name: `Déficit ${new Date(year, month).toLocaleString('es-ES', { month: 'long' })}`,
                    amount: -Math.abs(amount),
                    currency: 'EUR',
                    createdAt: Date.now(),
                    status: 'received',
                    type: 'rollover',
                    originalMonth: month,
                    originalYear: year,
                    budgetMonth: targetMonth,
                    budgetYear: targetYear
                };
                await incomeDB.addIncomeWithTransaction(negativeRollover);
            }
        }

        // 3. Execute Automated Monthly Savings
        const isDismissedData = rolloverAllocations.length === 1 && rolloverAllocations[0].action === 'dismiss';
        if (!isDismissedData) {
            const allSavings = await incomeDB.getAllSavings();
            const activeMonthlySavings: SavingGoal[] = allSavings.filter(g => (g.monthlySavingAmount || 0) > 0);

            for (const goal of activeMonthlySavings) {
                const redirection = data.redirections?.find(r => r.goalId === goal.id);
                const { needed, surplus } = getGoalSavingsImpact(goal);
                const closingDate = new Date(year, month + 1, 0).getTime();

                if (needed > 0) {
                    await incomeDB.allocateSavingsWithTransaction({
                        id: uuidv4(),
                        goalId: goal.id,
                        amount: needed,
                        date: closingDate
                    });
                }

                if (surplus > 0) {
                    const targetGoalId = redirection?.surplusTargetGoalId || goal.id;
                    if (targetGoalId !== 'stop') {
                        await incomeDB.allocateSavingsWithTransaction({
                            id: uuidv4(),
                            goalId: targetGoalId,
                            amount: surplus,
                            date: closingDate
                        });
                    }
                }

                if (redirection?.futureTargetGoalId) {
                    const amountToMove = goal.monthlySavingAmount || 0;
                    goal.monthlySavingAmount = 0;
                    await incomeDB.updateSavingGoal(goal);
                    if (redirection.futureTargetGoalId !== 'stop') {
                        const targetGoal = allSavings.find(g => g.id === redirection.futureTargetGoalId);
                        if (targetGoal) {
                            targetGoal.monthlySavingAmount = (targetGoal.monthlySavingAmount || 0) + amountToMove;
                            await incomeDB.updateSavingGoal(targetGoal);
                        }
                    }
                }
            }
        }

        await refreshFinance();
        await refreshIncomes();
        await refreshClosings();
        syncToExternalFolder();
    }, [refreshFinance, refreshIncomes, refreshClosings]);

    const deleteClosing = useCallback(async (year: number, month: number) => {
        const closing = await incomeDB.getClosing(year, month);
        if (!closing) return;

        console.log(`Deleting closing for ${year}-${month}...`);

        // 1. Delete ALL rollover incomes associated with this origin month
        // This covers both carry and deduct, even if they weren't the "main" action
        const allRollovers = await incomeDB.getRolloverIncomes();
        const associatedRollovers = allRollovers.filter(r =>
            Number(r.originalMonth) === Number(month) &&
            Number(r.originalYear) === Number(year)
        );

        for (const r of associatedRollovers) {
            console.log(`Deleting associated rollover income: ${r.amount} for ${r.budgetMonth}/${r.budgetYear}`);
            await incomeDB.deleteIncome(r.id);
        }

        // 2. Revert saving allocations created by the closing (no sourceAccountId and matching date)
        const closingDate = new Date(year, month + 1, 0).getTime();
        const allAllocations = await incomeDB.getAllAllocations();
        const closingAllocations = allAllocations.filter(a =>
            a.date === closingDate &&
            !a.sourceAccountId
        );

        for (const alloc of closingAllocations) {
            console.log(`Deleting automated saving allocation for goal ${alloc.goalId}: ${alloc.amount}`);
            await incomeDB.deleteAllocation(alloc.id);
        }

        // 3. Handle 'cover' action (this one doesn't create an allocation, it just subtracts from currentAmount)
        const { rolloverAction, rolloverAmount, targetId } = closing;
        if (rolloverAction === 'cover' && targetId) {
            const goal = (await incomeDB.getAllSavings()).find(g => g.id === targetId);
            if (goal) {
                console.log(`Reverting coverage impact on goal ${goal.name}: ${rolloverAmount}`);
                goal.currentAmount += Math.abs(rolloverAmount); // It was a negative impact, so we add it back
                await incomeDB.updateSavingGoal(goal);
            }
        }

        // 4. Delete the closing record itself
        await incomeDB.deleteClosing(year, month);

        await refreshFinance();
        await refreshIncomes();
        await refreshClosings();
        syncToExternalFolder();
    }, [refreshFinance, refreshIncomes, refreshClosings]);

    return (
        <MonthClosingContext.Provider value={{ isMonthClosed, closeMonth, deleteClosing, allClosings, pendingMonths, refreshClosings }}>
            {children}
        </MonthClosingContext.Provider>
    );
};

export const useMonthClosing = () => {
    const context = useContext(MonthClosingContext);
    if (context === undefined) {
        throw new Error('useMonthClosing must be used within a MonthClosingProvider');
    }
    return context;
};
