export type Frequency = 'weekly' | 'monthly' | 'yearly';

export interface IncomeBase {
    id: string; // UUID
    name: string;
    amount: number;
    currency: string;
    createdAt: number; // Timestamp
    linkedAccountId?: string; // Account where money is deposited
    status: 'pending' | 'received';
    type: 'fixed' | 'extra' | 'rollover';
    effectiveDate?: number; // Realization date
    budgetMonth?: number; // 0-indexed month
    budgetYear?: number;
    period?: string; // "YYYY-MM"
    categoryId?: string;
}

export interface FixedIncome extends IncomeBase {
    type: 'fixed';
    frequency: Frequency;
    expirationDate?: number; // Timestamp, optional (null means indefinite)
    paymentDay: number;
    active: boolean;
    ignoredPeriods?: string[]; // Format: "YYYY-MM"
}

export interface ExtraIncome extends IncomeBase {
    type: 'extra';
    receivedDate: number; // Timestamp
    category?: string;
    notes?: string;
}

export interface RolloverIncome extends IncomeBase {
    type: 'rollover';
    originalMonth: number;
    originalYear: number;
}

export type Income = FixedIncome | ExtraIncome | RolloverIncome;
