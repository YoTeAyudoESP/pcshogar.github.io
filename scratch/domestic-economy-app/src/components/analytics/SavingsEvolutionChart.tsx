import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useFinance } from '../../contexts/FinanceContext';
import { useDateSelection } from '../../contexts/DateSelectionContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatCurrency } from '../../utils/formatters';

const SavingsEvolutionChart: React.FC = () => {
    const { savings, allocations } = useFinance();
    const { selectedYear } = useDateSelection();
    const { t } = useLanguage();

    const chartData = useMemo(() => {
        const months = Array.from({ length: 12 }, (_, i) => {
            const date = new Date(selectedYear, i, 1);
            return {
                name: date.toLocaleString('es-ES', { month: 'short' }),
                month: i,
            } as any;
        });

        if (savings.length === 0) return [];

        // Pre-calculate discrepancies to handle legacy data or initial balances not tracked as allocations
        const goalDiscrepancies = new Map<string, number>();
        savings.forEach(goal => {
            const totalAllocated = allocations
                .filter(a => a.goalId === goal.id)
                .reduce((sum, a) => sum + a.amount, 0);

            // If currentAmount is different from total history, assume the diff is "Initial Balance"
            // We treat this diff as existing from the beginning of time (date = 0)
            const diff = goal.currentAmount - totalAllocated;
            if (diff !== 0) {
                goalDiscrepancies.set(goal.id, diff);
            }
        });

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        months.forEach((monthData, i) => {
            // Recharts draws lines between points. 
            // If we are in the selected year, and the month is in the future,
            // we skip calculating the balance so it stays 'undefined', 
            // which tells Recharts NOT to draw the line segment or point.
            if (selectedYear === currentYear && i > currentMonth) {
                return;
            }

            const monthEnd = new Date(selectedYear, i + 1, 0, 23, 59, 59).getTime();

            savings.forEach(goal => {
                // Sum actual allocations up to this month
                let balance = allocations
                    .filter(a => a.goalId === goal.id && a.date <= monthEnd)
                    .reduce((sum, a) => sum + a.amount, 0);

                // Add the implicit initial balance (treated as date 0, so always included)
                const discrepancy = goalDiscrepancies.get(goal.id) || 0;
                balance += discrepancy;

                monthData[goal.name] = balance;
            });
        });

        return months;
    }, [savings, allocations, selectedYear]);

    const colors = [
        '#4a90e2', '#2ecc71', '#f1c40f', '#e67e22', '#e74c3c',
        '#9b59b6', '#1abc9c', '#34495e', '#d35400', '#c0392b'
    ];

    if (savings.length === 0) {
        return (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                {t('analytics.noData')}
            </div>
        );
    }

    return (
        <div className="glass-panel" style={{ padding: '1.5rem', height: '400px', marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-muted)', fontSize: '1rem' }}>
                {t('analytics.savingsTitle')} ({selectedYear})
            </h3>
            <ResponsiveContainer width="100%" height="85%">
                <AreaChart data={chartData}>
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
                        itemStyle={{ fontSize: '0.8rem' }}
                        labelStyle={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}
                        formatter={(value: any) => formatCurrency(Number(value))}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    {savings.map((goal, index) => (
                        <Area
                            key={goal.id}
                            type="monotone"
                            dataKey={goal.name}
                            stroke={colors[index % colors.length]}
                            fill={colors[index % colors.length]}
                            fillOpacity={0.1}
                            strokeWidth={2}
                            name={goal.name}
                        />
                    ))}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default SavingsEvolutionChart;
