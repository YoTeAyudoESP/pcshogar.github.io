import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Income, FixedIncome, ExtraIncome } from '../types/income';
import { incomeDB } from '../services/db';
import { v4 as uuidv4 } from 'uuid';

interface IncomeContextType {
    fixedIncomes: FixedIncome[];
    extraIncomes: ExtraIncome[];
    loading: boolean;
    addFixedIncome: (data: Omit<FixedIncome, 'id' | 'type' | 'createdAt'>) => Promise<void>;
    addExtraIncome: (data: Omit<ExtraIncome, 'id' | 'type' | 'createdAt'>) => Promise<void>;
    deleteIncome: (id: string) => Promise<void>;
    updateIncome: (income: Income) => Promise<void>;
    refresh: () => Promise<void>;
}

const IncomeContext = createContext<IncomeContextType | undefined>(undefined);

export const IncomeProvider = ({ children }: { children: ReactNode }) => {
    const [fixedIncomes, setFixedIncomes] = useState<FixedIncome[]>([]);
    const [extraIncomes, setExtraIncomes] = useState<ExtraIncome[]>([]);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const fixed = await incomeDB.getFixedIncomes();
            const extra = await incomeDB.getExtraIncomes();
            setFixedIncomes(fixed);
            setExtraIncomes(extra);
        } catch (error) {
            console.error("Failed to fetch incomes", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const addFixedIncome = async (data: Omit<FixedIncome, 'id' | 'type' | 'createdAt'>) => {
        const newIncome: FixedIncome = {
            ...data,
            id: uuidv4(),
            type: 'fixed',
            createdAt: Date.now(),
            status: 'pending',
            linkedAccountId: undefined, // Fixed incomes usually don't update balance immediately unless specified? 
            // User request implies "select day effective". Fixed incomes might auto-realize? 
            // For now, Fixed Income starts as pending.
            // Logic for "Recibido" on fixed income needs a "Payment" record or status toggle.
            // Keeping simple for now: Fixed Incomes are projections.
            effectiveDate: undefined
        };
        await incomeDB.addIncomeWithTransaction(newIncome);
        await refresh();
    };

    const addExtraIncome = async (data: Omit<ExtraIncome, 'id' | 'type' | 'createdAt'>) => {
        const newIncome: ExtraIncome = {
            ...data,
            id: uuidv4(),
            type: 'extra',
            createdAt: Date.now(),
            status: data.effectiveDate ? 'received' : 'pending'
        };
        await incomeDB.addIncomeWithTransaction(newIncome);
        await refresh();
    };

    const deleteIncome = async (id: string) => {
        await incomeDB.deleteIncomeWithTransaction(id);
        await refresh();
    };

    const updateIncome = async (income: Income) => {
        await incomeDB.updateIncomeWithTransaction(income);
        await refresh();
    };

    return (
        <IncomeContext.Provider value={{
            fixedIncomes,
            extraIncomes,
            loading,
            addFixedIncome,
            addExtraIncome,
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
