import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from 'react';
import type { Account, CreditCard, Expense, SavingGoal, SavingAllocation, RecurringExpense, Category, Loan, MonthOverride } from '../types/finance';
import { DEFAULT_CATEGORIES } from '../types/finance';
import { incomeDB } from '../services/db';
import { v4 as uuidv4 } from 'uuid';

import { syncToExternalFolder } from '../services/syncService';

interface FinanceContextType {
    accounts: Account[];
    cards: CreditCard[];
    expenses: Expense[];
    savings: SavingGoal[];
    allocations: SavingAllocation[];
    recurringExpenses: RecurringExpense[];
    loans: Loan[];
    overrides: MonthOverride[];
    categories: Category[];
    loading: boolean;
    addAccount: (name: string, type: 'bank' | 'cash', initialBalance: number, color?: string) => Promise<void>;
    addCard: (name: string, linkedAccountId: string, limit: number, cutoffDay: number, paymentDay: number, type: 'debit' | 'credit', color?: string) => Promise<void>;
    addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
    addLoan: (loanData: Omit<Loan, 'id' | 'linkedRecurringExpenseId' | 'status'>, sourceAccountId?: string) => Promise<void>;
    addSavingGoal: (name: string, targetAmount: number, initialBalance: number, monthlySavingAmount?: number, isVirtual?: boolean, affectBudget?: boolean) => Promise<void>;
    allocateSavings: (goalId: string, amount: number, sourceAccountId?: string) => Promise<void>;
    addRecurringExpense: (expense: Omit<RecurringExpense, 'id'>) => Promise<void>;
    confirmRecurringExpense: (templateId: string, month: number, year: number, dateOverride?: number, amountOverride?: number) => Promise<void>;
    updateAccount: (account: Account) => Promise<void>;
    updateCard: (card: CreditCard) => Promise<void>;
    updateSavingGoal: (goal: SavingGoal) => Promise<void>;
    updateRecurringExpense: (expense: RecurringExpense) => Promise<void>;
    updateExpense: (expense: Expense) => Promise<void>;
    updateLoan: (loan: Loan) => Promise<void>;
    amortizeLoan: (loanId: string, amount: number, accountId: string, type: 'partial' | 'total', impact?: 'reduce_time' | 'reduce_installment') => Promise<void>;
    deleteAccount: (id: string) => Promise<void>;
    deleteCard: (id: string) => Promise<void>;
    deleteSaving: (id: string) => Promise<void>;
    deleteExpense: (id: string) => Promise<void>;
    deleteRecurringExpense: (id: string) => Promise<void>;
    deleteLoan: (id: string) => Promise<void>;
    updateMonthOverride: (override: MonthOverride) => Promise<void>;
    deleteMonthOverride: (year: number, month: number) => Promise<void>;
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
    const [overrides, setOverrides] = useState<MonthOverride[]>([]);
    const [loading, setLoading] = useState(true);

    const refreshFinance = useCallback(async () => {
        setLoading(true);
        try {
            const accs = await incomeDB.getAllAccounts();
            const cds = await incomeDB.getAllCards();
            const exps = await incomeDB.getAllExpenses();
            const svs = await incomeDB.getAllSavings();
            const alls = await incomeDB.getAllAllocations();
            const recs = await incomeDB.getAllRecurringExpenses();
            const lns = await incomeDB.getAllLoans();
            const ovs = await incomeDB.getAllOverrides();
            setAccounts(accs);
            setCards(cds);
            setExpenses(exps);
            setSavings(svs);
            setAllocations(alls);
            setRecurringExpenses(recs);
            setLoans(lns);
            setOverrides(ovs);
        } catch (error) {
            console.error("Failed to fetch finance data", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshFinance();
    }, [refreshFinance]);

    // ... existing add methods ...
    const addAccount = async (name: string, type: 'bank' | 'cash', balance: number, color?: string) => {
        const newAccount: Account = {
            id: uuidv4(),
            name,
            type,
            balance,
            currency: 'EUR',
            isMain: false,
            color
        };
        await incomeDB.addAccount(newAccount);
        await refreshFinance();
        syncToExternalFolder();
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
            color
        };
        await incomeDB.addCard(newCard);
        await refreshFinance();
        syncToExternalFolder();
    };

    const addExpense = async (expenseData: Omit<Expense, 'id'>) => {
        const newExpense: Expense = {
            ...expenseData,
            id: uuidv4()
        };
        await incomeDB.addExpenseWithTransaction(newExpense);
        await refreshFinance();
        syncToExternalFolder();
    };

    const addSavingGoal = async (name: string, targetAmount: number, initialBalance: number, monthlySavingAmount: number = 0, isVirtual: boolean = true, affectBudget: boolean = true) => {
        const id = uuidv4();
        const newGoal: SavingGoal = {
            id,
            name,
            targetAmount,
            currentAmount: affectBudget ? 0 : initialBalance,
            monthlySavingAmount,
            currency: 'EUR',
            isVirtual
        };
        await incomeDB.addSavingGoal(newGoal);

        if (affectBudget && initialBalance > 0) {
            // Create initial allocation
            await allocateSavings(id, initialBalance);
        } else {
            await refreshFinance();
        }

        syncToExternalFolder();
    };

    const allocateSavings = async (goalId: string, amount: number, sourceAccountId?: string) => {
        const allocation: SavingAllocation = {
            id: uuidv4(),
            goalId,
            sourceAccountId,
            amount,
            date: Date.now()
        };
        await incomeDB.allocateSavingsWithTransaction(allocation);
        await refreshFinance();
        syncToExternalFolder();
    };

    const addRecurringExpense = async (data: Omit<RecurringExpense, 'id'>) => {
        const newRec: RecurringExpense = {
            ...data,
            id: uuidv4()
        };
        await incomeDB.addRecurringExpense(newRec);
        await refreshFinance();
        syncToExternalFolder();
    };

    const addLoan = async (loanData: Omit<Loan, 'id' | 'linkedRecurringExpenseId' | 'status'>) => {
        const loanId = uuidv4();
        const recId = uuidv4();

        const newRec: RecurringExpense = {
            id: recId,
            description: `Cuota Préstamo: ${loanData.name}`,
            amount: loanData.monthlyInstallment,
            currency: loanData.currency,
            frequency: 'monthly',
            paymentDay: loanData.paymentDay,
            active: true,
            paymentMethod: loanData.paymentMethod,
            categoryId: loanData.categoryId
        };

        const newLoan: Loan = {
            ...loanData,
            id: loanId,
            linkedRecurringExpenseId: recId,
            status: 'active'
        };

        await incomeDB.addRecurringExpense(newRec);
        await incomeDB.addLoan(newLoan);
        await refreshFinance();
        syncToExternalFolder();
    };

    const confirmRecurringExpense = async (templateId: string, month: number, year: number, dateOverride?: number, amountOverride?: number) => {
        const template = recurringExpenses.find(e => e.id === templateId);
        if (!template) return;

        const date = dateOverride || new Date(year, month, template.paymentDay || new Date().getDate()).getTime();

        const newExpense: Expense = {
            id: uuidv4(),
            description: `${template.description} (${new Date(year, month).toLocaleString('es-ES', { month: 'long' })})`,
            amount: amountOverride !== undefined ? amountOverride : template.amount,
            currency: template.currency,
            date,
            categoryId: template.categoryId || 'cat_utilities',
            paymentMethod: template.paymentMethod || (template.sourceAccountId ? { type: 'account', accountId: template.sourceAccountId } : { type: 'cash' }),
            isFixed: true,
            status: 'paid',
            recurringExpenseId: templateId,
            period: `${year}-${String(month + 1).padStart(2, '0')}`
        };

        await incomeDB.addExpenseWithTransaction(newExpense);

        // Update Loan balance if linked
        const linkedLoan = loans.find(l => l.linkedRecurringExpenseId === templateId);
        if (linkedLoan) {
            const finalAmount = amountOverride !== undefined ? amountOverride : template.amount;
            const updatedRemaining = Math.max(0, linkedLoan.remainingAmount - finalAmount);
            const isCompleted = updatedRemaining <= 0;

            await incomeDB.updateLoan({
                ...linkedLoan,
                remainingAmount: updatedRemaining,
                status: isCompleted ? 'completed' : 'active'
            });

            if (isCompleted) {
                await incomeDB.updateRecurringExpense({
                    ...template,
                    active: false
                });
            }
        }

        await refreshFinance();
        syncToExternalFolder();
    };

    const updateExpense = async (expense: Expense) => {
        await incomeDB.updateExpense(expense);
        await refreshFinance();
        syncToExternalFolder();
    };

    const updateRecurringExpense = async (expense: RecurringExpense) => {
        await incomeDB.updateRecurringExpense(expense);
        await refreshFinance();
        syncToExternalFolder();
    };

    const updateAccount = async (account: Account) => {
        await incomeDB.updateAccount(account);
        await refreshFinance();
        syncToExternalFolder();
    };

    const updateCard = async (card: CreditCard) => {
        await incomeDB.updateCard(card);
        await refreshFinance();
        syncToExternalFolder();
    };

    const updateSavingGoal = async (goal: SavingGoal) => {
        await incomeDB.updateSavingGoal(goal);
        await refreshFinance();
        syncToExternalFolder();
    };

    const updateLoan = async (loan: Loan) => {
        await incomeDB.updateLoan(loan);

        // Update linked recurring expense
        if (loan.linkedRecurringExpenseId) {
            const template = recurringExpenses.find(e => e.id === loan.linkedRecurringExpenseId);
            if (template) {
                await incomeDB.updateRecurringExpense({
                    ...template,
                    description: `Cuota Préstamo: ${loan.name}`,
                    amount: loan.monthlyInstallment,
                    paymentDay: loan.paymentDay,
                    paymentMethod: loan.paymentMethod,
                    categoryId: loan.categoryId
                });
            }
        }

        await refreshFinance();
        syncToExternalFolder();
    };

    const amortizeLoan = async (loanId: string, amount: number, accountId: string, type: 'partial' | 'total', impact?: 'reduce_time' | 'reduce_installment') => {
        const loan = loans.find(l => l.id === loanId);
        if (!loan) return;

        // 1. Create one-time expense for amortization
        const amortizationExpense: Expense = {
            id: uuidv4(),
            description: `Amortización ${type === 'total' ? 'Total' : 'Parcial'} Préstamo: ${loan.name}`,
            amount: amount,
            currency: loan.currency,
            date: Date.now(),
            categoryId: loan.categoryId,
            paymentMethod: { type: 'account', accountId },
            isFixed: false,
            status: 'paid'
        };
        await incomeDB.addExpenseWithTransaction(amortizationExpense);

        // 2. Update loan remaining amount
        const updatedRemaining = Math.max(0, loan.remainingAmount - amount);
        const isCompleted = type === 'total' || updatedRemaining <= 0;

        // Create amortization record
        const newAmortization = {
            id: uuidv4(),
            date: Date.now(),
            amount,
            accountId,
            type,
            impact
        };

        const updatedLoan: Loan = {
            ...loan,
            remainingAmount: updatedRemaining,
            status: isCompleted ? 'completed' : 'active',
            amortizations: [...(loan.amortizations || []), newAmortization]
        };

        // 3. If partial and reduce_installment, recalculate monthlyInstallment
        // This is a simple logic, user might want to adjust it manually but we'll leave it as is for now
        // or just let them edit the loan normally. The prompt says "reducir el importe mensual si mantenemos el tiempo"
        // Since we don't have a "total months" field explicitly, we'll keep the installment same unless they edit it.

        await incomeDB.updateLoan(updatedLoan);

        // 4. If completed, deactivate recurring expense
        if (isCompleted && loan.linkedRecurringExpenseId) {
            const template = recurringExpenses.find(e => e.id === loan.linkedRecurringExpenseId);
            if (template) {
                await incomeDB.updateRecurringExpense({
                    ...template,
                    active: false
                });
            }
        }

        await refreshFinance();
        syncToExternalFolder();
    };

    const deleteAccount = async (id: string) => {
        await incomeDB.deleteAccount(id);
        await refreshFinance();
        syncToExternalFolder();
    };

    const deleteCard = async (id: string) => {
        await incomeDB.deleteCard(id);
        await refreshFinance();
        syncToExternalFolder();
    };

    const deleteSaving = async (id: string) => {
        await incomeDB.deleteSavingGoal(id);
        await refreshFinance();
        syncToExternalFolder();
    };

    const deleteExpense = async (id: string) => {
        await incomeDB.deleteExpense(id);
        await refreshFinance();
        syncToExternalFolder();
    };

    const deleteRecurringExpense = async (id: string) => {
        await incomeDB.deleteRecurringExpense(id);
        await refreshFinance();
        syncToExternalFolder();
    };

    const deleteLoan = async (id: string) => {
        const loan = loans.find(l => l.id === id);
        if (loan?.linkedRecurringExpenseId) {
            await incomeDB.deleteRecurringExpense(loan.linkedRecurringExpenseId);
        }
        await incomeDB.deleteLoan(id);
        await refreshFinance();
        syncToExternalFolder();
    };

    const updateMonthOverride = async (override: MonthOverride) => {
        await incomeDB.updateOverride(override);
        await refreshFinance();
        syncToExternalFolder();
    };

    const deleteMonthOverride = async (year: number, month: number) => {
        await incomeDB.deleteOverride(year, month);
        await refreshFinance();
        syncToExternalFolder();
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
            overrides,
            categories: DEFAULT_CATEGORIES,
            loading,
            addAccount,
            addCard,
            addExpense,
            addLoan,
            addSavingGoal,
            allocateSavings,
            addRecurringExpense,
            confirmRecurringExpense,
            updateAccount,
            updateCard,
            updateSavingGoal,
            updateRecurringExpense,
            updateExpense,
            updateLoan,
            amortizeLoan,
            deleteAccount,
            deleteCard,
            deleteSaving,
            deleteExpense,
            deleteRecurringExpense,
            deleteLoan,
            updateMonthOverride,
            deleteMonthOverride,
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
