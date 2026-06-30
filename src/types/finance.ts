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
    type: 'debit' | 'credit' | 'virtual';
    linkedAccountId?: string;
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
    isSettled?: boolean;
    excludeFromBudget?: boolean;
    isSettlement?: boolean;
    settlementMetadata?: {
        cardId: string;
        rangeStart: number;
        rangeEnd: number;
        isCarryover?: boolean;
    };
    updatedAt?: number;
    period?: string; // e.g., "2026-03"
    recurringExpenseId?: string;
    relatedId?: string;
    settlementInfo?: string;
    linkedSavingGoalId?: string;
    savingGoalFunding?: { goalId: string; amount: number }[];
}

export interface SavingGoal {
    id: string;
    name: string;
    targetAmount?: number;
    currentAmount: number;
    currency: Currency;
    icon?: string;
    color?: string; // Color identifier for charts/UI
    monthlySavingAmount?: number;
    automaticSourceAccountId?: string; // Where auto-savings come from
    accountInBudget?: boolean; // If adjustments affect monthly available
    isVirtual?: boolean;
    linkedFixedIncomeId?: string;
    updatedAt?: number;
    createdAt?: number; // Fecha de creación de la hucha
}

export interface SavingAllocation {
    id: string;
    goalId: string;
    amount: number;
    date: number;
    type: 'manual' | 'automatic' | 'transfer_in' | 'transfer_out' | 'adjustment';
    description?: string;
    sourceAccountId?: string;
    relatedGoalId?: string; // For transfers
    updatedAt?: number;
    budgetMonth?: number;
    budgetYear?: number;
}

export interface RecurringExpense {
    id: string;
    description: string;
    amount: number;
    currency: Currency;
    frequency: 'weekly' | 'monthly' | 'bi-monthly' | 'quarterly' | 'four-monthly' | 'five-monthly' | 'semi-annually' | 'seven-monthly' | 'eight-monthly' | 'nine-monthly' | 'ten-monthly' | 'eleven-monthly' | 'yearly';
    paymentDay: number; // Day of month
    paymentMonth?: number; // For yearly/bi-monthly/quarterly/etc. (1-indexed)
    active: boolean;
    sourceAccountId?: string;
    categoryId?: string;
    paymentMethod?: PaymentMethod;
    createdAt?: number;
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
    firstInstallmentAmount?: number;
    lastInstallmentAmount?: number;
    startDate: number;
    estimatedEndDate?: number;
    currency: Currency;
    paymentDay?: number;
    categoryId?: string;
    paymentMethod?: PaymentMethod;
    linkedAccountId?: string;
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
    id: string; // "YYYY-MM"
    year: number;
    month: number;
    closedAt: number;
    finalBalance: number;
    status: 'pending' | 'processed' | 'ignored';
    rolloverAction?: 'dismiss' | 'deduct' | 'save' | 'next_month';
    rolloverAmount?: number;
    remainingToDistribute?: number;
    distributions?: { type: 'next_month' | 'saving_goal', targetId?: string, amount: number }[];
    updatedAt?: number;
}

export interface MonthOverride {
    id: string; // "YYYY-MM"
    year: number;
    month: number;
    amount: number; // Current balance override
    isManual: boolean;
    updatedAt: number;
    delta?: number; // Diferencia con el cálculo automático al momento de crearse
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
    type?: 'income' | 'expense';
    updatedAt?: number;
}

export const DEFAULT_CATEGORIES: Category[] = [
    { id: 'cat_food', name: 'Alimentación', icon: 'shopping-cart', color: '#e67e22', type: 'expense' },
    { id: 'cat_transport', name: 'Transporte/Gasolina', icon: 'car', color: '#3498db', type: 'expense' },
    { id: 'cat_housing', name: 'Vivienda', icon: 'home', color: '#9b59b6', type: 'expense' },
    { id: 'cat_utilities', name: 'Suministros', icon: 'zap', color: '#f1c40f', type: 'expense' },
    { id: 'cat_leisure', name: 'Ocio', icon: 'coffee', color: '#e74c3c', type: 'expense' },
    { id: 'cat_diy', name: 'Bricolaje/Hogar', icon: 'hammer', color: '#2ecc71', type: 'expense' },
    { id: 'cat_health', name: 'Salud', icon: 'heart', color: '#ff7979', type: 'expense' },
    { id: 'cat_loans', name: 'Préstamos', icon: 'credit-card', color: '#1abc9c', type: 'expense' },
    { id: 'cat_other', name: 'Otros', icon: 'more-horizontal', color: '#95a5a6', type: 'expense' }
];

export const DEFAULT_INCOME_CATEGORIES: Category[] = [
    { id: 'cat_inc_salary', name: 'Nómina', icon: 'briefcase', color: '#2ecc71', type: 'income' },
    { id: 'cat_inc_extra', name: 'Ingresos Extra', icon: 'trending-up', color: '#3498db', type: 'income' },
    { id: 'cat_inc_gift', name: 'Regalos', icon: 'gift', color: '#e74c3c', type: 'income' },
    { id: 'cat_inc_invest', name: 'Inversiones', icon: 'dollar-sign', color: '#f1c40f', type: 'income' },
    { id: 'cat_inc_other', name: 'Otros Ingresos', icon: 'more-horizontal', color: '#95a5a6', type: 'income' }
];

export interface SyncSettings {
    enabled: boolean;
    type: 'local' | 'smb' | 'dropbox' | 'googledrive';
    localPath?: string;
    smbConfig?: {
        server: string;
        share: string;
        user: string;
        pass: string;
    };
    dropboxToken?: string;
    dropboxUserEmail?: string;
    dropboxPath?: string;
    googledriveToken?: string;
    googledriveUserEmail?: string;
    googledrivePath?: string;
    lastSync?: number;
}

export interface Economy {
    id: string;
    name: string;
    dbName: string;
    sync: SyncSettings;
    ownerProfileId?: string;
}

export interface UserProfile {
    id: string;
    name: string;
    pinHash?: string; // SHA-256 or MD5 hash of PIN
    biometricEnabled?: boolean; // Habilitar autenticación biométrica
    economies: Economy[];
    activeEconomyId: string;
    avatar?: string;
}

export interface AppSettings {
    currency: string;
    language: string;
    theme: string;
    sync: SyncSettings;
    profiles?: UserProfile[];
    activeProfileId?: string;
    notifyNextDayPayments?: boolean;
}

export const SUPPORTED_CURRENCIES = [
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'USD', symbol: '$', name: 'Dólar estadounidense' },
    { code: 'GBP', symbol: '£', name: 'Libra esterlina' },
    { code: 'JPY', symbol: '¥', name: 'Yen japonés' },
    { code: 'MXN', symbol: '$', name: 'Peso mexicano' },
    { code: 'ARS', symbol: '$', name: 'Peso argentino' },
    { code: 'COP', symbol: '$', name: 'Peso colombiano' },
    { code: 'CLP', symbol: '$', name: 'Peso chileno' }
];

export const SUPPORTED_LANGUAGES = [
    { code: 'es', name: 'Español (España)' },
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'it', name: 'Italiano' },
    { code: 'pt', name: 'Português' }
];

export const APP_THEMES = [
    { id: 'default', name: 'Principal (Oscuro)', colors: { primary: '#1e293b', secondary: '#0f172a' } },
    { id: 'light', name: 'Claro (Light)', colors: { primary: '#ffffff', secondary: '#f3f4f6' } }
];
