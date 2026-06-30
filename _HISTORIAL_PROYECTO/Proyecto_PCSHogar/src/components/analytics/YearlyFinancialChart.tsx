import React, { useMemo } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { useIncome } from '../../contexts/IncomeContext';
import { useDateSelection } from '../../contexts/DateSelectionContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const YearlyFinancialChart: React.FC = () => {
    const { expenses } = useFinance();
    const { fixedIncomes, extraIncomes } = useIncome();
    const { selectedYear } = useDateSelection();

    // We use selectedYear, but renaming it to currentYear to minimize diffs in logic below if desired, 
    // or just direct usage.
    const currentYear = selectedYear;

    const data = useMemo(() => {
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        return months.map((monthName, index) => {
            // Calculate Income
            const monthlyFixedIncome = fixedIncomes
                .filter(inc => {
                    // Use effectiveDate as start date, default to now if missing (though it should exist for fixed)
                    const start = inc.effectiveDate ? new Date(inc.effectiveDate) : new Date(0);
                    // Use expirationDate as end date, default to far future if missing (indefinite)
                    const end = inc.expirationDate ? new Date(inc.expirationDate) : new Date(9999, 11, 31);

                    // define the month range we are checking
                    const monthStart = new Date(currentYear, index, 1);
                    const monthEnd = new Date(currentYear, index + 1, 0); // Last day of month

                    // Simple overlap check: income active during this month
                    // (Start <= MonthEnd) AND (End >= MonthStart)
                    return start <= monthEnd && end >= monthStart;
                })
                .reduce((sum, inc) => sum + inc.amount, 0);

            const monthlyExtraIncome = extraIncomes
                .filter(inc => {
                    if (inc.budgetMonth !== undefined && inc.budgetYear !== undefined) {
                        return inc.budgetMonth === index && inc.budgetYear === currentYear;
                    }
                    const dateToUse = inc.receivedDate ?? inc.createdAt;
                    const d = new Date(dateToUse);
                    return d.getMonth() === index && d.getFullYear() === currentYear;
                })
                .reduce((sum, inc) => sum + inc.amount, 0);

            const totalIncome = monthlyFixedIncome + monthlyExtraIncome;

            // Calculate Expenses
            const totalExpense = expenses
                .filter(exp => {
                    const d = new Date(exp.date);
                    return d.getMonth() === index && d.getFullYear() === currentYear;
                })
                .reduce((sum, exp) => sum + exp.amount, 0);

            return {
                name: monthName,
                Ingresos: totalIncome,
                Gastos: totalExpense
            };
        });

    }, [expenses, fixedIncomes, extraIncomes, currentYear]);

    return (
        <div className="glass-panel" style={{ padding: 'var(--space-md)', height: '100%' }}>
            <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>Evolución {currentYear}</h3>
            <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="name" stroke="var(--text-muted)" />
                        <YAxis stroke="var(--text-muted)" />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1a1a2e', borderColor: '#333', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(value: any) => `${Number(value).toFixed(2)}€`}
                        />
                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '20px', bottom: 0 }} />
                        <Bar dataKey="Ingresos" fill="#2ecc71" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Gastos" fill="#e74c3c" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default YearlyFinancialChart;
