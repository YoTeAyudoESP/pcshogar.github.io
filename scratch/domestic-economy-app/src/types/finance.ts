export type Currency = 'EUR' | 'USD';

export interface Account {
    id: string;
    name: string;
    type: 'bank' | 'cash';
    balance: number;
    currency: Currency;
    isMain: boolean;
    color?: string;
    updatedAt?: number;
}

export interface CreditCard {
    id: string;
    name: string;
    type: 'debit' | 'credit';
    linkedAccountId: string;
    cutoffDay: number; // Day of month when cycle closes
    paymentDay: number; // Day of month when bill is paid
    limit: number;
    currentBalance: number;
    color?: string;
    updatedAt?: number;
}

export type PaymentMethod =
    | { type: 'account'; accountId: string }
    | { type: 'card'; cardId: string; settlementAdjustment?: number }
    | { type: 'cash' };

export interface Expense {
    id: string;
    description: string;
    amount: number;
    currency: Currency;
    date: number; // Transaction date
    categoryId: string;
    paymentMethod: PaymentMethod;
    isFixed: boolean;
    status: 'pending' | 'paid';
    recurringExpenseId?: string;
    period?: string; // YYYY-MM
    linkedSavingGoalId?: string;
    updatedAt?: number;
}

export interface SavingGoal {
    id: string;
    name: string;
    targetAmount?: number;
    currentAmount: number;
    currency: Currency;
    icon?: string;
    isVirtual?: boolean;
    monthlySavingAmount?: number;
    linkedFixedIncomeId?: string;
    updatedAt?: number;
}

export interface Loan {
    id: string;
    name: string;
    description?: string;
    totalAmount: number;
    monthlyInstallment: number;
    remainingAmount: number;
    startDate: number;
    status: 'active' | 'completed';
    currency: Currency;
    linkedRecurringExpenseId?: string;
    paymentDay: number;
    categoryId: string;
    paymentMethod: PaymentMethod;
    color?: string;
    amortizations?: {
        id: string;
        date: number;
        amount: number;
        accountId: string;
        type: 'partial' | 'total';
        impact?: 'reduce_time' | 'reduce_installment';
    }[];
    updatedAt?: number;
}

export interface MonthOverride {
    year: number;
    month: number;
    amount: number;
    targetAmount?: number;
    isManual: boolean;
    updatedAt: number;
}

export interface SavingAllocation {
    id: string;
    goalId: string;
    amount: number;
    date: number;
    sourceAccountId?: string;
    updatedAt?: number;
}

export interface RecurringExpense {
    id: string;
    description: string;
    amount: number;
    currency: Currency;
    frequency: 'monthly' | 'bi-monthly' | 'quarterly' | 'half-yearly' | 'yearly' | 'split-annual';
    paymentDay: number; // Day of month
    paymentMonth?: number; // Month of year (0-11) for yearly/quarterly/etc.
    splitStartMonth?: number; // Start month for split-annual (0-11)
    active: boolean;
    paymentMethod?: PaymentMethod;
    sourceAccountId?: string; // Deprecated, for backward compatibility
    categoryId?: string;
    updatedAt?: number;
}

export interface Category {
    id: string;
    name: string;
    icon?: string;
    color?: string;
    type: 'expense' | 'income';
    updatedAt?: number;
}

export interface AccountTransfer {
    id: string;
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    currency: Currency;
    date: number;
    notes?: string;
    updatedAt?: number;
}

export interface BalanceMovement {
    id: string;
    accountId: string;
    amount: number;
    type: 'expense' | 'income' | 'transfer' | 'allocation' | 'adjustment' | 'initial';
    relatedId?: string; // ID of the expense, income, or transfer
    description: string;
    date: number;
    updatedAt: number;
}

export const DEFAULT_CATEGORIES: Category[] = [
    { id: 'cat_food', name: 'Alimentación', icon: 'shopping-cart', color: '#e67e22', type: 'expense' },
    { id: 'cat_transport', name: 'Transporte/Gasolina', icon: 'car', color: '#3498db', type: 'expense' },
    { id: 'cat_housing', name: 'Vivienda', icon: 'home', color: '#9b59b6', type: 'expense' },
    { id: 'cat_utilities', name: 'Suministros', icon: 'zap', color: '#f1c40f', type: 'expense' },
    { id: 'cat_leisure', name: 'Ocio', icon: 'coffee', color: '#e74c3c', type: 'expense' },
    { id: 'cat_diy', name: 'Bricolaje/Hogar', icon: 'hammer', color: '#2ecc71', type: 'expense' },
    { id: 'cat_health', name: 'Salud', icon: 'heart', color: '#ff7979', type: 'expense' },
    { id: 'cat_loans', name: 'Préstamos/Hipotecas', icon: 'landmark', color: '#16a085', type: 'expense' },
    { id: 'cat_other', name: 'Otros', icon: 'more-horizontal', color: '#95a5a6', type: 'expense' }
];
