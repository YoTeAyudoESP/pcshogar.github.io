import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Income, FixedIncome, ExtraIncome } from '../types/income';
import type { 
    Account, CreditCard, Expense, SavingGoal, 
    SavingAllocation, RecurringExpense, Loan,
    AccountMovement, Category, Transfer,
    MonthClosing, MonthOverride 
} from '../types/finance';

interface DomesticEconomyDB extends DBSchema {
    incomes: {
        key: string;
        value: Income;
        indexes: { 'by-type': string; 'by-date': number; 'by-account': string };
    };
    accounts: {
        key: string;
        value: Account;
    };
    cards: {
        key: string;
        value: CreditCard;
        indexes: { 'by-account': string };
    };
    expenses: {
        key: string;
        value: Expense;
        indexes: { 'by-date': number; 'by-category': string };
    };
    recurring_expenses: {
        key: string;
        value: RecurringExpense;
    };
    savings: {
        key: string;
        value: SavingGoal;
    };
    allocations: {
        key: string;
        value: SavingAllocation;
        indexes: { 'by-goal': string };
    };
    loans: {
        key: string;
        value: Loan;
    };
    movements: {
        key: string;
        value: AccountMovement;
        indexes: { 'by-account': string; 'by-date': number };
    };
    categories: {
        key: string;
        value: Category;
    };
    transfers: {
        key: string;
        value: Transfer;
    };
    closings: {
        key: string;
        value: MonthClosing;
    };
    overrides: {
        key: string;
        value: MonthOverride;
    };
    deleted_items: {
        key: string; // StoreName:ID
        value: { id: string; store: string; deletedAt: number };
    };
}

const DB_NAME = 'domestic-economy-db';
const ORG_VERSION = 7;

class IncomeDB {
    private dbPromise: Promise<IDBPDatabase<DomesticEconomyDB>>;

    constructor() {
        this.dbPromise = openDB<DomesticEconomyDB>(DB_NAME, ORG_VERSION, {
            upgrade(db: IDBPDatabase<DomesticEconomyDB>, oldVersion: number, _newVersion: number | null, transaction: any) {

                if (oldVersion < 1) {
                    const store = db.createObjectStore('incomes', { keyPath: 'id' });
                    store.createIndex('by-type', 'type');
                    store.createIndex('by-date', 'createdAt');
                }
                if (oldVersion < 2) {
                    if (!db.objectStoreNames.contains('accounts')) {
                        db.createObjectStore('accounts', { keyPath: 'id' });
                    }
                    if (!db.objectStoreNames.contains('cards')) {
                        const cardStore = db.createObjectStore('cards', { keyPath: 'id' });
                        cardStore.createIndex('by-account', 'linkedAccountId');
                    }
                    if (!db.objectStoreNames.contains('expenses')) {
                        const expenseStore = db.createObjectStore('expenses', { keyPath: 'id' });
                        expenseStore.createIndex('by-date', 'date');
                        expenseStore.createIndex('by-category', 'categoryId');
                    }
                    if (!db.objectStoreNames.contains('savings')) {
                        db.createObjectStore('savings', { keyPath: 'id' });
                    }
                    if (!db.objectStoreNames.contains('allocations')) {
                        const allocStore = db.createObjectStore('allocations', { keyPath: 'id' });
                        allocStore.createIndex('by-goal', 'goalId');
                    }
                    const incomeStore = transaction.objectStore('incomes');
                    if (!incomeStore.indexNames.contains('by-account')) {
                        incomeStore.createIndex('by-account', 'linkedAccountId');
                    }
                }
                if (oldVersion < 3) {
                    if (!db.objectStoreNames.contains('recurring_expenses')) {
                        db.createObjectStore('recurring_expenses', { keyPath: 'id' });
                    }
                }
                if (oldVersion < 4) {
                    if (!db.objectStoreNames.contains('loans')) {
                        db.createObjectStore('loans', { keyPath: 'id' });
                    }
                }
                if (oldVersion < 5) {
                    if (!db.objectStoreNames.contains('movements')) {
                        const mStore = db.createObjectStore('movements', { keyPath: 'id' });
                        mStore.createIndex('by-account', 'accountId');
                        mStore.createIndex('by-date', 'date');
                    }
                    if (!db.objectStoreNames.contains('categories')) {
                        db.createObjectStore('categories', { keyPath: 'id' });
                    }
                    if (!db.objectStoreNames.contains('transfers')) {
                        db.createObjectStore('transfers', { keyPath: 'id' });
                    }
                    if (!db.objectStoreNames.contains('closings')) {
                        db.createObjectStore('closings', { keyPath: 'id' }); 
                    }
                    if (!db.objectStoreNames.contains('overrides')) {
                        db.createObjectStore('overrides', { keyPath: 'id' });
                    }
                }
                if (oldVersion < 6) {
                    // Update keyPaths if they were set to 'month' previously
                    // Note: idb doesn't easily allow changing keyPath of existing store. 
                    // We'll delete and recreate if empty, or just ensure new objects have 'id'
                    if (db.objectStoreNames.contains('closings')) {
                        db.deleteObjectStore('closings');
                        db.createObjectStore('closings', { keyPath: 'id' });
                    }
                    if (db.objectStoreNames.contains('overrides')) {
                        db.deleteObjectStore('overrides');
                        db.createObjectStore('overrides', { keyPath: 'id' });
                    }
                }
                if (oldVersion < 7) {
                    if (!db.objectStoreNames.contains('deleted_items')) {
                        db.createObjectStore('deleted_items', { keyPath: 'id' });
                    }
                }
            },
        });
    }

    async importFullData(data: any): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction(db.objectStoreNames, 'readwrite');
        
        // Map common store name variations (camelCase vs snake_case)
        const KEY_MAP: Record<string, string> = {
            'recurringExpenses': 'recurring_expenses',
            'fixedExpenses': 'recurring_expenses',
            'savingGoals': 'savings',
            'savingAllocations': 'allocations',
            'accountMovements': 'movements',
            'accountOverrides': 'overrides',
            'monthClosings': 'closings',
            'fixedIncomes': 'incomes',
            'recurring': 'recurring_expenses'
        };

        for (const storeName of db.objectStoreNames) {
            const store = tx.objectStore(storeName);
            await store.clear();
            
            // Try both original name and common variations from KEY_MAP
            let items = data[storeName] || [];
            if (!Array.isArray(items) || items.length === 0) {
                // Find if there's any mapped key for this store that contains data in the input
                for (const [jsonKey, targetStore] of Object.entries(KEY_MAP)) {
                    if (targetStore === storeName && Array.isArray(data[jsonKey]) && data[jsonKey].length > 0) {
                        items = data[jsonKey];
                        break;
                    }
                }
            }

            for (let item of items) {
                try {
                    // Normalization
                    if (storeName === 'loans') {
                        item = {
                            ...item,
                            currentDebt: item.currentDebt ?? item.remainingAmount ?? 0,
                            totalAmount: item.totalAmount ?? item.amount ?? item.originalAmount ?? 0,
                            monthlyPayment: item.monthlyPayment ?? item.monthlyInstallment ?? item.cuota ?? 0
                        };
                    }
                    if (storeName === 'accounts' || storeName === 'cards') {
                        // Support common color property names
                        item.color = item.color || item.backgroundColor || item.brandColor || item.hexColor;
                    }
                    if (storeName === 'expenses') {
                        // Normalize legacy card settlements to be excluded from budget
                        const desc = item.description || '';
                        const isLegacySettlement = /\[LIQUIDACION\]|Liquidación Tarjeta|Remanente Liquidación/i.test(desc);
                        if (isLegacySettlement) {
                            item.excludeFromBudget = true;
                            item.isSettlement = true;
                        }
                    }
                    if (storeName === 'recurring_expenses' || storeName === 'incomes') {
                        // Ensure required fields like ignoredPeriods exist
                        item.ignoredPeriods = item.ignoredPeriods || [];
                    }

                    // ID Generation for Month-based stores if missing
                    if (storeName === 'closings' && !item.id && item.year !== undefined && item.month !== undefined) {
                        item.id = `${item.year}-${String(item.month + 1).padStart(2, '0')}`;
                        item.status = item.status || 'processed';
                    }
                    if (storeName === 'overrides' && !item.id && item.year !== undefined && item.month !== undefined) {
                        item.id = `${item.year}-${String(item.month + 1).padStart(2, '0')}`;
                    }

                    // Allocation type recovery
                    if (storeName === 'allocations' && !item.type) {
                        item.type = item.amount > 0 ? 'manual' : 'adjustment';
                    }
                    
                    // Categorization bridge (name to ID)
                    if ((storeName === 'expenses' || storeName === 'incomes' || storeName === 'recurring_expenses') && !item.categoryId && item.category) {
                        // We check the categories already in the data if any, or seed them
                        const categories = data['categories'] || [];
                        const catMatch = categories.find((c: any) => c.name === item.category || c.id === item.category);
                        if (catMatch) {
                            item.categoryId = catMatch.id;
                        } else {
                            // Fallback for default categories in Spanish/English
                            const name = String(item.category).toLowerCase();
                            if (name.includes('comida') || name.includes('food')) item.categoryId = 'cat_food';
                            else if (name.includes('transporte') || name.includes('transport')) item.categoryId = 'cat_transport';
                            else if (name.includes('vivienda') || name.includes('housing')) item.categoryId = 'cat_housing';
                            else if (name.includes('ocio') || name.includes('leisure')) item.categoryId = 'cat_leisure';
                            else if (name.includes('salud') || name.includes('health')) item.categoryId = 'cat_health';
                            else if (name.includes('hogar') || name.includes('suministro') || name.includes('utility')) item.categoryId = 'cat_utilities';
                            else if (name.includes('nomina') || name.includes('salario') || name.includes('ingreso fijo') || name.includes('salary')) item.categoryId = 'cat_inc_salary';
                            else if (name.includes('extra') || name.includes('bonus')) item.categoryId = 'cat_inc_extra';
                        }
                    }

                    await store.put(item);
                } catch (e) {
                    console.warn(`Error normalizando/importando ítem en ${String(storeName)}:`, e);
                }
            }
        }
        await tx.done;
    }

    async recordDeletion(store: string, id: string): Promise<void> {
        const db = await this.dbPromise;
        await db.put('deleted_items', {
            id: `${store}:${id}`,
            store,
            deletedAt: Date.now()
        });
    }

    async exportFullData(): Promise<any> {
        const db = await this.dbPromise;
        const data: any = {};
        for (const storeName of db.objectStoreNames) {
            data[storeName] = await db.getAll(storeName);
        }
        return data;
    }

    async getAllIncomes(): Promise<Income[]> {
        return (await this.dbPromise).getAll('incomes');
    }

    async getFixedIncomes(): Promise<FixedIncome[]> {
        const all = await this.getAllIncomes();
        return all.filter((i): i is FixedIncome => i.type === 'fixed');
    }

    async getExtraIncomes(): Promise<Income[]> {
        const all = await this.getAllIncomes();
        return all.filter(i => i.type === 'extra' || i.type === 'rollover');
    }

    async updateIncome(income: Income): Promise<void> {
        await (await this.dbPromise).put('incomes', income);
    }

    async updateIncomeWithTransaction(updatedIncome: Income): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction(['incomes', 'accounts', 'movements'], 'readwrite');
        const incomeStore = tx.objectStore('incomes');
        const accountStore = tx.objectStore('accounts');
        const movementStore = tx.objectStore('movements');

        const oldIncome = await incomeStore.get(updatedIncome.id);
        if (!oldIncome) throw new Error('Ingreso no encontrado');

        // 1. Revert old balance effect if it was received
        if (oldIncome.linkedAccountId && oldIncome.status === 'received') {
            const oldAccount = await accountStore.get(oldIncome.linkedAccountId);
            if (oldAccount) {
                oldAccount.balance -= oldIncome.amount;
                await accountStore.put(oldAccount);
                // We don't delete the movement, we just adjust the balance. 
                // Alternatively we could find and delete the movement, but this is simpler.
            }
        }

        // 2. Apply new balance effect
        if (updatedIncome.linkedAccountId && updatedIncome.status === 'received') {
            const newAccount = await accountStore.get(updatedIncome.linkedAccountId);
            if (newAccount) {
                newAccount.balance += updatedIncome.amount;
                await accountStore.put(newAccount);
                
                // Add new movement or update existing? 
                // For simplicity, we'll adds a new adjustment movement if anything changed
                await movementStore.add({
                    id: `mv_upd_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    accountId: updatedIncome.linkedAccountId,
                    amount: updatedIncome.amount,
                    type: 'income',
                    description: `Ajuste Ingreso: ${updatedIncome.name}`,
                    relatedId: updatedIncome.id,
                    date: updatedIncome.effectiveDate || Date.now(),
                    updatedAt: Date.now()
                });
            }
        }

        await incomeStore.put(updatedIncome);
        await tx.done;
    }

    async deleteIncomeWithTransaction(id: string): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction(['incomes', 'accounts', 'movements'], 'readwrite');
        const incomeStore = tx.objectStore('incomes');
        const accountStore = tx.objectStore('accounts');

        const income = await incomeStore.get(id);
        if (income && income.linkedAccountId && income.status === 'received') {
            const account = await accountStore.get(income.linkedAccountId);
            if (account) {
                account.balance -= income.amount;
                await accountStore.put(account);
            }
        }

        await incomeStore.delete(id);
        await tx.done;
    }

    async addIncomeWithTransaction(income: Income): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction(['incomes', 'accounts', 'movements'], 'readwrite');
        const incomeStore = tx.objectStore('incomes');
        const accountStore = tx.objectStore('accounts');
        const movementStore = tx.objectStore('movements');

        await incomeStore.add(income);

        if (income.linkedAccountId && income.status === 'received') {
            const account = await accountStore.get(income.linkedAccountId);
            if (account) {
                account.balance += income.amount;
                await accountStore.put(account);
                
                await movementStore.add({
                    id: `mv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    accountId: income.linkedAccountId,
                    amount: income.amount,
                    type: 'income',
                    description: `Ingreso: ${income.name}`,
                    relatedId: income.id,
                    date: income.effectiveDate || Date.now(),
                    updatedAt: Date.now()
                });
            }
        }
        await tx.done;
    }

    async addExpenseWithTransaction(expense: Expense): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction(['expenses', 'accounts', 'cards', 'movements', 'savings', 'allocations'], 'readwrite');
        const expenseStore = tx.objectStore('expenses');
        const accountStore = tx.objectStore('accounts');
        const cardStore = tx.objectStore('cards');
        const movementStore = tx.objectStore('movements');
        const savingsStore = tx.objectStore('savings');
        const allocStore = tx.objectStore('allocations');

        await expenseStore.add(expense);

        if (expense.status === 'paid') {
            let targetAccountId: string | null = null;

            if (expense.paymentMethod.type === 'account' || expense.paymentMethod.type === 'cash') {
                targetAccountId = expense.paymentMethod.type === 'account'
                    ? expense.paymentMethod.accountId
                    : null;

                if (targetAccountId) {
                    const account = await accountStore.get(targetAccountId);
                    if (account) {
                        account.balance -= expense.amount;
                        await accountStore.put(account);
                    }
                }
            } else if (expense.paymentMethod.type === 'card') {
                const card = await cardStore.get(expense.paymentMethod.cardId);
                if (card) {
                    if (card.type === 'debit') {
                        if (card.linkedAccountId) {
                            targetAccountId = card.linkedAccountId;
                            const account = await accountStore.get(targetAccountId);
                            if (account) {
                                account.balance -= expense.amount;
                                await accountStore.put(account);
                            }
                        }
                    } else if (card.type === 'virtual') {
                        card.currentBalance -= expense.amount;
                        await cardStore.put(card);
                    } else {
                        card.currentBalance += expense.amount;
                        await cardStore.put(card);
                    }
                }
            }

            if (targetAccountId) {
                await movementStore.add({
                    id: `mv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    accountId: targetAccountId,
                    amount: -expense.amount,
                    type: 'expense',
                    description: `Gasto: ${expense.description}`,
                    relatedId: expense.id,
                    date: expense.date,
                    updatedAt: Date.now()
                });
            }

            // Deduct from savings goal if linked
            if (expense.linkedSavingGoalId) {
                const goal = await savingsStore.get(expense.linkedSavingGoalId);
                if (goal) {
                    goal.currentAmount -= expense.amount;
                    await savingsStore.put(goal);

                    // Record allocation
                    await allocStore.add({
                        id: `hucha_exp_${expense.id}`,
                        goalId: expense.linkedSavingGoalId,
                        amount: -expense.amount,
                        type: 'adjustment',
                        description: `Financiación de gasto: ${expense.description}`,
                        date: expense.date,
                        updatedAt: Date.now()
                    });
                }
            }
        }
        await tx.done;
    }

    // Generic helpers
    async getAllAccounts(): Promise<Account[]> { return (await this.dbPromise).getAll('accounts'); }
    async getAllCards(): Promise<CreditCard[]> { return (await this.dbPromise).getAll('cards'); }
    async getAllExpenses(): Promise<Expense[]> { return (await this.dbPromise).getAll('expenses'); }
    async getAllSavings(): Promise<SavingGoal[]> { return (await this.dbPromise).getAll('savings'); }
    async getAllAllocations(): Promise<SavingAllocation[]> { return (await this.dbPromise).getAll('allocations'); }
    async updateAllocation(allocation: SavingAllocation): Promise<void> { await (await this.dbPromise).put('allocations', allocation); }
    async getAllRecurringExpenses(): Promise<RecurringExpense[]> { return (await this.dbPromise).getAll('recurring_expenses'); }
    async getAllLoans(): Promise<Loan[]> { return (await this.dbPromise).getAll('loans'); }
    async getAllMovements(): Promise<AccountMovement[]> { return (await this.dbPromise).getAll('movements'); }
    async getAllCategories(): Promise<Category[]> { return (await this.dbPromise).getAll('categories'); }
    async getAllTransfers(): Promise<Transfer[]> { return (await this.dbPromise).getAll('transfers'); }
    async getAllClosings(): Promise<MonthClosing[]> { return (await this.dbPromise).getAll('closings'); }
    async getAllOverrides(): Promise<MonthOverride[]> { return (await this.dbPromise).getAll('overrides'); }

    async addMonthClosing(closing: MonthClosing): Promise<void> { await (await this.dbPromise).put('closings', { ...closing }); }
    async deleteMonthClosing(id: string): Promise<void> { await (await this.dbPromise).delete('closings', id); }

    async addMonthOverride(override: MonthOverride): Promise<void> { await (await this.dbPromise).put('overrides', { ...override, updatedAt: Date.now() }); }
    async deleteMonthOverride(id: string): Promise<void> { await (await this.dbPromise).delete('overrides', id); }

    async addAccount(account: Account): Promise<void> { await (await this.dbPromise).put('accounts', { ...account, updatedAt: Date.now() }); }
    async updateAccount(account: Account): Promise<void> { await (await this.dbPromise).put('accounts', { ...account, updatedAt: Date.now() }); }
    async addCard(card: CreditCard): Promise<void> { await (await this.dbPromise).put('cards', { ...card, updatedAt: Date.now() }); }
    async updateCard(card: CreditCard): Promise<void> { await (await this.dbPromise).put('cards', { ...card, updatedAt: Date.now() }); }
    async deleteAccount(id: string): Promise<void> { await (await this.dbPromise).delete('accounts', id); }
    async deleteCard(id: string): Promise<void> { await (await this.dbPromise).delete('cards', id); }

    async addSavingGoal(goal: SavingGoal): Promise<void> { await (await this.dbPromise).put('savings', { ...goal, updatedAt: Date.now() }); }
    async updateSavingGoal(goal: SavingGoal): Promise<void> { await (await this.dbPromise).put('savings', { ...goal, updatedAt: Date.now() }); }
    async deleteSavingGoal(id: string): Promise<void> { await (await this.dbPromise).delete('savings', id); }

    async addCategory(category: Category): Promise<void> { await (await this.dbPromise).put('categories', { ...category, updatedAt: Date.now() }); }
    async updateCategory(category: Category): Promise<void> { await (await this.dbPromise).put('categories', { ...category, updatedAt: Date.now() }); }
    
    async deleteCategoryWithReassignment(id: string, reassignToId?: string): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction(['categories', 'expenses', 'incomes', 'recurring_expenses'], 'readwrite');
        
        if (reassignToId) {
            const expenseStore = tx.objectStore('expenses');
            const incomeStore = tx.objectStore('incomes');
            const recurringStore = tx.objectStore('recurring_expenses');

            // 1. Reassign Expenses
            let expCursor = await expenseStore.index('by-category').openCursor(id);
            while (expCursor) {
                const expense = expCursor.value;
                expense.categoryId = reassignToId;
                await expCursor.update(expense);
                expCursor = await expCursor.continue();
            }

            // 2. Reassign Incomes (Both category and categoryId fields might be in use)
            let incCursor = await incomeStore.openCursor();
            while (incCursor) {
                const income = incCursor.value;
                // @ts-ignore
                if (income.categoryId === id || income.category === id) {
                    // @ts-ignore
                    income.categoryId = reassignToId;
                    // @ts-ignore
                    income.category = reassignToId;
                    await incCursor.update(income);
                }
                incCursor = await incCursor.continue();
            }

            // 3. Reassign Recurring Expenses
            let recCursor = await recurringStore.openCursor();
            while (recCursor) {
                const rec = recCursor.value;
                if (rec.categoryId === id) {
                    rec.categoryId = reassignToId;
                    await recCursor.update(rec);
                }
                recCursor = await recCursor.continue();
            }
        }

        // Final deletion
        await tx.objectStore('categories').delete(id);
        await tx.done;
    }

    async transferSavingsWithTransaction(fromGoalId: string, toGoalId: string, amount: number): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction(['savings', 'allocations'], 'readwrite');
        const savingsStore = tx.objectStore('savings');
        const allocStore = tx.objectStore('allocations');

        const fromGoal = await savingsStore.get(fromGoalId);
        const toGoal = await savingsStore.get(toGoalId);

        if (!fromGoal || !toGoal || fromGoal.currentAmount < amount) {
            throw new Error('Transferencia no válida: fondos insuficientes o huchas no encontradas');
        }

        fromGoal.currentAmount -= amount;
        toGoal.currentAmount += amount;

        await savingsStore.put(fromGoal);
        await savingsStore.put(toGoal);

        // Record history
        await allocStore.add({
            id: `tr_out_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            goalId: fromGoalId,
            relatedGoalId: toGoalId,
            amount: -amount,
            type: 'transfer_out',
            description: `Traspaso a ${toGoal.name}`,
            date: Date.now(),
            updatedAt: Date.now()
        });

        await allocStore.add({
            id: `tr_in_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            goalId: toGoalId,
            relatedGoalId: fromGoalId,
            amount: amount,
            type: 'transfer_in',
            description: `Traspaso desde ${fromGoal.name}`,
            date: Date.now(),
            updatedAt: Date.now()
        });

        await tx.done;
    }
    
    async allocateSavingsWithTransaction(allocation: SavingAllocation): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction(['allocations', 'savings', 'accounts'], 'readwrite');
        const allocStore = tx.objectStore('allocations');
        const savingsStore = tx.objectStore('savings');
        const accountStore = tx.objectStore('accounts');

        await allocStore.add(allocation);

        const goal = await savingsStore.get(allocation.goalId);
        if (goal) {
            goal.currentAmount += allocation.amount;
            await savingsStore.put(goal);
        }

        if (allocation.sourceAccountId) {
            const account = await accountStore.get(allocation.sourceAccountId);
            if (account) {
                account.balance -= allocation.amount;
                await accountStore.put(account);
            }
        }
        await tx.done;
    }

    async addRecurringExpense(expense: RecurringExpense): Promise<void> { await (await this.dbPromise).put('recurring_expenses', { ...expense, updatedAt: Date.now() }); }
    async updateRecurringExpense(expense: RecurringExpense): Promise<void> { await (await this.dbPromise).put('recurring_expenses', { ...expense, updatedAt: Date.now() }); }
    async deleteRecurringExpense(id: string): Promise<void> { await (await this.dbPromise).delete('recurring_expenses', id); }
    async addLoan(loan: Loan): Promise<void> { await (await this.dbPromise).put('loans', { ...loan, updatedAt: Date.now() }); }
    async updateLoan(loan: Loan): Promise<void> { await (await this.dbPromise).put('loans', { ...loan, updatedAt: Date.now() }); }
    async deleteLoan(id: string): Promise<void> { await (await this.dbPromise).delete('loans', id); }

    async amortizeLoanWithTransaction(loanId: string, amount: number, accountId: string, date: number, notes?: string): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction(['loans', 'accounts', 'expenses', 'movements'], 'readwrite');
        const loanStore = tx.objectStore('loans');
        const accountStore = tx.objectStore('accounts');
        const expenseStore = tx.objectStore('expenses');
        const movementStore = tx.objectStore('movements');

        const loan = await loanStore.get(loanId);
        const account = await accountStore.get(accountId);

        if (!loan || !account) throw new Error('Préstamo o cuenta no encontrados');

        // Update loan
        loan.currentDebt = Math.max(0, (loan.currentDebt ?? 0) - amount);
        loan.remainingAmount = loan.currentDebt;
        if (loan.currentDebt <= 0) {
            loan.status = 'paid';
            loan.isPaid = true;
        }
        loan.updatedAt = Date.now();
        await loanStore.put(loan);

        // Update account
        account.balance -= amount;
        await accountStore.put(account);

        // Create expense
        const expense: Expense = {
            id: `exp_amort_${Date.now()}`,
            description: `Amortización: ${loan.name} ${notes ? `(${notes})` : ''}`,
            amount: amount,
            currency: 'EUR',
            date: date,
            categoryId: 'cat_loans',
            paymentMethod: { type: 'account', accountId },
            isFixed: false,
            status: 'paid',
            updatedAt: Date.now()
        };
        await expenseStore.add(expense);

        // Create movement
        await movementStore.add({
            id: `mv_amort_${Date.now()}`,
            accountId: accountId,
            amount: -amount,
            type: 'expense',
            description: `Amortización: ${loan.name}`,
            relatedId: loanId,
            date: date,
            updatedAt: Date.now()
        });

        await tx.done;
    }

    async transferBalanceWithTransaction(transfer: Transfer): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction(['accounts', 'cards', 'movements', 'transfers'], 'readwrite');
        const accountStore = tx.objectStore('accounts');
        const cardStore = tx.objectStore('cards');
        const movementStore = tx.objectStore('movements');
        const transferStore = tx.objectStore('transfers');

        await transferStore.add(transfer);

        const fromAcc = await accountStore.get(transfer.fromAccountId);
        const fromCard = !fromAcc ? await cardStore.get(transfer.fromAccountId) : null;

        const toAcc = await accountStore.get(transfer.toAccountId);
        const toCard = !toAcc ? await cardStore.get(transfer.toAccountId) : null;

        const fromName = fromAcc ? fromAcc.name : (fromCard ? fromCard.name : 'Desconocido');
        const toName = toAcc ? toAcc.name : (toCard ? toCard.name : 'Desconocido');

        if (fromAcc) {
            fromAcc.balance -= transfer.amount;
            await accountStore.put(fromAcc);
        } else if (fromCard) {
            fromCard.currentBalance -= transfer.amount;
            await cardStore.put(fromCard);
        }

        if (toAcc) {
            toAcc.balance += transfer.amount;
            await accountStore.put(toAcc);
        } else if (toCard) {
            toCard.currentBalance += transfer.amount;
            await cardStore.put(toCard);
        }

        // Outgoing movement
        await movementStore.add({
            id: `mv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_out`,
            accountId: transfer.fromAccountId,
            amount: -transfer.amount,
            type: 'transfer',
            description: `Traspaso a ${toName}: ${transfer.notes || ''}`,
            relatedId: transfer.id,
            date: transfer.date,
            updatedAt: Date.now()
        });

        // Incoming movement
        await movementStore.add({
            id: `mv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_in`,
            accountId: transfer.toAccountId,
            amount: transfer.amount,
            type: 'transfer',
            description: `Traspaso desde ${fromName}: ${transfer.notes || ''}`,
            relatedId: transfer.id,
            date: transfer.date,
            updatedAt: Date.now()
        });
        await tx.done;
    }

    async adjustSavingGoalWithTransaction(
        goalId: string, 
        amount: number, 
        accountId?: string, 
        isBudgetAdjustment: boolean = true, 
        date?: number,
        budgetMonth?: number,
        budgetYear?: number,
        customType?: 'manual' | 'automatic' | 'transfer_in' | 'transfer_out' | 'adjustment',
        customDescription?: string
    ): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction(['savings', 'allocations', 'accounts', 'movements'], 'readwrite');
        const savingsStore = tx.objectStore('savings');
        const allocStore = tx.objectStore('allocations');
        const accountStore = tx.objectStore('accounts');
        const movementStore = tx.objectStore('movements');

        const goal = await savingsStore.get(goalId);
        if (!goal) throw new Error('Hucha no encontrada');

        goal.currentAmount += amount;
        await savingsStore.put(goal);

        const targetDate = date || Date.now();

        // Record history in hucha
        await allocStore.add({
            id: `adj_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            goalId,
            amount: amount,
            type: customType || (isBudgetAdjustment ? 'manual' : (amount >= 0 ? 'manual' : 'adjustment')),
            description: customDescription || (amount >= 0 ? 'Aportación manual' : 'Retirada de fondos'),
            date: targetDate,
            updatedAt: Date.now(),
            budgetMonth,
            budgetYear
        });

        // If it's an adjustment that affects an account and the budget
        if (accountId && isBudgetAdjustment) {
            const account = await accountStore.get(accountId);
            if (account) {
                account.balance -= amount; // Adding to hucha subtracts from account
                await accountStore.put(account);

                await movementStore.add({
                    id: `mv_hucha_${Date.now()}`,
                    accountId,
                    amount: -amount,
                    type: 'allocation',
                    description: `Ahorro en hucha: ${goal.name}`,
                    relatedId: goalId,
                    date: targetDate,
                    updatedAt: Date.now()
                });
            }
        }

    }

    async deleteExpenseWithTransaction(id: string): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction(['expenses', 'accounts', 'cards', 'movements', 'savings', 'allocations'], 'readwrite');
        const expenseStore = tx.objectStore('expenses');
        const accountStore = tx.objectStore('accounts');
        const cardStore = tx.objectStore('cards');
        const movementStore = tx.objectStore('movements');
        const savingsStore = tx.objectStore('savings');
        const allocStore = tx.objectStore('allocations');

        const expense = await expenseStore.get(id);
        if (!expense) return;

        if (expense.status === 'paid') {
            if (expense.paymentMethod.type === 'account') {
                const account = await accountStore.get(expense.paymentMethod.accountId);
                if (account) {
                    account.balance += expense.amount;
                    await accountStore.put(account);
                }
            } else if (expense.paymentMethod.type === 'card') {
                const card = await cardStore.get(expense.paymentMethod.cardId);
                if (card) {
                    if (card.type === 'debit') {
                        if (card.linkedAccountId) {
                            const account = await accountStore.get(card.linkedAccountId);
                            if (account) {
                                account.balance += expense.amount;
                                await accountStore.put(account);
                            }
                        }
                    } else if (card.type === 'virtual') {
                        card.currentBalance += expense.amount;
                        await cardStore.put(card);
                    } else {
                        card.currentBalance -= expense.amount;
                        await cardStore.put(card);
                    }
                }
            }

            // Revert savings goal if linked
            if (expense.linkedSavingGoalId) {
                const goal = await savingsStore.get(expense.linkedSavingGoalId);
                if (goal) {
                    goal.currentAmount += expense.amount;
                    await savingsStore.put(goal);
                }
                // Also delete the specific related allocation if found
                await allocStore.delete(`hucha_exp_${expense.id}`);
            }
        }

        await expenseStore.delete(id);
        await tx.done;
    }

    async updateExpense(updatedExpense: Expense): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction(['expenses', 'accounts', 'cards', 'movements', 'savings', 'allocations'], 'readwrite');
        const expenseStore = tx.objectStore('expenses');
        const accountStore = tx.objectStore('accounts');
        const cardStore = tx.objectStore('cards');
        const movementStore = tx.objectStore('movements');
        const savingsStore = tx.objectStore('savings');
        const allocStore = tx.objectStore('allocations');

        const oldExpense = await expenseStore.get(updatedExpense.id);
        if (!oldExpense) throw new Error('Gasto no encontrado');

        // 1. REVERT OLD EFFECTS
        if (oldExpense.status === 'paid') {
            // Revert bank/cash balance
            if (oldExpense.paymentMethod.type === 'account') {
                const account = await accountStore.get(oldExpense.paymentMethod.accountId);
                if (account) {
                    account.balance += oldExpense.amount;
                    await accountStore.put(account);
                }
            } else if (oldExpense.paymentMethod.type === 'card') {
                const card = await cardStore.get(oldExpense.paymentMethod.cardId);
                if (card) {
                    if (card.type === 'debit') {
                        if (card.linkedAccountId) {
                            const account = await accountStore.get(card.linkedAccountId);
                            if (account) {
                                account.balance += oldExpense.amount;
                                await accountStore.put(account);
                            }
                        }
                    } else if (card.type === 'virtual') {
                        card.currentBalance += oldExpense.amount;
                        await cardStore.put(card);
                    } else {
                        card.currentBalance -= oldExpense.amount;
                        await cardStore.put(card);
                    }
                }
            }

            // Revert savings goal if linked
            if (oldExpense.linkedSavingGoalId) {
                const goal = await savingsStore.get(oldExpense.linkedSavingGoalId);
                if (goal) {
                    goal.currentAmount += oldExpense.amount;
                    await savingsStore.put(goal);
                }
                await allocStore.delete(`hucha_exp_${oldExpense.id}`);
            }

            // Delete old movement (we'll create a new one if still paid)
            // Heuristic: delete movements related to this expense
            let mCursor = await movementStore.index('by-account').openCursor(); // This is slow, but movements don't have a direct 'by-relatedId' index in schema.
            // Actually, we'll just add an adjustment movement instead of searching all.
        }

        // 2. APPLY NEW EFFECTS
        if (updatedExpense.status === 'paid') {
            let targetAccountId: string | null = null;

            if (updatedExpense.paymentMethod.type === 'account') {
                targetAccountId = updatedExpense.paymentMethod.accountId;
                const account = await accountStore.get(targetAccountId);
                if (account) {
                    account.balance -= updatedExpense.amount;
                    await accountStore.put(account);
                }
            } else if (updatedExpense.paymentMethod.type === 'card') {
                const card = await cardStore.get(updatedExpense.paymentMethod.cardId);
                if (card) {
                    if (card.type === 'debit') {
                        if (card.linkedAccountId) {
                            targetAccountId = card.linkedAccountId;
                            const account = await accountStore.get(targetAccountId);
                            if (account) {
                                account.balance -= updatedExpense.amount;
                                await accountStore.put(account);
                            }
                        }
                    } else if (card.type === 'virtual') {
                        card.currentBalance -= updatedExpense.amount;
                        await cardStore.put(card);
                    } else {
                        card.currentBalance += updatedExpense.amount;
                        await cardStore.put(card);
                    }
                }
            }

            if (targetAccountId) {
                await movementStore.add({
                    id: `mv_upd_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    accountId: targetAccountId,
                    amount: -updatedExpense.amount,
                    type: 'expense',
                    description: `Ajuste Gasto: ${updatedExpense.description}`,
                    relatedId: updatedExpense.id,
                    date: updatedExpense.date,
                    updatedAt: Date.now()
                });
            }

            if (updatedExpense.linkedSavingGoalId) {
                const goal = await savingsStore.get(updatedExpense.linkedSavingGoalId);
                if (goal) {
                    goal.currentAmount -= updatedExpense.amount;
                    await savingsStore.put(goal);
                    await allocStore.put({
                        id: `hucha_exp_${updatedExpense.id}`,
                        goalId: updatedExpense.linkedSavingGoalId,
                        amount: -updatedExpense.amount,
                        type: 'adjustment',
                        description: `Financiación de gasto: ${updatedExpense.description}`,
                        date: updatedExpense.date,
                        updatedAt: Date.now()
                    });
                }
            }
        }

        await expenseStore.put(updatedExpense);
        await tx.done;
    }
}


export const incomeDB = new IncomeDB();
