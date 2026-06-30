export type Frequency = 'weekly' | 'monthly' | 'yearly';

export interface IncomeBase {
    id: string; // UUID
    name: string;
    amount: number;
    currency: string;
    createdAt: number; // Timestamp
    updatedAt?: number; // Timestamp
    linkedAccountId?: string; // Account where money is deposited
    status: 'pending' | 'received';
    effectiveDate?: number; // Realization date
    budgetMonth?: number; // 0-11
    budgetYear?: number;
}

export interface FixedIncome extends IncomeBase {
    type: 'fixed';
    frequency: 'weekly' | 'monthly' | 'yearly';
    expirationDate?: number; // Timestamp, optional (null means indefinite)
    active: boolean;
}

export interface ExtraIncome extends IncomeBase {
    type: 'extra';
    receivedDate?: number; // Timestamp
    categoryId?: string;
    notes?: string;
    fixedIncomeId?: string; // If this is an instance of a FixedIncome
}

export type Income = FixedIncome | ExtraIncome;

