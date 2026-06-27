import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from 'react';
import type { 
    Account, CreditCard, Expense, SavingGoal, 
    SavingAllocation, RecurringExpense, Loan,
    AccountMovement, Category, Transfer,
    MonthClosing, MonthOverride 
} from '../types/finance';
import { DEFAULT_CATEGORIES } from '../types/finance';
import { incomeDB } from '../services/db';
import { v4 as uuidv4 } from 'uuid';

interface FinanceContextType {
    accounts: Account[];
    cards: CreditCard[];
    expenses: Expense[];
    savings: SavingGoal[];
    allocations: SavingAllocation[];
    recurringExpenses: RecurringExpense[];
    loans: Loan[];
    movements: AccountMovement[];
    categories: Category[];
    transfers: Transfer[];
    closings: MonthClosing[];
    overrides: MonthOverride[];
    loading: boolean;
    addAccount: (name: string, type: 'bank' | 'cash', initialBalance: number, color?: string) => Promise<void>;
    addCard: (name: string, linkedAccountId: string, limit: number, cutoffDay: number, paymentDay: number, type: 'debit' | 'credit', color?: string) => Promise<void>;
    addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
    addSavingGoal: (goal: Omit<SavingGoal, 'id'>) => Promise<void>;
    allocateSavings: (goalId: string, sourceAccountId: string, amount: number) => Promise<void>;
    addRecurringExpense: (expense: Omit<RecurringExpense, 'id'>) => Promise<void>;
    addLoan: (loan: Omit<Loan, 'id'>) => Promise<void>;
    updateAccount: (account: Account) => Promise<void>;
    updateCard: (card: CreditCard) => Promise<void>;
    updateSavingGoal: (goal: SavingGoal) => Promise<void>;
    updateLoan: (loan: Loan) => Promise<void>;
    deleteLoan: (id: string) => Promise<void>;
    deleteAccount: (id: string) => Promise<void>;
    deleteCard: (id: string) => Promise<void>;
    performTransfer: (fromAccountId: string, toAccountId: string, amount: number, notes?: string) => Promise<void>;
    addCategory: (category: Omit<Category, 'id' | 'updatedAt'>) => Promise<void>;
    updateCategory: (category: Category) => Promise<void>;
    deleteCategory: (id: string, reassignToId?: string) => Promise<void>;
    importData: (data: any) => Promise<void>;
    refreshFinance: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider = ({ children }: { children: ReactNode }) => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [cards, setCards] = useState<CreditCard[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [savings, setSavings] = useState<SavingGoal[]>([]);
    const [allocations, setAllocations] = useState<SavingAllocation[]>([]);
    const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
    const [loans, setLoans] = useState<Loan[]>([]);
    const [movements, setMovements] = useState<AccountMovement[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [closings, setClosings] = useState<MonthClosing[]>([]);
    const [overrides, setOverrides] = useState<MonthOverride[]>([]);
    const [loading, setLoading] = useState(true);

    const refreshFinance = useCallback(async () => {
        setLoading(true);
        try {
            const [
                accs, cds, exps, svs, alls, recs, lns, mvms, cats, trns, clss, ovrs
            ] = await Promise.all([
                incomeDB.getAllAccounts(),
                incomeDB.getAllCards(),
                incomeDB.getAllExpenses(),
                incomeDB.getAllSavings(),
                incomeDB.getAllAllocations(),
                incomeDB.getAllRecurringExpenses(),
                incomeDB.getAllLoans(),
                incomeDB.getAllMovements(),
                incomeDB.getAllCategories(),
                incomeDB.getAllTransfers(),
                incomeDB.getAllClosings(),
                incomeDB.getAllOverrides()
            ]);
            
            setAccounts(accs);
            setCards(cds);
            setExpenses(exps);
            setSavings(svs);
            setAllocations(alls);
            setRecurringExpenses(recs);
            setLoans(lns);
            setMovements(mvms);
            
            if (cats.length === 0) {
                // Seed default categories
                for (const cat of DEFAULT_CATEGORIES) {
                    await incomeDB.addCategory(cat);
                }
                const seededCats = await incomeDB.getAllCategories();
                setCategories(seededCats);
            } else {
                setCategories(cats);
            }
            
            setTransfers(trns);
            setClosings(clss);
            setOverrides(ovrs);
        } catch (error) {
            console.error("Failed to fetch finance data", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshFinance();
    }, [refreshFinance]);

    const importData = async (data: any) => {
        await incomeDB.importFullData(data);
        await refreshFinance();
    };

    const addAccount = async (name: string, type: 'bank' | 'cash', initialBalance: number, color?: string) => {
        const newAccount: Account = {
            id: uuidv4(),
            name,
            type,
            balance: initialBalance,
            currency: 'EUR',
            isMain: accounts.length === 0,
            color,
            updatedAt: Date.now()
        };
        await incomeDB.addAccount(newAccount);
        await refreshFinance();
    };

    const addCard = async (name: string, linkedAccountId: string, limit: number, cutoffDay: number, paymentDay: number, type: 'debit' | 'credit', color?: string) => {
        const newCard: CreditCard = {
            id: uuidv4(),
            name,
            type,
            linkedAccountId,
            limit,
            cutoffDay,
            paymentDay,
            currentBalance: 0,
            color,
            updatedAt: Date.now()
        };
        await incomeDB.addCard(newCard);
        await refreshFinance();
    };

    const addExpense = async (expenseData: Omit<Expense, 'id'>) => {
        const newExpense: Expense = {
            ...expenseData,
            id: uuidv4(),
            updatedAt: Date.now()
        };
        await incomeDB.addExpenseWithTransaction(newExpense);
        await refreshFinance();
    };

    const addSavingGoal = async (goalData: Omit<SavingGoal, 'id'>) => {
        const newGoal: SavingGoal = {
            ...goalData,
            id: uuidv4(),
            currentAmount: goalData.currentAmount ?? 0,
            updatedAt: Date.now()
        };
        await incomeDB.addSavingGoal(newGoal);
        await refreshFinance();
    };

    const allocateSavings = async (goalId: string, sourceAccountId: string, amount: number) => {
        const allocation: SavingAllocation = {
            id: uuidv4(),
            goalId,
            sourceAccountId,
            amount,
            date: Date.now(),
            updatedAt: Date.now()
        };
        await incomeDB.allocateSavingsWithTransaction(allocation);
        await refreshFinance();
    };

    const addRecurringExpense = async (data: Omit<RecurringExpense, 'id'>) => {
        const newRec: RecurringExpense = {
            ...data,
            id: uuidv4(),
            updatedAt: Date.now()
        };
        await incomeDB.addRecurringExpense(newRec);
        await refreshFinance();
    };

    const addLoan = async (loanData: Omit<Loan, 'id'>) => {
        const newLoan: Loan = {
            ...loanData,
            id: uuidv4(),
            updatedAt: Date.now()
        };
        await incomeDB.addLoan(newLoan);
        await refreshFinance();
    };

    const updateAccount = async (account: Account) => {
        await incomeDB.updateAccount({ ...account, updatedAt: Date.now() });
        await refreshFinance();
    };

    const updateCard = async (card: CreditCard) => {
        await incomeDB.updateCard({ ...card, updatedAt: Date.now() });
        await refreshFinance();
    };

    const updateSavingGoal = async (goal: SavingGoal) => {
        await incomeDB.updateSavingGoal({ ...goal, updatedAt: Date.now() });
        await refreshFinance();
    };

    const updateLoan = async (loan: Loan) => {
        await incomeDB.updateLoan({ ...loan, updatedAt: Date.now() });
        await refreshFinance();
    };

    const deleteLoan = async (id: string) => {
        await incomeDB.deleteLoan(id);
        await refreshFinance();
    };

    const deleteAccount = async (id: string) => {
        await incomeDB.deleteAccount(id);
        await refreshFinance();
    };

    const deleteCard = async (id: string) => {
        await incomeDB.deleteCard(id);
        await refreshFinance();
    };

    const performTransfer = async (fromAccountId: string, toAccountId: string, amount: number, notes?: string) => {
        const transfer: Transfer = {
            id: uuidv4(),
            fromAccountId,
            toAccountId,
            amount,
            currency: 'EUR',
            date: Date.now(),
            notes,
            updatedAt: Date.now()
        };
        await incomeDB.transferBalanceWithTransaction(transfer);
        await refreshFinance();
    };

    const addCategory = async (catData: Omit<Category, 'id' | 'updatedAt'>) => {
        const newCategory: Category = {
            ...catData,
            id: uuidv4(),
            updatedAt: Date.now()
        };
        await incomeDB.addCategory(newCategory);
        await refreshFinance();
    };

    const updateCategory = async (category: Category) => {
        await incomeDB.updateCategory({ ...category, updatedAt: Date.now() });
        await refreshFinance();
    };

    const deleteCategory = async (id: string, reassignToId?: string) => {
        await incomeDB.deleteCategory(id, reassignToId);
        await refreshFinance();
    };

    return (
        <FinanceContext.Provider value={{
            accounts,
            cards,
            expenses,
            savings,
            allocations,
            recurringExpenses,
            loans,
            movements,
            categories,
            transfers,
            closings,
            overrides,
            loading,
            addAccount,
            addCard,
            addExpense,
            addSavingGoal,
            allocateSavings,
            addRecurringExpense,
            addLoan,
            updateAccount,
            updateCard,
            updateSavingGoal,
            updateLoan,
            deleteLoan,
            deleteAccount,
            deleteCard,
            performTransfer,
            addCategory,
            updateCategory,
            deleteCategory,
            importData,
            refreshFinance
        }}>
            {children}
        </FinanceContext.Provider>
    );
};

export const useFinance = () => {
    const context = useContext(FinanceContext);
    if (context === undefined) {
        throw new Error('useFinance must be used within a FinanceProvider');
    }
    return context;
};
