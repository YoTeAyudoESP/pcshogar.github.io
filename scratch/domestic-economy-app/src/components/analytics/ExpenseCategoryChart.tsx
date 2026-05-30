import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useFinance } from '../../contexts/FinanceContext';
import { useDateSelection } from '../../contexts/DateSelectionContext';
import { formatCurrency } from '../../utils/formatters';

const ExpenseCategoryChart: React.FC = () => {
    const { expenses, categories } = useFinance();
    const { selectedMonth, selectedYear } = useDateSelection();

    const chartData = useMemo(() => {
        const filtered = expenses.filter(exp => {
            if (exp.status !== 'paid') return false;
            // EXCLUDE: Funded by piggy banks or credit card settlements
            if (exp.linkedSavingGoalId) return false;
            if (exp.description.startsWith('[LIQUIDACION]')) return false;

            const date = new Date(exp.date);
            return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
        });


        const grouped = filtered.reduce((acc, exp) => {
            const category = categories.find(c => c.id === exp.categoryId);
            const name = category?.name || 'Varios';
            acc[name] = (acc[name] || 0) + exp.amount;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(grouped).map(([name, value]) => ({ name, value }));
    }, [expenses, categories, selectedMonth, selectedYear]);

    const COLORS = ['#4A90E2', '#2ECC71', '#E74C3C', '#F1C40F', '#9B59B6', '#1ABC9C', '#F39C12'];

    return (
        <div className="glass-panel" style={{ padding: '1.5rem', height: '400px' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-muted)', fontSize: '1rem' }}>Gastos por Categoría</h3>
            <ResponsiveContainer width="100%" height="85%">
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {chartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
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
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ExpenseCategoryChart;
