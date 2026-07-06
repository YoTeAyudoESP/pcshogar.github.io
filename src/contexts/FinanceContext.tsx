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
    allocateSavings: (goalId: string, sourceAccountId: string, amount: number, date?: number, description?: string, budgetMonth?: number, budgetYear?: number) => Promise<void>;
    transferSavings: (fromGoalId: string, toGoalId: string, amount: number) => Promise<void>;
    adjustSavings: (goalId: string, amount: number, accountId?: string, isBudgetAdjustment?: boolean, date?: number, budgetMonth?: number, budgetYear?: number) => Promise<void>;
    deleteSavingGoal: (id: string) => Promise<void>;
    addRecurringExpense: (expense: Omit<RecurringExpense, 'id'>) => Promise<string>;
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
            
            // Migration: Repair legacy card settlements in local IndexedDB
            let didSettlementMigration = false;
            const repairedExps = [...exps];
            for (let i = 0; i < repairedExps.length; i++) {
                const exp = repairedExps[i];
                const desc = exp.description || '';
                const isLegacySettlement = /\[LIQUIDACION\]|Liquidación Tarjeta|Remanente Liquidación/i.test(desc);
                if (isLegacySettlement && (!exp.excludeFromBudget || !exp.isSettlement)) {
                    didSettlementMigration = true;
                    const updatedExp = {
                        ...exp,
                        excludeFromBudget: true,
                        isSettlement: true,
                        updatedAt: Date.now()
                    };
                    await incomeDB.updateExpense(updatedExp);
                    repairedExps[i] = updatedExp;
                }
            }
            setExpenses(repairedExps);

            setSavings(svs);
            setAllocations(alls);
            setRecurringExpenses(recs);
            setLoans(lns);
            
            // Auto-link active loans and recurring expenses if they match and are not linked
            let updatedLoans = [...lns];
            let didLoanMigration = false;
            for (let i = 0; i < updatedLoans.length; i++) {
                const loan = updatedLoans[i];
                if (loan.status === 'active' && !loan.linkedRecurringExpenseId && !loan.isPaid) {
                    const amountToMatch = loan.monthlyPayment || loan.monthlyInstallment || 0;
                    // Find an active recurring expense of type 'cat_loans' with the same amount
                    // which is not already linked to another loan
                    const matchingRec = recs.find(r => 
                        r.active && 
                        r.categoryId === 'cat_loans' && 
                        Math.abs(r.amount - amountToMatch) < 0.01 &&
                        !updatedLoans.some(l => l.linkedRecurringExpenseId === r.id)
                    );
                    
                    if (matchingRec) {
                        didLoanMigration = true;
                        const linkedLoan = {
                            ...loan,
                            linkedRecurringExpenseId: matchingRec.id,
                            updatedAt: Date.now()
                        };
                        await incomeDB.updateLoan(linkedLoan);
                        updatedLoans[i] = linkedLoan;
                    }
                }
            }
            if (didLoanMigration) {
                setLoans(updatedLoans);
            }

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

            // Auto-rollover pending expenses from past months
            let activeExpenses = [...repairedExps];
            let didExpenseRollover = false;
            for (let i = 0; i < repairedExps.length; i++) {
                const exp = repairedExps[i];
                if (exp.status === 'pending') {
                    const expPeriod = exp.period ?? `${new Date(exp.date).getFullYear()}-${String(new Date(exp.date).getMonth() + 1).padStart(2, '0')}`;
                    const currentPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
                    
                    if (expPeriod < currentPeriod) {
                        didExpenseRollover = true;
                        
                        // Change date to 1st of current month
                        const newDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
                        let newDesc = exp.description;
                        if (!newDesc.includes('[Atrasado]')) {
                            newDesc = `[Atrasado] ${newDesc}`;
                        }
                        
                        const updatedExp = {
                            ...exp,
                            description: newDesc,
                            date: newDate,
                            period: currentPeriod,
                            updatedAt: Date.now()
                        };
                        
                        await incomeDB.updateExpense(updatedExp);
                        activeExpenses[i] = updatedExp;
                    }
                }
            }
            if (didExpenseRollover) {
                setExpenses(activeExpenses);
            }

            // Auto-rollover pending extra incomes from past months
            let didIncomeRollover = false;
            for (let i = 0; i < activeIncomes.length; i++) {
                const inc = activeIncomes[i];
                if (inc.type === 'extra' && inc.status === 'pending') {
                    const incDate = inc.effectiveDate || inc.receivedDate || inc.createdAt || Date.now();
                    const incPeriod = inc.period ?? `${new Date(incDate).getFullYear()}-${String(new Date(incDate).getMonth() + 1).padStart(2, '0')}`;
                    const currentPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
                    
                    if (incPeriod < currentPeriod) {
                        didIncomeRollover = true;
                        
                        // Change date to 1st of current month
                        const newDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
                        let newName = inc.name;
                        if (!newName.includes('[Atrasado]')) {
                            newName = `[Atrasado] ${newName}`;
                        }
                        
                        const updatedInc = {
                            ...inc,
                            name: newName,
                            effectiveDate: newDate,
                            receivedDate: newDate,
                            period: currentPeriod,
                            updatedAt: Date.now()
                        };
                        
                        await incomeDB.updateIncome(updatedInc);
                        activeIncomes[i] = updatedInc;
                    }
                }
            }
            if (didIncomeRollover) {
                setIncomes(activeIncomes);
            }
            
            // Split incomes for convenience
            setFixedIncomes(activeIncomes.filter((i): i is FixedIncome => i.type === 'fixed'));
            setExtraIncomes(activeIncomes.filter(i => i.type === 'extra' || i.type === 'rollover'));

            // Migration: calculate and save delta for historical overrides
            let didMigration = false;
            const updatedOvrs = [...ovrs];
            for (let i = 0; i < updatedOvrs.length; i++) {
                const ovr = updatedOvrs[i];
                if (ovr.delta === undefined) {
                    didMigration = true;
                    const otherOverrides = updatedOvrs.filter(o => o.id !== ovr.id);
                    const { availableToSpend: autoCalculatedAvailable } = calculateAvailableBalanceForMonth(ovr.year, ovr.month, {
                        fixedIncomes: activeIncomes.filter((inc): inc is FixedIncome => inc.type === 'fixed'),
                        extraIncomes: activeIncomes.filter(inc => inc.type === 'extra' || inc.type === 'rollover'),
                        expenses: exps,
                        allocations: alls,
                        savings: svs,
                        recurringExpenses: recs,
                        overrides: otherOverrides,
                        cards: cds
                    });
                    const updatedOvr = {
                        ...ovr,
                        delta: ovr.amount - autoCalculatedAvailable
                    };
                    await incomeDB.addMonthOverride(updatedOvr);
                    updatedOvrs[i] = updatedOvr;
                }
            }
            if (didMigration) {
                setOverrides(updatedOvrs);
            }

            // Migration: Repair legacy automatic allocations lacking budgetMonth/budgetYear
            let didAllocMigration = false;
            const updatedAlls = [...alls];
            for (let i = 0; i < updatedAlls.length; i++) {
                const alloc = updatedAlls[i];
                if (alloc.type === 'automatic' && alloc.budgetMonth === undefined) {
                    const allocTime = alloc.date || 0;
                    const matchingIncome = activeIncomes.find(inc => {
                        const incTime = inc.createdAt || inc.updatedAt || 0;
                        return Math.abs(incTime - allocTime) < 60000;
                    });
                    
                    if (matchingIncome && matchingIncome.budgetMonth !== undefined && matchingIncome.budgetYear !== undefined) {
                        didAllocMigration = true;
                        const updatedAlloc = {
                            ...alloc,
                            budgetMonth: matchingIncome.budgetMonth,
                            budgetYear: matchingIncome.budgetYear
                        };
                        await incomeDB.updateAllocation(updatedAlloc);
                        updatedAlls[i] = updatedAlloc;
                    }
                }
            }
            if (didAllocMigration) {
                setAllocations(updatedAlls);
            }

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
            } else if (existingClosing && existingClosing.status === 'pending') {
                // Recalculate to see if the available balance has changed
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

                if (Math.abs(existingClosing.finalBalance - availableToSpend) > 0.001) {
                    if (Math.abs(availableToSpend) <= 0.001) {
                        // If it's now 0, delete the pending closing
                        await incomeDB.deleteMonthClosing(existingClosing.id);
                        const idx = clss.findIndex(c => c.id === existingClosing!.id);
                        if (idx !== -1) {
                            clss.splice(idx, 1);
                        }
                        existingClosing = undefined;
                    } else {
                        // Update the final balance
                        existingClosing.finalBalance = availableToSpend;
                        existingClosing.closedAt = Date.now();
                        await incomeDB.addMonthClosing(existingClosing);
                    }
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
    const { settings, updateSyncSettings, activeEconomy } = useAppSettings();
    const { showToast } = useToast();

    useEffect(() => {
        refreshFinance();
    }, [refreshFinance, activeEconomy?.id]);

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

        if (newGoal.currentAmount > 0) {
            const allocation: SavingAllocation = {
                id: `adj_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                goalId: newGoal.id,
                amount: newGoal.currentAmount,
                type: newGoal.accountInBudget !== false ? 'manual' : 'adjustment',
                description: 'Saldo inicial',
                date: Date.now(),
                updatedAt: Date.now()
            };
            await incomeDB.updateAllocation(allocation);
        }

        await refreshFinance();
    };

    const allocateSavings = async (
        goalId: string, 
        sourceAccountId: string, 
        amount: number, 
        date?: number, 
        description?: string, 
        budgetMonth?: number, 
        budgetYear?: number
    ) => {
        const allocation: SavingAllocation = {
            id: uuidv4(),
            goalId,
            sourceAccountId,
            amount,
            type: 'automatic',
            date: date || Date.now(),
            updatedAt: Date.now(),
            description,
            budgetMonth,
            budgetYear
        };
        await incomeDB.allocateSavingsWithTransaction(allocation);
        await refreshFinance();
    };

    const transferSavings = async (fromGoalId: string, toGoalId: string, amount: number) => {
        await incomeDB.transferSavingsWithTransaction(fromGoalId, toGoalId, amount);
        await refreshFinance();
    };

    const adjustSavings = async (
        goalId: string, 
        amount: number, 
        accountId?: string, 
        isBudgetAdjustment: boolean = true, 
        date?: number, 
        budgetMonth?: number, 
        budgetYear?: number
    ) => {
        await incomeDB.adjustSavingGoalWithTransaction(goalId, amount, accountId, isBudgetAdjustment, date, budgetMonth, budgetYear);
        await refreshFinance();
    };

    const deleteSavingGoal = async (id: string) => {
        await incomeDB.recordDeletion('savings', id);
        await incomeDB.deleteSavingGoal(id);
        await refreshFinance();
    };

    const addRecurringExpense = async (data: Omit<RecurringExpense, 'id'>): Promise<string> => {
        const newRec: RecurringExpense = {
            ...data,
            id: (data as any).id || uuidv4(),
            updatedAt: Date.now()
        };
        await incomeDB.addRecurringExpense(newRec);
        await refreshFinance();
        return newRec.id;
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

            // Auto-savings allocations for linked piggy banks
            const linkedGoals = savings.filter(s => s.linkedFixedIncomeId === fixedId);
            for (const goal of linkedGoals) {
                const saveAmount = goal.monthlySavingAmount || 0;
                if (saveAmount > 0) {
                    const sourceAcc = goal.automaticSourceAccountId || accountId;
                    if (sourceAcc) {
                        await allocateSavings(goal.id, sourceAcc, saveAmount, date, `Ahorro auto. desde cobro de: ${description}`, budgetMonth, budgetYear);
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

            // Check if this recurring expense is linked to any active loan
            const linkedLoan = loans.find(l => l.linkedRecurringExpenseId === fixedId && l.status === 'active');
            if (linkedLoan) {
                const updatedDebt = Math.max(0, (linkedLoan.currentDebt ?? 0) - amount);
                const isPaid = updatedDebt <= 0;

                await incomeDB.updateLoan({
                    ...linkedLoan,
                    currentDebt: updatedDebt,
                    remainingAmount: updatedDebt,
                    status: isPaid ? 'paid' : 'active',
                    isPaid: isPaid,
                    updatedAt: Date.now()
                });

                if (isPaid) {
                    const rec = recurringExpenses.find(r => r.id === fixedId);
                    if (rec) {
                        await incomeDB.updateRecurringExpense({ ...rec, active: false, updatedAt: Date.now() });
                    }
                }
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
                date,
                updatedAt: Date.now(),
                budgetMonth,
                budgetYear
            };
            await incomeDB.allocateSavingsWithTransaction(allocation);
        }

        await refreshFinance();
    };

    const addLoan = async (loanData: Omit<Loan, 'id'>) => {
        const newLoan: Loan = {
            ...loanData,
            id: (loanData as any).id || uuidv4(),
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
        const oldGoal = savings.find(g => g.id === goal.id);
        const oldAmount = oldGoal ? oldGoal.currentAmount : 0;
        const diff = goal.currentAmount - oldAmount;

        if (oldGoal && diff !== 0) {
            const allocation: SavingAllocation = {
                id: `adj_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                goalId: goal.id,
                amount: diff,
                type: goal.accountInBudget !== false ? 'manual' : 'adjustment',
                description: diff > 0 ? 'Ajuste manual de saldo (Incremento)' : 'Ajuste manual de saldo (Reducción)',
                date: Date.now(),
                updatedAt: Date.now()
            };
            await incomeDB.updateAllocation(allocation);
        }

        await incomeDB.updateSavingGoal({ ...goal, updatedAt: Date.now() });
        await refreshFinance();
    };

    const updateLoan = async (loan: Loan) => {
        await incomeDB.updateLoan({ ...loan, updatedAt: Date.now() });
        await refreshFinance();
    };
    
    const amortizeLoan = async (loanId: string, amount: number, accountId: string, date: number, notes?: string) => {
        await incomeDB.amortizeLoanWithTransaction(loanId, amount, accountId, date, notes);
        
        // Check if the loan is now paid to deactivate its linked recurring expense
        const updatedLoans = await incomeDB.getAllLoans();
        const updatedLoan = updatedLoans.find(l => l.id === loanId);
        if (updatedLoan && (updatedLoan.currentDebt ?? 0) <= 0 && updatedLoan.linkedRecurringExpenseId) {
            const rec = recurringExpenses.find(r => r.id === updatedLoan.linkedRecurringExpenseId);
            if (rec) {
                await incomeDB.updateRecurringExpense({ ...rec, active: false, updatedAt: Date.now() });
            }
        }
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
        
        // Exclude the current override (if any) to get the autoCalculated amount
        const otherOverrides = overrides.filter(o => o.id !== id);
        
        const { availableToSpend: autoCalculatedAvailable } = calculateAvailableBalanceForMonth(year, month, {
            fixedIncomes: incomes.filter((i): i is FixedIncome => i.type === 'fixed'),
            extraIncomes: incomes.filter(i => i.type === 'extra' || i.type === 'rollover'),
            expenses,
            allocations,
            savings,
            recurringExpenses,
            overrides: otherOverrides,
            cards
        });

        const delta = amount - autoCalculatedAvailable;

        await incomeDB.addMonthOverride({
            id,
            year,
            month,
            amount,
            isManual: true,
            updatedAt: Date.now(),
            delta
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
                // Adjust saving goal. Set isBudgetAdjustment to false and type to 'adjustment'
                // so it doesn't affect the current month's available balance.
                await incomeDB.adjustSavingGoalWithTransaction(
                    dist.targetId, 
                    dist.amount, 
                    undefined, 
                    false, 
                    Date.now(), 
                    undefined, 
                    undefined, 
                    'adjustment', 
                    `Remanente de ${new Date(closing.year, closing.month).toLocaleString('es-ES', { month: 'long' })}`
                );
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
                    // Reverse saving goal adjustment. Set isBudgetAdjustment to false and type to 'adjustment'
                    await incomeDB.adjustSavingGoalWithTransaction(
                        dist.targetId, 
                        -dist.amount, 
                        undefined, 
                        false, 
                        Date.now(), 
                        undefined, 
                        undefined, 
                        'adjustment', 
                        `Reversión remanente de ${new Date(closing.year, closing.month).toLocaleString('es-ES', { month: 'long' })}`
                    );
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
                    // Revert saving goal adjustment. Set isBudgetAdjustment to false and type to 'adjustment'
                    await incomeDB.adjustSavingGoalWithTransaction(
                        dist.targetId, 
                        -dist.amount, 
                        undefined, 
                        false, 
                        Date.now(), 
                        undefined, 
                        undefined, 
                        'adjustment', 
                        `Reversión remanente de ${new Date(closing.year, closing.month).toLocaleString('es-ES', { month: 'long' })}`
                    );
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
