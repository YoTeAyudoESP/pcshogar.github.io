import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Income, FixedIncome, ExtraIncome, RolloverIncome } from '../types/income';
import type { Account, CreditCard, Expense, SavingGoal, SavingAllocation, RecurringExpense, Loan, MonthOverride } from '../types/finance';

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
    closings: {
        key: [number, number]; // [year, month]
        value: {
            year: number;
            month: number;
            closedAt: number;
            finalBalance: number;
            rolloverAction: 'save' | 'carry' | 'cover' | 'deduct' | 'dismiss';
            rolloverAmount: number;
            targetId?: string; // piggy bank id if save/cover
        };
    };
    tombstones: {
        key: string;
        value: {
            id: string;
            type: string; // collection name
            date: number; // deletion ts
        };
    };

    tombstones_sync: {
        key: string;
        value: {
            id: string;
            type: string;
            date: number;
        };
    };
    overrides: {
        key: [number, number]; // [year, month]
        value: MonthOverride;
    };
}

const DB_NAME = 'domestic-economy-db';
const ORG_VERSION = 7;

// ... (previous version logic) ... 


class IncomeDB {
    private dbPromise: Promise<IDBPDatabase<DomesticEconomyDB>>;

    constructor() {
        this.dbPromise = openDB<DomesticEconomyDB>(DB_NAME, ORG_VERSION, {
            upgrade(db, oldVersion, _newVersion, transaction) {
                if (oldVersion < 1) {
                    const store = db.createObjectStore('incomes', { keyPath: 'id' });
                    store.createIndex('by-type', 'type');
                    store.createIndex('by-date', 'createdAt');
                }
                if (oldVersion < 2) {
                    // Upgrade to v2
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
                    // Add index to incomes if it doesn't exist (transactional)
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
                    if (!db.objectStoreNames.contains('closings')) {
                        // Store { year, month, closedAt, finalBalance, rolloverAction, rolloverAmount }
                        db.createObjectStore('closings', { keyPath: ['year', 'month'] });
                    }
                }
                if (oldVersion < 6) {
                    if (!db.objectStoreNames.contains('tombstones')) {
                        // Store deleted item IDs { id, type, date }
                        db.createObjectStore('tombstones', { keyPath: 'id' });
                    }
                }
                if (oldVersion < 7) {
                    if (!db.objectStoreNames.contains('overrides')) {
                        db.createObjectStore('overrides', { keyPath: ['year', 'month'] });
                    }
                }
            },
        });
    }

    private initializedChanges = false;

    private getPersistentChanges(): Record<string, string[]> {
        if (!typeof window) return {}; // SSR safety
        try {
            return JSON.parse(localStorage.getItem('pcs_unsynced_changes_v3') || 'null') || {};
        } catch {
            return {};
        }
    }

    private savePersistentChanges(changes: Record<string, string[]>) {
        if (!typeof window) return;
        localStorage.setItem('pcs_unsynced_changes_v3', JSON.stringify(changes));
    }

    // Initialize tracking: If no tracking data exists, mark ALL items as changed to prevent data loss on first sync after update
    async initializeChangesTracking() {
        if (this.initializedChanges) return;
        if (localStorage.getItem('pcs_unsynced_changes_v3')) {
            this.initializedChanges = true;
            return;
        }

        console.log('Initializing Persistent Change Tracking: Marking all valid data as unsynced for safety.');
        const db = await this.dbPromise;
        const stores = ['incomes', 'accounts', 'cards', 'expenses', 'recurring_expenses', 'savings', 'allocations', 'loans', 'closings', 'overrides'] as const;

        const changes: Record<string, string[]> = {};

        const tx = db.transaction(stores, 'readonly');
        for (const storeName of stores) {
            const keys = await tx.objectStore(storeName).getAllKeys();
            const isComposite = ['closings', 'overrides'].includes(storeName);
            changes[storeName] = keys.map(k => {
                if (isComposite && Array.isArray(k)) {
                    return `${k[0]}-${k[1]}`;
                }
                return String(k);
            });
        }
        await tx.done;

        this.savePersistentChanges(changes);
        this.initializedChanges = true;
    }

    /**
     * Marks ALL existing data in the DB as unsynced changes.
     * This is crucial after importing data from a file, to ensure
     * that these imported items "win" against whatever is currently in the cloud.
     */
    async markAllAsChanged() {
        console.log('Marking all data as changed to ensure cloud update...');
        const db = await this.dbPromise;
        const stores = ['incomes', 'accounts', 'cards', 'expenses', 'recurring_expenses', 'savings', 'allocations', 'loans', 'closings', 'overrides'] as const;

        const changes = this.getPersistentChanges();

        const tx = db.transaction(stores, 'readonly');
        for (const storeName of stores) {
            const keys = await tx.objectStore(storeName).getAllKeys();
            const isComposite = ['closings', 'overrides'].includes(storeName);

            if (!changes[storeName]) changes[storeName] = [];

            for (const k of keys) {
                const id = (isComposite && Array.isArray(k)) ? `${k[0]}-${k[1]}` : String(k);
                if (!changes[storeName].includes(id)) {
                    changes[storeName].push(id);
                }
            }
        }
        await tx.done;

        this.savePersistentChanges(changes);
    }

    private async removeTombstone(id: string, _type: string, existingTx?: any) {
        if (existingTx) {
            const store = existingTx.objectStore('tombstones');
            if (await store.get(id)) {
                await store.delete(id);
                this.trackChange('tombstones', id);
            }
            return;
        }
        const db = await this.dbPromise;
        const tx = db.transaction('tombstones', 'readwrite');
        const store = tx.objectStore('tombstones');
        if (await store.get(id)) {
            await store.delete(id);
            this.trackChange('tombstones', id);
        }
        await tx.done;
    }

    private trackChange(store: string, id: string) {
        // Ensure we work with latest persistent state
        const changes = this.getPersistentChanges();

        if (!changes[store]) {
            changes[store] = [];
        }
        if (!changes[store].includes(id)) {
            changes[store].push(id);
            this.savePersistentChanges(changes);
        }
    }

    getChanges() {
        return this.getPersistentChanges();
    }

    /**
     * Clears specific changes from the tracker. 
     * To avoid race conditions, we only clear the changes that were actually synced.
     */
    clearChanges(syncedChanges?: Record<string, string[]>) {
        if (!syncedChanges) {
            localStorage.removeItem('pcs_unsynced_changes_v3');
            return;
        }

        const currentChanges = this.getPersistentChanges();
        let hasRemaining = false;

        for (const store in syncedChanges) {
            if (currentChanges[store]) {
                currentChanges[store] = currentChanges[store].filter(
                    id => !syncedChanges[store].includes(id)
                );
                if (currentChanges[store].length > 0) hasRemaining = true;
                else delete currentChanges[store];
            }
        }

        if (hasRemaining) {
            this.savePersistentChanges(currentChanges);
        } else {
            localStorage.removeItem('pcs_unsynced_changes_v3');
        }
    }

    async getAllIncomes(): Promise<Income[]> {
        const db = await this.dbPromise;
        return db.getAll('incomes');
    }

    async getFixedIncomes(): Promise<FixedIncome[]> {
        const db = await this.dbPromise;
        const all = await db.getAllFromIndex('incomes', 'by-type', 'fixed');
        return all as FixedIncome[];
    }



    // TOMBSTONE METHOD
    async addTombstone(id: string, type: string): Promise<void> {
        const db = await this.dbPromise;
        const ts = { id, type, date: Date.now() };
        await db.put('tombstones', ts);
        this.trackChange('tombstones', id);
    }

    async getTombstones(): Promise<{ id: string; type: string; date: number }[]> {
        return (await this.dbPromise).getAll('tombstones');
    }

    async cleanupOldTombstones(maxAgeDays: number = 60): Promise<void> {
        const db = await this.dbPromise;
        const cutoff = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
        const tx = db.transaction('tombstones', 'readwrite');
        const store = tx.objectStore('tombstones');
        let cursor = await store.openCursor();

        while (cursor) {
            if (cursor.value.date < cutoff) {
                await cursor.delete();
            }
            cursor = await cursor.continue();
        }
        await tx.done;
    }

    async getExtraIncomes(): Promise<ExtraIncome[]> {
        const db = await this.dbPromise;
        const all = await db.getAllFromIndex('incomes', 'by-type', 'extra');
        return all as ExtraIncome[];
    }

    async getRolloverIncomes(): Promise<RolloverIncome[]> {
        const db = await this.dbPromise;
        const all = await db.getAllFromIndex('incomes', 'by-type', 'rollover' as any);
        return all as RolloverIncome[];
    }

    async addIncome(income: Income): Promise<string> {
        const db = await this.dbPromise;
        await this.removeTombstone(income.id, 'incomes');
        await db.put('incomes', income);
        this.trackChange('incomes', income.id);
        return income.id;
    }

    async deleteIncome(id: string): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction(['incomes', 'accounts', 'tombstones'], 'readwrite');
        const incomeStore = tx.objectStore('incomes');
        const accountStore = tx.objectStore('accounts');
        const tombstoneStore = tx.objectStore('tombstones');

        const income = await incomeStore.get(id);

        // If we are deleting a received income, we must revert the balance change
        if (income && income.status === 'received' && income.linkedAccountId) {
            const account = await accountStore.get(income.linkedAccountId);
            if (account) {
                account.balance -= income.amount;
                await accountStore.put(account);
                this.trackChange('accounts', account.id);
            }
        }

        await incomeStore.delete(id);
        this.trackChange('incomes', id);

        // Add Tombstone
        await tombstoneStore.put({ id, type: 'incomes', date: Date.now() });
        this.trackChange('tombstones', id);

        await tx.done;
    }

    async deleteExpense(id: string): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction(['expenses', 'accounts', 'cards', 'tombstones'], 'readwrite');
        const expenseStore = tx.objectStore('expenses');
        const accountStore = tx.objectStore('accounts');
        const cardStore = tx.objectStore('cards');
        const tombstoneStore = tx.objectStore('tombstones');

        const expense = await expenseStore.get(id);

        // Revert balance if expense was paid
        if (expense && expense.status === 'paid') {
            await this.adjustBalances(expense, 'remove', accountStore, cardStore);
        }

        await expenseStore.delete(id);
        this.trackChange('expenses', id);

        // Add Tombstone
        await tombstoneStore.put({ id, type: 'expenses', date: Date.now() });
        this.trackChange('tombstones', id);

        await tx.done;
    }

    async updateIncome(income: Income): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction(['incomes', 'accounts', 'tombstones'], 'readwrite');
        const incomeStore = tx.objectStore('incomes');
        const accountStore = tx.objectStore('accounts');

        const oldIncome = await incomeStore.get(income.id);

        // If it was already received, undo previous balance change
        if (oldIncome && oldIncome.status === 'received' && oldIncome.linkedAccountId) {
            const account = await accountStore.get(oldIncome.linkedAccountId);
            if (account) {
                account.balance -= oldIncome.amount;
                await accountStore.put(account);
                this.trackChange('accounts', account.id);
            }
        }

        await this.removeTombstone(income.id, 'incomes', tx);
        await incomeStore.put(income);
        this.trackChange('incomes', income.id);

        // If it is now received, apply new balance change
        if (income.status === 'received' && income.linkedAccountId) {
            const account = await accountStore.get(income.linkedAccountId);
            if (account) {
                account.balance += income.amount;
                await accountStore.put(account);
                this.trackChange('accounts', account.id);
            }
        }

        await tx.done;
    }

    async addIncomeWithTransaction(income: Income): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction(['incomes', 'accounts', 'tombstones'], 'readwrite');
        const incomeStore = tx.objectStore('incomes');
        const accountStore = tx.objectStore('accounts');

        await this.removeTombstone(income.id, 'incomes', tx);
        await incomeStore.add(income);
        this.trackChange('incomes', income.id);

        if (income.type !== 'rollover' && income.linkedAccountId && income.status === 'received') {
            const account = await accountStore.get(income.linkedAccountId);
            if (account) {
                account.balance += income.amount;
                await accountStore.put(account);
                this.trackChange('accounts', account.id);
            }
        }

        await tx.done;
    }

    // Generic helpers could be better, but explicit for now
    async getAllAccounts(): Promise<Account[]> {
        return (await this.dbPromise).getAll('accounts');
    }
    async addAccount(account: Account): Promise<void> {
        await this.removeTombstone(account.id, 'accounts');
        await (await this.dbPromise).put('accounts', account);
        this.trackChange('accounts', account.id);
    }
    async getAllCards(): Promise<CreditCard[]> {
        return (await this.dbPromise).getAll('cards');
    }
    async addCard(card: CreditCard): Promise<void> {
        await this.removeTombstone(card.id, 'cards');
        await (await this.dbPromise).put('cards', card);
        this.trackChange('cards', card.id);
    }
    async updateAccount(account: Account): Promise<void> {
        await this.removeTombstone(account.id, 'accounts');
        await (await this.dbPromise).put('accounts', account);
        this.trackChange('accounts', account.id);
    }
    async updateCard(card: CreditCard): Promise<void> {
        await this.removeTombstone(card.id, 'cards');
        await (await this.dbPromise).put('cards', card);
        this.trackChange('cards', card.id);
    }
    async deleteAccount(id: string): Promise<void> {
        await (await this.dbPromise).delete('accounts', id);
        this.trackChange('accounts', id);
        await this.addTombstone(id, 'accounts');
    }
    async deleteCard(id: string): Promise<void> {
        await (await this.dbPromise).delete('cards', id);
        this.trackChange('cards', id);
        await this.addTombstone(id, 'cards');
    }
    async addExpenseWithTransaction(expense: Expense): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction(['expenses', 'accounts', 'cards', 'tombstones'], 'readwrite');
        const expenseStore = tx.objectStore('expenses');
        const accountStore = tx.objectStore('accounts');
        const cardStore = tx.objectStore('cards');

        await this.removeTombstone(expense.id, 'expenses', tx);
        await expenseStore.add(expense);
        this.trackChange('expenses', expense.id);

        if (expense.status === 'paid') {
            await this.adjustBalances(expense, 'add', accountStore, cardStore);
        }

        await tx.done;
    }

    private async adjustBalances(expense: Expense, action: 'add' | 'remove', accountStore: any, cardStore: any): Promise<void> {
        const factor = action === 'add' ? 1 : -1;

        if (expense.paymentMethod.type === 'account' || expense.paymentMethod.type === 'cash') {
            let accountId = expense.paymentMethod.type === 'account' ? expense.paymentMethod.accountId : null;

            // Fix: If it's cash and no accountId is provided, look for the first cash account
            if (expense.paymentMethod.type === 'cash' && !accountId) {
                const allAccounts = await accountStore.getAll();
                const cashAccount = allAccounts.find((a: Account) => a.type === 'cash');
                if (cashAccount) accountId = cashAccount.id;
            }

            if (accountId) {
                const account = await accountStore.get(accountId);
                if (account) {
                    account.balance -= (expense.amount * factor);
                    await accountStore.put(account);
                    this.trackChange('accounts', account.id);
                }
            }
        } else if (expense.paymentMethod.type === 'card') {
            const cardId = expense.paymentMethod.cardId;
            const card = await cardStore.get(cardId);
            if (card) {
                if (card.type === 'debit') {
                    const account = await accountStore.get(card.linkedAccountId);
                    if (account) {
                        account.balance -= (expense.amount * factor);
                        await accountStore.put(account);
                        this.trackChange('accounts', account.id);
                    }
                } else {
                    card.currentBalance += (expense.amount * factor);
                    await cardStore.put(card);
                    this.trackChange('cards', card.id);
                }
            }
        }
    }

    async updateExpense(expense: Expense): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction(['expenses', 'accounts', 'cards', 'tombstones'], 'readwrite');
        const expenseStore = tx.objectStore('expenses');
        const accountStore = tx.objectStore('accounts');
        const cardStore = tx.objectStore('cards');

        const oldExpense = await expenseStore.get(expense.id);

        if (oldExpense && oldExpense.status === 'paid') {
            await this.adjustBalances(oldExpense, 'remove', accountStore, cardStore);
        }

        await this.removeTombstone(expense.id, 'expenses', tx);
        await expenseStore.put(expense);
        this.trackChange('expenses', expense.id);

        if (expense.status === 'paid') {
            await this.adjustBalances(expense, 'add', accountStore, cardStore);
        }

        await tx.done;
    }

    async getAllExpenses(): Promise<Expense[]> {
        const db = await this.dbPromise;
        const expenses = await db.getAllFromIndex('expenses', 'by-date');
        // Return mostly sorted, but strictly speaking specific logic might be needed if index order isn't perfect
        // IndexedDB 'by-date' (number) should be ascending.
        return expenses;
    }
    async addExpense(expense: Expense): Promise<void> {
        // Legacy simple add, but clearer to redirect to logic
        await this.addExpenseWithTransaction(expense);
    }
    async getAllSavings(): Promise<SavingGoal[]> {
        return (await this.dbPromise).getAll('savings');
    }
    async addSavingGoal(goal: SavingGoal): Promise<void> {
        await this.removeTombstone(goal.id, 'savings');
        await (await this.dbPromise).put('savings', goal);
        this.trackChange('savings', goal.id);
    }
    async allocateSavingsWithTransaction(allocation: SavingAllocation): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction(['allocations', 'savings', 'accounts'], 'readwrite');
        const allocStore = tx.objectStore('allocations');
        const savingsStore = tx.objectStore('savings');
        const accountStore = tx.objectStore('accounts');

        await this.removeTombstone(allocation.id, 'allocations');
        await allocStore.add(allocation);
        this.trackChange('allocations', allocation.id);


        const goal = await savingsStore.get(allocation.goalId);
        if (goal) {
            goal.currentAmount += allocation.amount;
            await savingsStore.put(goal);
            this.trackChange('savings', goal.id);

            // Only deduct from account if it's NOT a virtual piggy bank AND source is defined
            if (!goal.isVirtual && allocation.sourceAccountId) {
                const account = await accountStore.get(allocation.sourceAccountId);
                if (account) {
                    account.balance -= allocation.amount;
                    await accountStore.put(account);
                    this.trackChange('accounts', account.id);
                }
            }
        }

        await tx.done;
    }

    async getAllAllocations(): Promise<SavingAllocation[]> {
        return (await this.dbPromise).getAll('allocations');
    }

    async getAllRecurringExpenses(): Promise<RecurringExpense[]> {
        return (await this.dbPromise).getAll('recurring_expenses');
    }
    async addRecurringExpense(expense: RecurringExpense): Promise<void> {
        await this.removeTombstone(expense.id, 'recurring_expenses');
        await (await this.dbPromise).put('recurring_expenses', expense);
        this.trackChange('recurring_expenses', expense.id);
    }
    async updateRecurringExpense(expense: RecurringExpense): Promise<void> {
        await this.removeTombstone(expense.id, 'recurring_expenses');
        await (await this.dbPromise).put('recurring_expenses', expense);
        this.trackChange('recurring_expenses', expense.id);
    }
    async deleteRecurringExpense(id: string): Promise<void> {
        await (await this.dbPromise).delete('recurring_expenses', id);
        this.trackChange('recurring_expenses', id);
        await this.addTombstone(id, 'recurring_expenses');
    }

    async updateSavingGoal(goal: SavingGoal): Promise<void> {
        await this.removeTombstone(goal.id, 'savings');
        await (await this.dbPromise).put('savings', goal);
        this.trackChange('savings', goal.id);
    }
    async deleteSavingGoal(id: string): Promise<void> {
        await (await this.dbPromise).delete('savings', id);
        this.trackChange('savings', id);
        await this.addTombstone(id, 'savings');
    }

    // Loans
    async getAllLoans(): Promise<Loan[]> {
        return (await this.dbPromise).getAll('loans');
    }

    async addLoan(loan: Loan): Promise<void> {
        await this.removeTombstone(loan.id, 'loans');
        await (await this.dbPromise).add('loans', loan);
        this.trackChange('loans', loan.id);
    }
    async updateLoan(loan: Loan): Promise<void> {
        await this.removeTombstone(loan.id, 'loans');
        await (await this.dbPromise).put('loans', loan);
        this.trackChange('loans', loan.id);
    }
    async deleteLoan(id: string): Promise<void> {
        await (await this.dbPromise).delete('loans', id);
        this.trackChange('loans', id);
        await this.addTombstone(id, 'loans');
    }

    // Closings
    async getClosing(year: number, month: number) {
        return (await this.dbPromise).get('closings', [year, month]);
    }

    async addClosing(closingData: { year: number; month: number; closedAt: number; finalBalance: number; rolloverAction: 'save' | 'carry' | 'cover' | 'deduct' | 'dismiss'; rolloverAmount: number; targetId?: string }) {
        const key = `${closingData.year}-${closingData.month}`;
        await this.removeTombstone(key, 'closings');
        await (await this.dbPromise).put('closings', closingData);
        // Closings key is complex [year, month], simplifying tacker to use string key
        this.trackChange('closings', key);
    }

    async getAllClosings() {
        return (await this.dbPromise).getAll('closings');
    }

    async deleteClosing(year: number, month: number): Promise<void> {
        const db = await this.dbPromise;
        const key = `${year}-${month}`;
        await db.delete('closings', [year, month]);
        this.trackChange('closings', key);
        await this.addTombstone(key, 'closings');
    }

    async deleteAllocation(id: string): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction(['allocations', 'savings', 'accounts', 'tombstones'], 'readwrite');
        const allocStore = tx.objectStore('allocations');
        const savingsStore = tx.objectStore('savings');
        const accountStore = tx.objectStore('accounts');
        const tombstoneStore = tx.objectStore('tombstones');

        const allocation = await allocStore.get(id);
        if (allocation) {
            const goal = await savingsStore.get(allocation.goalId);
            if (goal) {
                goal.currentAmount -= allocation.amount;
                await savingsStore.put(goal);
                this.trackChange('savings', goal.id);

                // Add back to account if it wasn't virtual
                if (!goal.isVirtual && allocation.sourceAccountId) {
                    const account = await accountStore.get(allocation.sourceAccountId);
                    if (account) {
                        account.balance += allocation.amount;
                        await accountStore.put(account);
                        this.trackChange('accounts', account.id);
                    }
                }
            }
            await allocStore.delete(id);
            this.trackChange('allocations', id);
            await tombstoneStore.put({ id, type: 'allocations', date: Date.now() });
            this.trackChange('tombstones', id);
        }
        await tx.done;
    }

    async getOverride(year: number, month: number): Promise<MonthOverride | undefined> {
        return (await this.dbPromise).get('overrides', [year, month]);
    }

    async getAllOverrides(): Promise<MonthOverride[]> {
        return (await this.dbPromise).getAll('overrides');
    }

    async updateOverride(override: MonthOverride): Promise<void> {
        const db = await this.dbPromise;
        const key = `${override.year}-${override.month}`;
        await this.removeTombstone(key, 'overrides');
        const tx = db.transaction('overrides', 'readwrite');
        await tx.objectStore('overrides').put(override);
        this.trackChange('overrides', key);
        await tx.done;
    }

    async deleteOverride(year: number, month: number): Promise<void> {
        const db = await this.dbPromise;
        const key = `${year}-${month}`;
        const tx = db.transaction('overrides', 'readwrite');
        await tx.objectStore('overrides').delete([year, month]);
        this.trackChange('overrides', key);
        await tx.done;
        await this.addTombstone(key, 'overrides');
    }

    async clearAllData() {
        const db = await this.dbPromise;
        const stores = ['incomes', 'accounts', 'cards', 'expenses', 'recurring_expenses', 'savings', 'allocations', 'loans', 'closings', 'tombstones', 'overrides'] as const;
        const tx = db.transaction(stores, 'readwrite');
        for (const storeName of stores) {
            await tx.objectStore(storeName).clear();
        }
        await tx.done;
    }

    async importData(data: any, shouldMarkAsChanged = true) {
        const db = await this.dbPromise;

        // Clear all existing data
        await db.clear('incomes');
        await db.clear('accounts');
        await db.clear('cards');
        await db.clear('expenses');
        await db.clear('savings');
        await db.clear('allocations');
        await db.clear('recurring_expenses'); // Changed from 'recurring' to 'recurring_expenses'
        await db.clear('loans');
        await db.clear('closings');
        await db.clear('tombstones'); // Added clear for tombstones
        await db.clear('overrides'); // Added clear for overrides

        // Import new data
        // Using a single transaction for all puts for efficiency
        const stores = ['incomes', 'accounts', 'cards', 'expenses', 'recurring_expenses', 'savings', 'allocations', 'loans', 'closings', 'tombstones', 'overrides'] as const;
        const tx = db.transaction(stores, 'readwrite');

        const putAllInTx = async (storeName: typeof stores[number], items: any[]) => {
            if (!items) return;
            const store = tx.objectStore(storeName);
            for (const item of items) {
                await store.put(item);
            }
        };

        if (data.incomes) await putAllInTx('incomes', data.incomes);
        if (data.accounts) await putAllInTx('accounts', data.accounts);
        if (data.cards) await putAllInTx('cards', data.cards);
        if (data.expenses) await putAllInTx('expenses', data.expenses);
        if (data.savings) await putAllInTx('savings', data.savings);
        if (data.allocations) await putAllInTx('allocations', data.allocations);
        if (data.recurring) await putAllInTx('recurring_expenses', data.recurring); // Data key is 'recurring', store is 'recurring_expenses'
        if (data.loans) await putAllInTx('loans', data.loans);
        if (data.closings) await putAllInTx('closings', data.closings);
        if (data.tombstones) await putAllInTx('tombstones', data.tombstones); // Added import for tombstones
        if (data.overrides) await putAllInTx('overrides', data.overrides);

        await tx.done;

        // Reset changes tracking and mark EVERYTHING as new so it uploads to cloud correctly
        if (shouldMarkAsChanged) {
            localStorage.removeItem('pcs_unsynced_changes_v3');
            await this.markAllAsChanged();
        }

        localStorage.setItem('pcs_last_sync_full', new Date().toISOString());
    }
}

export const incomeDB = new IncomeDB();
