import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Income, FixedIncome, ExtraIncome, RolloverIncome } from '../types/income';
import { incomeDB } from '../services/db';
import { v4 as uuidv4 } from 'uuid';

import { syncToExternalFolder } from '../services/syncService';

interface IncomeContextType {
    fixedIncomes: FixedIncome[];
    extraIncomes: ExtraIncome[];
    rolloverIncomes: RolloverIncome[];
    loading: boolean;
    addFixedIncome: (data: Omit<FixedIncome, 'id' | 'type' | 'createdAt'>) => Promise<void>;
    addExtraIncome: (data: Omit<ExtraIncome, 'id' | 'type' | 'createdAt'>) => Promise<void>;
    confirmFixedIncome: (templateId: string, month: number, year: number, accountId: string, options?: { dateOverride?: number, budgetMonth?: number, budgetYear?: number }) => Promise<void>;
    deleteIncome: (id: string) => Promise<void>;
    updateIncome: (income: Income) => Promise<void>;
    refresh: () => Promise<void>;
}

const IncomeContext = createContext<IncomeContextType | undefined>(undefined);

export const IncomeProvider = ({ children }: { children: ReactNode }) => {
    const [fixedIncomes, setFixedIncomes] = useState<FixedIncome[]>([]);
    const [extraIncomes, setExtraIncomes] = useState<ExtraIncome[]>([]);
    const [rolloverIncomes, setRolloverIncomes] = useState<RolloverIncome[]>([]);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const [fixed, extra, rollovers] = await Promise.all([
                incomeDB.getFixedIncomes(),
                incomeDB.getExtraIncomes(),
                incomeDB.getRolloverIncomes()
            ]);

            // Automatic Cleanup: Remove potentially duplicated fixed incomes if there's a confirmed one that matches perfectly
            let listChanged = false;
            const toDelete: string[] = [];

            // 1. Cleanup Rollover duplicates
            const seenRollover = new Set();
            for (const r of rollovers) {
                const key = `${r.originalMonth}-${r.originalYear}-${r.budgetMonth}-${r.budgetYear}-${r.amount}`;
                if (seenRollover.has(key)) {
                    toDelete.push(r.id);
                } else {
                    seenRollover.add(key);
                }
            }

            // 2. Cleanup Fixed Income confirmation duplicates
            const duplicates = extra.filter(inc => {
                if (!inc.fixedIncomeId) return false;
                return extra.some(other =>
                    other.id !== inc.id &&
                    other.fixedIncomeId === inc.fixedIncomeId &&
                    other.budgetMonth === inc.budgetMonth &&
                    other.budgetYear === inc.budgetYear &&
                    (other.updatedAt || 0) > (inc.updatedAt || 0)
                );
            });

            for (const d of duplicates) {
                if (!toDelete.includes(d.id)) {
                    toDelete.push(d.id);
                }
            }

            if (toDelete.length > 0) {
                console.warn(`Cleaning up ${toDelete.length} duplicate income entries.`);
                for (const id of toDelete) {
                    await incomeDB.deleteIncomeRaw(id);
                }
                listChanged = true;
            }

            if (listChanged) {
                const [finalFixed, finalExtra, finalRollovers] = await Promise.all([
                    incomeDB.getFixedIncomes(),
                    incomeDB.getExtraIncomes(),
                    incomeDB.getRolloverIncomes()
                ]);
                setFixedIncomes(finalFixed);
                setExtraIncomes(finalExtra);
                setRolloverIncomes(finalRollovers);
            } else {
                setFixedIncomes(fixed);
                setExtraIncomes(extra);
                setRolloverIncomes(rollovers);
            }

            syncToExternalFolder();
        } catch (error) {
            console.error('Error refreshing incomes:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    useEffect(() => {
        return incomeDB.onDataImported(() => {
            console.log('IncomeContext: Data imported, refreshing...');
            refresh();
        });
    }, [refresh]);

    // ... existing helpers ...

    const addFixedIncome = async (data: Omit<FixedIncome, 'id' | 'type' | 'createdAt'>) => {
        const newIncome: FixedIncome = {
            ...data,
            id: uuidv4(),
            type: 'fixed',
            createdAt: Date.now(),
            status: 'pending',
            linkedAccountId: data.linkedAccountId,
            effectiveDate: undefined
        };
        await incomeDB.addIncomeWithTransaction(newIncome);
        await refresh();
        syncToExternalFolder();
    };

    const addExtraIncome = async (data: Omit<ExtraIncome, 'id' | 'type' | 'createdAt'>) => {
        const id = uuidv4();
        const newIncome: ExtraIncome = {
            ...data,
            id,
            type: 'extra',
            createdAt: Date.now(),
            status: data.effectiveDate ? 'received' : 'pending'
        };
        await incomeDB.addIncomeWithTransaction(newIncome);

        if (newIncome.linkedSavingGoalId && newIncome.status === 'received') {
            const savings = await incomeDB.getAllSavings();
            const goal = (savings as any[]).find((s: any) => s.id === newIncome.linkedSavingGoalId);
            if (goal) {
                await incomeDB.updateSavingGoal({
                    ...goal,
                    currentAmount: goal.currentAmount + newIncome.amount
                });
            }
        }

        await refresh();
        syncToExternalFolder();
    };

    const confirmFixedIncome = async (templateId: string, month: number, year: number, accountId: string, options?: { dateOverride?: number, budgetMonth?: number, budgetYear?: number }) => {
        const template = fixedIncomes.find(i => i.id === templateId);
        if (!template) return;

        // NEW: Protection against duplicate confirmation
        const bMonth = options?.budgetMonth ?? month;
        const bYear = options?.budgetYear ?? year;

        // Check if there is already a confirmation for this template and budget month/year
        const existing = extraIncomes.find(i =>
            (i.fixedIncomeId === templateId ||
                (i.category === 'Ingreso Fijo Confirmado' && i.amount === template.amount && i.name.startsWith(template.name))) &&
            (i.budgetMonth === bMonth || (!i.budgetMonth && month === bMonth)) &&
            (i.budgetYear === bYear || (!i.budgetYear && year === bYear))
        );

        if (existing) {
            console.warn("Already confirmed this fixed income for this month.");
            return;
        }

        const date = options?.dateOverride || new Date(year, month, new Date().getDate()).getTime();

        const receivedIncome: ExtraIncome = {
            id: uuidv4(),
            type: 'extra',
            name: `${template.name} (${new Date(year, month).toLocaleString('es-ES', { month: 'long' })})`,
            amount: template.amount,
            currency: template.currency,
            createdAt: Date.now(),
            receivedDate: date,
            status: 'received',
            linkedAccountId: accountId,
            category: 'Ingreso Fijo Confirmado',
            budgetMonth: options?.budgetMonth,
            budgetYear: options?.budgetYear,
            fixedIncomeId: templateId
        };

        await incomeDB.addIncomeWithTransaction(receivedIncome);

        // NEW: Automatic savings allocation
        const savings = await incomeDB.getAllSavings();
        const goalsToSave = (savings as any[]).filter(s => s.linkedFixedIncomeId === templateId && (s.monthlySavingAmount || 0) > 0);

        if (goalsToSave.length > 0) {
            console.log(`Auto-allocating savings for ${goalsToSave.length} goals...`);
            for (const goal of goalsToSave) {
                const allocation = {
                    id: uuidv4(),
                    goalId: goal.id,
                    sourceAccountId: accountId,
                    amount: goal.monthlySavingAmount,
                    date: date
                };
                await incomeDB.allocateSavingsWithTransaction(allocation);
            }
        }

        await refresh();
        syncToExternalFolder();
    };

    const deleteIncome = async (id: string) => {
        const income = [...fixedIncomes, ...extraIncomes].find(i => i.id === id);
        if (income && income.type === 'extra' && income.linkedSavingGoalId && income.status === 'received') {
            const savings = await incomeDB.getAllSavings();
            const goal = (savings as any[]).find((s: any) => s.id === income.linkedSavingGoalId);
            if (goal) {
                await incomeDB.updateSavingGoal({
                    ...goal,
                    currentAmount: goal.currentAmount - income.amount
                });
            }
        }
        await incomeDB.deleteIncome(id);
        await refresh();
        syncToExternalFolder();
    };

    const updateIncome = async (income: Income) => {
        const oldIncome = [...fixedIncomes, ...extraIncomes].find(i => i.id === income.id);
        await incomeDB.updateIncome(income);

        // Adjust saving goal if linked and extra income
        if (income.type === 'extra' && (oldIncome?.linkedSavingGoalId || income.linkedSavingGoalId)) {
            const oldExtra = oldIncome?.type === 'extra' ? oldIncome : null;

            // Restore old goal amount
            if (oldExtra?.linkedSavingGoalId && oldExtra.status === 'received') {
                const savings = await incomeDB.getAllSavings();
                const oldGoal = (savings as any[]).find((s: any) => s.id === oldExtra.linkedSavingGoalId);
                if (oldGoal) {
                    await incomeDB.updateSavingGoal({
                        ...oldGoal,
                        currentAmount: oldGoal.currentAmount - oldExtra.amount
                    });
                }
            }

            // Add new goal amount
            if (income.linkedSavingGoalId && income.status === 'received') {
                const savings = await incomeDB.getAllSavings();
                const newGoal = (savings as any[]).find((s: any) => s.id === income.linkedSavingGoalId);
                if (newGoal) {
                    await incomeDB.updateSavingGoal({
                        ...newGoal,
                        currentAmount: newGoal.currentAmount + income.amount
                    });
                }
            }
        }

        await refresh();
        syncToExternalFolder();
    };

    return (
        <IncomeContext.Provider value={{
            fixedIncomes,
            extraIncomes,
            rolloverIncomes,
            loading,
            addFixedIncome,
            addExtraIncome,
            confirmFixedIncome,
            deleteIncome,
            updateIncome,
            refresh
        }}>
            {children}
        </IncomeContext.Provider>
    );
};

export const useIncome = () => {
    const context = useContext(IncomeContext);
    if (context === undefined) {
        throw new Error('useIncome must be used within an IncomeProvider');
    }
    return context;
};
