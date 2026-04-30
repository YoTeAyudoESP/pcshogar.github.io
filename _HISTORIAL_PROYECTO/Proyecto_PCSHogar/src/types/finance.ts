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
    | { type: 'account'; accountId: string; settlementAdjustment?: number }
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
    updatedAt?: number;
    period?: string; // e.g., "2026-03"
    recurringExpenseId?: string;
    settlementInfo?: string;
    linkedSavingGoalId?: string;
}

export interface SavingGoal {
    id: string;
    name: string;
    targetAmount?: number;
    currentAmount: number;
    currency: Currency;
    icon?: string;
    monthlySavingAmount?: number;
    isVirtual?: boolean;
    linkedFixedIncomeId?: string;
    updatedAt?: number;
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
    frequency: 'weekly' | 'monthly' | 'yearly' | 'bi-monthly';
    paymentDay: number; // Day of month
    paymentMonth?: number; // For yearly/bi-monthly
    active: boolean;
    sourceAccountId?: string;
    categoryId?: string;
    paymentMethod?: PaymentMethod;
    updatedAt?: number;
    ignoredPeriods?: string[]; // Array of strings like "2026-04"
}

export interface Loan {
    id: string;
    name: string;
    totalAmount: number;
    remainingAmount: number;
    currentDebt: number;       // Alias / current outstanding debt (same as remainingAmount)
    monthlyInstallment: number;
    monthlyPayment: number;    // Alias for monthlyInstallment used in components
    startDate: number;
    currency: Currency;
    paymentDay?: number;
    categoryId?: string;
    paymentMethod?: PaymentMethod;
    linkedRecurringExpenseId?: string;
    status: 'active' | 'paid';
    isPaid?: boolean;          // Convenience flag
    updatedAt?: number;
    color?: string;
}

export interface Transfer {
    id: string;
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    currency: Currency;
    date: number;
    notes?: string;
    updatedAt?: number;
}

export interface MonthClosing {
    year: number;
    month: number;
    closedAt: number;
    finalBalance: number;
    rolloverAction: 'dismiss' | 'deduct';
    rolloverAmount: number;
}

export interface MonthOverride {
    year: number;
    month: number;
    amount: number; // Current balance override
    targetAmount?: number; // Previous target balance?
    isManual: boolean;
    updatedAt: number;
}

export interface AccountMovement {

    id: string;
    accountId: string;
    amount: number;
    type: 'income' | 'expense' | 'transfer' | 'allocation' | 'adjustment' | 'cancel_income' | 'cancel_expense';
    description: string;
    relatedId?: string;
    date: number;
    updatedAt?: number;
}

export interface Category {
    id: string;
    name: string;
    icon?: string;
    color?: string;
    type: 'income' | 'expense';
    updatedAt?: number;
}

export const DEFAULT_CATEGORIES: Category[] = [
    // Expense Categories
    { id: 'cat_food', name: 'Alimentación', icon: 'shopping-cart', color: '#e67e22', type: 'expense' },
    { id: 'cat_transport', name: 'Transporte/Gasolina', icon: 'car', color: '#3498db', type: 'expense' },
    { id: 'cat_housing', name: 'Vivienda', icon: 'home', color: '#9b59b6', type: 'expense' },
    { id: 'cat_utilities', name: 'Suministros', icon: 'zap', color: '#f1c40f', type: 'expense' },
    { id: 'cat_leisure', name: 'Ocio', icon: 'coffee', color: '#e74c3c', type: 'expense' },
    { id: 'cat_diy', name: 'Bricolaje/Hogar', icon: 'hammer', color: '#2ecc71', type: 'expense' },
    { id: 'cat_health', name: 'Salud', icon: 'heart', color: '#ff7979', type: 'expense' },
    { id: 'cat_loans', name: 'Préstamos', icon: 'credit-card', color: '#1abc9c', type: 'expense' },
    { id: 'cat_other', name: 'Otros', icon: 'more-horizontal', color: '#95a5a6', type: 'expense' },
    
    // Income Categories
    { id: 'cat_salary', name: 'Salario/Nómina', icon: 'briefcase', color: '#27ae60', type: 'income' },
    { id: 'cat_sales', name: 'Ventas', icon: 'tag', color: '#f39c12', type: 'income' },
    { id: 'cat_interests', name: 'Intereses/Inversión', icon: 'trending-up', color: '#2980b9', type: 'income' },
    { id: 'cat_gift', name: 'Regalos', icon: 'gift', color: '#e84393', type: 'income' },
    { id: 'cat_refund', name: 'Reembolsos', icon: 'rotate-ccw', color: '#00cec9', type: 'income' },
    { id: 'cat_other_income', name: 'Otros Ingresos', icon: 'plus-circle', color: '#636e72', type: 'income' }
];

