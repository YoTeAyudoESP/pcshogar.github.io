import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useFinance } from '../../contexts/FinanceContext';
import { useIncome } from '../../contexts/IncomeContext';
import { useDateSelection } from '../../contexts/DateSelectionContext';
import { formatCurrency } from '../../utils/formatters';

const YearlyFinancialChart: React.FC = () => {
    const { expenses } = useFinance();
    const { extraIncomes } = useIncome();
    const { selectedYear } = useDateSelection();

    const chartData = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const months = Array.from({ length: 12 }, (_, i) => {
            const date = new Date(selectedYear, i, 1);
            const isFuture = selectedYear === currentYear && i > currentMonth;

            return {
                name: date.toLocaleString('es-ES', { month: 'short' }),
                income: isFuture ? undefined : 0,
                expense: isFuture ? undefined : 0,
                month: i
            } as any;
        });

        // Sum Extra Incomes (Realized Incomes)
        extraIncomes.forEach(inc => {
            if (inc.status === 'received' && inc.receivedDate) {
                // EXCLUDE: Direct savings (huchas)
                if (inc.linkedSavingGoalId) return;

                const m = inc.budgetMonth !== undefined ? inc.budgetMonth : new Date(inc.receivedDate).getMonth();
                const y = inc.budgetYear !== undefined ? inc.budgetYear : new Date(inc.receivedDate).getFullYear();

                if (y === selectedYear) {
                    months[m].income += Number(inc.amount);
                }
            }
        });

        // Sum Expenses (Realized Expenses)
        expenses.forEach(exp => {
            if (exp.status === 'paid') {
                // EXCLUDE: Funded by piggy banks or credit card settlements
                if (exp.linkedSavingGoalId) return;
                if (exp.description.startsWith('[LIQUIDACION]')) return;

                const date = new Date(exp.date);
                if (date.getFullYear() === selectedYear) {
                    months[date.getMonth()].expense += Number(exp.amount);
                }
            }
        });


        return months;
    }, [expenses, extraIncomes, selectedYear]);

    return (
        <div className="glass-panel" style={{ padding: '1.5rem', height: '400px' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-muted)', fontSize: '1rem' }}>Evolución {selectedYear}</h3>
            <ResponsiveContainer width="100%" height="85%">
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2ed573" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#2ed573" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ff4757" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#ff4757" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <Tooltip
                        contentStyle={{
                            background: 'var(--bg-surface-elevated)',
                            border: 'var(--card-border)',
                            borderRadius: '12px',
                            backdropFilter: 'blur(8px)'
                        }}
                        itemStyle={{ color: 'var(--text-main)' }}
                        labelStyle={{ color: 'var(--text-main)' }}
                        formatter={(value: any) => formatCurrency(Number(value))}
                    />
                    <Legend
                        verticalAlign="top"
                        height={36}
                        iconType="circle"
                        formatter={(value) => <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{value}</span>}
                    />
                    <Area type="monotone" dataKey="income" stroke="#2ed573" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" name="Ingresos" />
                    <Area type="monotone" dataKey="expense" stroke="#ff4757" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" name="Gastos" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default YearlyFinancialChart;
