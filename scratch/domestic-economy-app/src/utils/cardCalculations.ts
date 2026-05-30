import type { CreditCard, Expense } from '../types/finance';

export interface SettlementCycle {
    total: number;
    startDate: number;
    endDate: number;
    paymentDate: number;
    isPaid: boolean;
    type: 'current' | 'previous';
    id: string; // Unique ID for the cycle to help with payment tracking
}

export const getSettlementCycles = (card: CreditCard, expenses: Expense[], referenceDate: number = Date.now()): SettlementCycle[] => {
    const ref = new Date(referenceDate);
    const day = ref.getDate();
    const month = ref.getMonth();
    const year = ref.getFullYear();

    // 1. Calculate Current Cycle (Accruing for the reference month)
    let currentClosingMonth = month;
    let currentClosingYear = year;

    // The cycle closing in 'month' actually starts in 'month - 1' 
    // unless the day is already past the cutoff day of 'month'.

    // If we are looking at a specific month/year, the "current" cycle for that context
    // is the one that CLOSES in that month or the next one.

    // For consistency with Dashboard, if we are in month M, 
    // we want to see the cycle that closes in M (previous) and the one closing in M+1 (current).

    // However, the original logic was:
    if (day > card.cutoffDay) {
        currentClosingMonth++;
        if (currentClosingMonth > 11) {
            currentClosingMonth = 0;
            currentClosingYear++;
        }
    }

    const getSafeEndDate = (y: number, m: number, d: number) => {
        const lastDay = new Date(y, m + 1, 0).getDate();
        return new Date(y, m, Math.min(d, lastDay), 23, 59, 59).getTime();
    };

    const getSafeStartDate = (y: number, m: number, d: number) => {
        // Start date is the day AFTER the cutoff day of the PREVIOUS month
        // So we calculate cutoff day of M-1 and add 1 day.
        const lastDayPrev = new Date(y, m, 0).getDate();
        const prevCutoff = Math.min(d, lastDayPrev);
        const date = new Date(y, m - 1, prevCutoff, 0, 0, 0);
        date.setDate(date.getDate() + 1);
        return date.getTime();
    };

    const currentEndDate = getSafeEndDate(currentClosingYear, currentClosingMonth, card.cutoffDay);
    const currentStartDate = getSafeStartDate(currentClosingYear, currentClosingMonth, card.cutoffDay);

    // 2. Calculate Previous Cycle (Billed)
    const prevEndDate = currentStartDate - 1;
    const prevStartDate = getSafeStartDate(currentClosingYear, currentClosingMonth - 1, card.cutoffDay);


    const cycles: SettlementCycle[] = [
        createCycle(card, expenses, currentStartDate, currentEndDate, 'current'),
        createCycle(card, expenses, prevStartDate, prevEndDate, 'previous')
    ];

    return cycles;
};

const createCycle = (card: CreditCard, expenses: Expense[], start: number, end: number, type: 'current' | 'previous'): SettlementCycle => {
    const total = expenses
        .filter(exp => {
            if (exp.paymentMethod.type !== 'card' || exp.paymentMethod.cardId !== card.id || exp.status !== 'paid') {
                return false;
            }

            const adj = exp.paymentMethod.settlementAdjustment || 0;
            const expenseDate = exp.date;

            // Basic check: does it fall into this range naturally?
            const inRange = expenseDate >= start && expenseDate <= end;

            if (adj === 0) return inRange;

            // If adj is 1, it moves to the NEXT cycle. 
            // So if it was in THIS range, it NO LONGER belongs here.
            // If it was in the PREVIOUS range, it NOW belongs here.

            if (adj === 1) {
                // Move from previous to current
                const prevStart = new Date(start);
                prevStart.setMonth(prevStart.getMonth() - 1);
                const prevEnd = start - 1;
                return expenseDate >= prevStart.getTime() && expenseDate <= prevEnd;
            }

            if (adj === -1) {
                // Move from next to current
                const nextEnd = new Date(end);
                nextEnd.setMonth(nextEnd.getMonth() + 1);
                const nextStart = end + 1;
                return expenseDate >= nextStart && expenseDate <= nextEnd.getTime();
            }

            return false;
        })
        .reduce((sum, exp) => Math.round((sum + exp.amount) * 100) / 100, 0);

    // Payment Date Calculation
    const closingDate = new Date(end);
    let payMonth = closingDate.getMonth();
    let payYear = closingDate.getFullYear();

    if (card.paymentDay <= card.cutoffDay) {
        payMonth++;
        if (payMonth > 11) { payMonth = 0; payYear++; }
    }
    const lastDayPayMonth = new Date(payYear, payMonth + 1, 0).getDate();
    const paymentDate = new Date(payYear, payMonth, Math.min(card.paymentDay, lastDayPayMonth)).getTime();


    // Check if paid: Look for an expense in the linked account with specific description
    // Pattern: [LIQUIDACION] {cardName} ({startDate} - {endDate})
    const dateStr = new Date(end).toLocaleDateString();
    const isPaid = expenses.some(exp =>
        exp.description.startsWith('[LIQUIDACION]') &&
        exp.description.includes(card.name) &&
        exp.description.includes(dateStr) &&
        exp.status === 'paid'
    );

    return {
        id: `SETTLE_${card.id}_${end}`,
        total,
        startDate: start,
        endDate: end,
        paymentDate,
        isPaid,
        type
    };
};
