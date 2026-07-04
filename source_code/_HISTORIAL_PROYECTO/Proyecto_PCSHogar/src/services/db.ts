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
}

const DB_NAME = 'domestic-economy-db';
const ORG_VERSION = 5;

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
                        db.createObjectStore('closings', { keyPath: 'month' }); // composite key? simplistic for now
                    }
                    if (!db.objectStoreNames.contains('overrides')) {
                        db.createObjectStore('overrides', { keyPath: 'month' });
                    }
                }
            },
        });
    }

    async importFullData(data: any): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction(db.objectStoreNames, 'readwrite');
        
        for (const storeName of db.objectStoreNames) {
            const store = tx.objectStore(storeName);
            await store.clear();
            const items = data[storeName] || [];
            for (const item of items) {
                await store.put(item);
            }
        }
        await tx.done;
    }

    async getAllIncomes(): Promise<Income[]> {
        return (await this.dbPromise).getAll('incomes');
    }

    async getFixedIncomes(): Promise<FixedIncome[]> {
        const all = await this.getAllIncomes();
        return all.filter((i): i is FixedIncome => i.type === 'fixed');
    }

    async getExtraIncomes(): Promise<ExtraIncome[]> {
        const all = await this.getAllIncomes();
        return all.filter((i): i is ExtraIncome => i.type === 'extra');
    }

    async deleteIncome(id: string): Promise<void> {
        await (await this.dbPromise).delete('incomes', id);
    }

    async updateIncome(income: Income): Promise<void> {
        await (await this.dbPromise).put('incomes', income);
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

    async updateIncomeWithTransaction(updatedIncome: Income): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction(['incomes', 'accounts', 'movements'], 'readwrite');
        const incomeStore = tx.objectStore('incomes');
        const accountStore = tx.objectStore('accounts');
        const movementStore = tx.objectStore('movements');

        const oldIncome = await incomeStore.get(updatedIncome.id);
        if (!oldIncome) {
            await tx.abort();
            return;
        }

        // 1. Revert old income effect if it was received
        if (oldIncome.linkedAccountId && oldIncome.status === 'received') {
            const oldAccount = await accountStore.get(oldIncome.linkedAccountId);
            if (oldAccount) {
                oldAccount.balance -= oldIncome.amount;
                await accountStore.put(oldAccount);
                // We don't remove the movement for simplicity, or we could add a reversal movement
                await movementStore.add({
                    id: `mv_rev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    accountId: oldIncome.linkedAccountId,
                    amount: -oldIncome.amount,
                    type: 'cancel_income',
                    description: `Corrección Ingreso: ${oldIncome.name}`,
                    relatedId: oldIncome.id,
                    date: Date.now(),
                    updatedAt: Date.now()
                });
            }
        }

        // 2. Apply new income effect if it is received
        if (updatedIncome.linkedAccountId && updatedIncome.status === 'received') {
            const newAccount = await accountStore.get(updatedIncome.linkedAccountId);
            if (newAccount) {
                newAccount.balance += updatedIncome.amount;
                await accountStore.put(newAccount);
                
                await movementStore.add({
                    id: `mv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    accountId: updatedIncome.linkedAccountId,
                    amount: updatedIncome.amount,
                    type: 'income',
                    description: `Ingreso (Modif): ${updatedIncome.name}`,
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
        const movementStore = tx.objectStore('movements');

        const income = await incomeStore.get(id);
        if (income && income.linkedAccountId && income.status === 'received') {
            const account = await accountStore.get(income.linkedAccountId);
            if (account) {
                account.balance -= income.amount;
                await accountStore.put(account);
                
                await movementStore.add({
                    id: `mv_del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    accountId: income.linkedAccountId,
                    amount: -income.amount,
                    type: 'cancel_income',
                    description: `Eliminación Ingreso: ${income.name}`,
                    relatedId: income.id,
                    date: Date.now(),
                    updatedAt: Date.now()
                });
            }
        }

        await incomeStore.delete(id);
        await tx.done;
    }

    async addExpenseWithTransaction(expense: Expense): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction(['expenses', 'accounts', 'cards', 'movements'], 'readwrite');
        const expenseStore = tx.objectStore('expenses');
        const accountStore = tx.objectStore('accounts');
        const cardStore = tx.objectStore('cards');
        const movementStore = tx.objectStore('movements');

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
                        targetAccountId = card.linkedAccountId;
                        const account = await accountStore.get(targetAccountId);
                        if (account) {
                            account.balance -= expense.amount;
                            await accountStore.put(account);
                        }
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
        }
        await tx.done;
    }

    // Generic helpers
    async getAllAccounts(): Promise<Account[]> { return (await this.dbPromise).getAll('accounts'); }
    async getAllCards(): Promise<CreditCard[]> { return (await this.dbPromise).getAll('cards'); }
    async getAllExpenses(): Promise<Expense[]> { return (await this.dbPromise).getAll('expenses'); }
    async getAllSavings(): Promise<SavingGoal[]> { return (await this.dbPromise).getAll('savings'); }
    async getAllAllocations(): Promise<SavingAllocation[]> { return (await this.dbPromise).getAll('allocations'); }
    async getAllRecurringExpenses(): Promise<RecurringExpense[]> { return (await this.dbPromise).getAll('recurring_expenses'); }
    async getAllLoans(): Promise<Loan[]> { return (await this.dbPromise).getAll('loans'); }
    async getAllMovements(): Promise<AccountMovement[]> { return (await this.dbPromise).getAll('movements'); }
    async getAllCategories(): Promise<Category[]> { return (await this.dbPromise).getAll('categories'); }
    async getAllTransfers(): Promise<Transfer[]> { return (await this.dbPromise).getAll('transfers'); }
    async getAllClosings(): Promise<MonthClosing[]> { return (await this.dbPromise).getAll('closings'); }
    async getAllOverrides(): Promise<MonthOverride[]> { return (await this.dbPromise).getAll('overrides'); }

    async addAccount(account: Account): Promise<void> { await (await this.dbPromise).put('accounts', account); }
    async updateAccount(account: Account): Promise<void> { await (await this.dbPromise).put('accounts', account); }
    async addCard(card: CreditCard): Promise<void> { await (await this.dbPromise).put('cards', card); }
    async updateCard(card: CreditCard): Promise<void> { await (await this.dbPromise).put('cards', card); }
    async deleteAccount(id: string): Promise<void> { await (await this.dbPromise).delete('accounts', id); }
    async deleteCard(id: string): Promise<void> { await (await this.dbPromise).delete('cards', id); }
    async addCategory(category: Category): Promise<void> { await (await this.dbPromise).put('categories', category); }
    async updateCategory(category: Category): Promise<void> { await (await this.dbPromise).put('categories', category); }

    async deleteCategory(id: string, reassignToId?: string): Promise<void> {
        const db = await this.dbPromise;
        const stores = ['categories', 'expenses', 'recurring_expenses', 'loans', 'incomes'];
        const tx = db.transaction(stores as any, 'readwrite');

        if (reassignToId) {
            // Reassign expenses
            const expenseStore = tx.objectStore('expenses') as any;
            const expenses = await expenseStore.index('by-category').getAll(id);
            for (const exp of expenses) {
                exp.categoryId = reassignToId;
                await expenseStore.put(exp);
            }

            // Reassign recurring expenses
            const recStore = tx.objectStore('recurring_expenses');
            const recs = await recStore.getAll();
            for (const rec of recs) {
                if (rec.categoryId === id) {
                    rec.categoryId = reassignToId;
                    await recStore.put(rec);
                }
            }

            // Reassign loans
            const loanStore = tx.objectStore('loans');
            const loans = await loanStore.getAll();
            for (const loan of loans) {
                if (loan.categoryId === id) {
                    loan.categoryId = reassignToId;
                    await loanStore.put(loan);
                }
            }

            // Reassign incomes (check both 'category' and 'categoryId' for compatibility)
            const incomeStore = tx.objectStore('incomes');
            const incomes = await incomeStore.getAll();
            for (const inc of incomes) {
                if ((inc as any).categoryId === id || (inc as any).category === id) {
                    (inc as any).categoryId = reassignToId;
                    delete (inc as any).category;
                    await incomeStore.put(inc);
                }
            }
        }

        // Finally delete the category
        await tx.objectStore('categories').delete(id);
        await tx.done;
    }

    async addSavingGoal(goal: SavingGoal): Promise<void> { await (await this.dbPromise).put('savings', goal); }
    async updateSavingGoal(goal: SavingGoal): Promise<void> { await (await this.dbPromise).put('savings', goal); }
    
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

    async addRecurringExpense(expense: RecurringExpense): Promise<void> { await (await this.dbPromise).put('recurring_expenses', expense); }
    async addLoan(loan: Loan): Promise<void> { await (await this.dbPromise).put('loans', loan); }
    async updateLoan(loan: Loan): Promise<void> { await (await this.dbPromise).put('loans', loan); }
    async deleteLoan(id: string): Promise<void> { await (await this.dbPromise).delete('loans', id); }

    async transferBalanceWithTransaction(transfer: Transfer): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction(['accounts', 'movements', 'transfers'], 'readwrite');
        const accountStore = tx.objectStore('accounts');
        const movementStore = tx.objectStore('movements');
        const transferStore = tx.objectStore('transfers');

        await transferStore.add(transfer);

        const fromAcc = await accountStore.get(transfer.fromAccountId);
        const toAcc = await accountStore.get(transfer.toAccountId);

        if (fromAcc && toAcc) {
            fromAcc.balance -= transfer.amount;
            toAcc.balance += transfer.amount;

            await accountStore.put(fromAcc);
            await accountStore.put(toAcc);

            // Outgoing movement
            await movementStore.add({
                id: `mv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_out`,
                accountId: transfer.fromAccountId,
                amount: -transfer.amount,
                type: 'transfer',
                description: `Traspaso a ${toAcc.name}: ${transfer.notes || ''}`,
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
                description: `Traspaso desde ${fromAcc.name}: ${transfer.notes || ''}`,
                relatedId: transfer.id,
                date: transfer.date,
                updatedAt: Date.now()
            });
        }
        await tx.done;
    }
}


export const incomeDB = new IncomeDB();

