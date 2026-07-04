import React, { useMemo } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { useIncome } from '../../contexts/IncomeContext';
import { useDateSelection } from '../../contexts/DateSelectionContext';

const FinanceSummary: React.FC = () => {
    const { expenses, allocations } = useFinance();
    const { fixedIncomes, extraIncomes } = useIncome();
    const { selectedMonth, selectedYear } = useDateSelection();

    // Helper to check if a date is in the selected month/year
    const isSelectedMonth = (timestamp: number, bMonth?: number, bYear?: number) => {
        if (bMonth !== undefined && bYear !== undefined) {
            return bYear === selectedYear && bMonth === selectedMonth;
        }
        const d = new Date(timestamp);
        return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    };

    // 1. Calculate Monthly Income
    const totalMonthIncome = useMemo(() => {
        let total = 0;

        // Sum all incomes (Fixed + Extra) with effectiveDate or createdAt in current month.
        [...fixedIncomes, ...extraIncomes].forEach(inc => {
            // Logic for Fixed Incomes:
            // Should valid if:
            // 1. effectiveDate <= selectedMonthEnd
            // 2. expirationDate (if exists) >= selectedMonthStart
            // BUT for simplicity in this summary view, we currently treat them as "active" if they exist??
            // Re-reading original logic: "sum all incomes existing in DB that belong to this month"
            // The previous logic was: isCurrentMonth(dateToCheck).
            // Let's stick to that for Extra Incomes (one-off).
            // For Fixed Incomes, they are recurring. If I go to previous month, I expect to see my salary there too.
            // So for Fixed Incomes, we should check providing they were active in that month.

            if ('receivedDate' in inc) {
                // ExtraIncome
                const dateToCheck = inc.receivedDate ?? inc.createdAt;
                if (isSelectedMonth(dateToCheck, inc.budgetMonth, inc.budgetYear)) {
                    total += inc.amount;
                }
            } else {
                // FixedIncome
                const fixedInc = inc as import('../../types/income').FixedIncome;
                const start = fixedInc.effectiveDate ? new Date(fixedInc.effectiveDate) : new Date(0);
                const end = fixedInc.expirationDate ? new Date(fixedInc.expirationDate) : new Date(9999, 11, 31);

                const monthStart = new Date(selectedYear, selectedMonth, 1);
                const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);

                if (start <= monthEnd && end >= monthStart) {
                    total += fixedInc.amount;
                }
            }
        });
        return total;
    }, [fixedIncomes, extraIncomes, selectedMonth, selectedYear]);


    // 2. Calculate Monthly Expenses
    const totalMonthExpenses = useMemo(() => {
        return expenses
            .filter(exp => isSelectedMonth(exp.date))
            .reduce((sum, exp) => sum + exp.amount, 0);
    }, [expenses, selectedMonth, selectedYear]);

    const totalMonthAllocations = useMemo(() => {
        return allocations
            .filter(alloc => isSelectedMonth(alloc.date))
            .reduce((sum, alloc) => sum + alloc.amount, 0);
    }, [allocations, selectedMonth, selectedYear]);

    // 4. Final Calculation: Income - Expenses - Savings Allocations
    const availableToSpend = totalMonthIncome - totalMonthExpenses - totalMonthAllocations;

    const monthName = new Date(selectedYear, selectedMonth).toLocaleString('es-ES', { month: 'long' });

    return (
        <section className="glass-panel" style={{
            padding: 'var(--space-md)',
            marginBottom: 'var(--space-md)',
            background: 'linear-gradient(135deg, rgba(235, 77, 75, 0.1), rgba(46, 213, 115, 0.1))'
        }}>
            <h2 style={{ textAlign: 'center', marginBottom: '1rem', fontSize: '1.2rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                Disponible en {monthName}
            </h2>
            <div style={{ textAlign: 'center', fontSize: '3rem', fontWeight: 800, color: availableToSpend >= 0 ? 'var(--color-success)' : 'var(--hue-danger)', textShadow: '0 0 20px rgba(255,255,255, 0.1)' }}>
                {availableToSpend.toFixed(2)}€
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                <div>
                    <div>Ingresos (Mes)</div>
                    <div style={{ color: 'white', fontWeight: 600 }}>{totalMonthIncome.toFixed(2)}€</div>
                </div>
                <div>
                    <div>Gastos (Mes)</div>
                    <div style={{ color: 'var(--hue-danger)', fontWeight: 600 }}>{totalMonthExpenses.toFixed(2)}€</div>
                </div>
            </div>
        </section>
    );
};

export default FinanceSummary;
