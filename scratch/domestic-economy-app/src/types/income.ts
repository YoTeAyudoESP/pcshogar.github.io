export type Frequency = 'weekly' | 'monthly' | 'yearly';

export interface IncomeBase {
    id: string; // UUID
    name: string;
    amount: number;
    currency: string;
    createdAt: number; // Timestamp
    linkedAccountId?: string; // Account where money is deposited
    status: 'pending' | 'received';
    effectiveDate?: number; // Realization date
    budgetMonth?: number; // 0-11, for liquidity calculation
    budgetYear?: number;
    linkedSavingGoalId?: string;
    fixedIncomeId?: string; // ID of the fixed income template that generated this entry
    updatedAt?: number;
}

export interface FixedIncome extends IncomeBase {
    type: 'fixed';
    frequency: Frequency;
    expirationDate?: number; // Timestamp, optional (null means indefinite)
    active: boolean;
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

import type { Category } from './finance';

export const DEFAULT_INCOME_CATEGORIES: Category[] = [
    { id: 'inc_salary', name: 'Nómina/Salario', icon: 'briefcase', type: 'income', color: '#2ecc71' },
    { id: 'inc_gift', name: 'Regalo', icon: 'gift', type: 'income', color: '#e74c3c' },
    { id: 'inc_sale', name: 'Venta', icon: 'tag', type: 'income', color: '#3498db' },
    { id: 'inc_bonus', name: 'Bono/Extra', icon: 'star', type: 'income', color: '#f1c40f' },
    { id: 'inc_refund', name: 'Devolución', icon: 'refresh-cw', type: 'income', color: '#9b59b6' },
    { id: 'inc_other', name: 'Otros', icon: 'more-horizontal', type: 'income', color: '#95a5a6' }
];
