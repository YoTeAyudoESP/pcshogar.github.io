import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from 'react';
import type { Income, FixedIncome, ExtraIncome } from '../types/income';
import type { 
    Account, CreditCard, Expense, SavingGoal, 
    SavingAllocation, RecurringExpense, Loan,
    AccountMovement, Category, Transfer,
    MonthClosing, MonthOverride
} from '../types/finance';
import { 
    DEFAULT_CATEGORIES, 
    DEFAULT_INCOME_CATEGORIES 
} from '../types/finance';
import { incomeDB } from '../services/db';
import { SyncService } from '../services/syncService';
import { useAppSettings } from './AppSettingsContext';
import { calculateAvailableBalanceForMonth } from '../utils/financeCalculations';
import { DropboxService } from '../services/dropboxService';
import { GoogleDriveService } from '../services/googleDriveService';
import { useToast } from './ToastContext';

// Simple fallback for uuidv4 to avoid dependency issues on some devices
const uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

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
    incomes: Income[];
    fixedIncomes: FixedIncome[];
    extraIncomes: Income[];
    loading: boolean;
    addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
    updateCategory: (category: Category) => Promise<void>;
    deleteCategory: (id: string, reassignToId?: string) => Promise<void>;
    addAccount: (name: string, type: 'bank' | 'cash', initialBalance: number, color?: string) => Promise<void>;
    addCard: (name: string, linkedAccountId: string, limit: number, cutoffDay: number, paymentDay: number, type: 'debit' | 'credit' | 'virtual', color?: string, initialBalance?: number) => Promise<void>;
    addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
    addSavingGoal: (goal: Omit<SavingGoal, 'id'>) => Promise<void>;
    allocateSavings: (goalId: string, sourceAccountId: string, amount: number) => Promise<void>;
    transferSavings: (fromGoalId: string, toGoalId: string, amount: number) => Promise<void>;
    adjustSavings: (goalId: string, amount: number, accountId?: string, isBudgetAdjustment?: boolean) => Promise<void>;
    deleteSavingGoal: (id: string) => Promise<void>;
    addRecurringExpense: (expense: Omit<RecurringExpense, 'id'>) => Promise<void>;
    updateRecurringExpense: (expense: RecurringExpense) => Promise<void>;
    deleteRecurringExpense: (id: string) => Promise<void>;
    addFixedIncome: (income: Omit<FixedIncome, 'id' | 'type' | 'createdAt'>) => Promise<void>;
    addExtraIncome: (income: Omit<ExtraIncome, 'id' | 'type' | 'createdAt'>) => Promise<void>;
    updateIncome: (income: Income) => Promise<void>;
    deleteIncome: (id: string, restorePending?: boolean) => Promise<void>;
    confirmFixedMovement: (type: 'income' | 'expense', fixedId: string, amount: number, date: number, accountId: string, period: string, description: string, categoryId?: string) => Promise<void>;
    confirmExtraIncome: (
        incomeId: string,
        amount: number,
        date: number,
        accountId: string,
        period: string,
        excludeFromBudget: boolean,
        targetSavingGoalId?: string
    ) => Promise<void>;
    addLoan: (loan: Omit<Loan, 'id'>) => Promise<void>;
    updateAccount: (account: Account) => Promise<void>;
    updateCard: (card: CreditCard) => Promise<void>;
    updateSavingGoal: (goal: SavingGoal) => Promise<void>;
    updateLoan: (loan: Loan) => Promise<void>;
    amortizeLoan: (loanId: string, amount: number, accountId: string, date: number, notes?: string) => Promise<void>;
    deleteLoan: (id: string) => Promise<void>;
    deleteAccount: (id: string) => Promise<void>;
    deleteCard: (id: string) => Promise<void>;
    deleteExpense: (id: string, restorePending?: boolean) => Promise<void>;
    discardFixedMovement: (type: 'income' | 'expense', fixedId: string, period: string) => Promise<void>;
    updateExpense: (expense: Expense) => Promise<void>;
    performTransfer: (fromAccountId: string, toAccountId: string, amount: number, notes?: string) => Promise<void>;
    setMonthOverride: (year: number, month: number, amount: number) => Promise<void>;
    deleteMonthOverride: (id: string) => Promise<void>;
    closeMonthWithDecision: (closing: MonthClosing, distributions: { type: 'next_month' | 'saving_goal', targetId?: string, amount: number }[]) => Promise<void>;
    reverseMonthClosing: (id: string) => Promise<void>;
    updateMonthClosing: (closing: MonthClosing) => Promise<void>;
    ignoreMonthClosing: (id: string) => Promise<void>;
    editMonthClosingAmount: (closingId: string, newAmount: number) => Promise<void>;
    setPendingClosing: (closing: MonthClosing | null) => void;
    pendingClosing: MonthClosing | null;
    importData: (data: any) => Promise<void>;
    settleCardCycle: (cardId: string, amount: number, totalPending: number, date: number, accountId: string, rangeStart?: number, rangeEnd?: number) => Promise<void>;
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
    const [incomes, setIncomes] = useState<Income[]>([]);
    const [fixedIncomes, setFixedIncomes] = useState<FixedIncome[]>([]);
    const [extraIncomes, setExtraIncomes] = useState<Income[]>([]);
    const [loading, setLoading] = useState(true);
    const [pendingClosing, setPendingClosing] = useState<MonthClosing | null>(null);

    const refreshFinance = useCallback(async () => {
        setLoading(true);
        try {
            const [
                accs, cds, exps, svs, alls, recs, lns, mvms, cats, trns, clss, ovrs, incs
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
                incomeDB.getAllOverrides(),
                incomeDB.getAllIncomes()
            ]);
            
            setAccounts(accs);
            setCards(cds);
            setExpenses(exps);
            setSavings(svs);
            setAllocations(alls);
            setRecurringExpenses(recs);
            setLoans(lns);
            setMovements(mvms);
            setTransfers(trns);
            setClosings(clss);
            setOverrides(ovrs);

            // Auto-repair buggy fixed incomes saved as received
            let activeIncomes = [...incs];
            let didRepair = false;
            for (const inc of incs) {
                if (inc.type === 'fixed' && inc.status === 'received') {
                    didRepair = true;
                    const bMonth = inc.budgetMonth ?? new Date().getMonth();
                    const bYear = inc.budgetYear ?? new Date().getFullYear();
                    const period = `${bYear}-${(bMonth + 1).toString().padStart(2, '0')}`;
                    
                    const repairedFixed: FixedIncome = {
                        ...inc,
                        status: 'pending',
                        ignoredPeriods: [...(inc.ignoredPeriods || []), period],
                        updatedAt: Date.now()
                    } as FixedIncome;
                    await incomeDB.updateIncome(repairedFixed);
                    
                    const extraIncome: any = {
                        id: uuidv4(),
                        name: inc.name,
                        amount: inc.amount,
                        currency: inc.currency || 'EUR',
                        createdAt: inc.createdAt || Date.now(),
                        effectiveDate: inc.effectiveDate || inc.createdAt || Date.now(),
                        linkedAccountId: inc.linkedAccountId || '',
                        status: 'received',
                        type: 'extra',
                        budgetMonth: bMonth,
                        budgetYear: bYear,
                        period,
                        fixedIncomeId: inc.id,
                        updatedAt: Date.now()
                    };
                    await incomeDB.addIncomeWithTransaction(extraIncome);
                }
            }
            if (didRepair) {
                activeIncomes = await incomeDB.getAllIncomes();
            }

            setIncomes(activeIncomes);
            
            // Split incomes for convenience
            setFixedIncomes(activeIncomes.filter((i): i is FixedIncome => i.type === 'fixed'));
            setExtraIncomes(activeIncomes.filter(i => i.type === 'extra' || i.type === 'rollover'));

            // SEEDING: If no categories exist, add default ones
            if (cats.length === 0) {
                const allDefaults = [...DEFAULT_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES];
                await Promise.all(allDefaults.map(cat => incomeDB.addCategory(cat)));
                // Refresh again to get the seeded categories
                const newCats = await incomeDB.getAllCategories();
                setCategories(newCats);
            } else {
                setCategories(cats);
            }

            // AUTO-DETECTION of pending month closing
            const now = new Date();
            const currentRealYear = now.getFullYear();
            const currentRealMonth = now.getMonth();
            
            // Calculate previous month
            let prevMonth = currentRealMonth - 1;
            let prevYear = currentRealYear;
            if (prevMonth < 0) {
                prevMonth = 11;
                prevYear--;
            }

            const prevId = `${prevYear}-${(prevMonth + 1).toString().padStart(2, '0')}`;
            
            let existingClosing = clss.find(c => c.id === prevId);
            
            // Check if there is already a rollover income for the target month
            const hasExistingRollover = incs.some(i => 
                i.type === 'rollover' && 
                i.budgetMonth === currentRealMonth && 
                i.budgetYear === currentRealYear
            );

            if (!existingClosing && !hasExistingRollover) {
                // We need to calculate if there's any remaining balance
                const { availableToSpend } = calculateAvailableBalanceForMonth(prevYear, prevMonth, {
                    fixedIncomes: incs.filter((i): i is FixedIncome => i.type === 'fixed'),
                    extraIncomes: incs.filter(i => i.type === 'extra' || i.type === 'rollover'),
                    expenses: exps,
                    allocations: alls,
                    savings: svs,
                    recurringExpenses: recs,
                    overrides: ovrs,
                    cards: cds
                });

                if (Math.abs(availableToSpend) > 0.001) {
                    const newPendingClosing: MonthClosing = {
                        id: prevId,
                        year: prevYear,
                        month: prevMonth,
                        closedAt: Date.now(),
                        finalBalance: availableToSpend,
                        status: 'pending',
                        updatedAt: 1 // Low timestamp so synced 'processed' closings always overwrite it
                    };
                    await incomeDB.addMonthClosing(newPendingClosing);
                    clss.push(newPendingClosing);
                    existingClosing = newPendingClosing;
                }
            }

            // If there's a pending closing, show modal
            const pending = clss.find(c => c.status === 'pending');
            if (pending) {
                setPendingClosing(pending);
            } else {
                setPendingClosing(null);
            }

        } catch (error) {
            console.error("Failed to fetch finance data", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshFinance();
    }, [refreshFinance]);

    const { settings, updateSyncSettings } = useAppSettings();
    const { showToast } = useToast();

    // Auto-sync watcher
    useEffect(() => {
        if (!loading && settings.sync.enabled) {
            const triggerSync = async () => {
                if (settings.sync.type === 'local' && settings.sync.localPath) {
                    const success = await SyncService.syncToLocalFile(settings.sync.localPath);
                    if (success) {
                        updateSyncSettings({ lastSync: Date.now() });
                        showToast('Copia local actualizada', 'success');
                    }
                } else if (settings.sync.type === 'dropbox' && settings.sync.dropboxToken) {
                    try {
                        const timestamp = await DropboxService.sync();
                        if (timestamp) {
                            updateSyncSettings({ lastSync: timestamp });
                            await refreshFinance();
                            showToast('Datos sincronizados con Dropbox', 'success');
                        }
                    } catch (e) {
                        console.error("Auto-sync Dropbox failed", e);
                        showToast('Error al sincronizar con Dropbox', 'error');
                    }
                } else if (settings.sync.type === 'googledrive' && settings.sync.googledriveToken) {
                    try {
                        const timestamp = await GoogleDriveService.sync();
                        if (timestamp) {
                            updateSyncSettings({ lastSync: timestamp });
                            await refreshFinance();
                            showToast('Datos sincronizados con Google Drive', 'success');
                        }
                    } catch (e) {
                        console.error("Auto-sync Google Drive failed", e);
                        showToast('Error al sincronizar con Google Drive', 'error');
                    }
                }
            };

            const timer = setTimeout(triggerSync, 2000); // Debounce 2s for cloud
            return () => clearTimeout(timer);
        }
    }, [
        accounts, cards, expenses, savings, allocations, 
        recurringExpenses, loans, movements, categories, 
        transfers, closings, overrides, incomes,
        settings.sync.enabled, settings.sync.localPath, settings.sync.dropboxToken, settings.sync.googledriveToken, settings.sync.type, loading, showToast, refreshFinance
    ]);

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

    const addCard = async (name: string, linkedAccountId: string, limit: number, cutoffDay: number, paymentDay: number, type: 'debit' | 'credit' | 'virtual', color?: string, initialBalance?: number) => {
        const newCard: CreditCard = {
            id: uuidv4(),
            name,
            type,
            linkedAccountId: type === 'virtual' ? '' : linkedAccountId,
            limit: type === 'virtual' ? 0 : limit,
            cutoffDay: type === 'virtual' ? 0 : cutoffDay,
            paymentDay: type === 'virtual' ? 0 : paymentDay,
            currentBalance: type === 'virtual' ? (initialBalance ?? 0) : 0,
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
            createdAt: Date.now(),
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
            type: 'automatic',
            date: Date.now(),
            updatedAt: Date.now()
        };
        await incomeDB.allocateSavingsWithTransaction(allocation);
        await refreshFinance();
    };

    const transferSavings = async (fromGoalId: string, toGoalId: string, amount: number) => {
        await incomeDB.transferSavingsWithTransaction(fromGoalId, toGoalId, amount);
        await refreshFinance();
    };

    const adjustSavings = async (goalId: string, amount: number, accountId?: string, isBudgetAdjustment: boolean = true) => {
        await incomeDB.adjustSavingGoalWithTransaction(goalId, amount, accountId, isBudgetAdjustment);
        await refreshFinance();
    };

    const deleteSavingGoal = async (id: string) => {
        await incomeDB.recordDeletion('savings', id);
        await incomeDB.deleteSavingGoal(id);
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

    const updateRecurringExpense = async (expense: RecurringExpense) => {
        await incomeDB.updateRecurringExpense({ ...expense, updatedAt: Date.now() });
        await refreshFinance();
    };

    const deleteRecurringExpense = async (id: string) => {
        await incomeDB.recordDeletion('recurring_expenses', id);
        await incomeDB.deleteRecurringExpense(id);
        await refreshFinance();
    };

    const addFixedIncome = async (data: Omit<FixedIncome, 'id' | 'type' | 'createdAt'>) => {
        const fixedId = uuidv4();
        const now = Date.now();
        const bMonth = data.budgetMonth ?? new Date().getMonth();
        const bYear = data.budgetYear ?? new Date().getFullYear();
        const period = `${bYear}-${(bMonth + 1).toString().padStart(2, '0')}`;
        
        const isReceived = data.status === 'received';
        
        const newIncome: FixedIncome = {
            ...data,
            id: fixedId,
            type: 'fixed',
            createdAt: now,
            updatedAt: now,
            status: 'pending',
            ignoredPeriods: isReceived ? [period] : []
        };
        await incomeDB.addIncomeWithTransaction(newIncome);
        
        if (isReceived) {
            const extraIncome: any = {
                id: uuidv4(),
                name: data.name,
                amount: data.amount,
                currency: data.currency || 'EUR',
                createdAt: now,
                effectiveDate: data.effectiveDate || now,
                linkedAccountId: data.linkedAccountId || '',
                status: 'received',
                type: 'extra',
                budgetMonth: bMonth,
                budgetYear: bYear,
                period,
                fixedIncomeId: fixedId,
                updatedAt: now
            };
            await incomeDB.addIncomeWithTransaction(extraIncome);
        }
        
        await refreshFinance();
    };

    const addExtraIncome = async (data: Omit<ExtraIncome, 'id' | 'type' | 'createdAt'>) => {
        const now = Date.now();
        const newIncome: any = {
            ...data,
            id: uuidv4(),
            type: 'extra',
            createdAt: now,
            updatedAt: now,
            status: data.status || (data.effectiveDate ? 'received' : 'pending'),
            effectiveDate: data.effectiveDate || (data.status === 'received' ? now : undefined)
        };
        await incomeDB.addIncomeWithTransaction(newIncome);
        await refreshFinance();
    };

    const deleteIncome = async (id: string, restorePending: boolean = true) => {
        const income = incomes.find(i => i.id === id);
        if (income && (income as any).fixedIncomeId && income.period && restorePending) {
            const fixed = incomes.find(i => i.id === (income as any).fixedIncomeId) as FixedIncome;
            if (fixed) {
                const ignoredPeriods = (fixed.ignoredPeriods || []).filter(p => p !== income.period);
                await incomeDB.updateIncome({ ...fixed, ignoredPeriods, updatedAt: Date.now() } as any);
            }
        }
        
        await incomeDB.recordDeletion('incomes', id);
        await incomeDB.deleteIncomeWithTransaction(id);
        await refreshFinance();
    };

    const discardFixedMovement = async (type: 'income' | 'expense', fixedId: string, period: string) => {
        if (type === 'income') {
            const fixed = incomes.find(i => i.id === fixedId) as FixedIncome;
            if (fixed) {
                const ignoredPeriods = [...(fixed.ignoredPeriods || []), period];
                await incomeDB.updateIncome({ ...fixed, ignoredPeriods, updatedAt: Date.now() } as any);
            }
        } else {
            const rec = recurringExpenses.find(r => r.id === fixedId);
            if (rec) {
                const ignoredPeriods = [...(rec.ignoredPeriods || []), period];
                await incomeDB.updateRecurringExpense({ ...rec, ignoredPeriods, updatedAt: Date.now() });
            }
        }
        await refreshFinance();
    };

    const updateIncome = async (income: Income) => {
        await incomeDB.updateIncomeWithTransaction({ ...income, updatedAt: Date.now() });
        await refreshFinance();
    };

    const confirmFixedMovement = async (
        type: 'income' | 'expense',
        fixedId: string,
        amount: number,
        date: number,
        accountId: string,
        period: string,
        description: string,
        categoryId?: string
    ) => {
        if (type === 'income') {
            const [y, m] = period.split('-').map(Number);
            const budgetMonth = m - 1;
            const budgetYear = y;
            
            const newIncome: any = {
                id: uuidv4(),
                name: description,
                amount,
                currency: 'EUR',
                createdAt: Date.now(),
                effectiveDate: date,
                linkedAccountId: accountId,
                status: 'received',
                type: 'extra',
                budgetMonth,
                budgetYear,
                period,
                fixedIncomeId: fixedId
            };
            await incomeDB.addIncomeWithTransaction(newIncome);
            
            const fixed = incomes.find(i => i.id === fixedId) as FixedIncome;
            if (fixed) {
                const ignoredPeriods = [...(fixed.ignoredPeriods || []), period];
                await incomeDB.updateIncome({ ...fixed, ignoredPeriods });
            }

            // Auto-savings allocations for linked piggy banks
            const linkedGoals = savings.filter(s => s.linkedFixedIncomeId === fixedId);
            for (const goal of linkedGoals) {
                const saveAmount = goal.monthlySavingAmount || 0;
                if (saveAmount > 0) {
                    const sourceAcc = goal.automaticSourceAccountId || accountId;
                    if (sourceAcc) {
                        const allocation: SavingAllocation = {
                            id: uuidv4(),
                            goalId: goal.id,
                            sourceAccountId: sourceAcc,
                            amount: saveAmount,
                            type: 'automatic',
                            date: Date.now(),
                            updatedAt: Date.now(),
                            description: `Ahorro auto. desde cobro de: ${description}`
                        };
                        await incomeDB.allocateSavingsWithTransaction(allocation);
                    }
                }
            }
        } else {
            const isCard = cards.some(c => c.id === accountId);
            const newExpense: Expense = {
                id: uuidv4(),
                description,
                amount,
                currency: 'EUR',
                date,
                categoryId: categoryId || 'cat_other',
                paymentMethod: isCard ? { type: 'card', cardId: accountId } : { type: 'account', accountId },
                isFixed: true,
                status: 'paid',
                period,
                recurringExpenseId: fixedId,
                updatedAt: Date.now()
            };
            await incomeDB.addExpenseWithTransaction(newExpense);
            
            const rec = recurringExpenses.find(r => r.id === fixedId);
            if (rec) {
                const ignoredPeriods = [...(rec.ignoredPeriods || []), period];
                await incomeDB.updateRecurringExpense({ ...rec, ignoredPeriods, updatedAt: Date.now() });
            }
        }
        await refreshFinance();
    };
 
    const confirmExtraIncome = async (
        incomeId: string,
        amount: number,
        date: number,
        accountId: string,
        period: string,
        excludeFromBudget: boolean,
        targetSavingGoalId?: string
    ) => {
        const income = incomes.find(i => i.id === incomeId);
        if (!income) throw new Error('Ingreso no encontrado');

        const [y, m] = period.split('-').map(Number);
        const budgetMonth = m - 1;
        const budgetYear = y;

        const updatedIncome: Income = {
            ...income,
            amount,
            status: 'received',
            effectiveDate: date,
            linkedAccountId: accountId,
            period,
            budgetMonth,
            budgetYear,
            excludeFromBudget,
            updatedAt: Date.now()
        } as Income;

        await incomeDB.updateIncomeWithTransaction(updatedIncome);

        if (targetSavingGoalId && accountId) {
            const allocation: SavingAllocation = {
                id: uuidv4(),
                goalId: targetSavingGoalId,
                sourceAccountId: accountId,
                amount,
                type: 'automatic',
                date: Date.now(),
                updatedAt: Date.now()
            };
            await incomeDB.allocateSavingsWithTransaction(allocation);
        }

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
    
    const amortizeLoan = async (loanId: string, amount: number, accountId: string, date: number, notes?: string) => {
        await incomeDB.amortizeLoanWithTransaction(loanId, amount, accountId, date, notes);
        await refreshFinance();
    };

    const deleteLoan = async (id: string) => {
        const loan = loans.find(l => l.id === id);
        if (loan && (loan.currentDebt ?? 0) > 0) {
            throw new Error('No se puede eliminar un préstamo con deuda pendiente. Por favor, amortízalo primero.');
        }
        await incomeDB.recordDeletion('loans', id);
        await incomeDB.deleteLoan(id);
        await refreshFinance();
    };

    const deleteAccount = async (id: string) => {
        await incomeDB.recordDeletion('accounts', id);
        await incomeDB.deleteAccount(id);
        await refreshFinance();
    };

    const deleteCard = async (id: string) => {
        await incomeDB.recordDeletion('cards', id);
        await incomeDB.deleteCard(id);
        await refreshFinance();
    };

    const deleteExpense = async (id: string, restorePending: boolean = true) => {
        const expense = expenses.find(e => e.id === id);
        if (!expense) return;

        if (expense.recurringExpenseId && expense.period && restorePending) {
            // Restore the fixed movement to "Pending"
            const rec = recurringExpenses.find(r => r.id === expense.recurringExpenseId);
            if (rec) {
                const ignoredPeriods = (rec.ignoredPeriods || []).filter(p => p !== expense.period);
                await incomeDB.updateRecurringExpense({ ...rec, ignoredPeriods, updatedAt: Date.now() });
            }
        }

        // Handle settlement reversal
        if (expense.isSettlement && expense.settlementMetadata) {
            const { cardId, rangeStart, rangeEnd, isCarryover } = expense.settlementMetadata;
            
            if (!isCarryover) {
                // Find all expenses that were settled in this range and un-settle them
                const settledExpenses = expenses.filter(e => 
                    e.paymentMethod.type === 'card' && 
                    e.paymentMethod.cardId === cardId && 
                    e.isSettled
                );

                for (const exp of settledExpenses) {
                    if (!exp?.paymentMethod) continue;
                    const d = new Date(exp.date);
                    const adjustment = (exp.paymentMethod as any)?.settlementAdjustment || 0;
                    if (adjustment !== 0) d.setMonth(d.getMonth() + adjustment);
                    const effectiveTime = d.getTime();

                    if (effectiveTime >= rangeStart && effectiveTime <= rangeEnd) {
                        await incomeDB.updateExpense({
                            ...exp,
                            isSettled: false,
                            updatedAt: Date.now()
                        });
                    }
                }
            }
        }
        
        // Track deletion for sync
        await incomeDB.recordDeletion('expenses', id);
        
        await incomeDB.deleteExpenseWithTransaction(id);
        await refreshFinance();
    };

    const updateExpense = async (expense: Expense) => {
        await incomeDB.updateExpense({ ...expense, updatedAt: Date.now() });
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

    const setMonthOverride = async (year: number, month: number, amount: number) => {
        // month is 0-indexed, but ID should use 1-indexed for YYYY-MM consistency
        const id = `${year}-${(month + 1).toString().padStart(2, '0')}`;
        await incomeDB.addMonthOverride({
            id,
            year,
            month,
            amount,
            isManual: true,
            updatedAt: Date.now()
        });
        await refreshFinance();
    };

    const deleteMonthOverride = async (id: string) => {
        await incomeDB.recordDeletion('overrides', id);
        await incomeDB.deleteMonthOverride(id);
        await refreshFinance();
    };

    const addCategory = async (categoryData: Omit<Category, 'id'>) => {
        const newCategory: Category = {
            ...categoryData,
            id: uuidv4(),
            updatedAt: Date.now()
        };
        await incomeDB.addCategory(newCategory);
        await refreshFinance();
    };

    const updateCategory = async (category: Category) => {
        await incomeDB.updateCategory({
            ...category,
            updatedAt: Date.now()
        });
        await refreshFinance();
    };

    const deleteCategory = async (id: string, reassignToId?: string) => {
        await incomeDB.recordDeletion('categories', id);
        await incomeDB.deleteCategoryWithReassignment(id, reassignToId);
        await refreshFinance();
    };

    const updateMonthClosing = async (closing: MonthClosing) => {
        await incomeDB.addMonthClosing(closing);
        await refreshFinance();
    };

    const closeMonthWithDecision = async (closing: MonthClosing, distributions: { type: 'next_month' | 'saving_goal', targetId?: string, amount: number }[]) => {
        // 1. Process each distribution
        for (const dist of distributions) {
            if (dist.type === 'next_month') {
                // Calculate next month
                let nextMonth = closing.month + 1;
                let nextYear = closing.year;
                if (nextMonth > 11) {
                    nextMonth = 0;
                    nextYear++;
                }

                // Check if a rollover already exists for the next month
                const existingRollover = incomes.find(i => 
                    i.type === 'rollover' && 
                    i.budgetMonth === nextMonth && 
                    i.budgetYear === nextYear
                );

                if (existingRollover) {
                    // Update the existing one instead of adding a new one
                    await incomeDB.updateIncomeWithTransaction({
                        ...existingRollover,
                        amount: dist.amount,
                        name: `Remanente de ${new Date(closing.year, closing.month).toLocaleString('es-ES', { month: 'long' })}`,
                        updatedAt: Date.now()
                    });
                } else {
                    // Create a special ROLLOVER income for the next month
                    const rolloverIncome: any = {
                        id: uuidv4(),
                        name: `Remanente de ${new Date(closing.year, closing.month).toLocaleString('es-ES', { month: 'long' })}`,
                        amount: dist.amount,
                        currency: 'EUR',
                        type: 'rollover',
                        createdAt: Date.now(),
                        effectiveDate: new Date(nextYear, nextMonth, 1).getTime(),
                        budgetMonth: nextMonth,
                        budgetYear: nextYear,
                        status: 'received'
                    };
                    await incomeDB.addIncomeWithTransaction(rolloverIncome);
                }
            } else if (dist.type === 'saving_goal' && dist.targetId) {
                // Adjust saving goal (this doesn't affect account balance by default as it's an "available" distribution)
                // Use isBudgetAdjustment=true to make it affect the monthly summary logic
                await incomeDB.adjustSavingGoalWithTransaction(dist.targetId, dist.amount, undefined, true);
            }
        }

        // 2. Mark closing as processed and save distributions
        await incomeDB.addMonthClosing({
            ...closing,
            status: 'processed',
            closedAt: Date.now(),
            distributions,
            updatedAt: Date.now()
        });
        
        await refreshFinance();
    };

    const reverseMonthClosing = async (id: string) => {
        const closing = closings.find(c => c.id === id);
        if (!closing) return;

        if (closing.distributions) {
            // 1. Revert distributions
            for (const dist of closing.distributions) {
                if (dist.type === 'next_month') {
                    // Find rollover income generated for next month and delete it
                    let nextMonth = closing.month + 1;
                    let nextYear = closing.year;
                    if (nextMonth > 11) {
                        nextMonth = 0;
                        nextYear++;
                    }
                    const rolloverInc = extraIncomes.find(i => 
                        i.type === 'rollover' && 
                        i.budgetMonth === nextMonth && 
                        i.budgetYear === nextYear &&
                        i.amount === dist.amount // Simple heuristic, ideally we'd have exact ID
                    );
                    if (rolloverInc) {
                        await incomeDB.deleteIncomeWithTransaction(rolloverInc.id);
                    }
                } else if (dist.type === 'saving_goal' && dist.targetId) {
                    // Reverse saving goal adjustment
                    await incomeDB.adjustSavingGoalWithTransaction(dist.targetId, -dist.amount, undefined, true);
                }
            }
        }

        // 2. Revert status to pending
        await incomeDB.addMonthClosing({
            ...closing,
            status: 'pending',
            distributions: undefined,
            updatedAt: Date.now()
        });

        await refreshFinance();
    };

    const settleCardCycle = async (
        cardId: string, 
        amount: number, 
        totalPending: number,
        date: number, 
        accountId: string,
        rangeStart?: number,
        rangeEnd?: number
    ) => {
        const card = cards.find(c => c.id === cardId);
        if (!card) return;

        // 1. Find and mark expenses in the cycle range as settled
        const cardExpenses = expenses.filter(e => {
            if (!e?.paymentMethod) return false;
            const isCard = e.paymentMethod.type === 'card' && e.paymentMethod.cardId === cardId;
            if (!isCard || e.isSettled) return false;
            
            if (rangeStart && rangeEnd) {
                const d = new Date(e.date);
                const adjustment = (e.paymentMethod as any)?.settlementAdjustment || 0;
                if (adjustment !== 0) {
                    d.setMonth(d.getMonth() + adjustment);
                }
                const effectiveTime = d.getTime();
                return effectiveTime >= rangeStart && effectiveTime <= rangeEnd;
            }
            return true;
        });

        for (const exp of cardExpenses) {
            await incomeDB.updateExpense({
                ...exp,
                isSettled: true,
                updatedAt: Date.now()
            });
        }

        // 2. Create a "settlement" expense in the linked account
        const settlementExpense: Expense = {
            id: uuidv4(),
            description: `Liquidación Tarjeta: ${card.name}`,
            amount: amount,
            currency: 'EUR',
            date: date,
            categoryId: 'cat_other',
            paymentMethod: { type: 'account', accountId },
            isFixed: false,
            status: 'paid',
            excludeFromBudget: true,
            isSettlement: true,
            settlementMetadata: {
                cardId: card.id,
                rangeStart: rangeStart || 0,
                rangeEnd: rangeEnd || 0,
                isCarryover: false
            },
            updatedAt: Date.now()
        };
        await incomeDB.addExpenseWithTransaction(settlementExpense);

        // 3. Handle difference if paid less than pending (carryover)
        if (amount < totalPending) {
            const difference = totalPending - amount;
            // The carryover date should be in the next cycle. 
            // We use rangeEnd + 1 day as a safe bet for the next cycle's date.
            const carryoverDate = rangeEnd ? rangeEnd + (24 * 60 * 60 * 1000) : Date.now();
            
            const carryoverExpense: Expense = {
                id: uuidv4(),
                description: `Remanente Liquidación Anterior: ${card.name}`,
                amount: difference,
                currency: 'EUR',
                date: carryoverDate,
                categoryId: 'cat_other',
                paymentMethod: { type: 'card', cardId },
                isFixed: false,
                status: 'paid',
                excludeFromBudget: true,
                isSettlement: true,
                settlementMetadata: {
                    cardId: card.id,
                    rangeStart: carryoverDate,
                    rangeEnd: carryoverDate,
                    isCarryover: true
                },
                updatedAt: Date.now()
            };
            await incomeDB.addExpenseWithTransaction(carryoverExpense);
        }

        // 4. Update card balance
        const updatedCard = {
            ...card,
            currentBalance: Math.max(0, card.currentBalance - amount),
            updatedAt: Date.now()
        };
        await incomeDB.updateCard(updatedCard);

        await refreshFinance();
    };

    const ignoreMonthClosing = async (id: string) => {
        const closing = closings.find(c => c.id === id);
        if (!closing) return;

        // 1. Revert distributions if any (same as reverse)
        if (closing.distributions) {
            for (const dist of closing.distributions) {
                if (dist.type === 'next_month') {
                    let nextMonth = closing.month + 1;
                    let nextYear = closing.year;
                    if (nextMonth > 11) {
                        nextMonth = 0;
                        nextYear++;
                    }
                    const rolloverInc = extraIncomes.find(i => 
                        i.type === 'rollover' && 
                        i.budgetMonth === nextMonth && 
                        i.budgetYear === nextYear &&
                        i.amount === dist.amount
                    );
                    if (rolloverInc) {
                        await incomeDB.deleteIncomeWithTransaction(rolloverInc.id);
                    }
                } else if (dist.type === 'saving_goal' && dist.targetId) {
                    await incomeDB.adjustSavingGoalWithTransaction(dist.targetId, -dist.amount, undefined, true);
                }
            }
        }

        // 2. Set status to ignored
        await incomeDB.addMonthClosing({
            ...closing,
            status: 'ignored',
            distributions: undefined,
            updatedAt: Date.now()
        });

        await refreshFinance();
    };

    const editMonthClosingAmount = async (closingId: string, newAmount: number) => {
        const closing = closings.find(c => c.id === closingId);
        if (!closing) return;

        // 1. Update closing finalBalance
        const updatedClosing = {
            ...closing,
            finalBalance: newAmount,
            updatedAt: Date.now()
        };
        await incomeDB.addMonthClosing(updatedClosing);

        // 2. Find and update the corresponding rollover income if it exists
        if (closing.distributions) {
            const nextMonthDist = closing.distributions.find(d => d.type === 'next_month');
            if (nextMonthDist) {
                // Calculate next month to match rollover
                let nextMonth = closing.month + 1;
                let nextYear = closing.year;
                if (nextMonth > 11) {
                    nextMonth = 0;
                    nextYear++;
                }

                // Find rollover income in target month
                const rolloverInc = incomes.find(i => 
                    i.type === 'rollover' && 
                    i.budgetMonth === nextMonth && 
                    i.budgetYear === nextYear &&
                    Math.abs(Math.abs(i.amount) - nextMonthDist.amount) < 0.01
                );

                if (rolloverInc) {
                    const huchasSum = closing.distributions
                        .filter(d => d.type === 'saving_goal')
                        .reduce((sum, d) => sum + d.amount, 0);

                    const isDeficit = newAmount < 0;
                    const newRolloverAmount = isDeficit 
                        ? -(Math.abs(newAmount) - huchasSum)
                        : (newAmount - huchasSum);

                    // Update distributions in closing
                    const updatedDistributions = closing.distributions.map(d => {
                        if (d.type === 'next_month') {
                            return { ...d, amount: Math.abs(newRolloverAmount) };
                        }
                        return d;
                    });

                    await incomeDB.addMonthClosing({
                        ...updatedClosing,
                        distributions: updatedDistributions
                    });

                    // Update rollover income record
                    await incomeDB.updateIncomeWithTransaction({
                        ...rolloverInc,
                        amount: newRolloverAmount,
                        updatedAt: Date.now()
                    });
                }
            }
        }
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
            incomes,
            fixedIncomes,
            extraIncomes,
            loading,
            addCategory,
            updateCategory,
            deleteCategory,
            addAccount,
            addCard,
            addExpense,
            addSavingGoal,
            allocateSavings,
            transferSavings,
            adjustSavings,
            deleteSavingGoal,
            addRecurringExpense,
            updateRecurringExpense,
            deleteRecurringExpense,
            addFixedIncome,
            addExtraIncome,
            deleteIncome,
            updateIncome,
            confirmFixedMovement,
            confirmExtraIncome,
            addLoan,
            updateAccount,
            updateCard,
            updateSavingGoal,
            updateLoan,
            amortizeLoan,
            deleteLoan,
            deleteAccount,
            deleteCard,
            deleteExpense,
            updateExpense,
            discardFixedMovement,
            performTransfer,
            setMonthOverride,
            deleteMonthOverride,
            closeMonthWithDecision,
            reverseMonthClosing,
            updateMonthClosing,
            ignoreMonthClosing,
            editMonthClosingAmount,
            settleCardCycle,
            pendingClosing,
            setPendingClosing,
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
