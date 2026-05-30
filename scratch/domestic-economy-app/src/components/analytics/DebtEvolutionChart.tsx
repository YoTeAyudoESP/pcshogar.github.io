import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { useFinance } from '../../contexts/FinanceContext';
import { useDateSelection } from '../../contexts/DateSelectionContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatCurrency } from '../../utils/formatters';

const DebtEvolutionChart: React.FC = () => {
    const { loans, expenses } = useFinance();
    const { selectedYear } = useDateSelection();
    const { t } = useLanguage();

    const chartData = useMemo(() => {
        const months = Array.from({ length: 12 }, (_, i) => {
            const date = new Date(selectedYear, i, 1);
            return {
                name: date.toLocaleString('es-ES', { month: 'short' }),
                debt: 0,
                month: i
            } as any;
        });

        if (loans.length === 0) return [];

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        months.forEach((monthData, i) => {
            // Cut off future data for the current year
            if (selectedYear === currentYear && i > currentMonth) {
                loans.forEach(loan => {
                    monthData[loan.name] = undefined;
                });
                monthData.debt = undefined;
                return;
            }

            const monthEnd = new Date(selectedYear, i + 1, 0, 23, 59, 59).getTime();
            let totalDebt = 0;

            loans.forEach(loan => {
                const loanStart = new Date(loan.startDate).getTime();
                if (loanStart <= monthEnd) {
                    // Start with total amount
                    let remaining = loan.totalAmount;

                    // Subtract all payments made BEFORE or DURING this month
                    const payments = expenses.filter(exp =>
                        exp.paymentMethod.type === 'account' &&
                        exp.description.includes(loan.name) &&
                        exp.status === 'paid' &&
                        exp.date <= monthEnd
                    );

                    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
                    remaining = Math.max(0, remaining - totalPaid);
                    monthData[loan.name] = remaining;
                    totalDebt += remaining;
                } else {
                    monthData[loan.name] = 0;
                }
            });

            monthData.debt = totalDebt;
        });

        return months;
    }, [loans, expenses, selectedYear]);

    if (loans.length === 0) {
        return (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                {t('analytics.noData')}
            </div>
        );
    }

    return (
        <div className="glass-panel" style={{ padding: '1.5rem', height: '400px' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-muted)', fontSize: '1rem' }}>
                {t('analytics.debtTitle')} ({selectedYear})
            </h3>
            <ResponsiveContainer width="100%" height="85%">
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id="colorDebt" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-danger)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="var(--color-danger)" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis
                        stroke="var(--text-muted)"
                        fontSize={10}
                        tickFormatter={(value) => `${value}€`}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        contentStyle={{ background: 'var(--bg-surface)', border: 'var(--card-border)', borderRadius: '12px' }}
                        itemStyle={{ color: 'var(--text-main)' }}
                        labelStyle={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}
                        formatter={(value: any) => formatCurrency(Number(value))}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" />

                    {loans.map(loan => (
                        <Area
                            key={loan.id}
                            type="monotone"
                            dataKey={loan.name}
                            stroke={loan.color || 'var(--color-primary)'}
                            fill={loan.color || 'var(--color-primary)'}
                            fillOpacity={0.1}
                            strokeWidth={1}
                            name={loan.name}
                        />
                    ))}

                    <Area
                        type="monotone"
                        dataKey="debt"
                        stroke="var(--color-danger)"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorDebt)"
                        name={t('analytics.debtLegend')}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default DebtEvolutionChart;
