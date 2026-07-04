import React, { useMemo } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { useDateSelection } from '../../contexts/DateSelectionContext';
import { DEFAULT_CATEGORIES } from '../../types/finance';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { formatMoney, isItemInMonthAndYear } from '../../utils/financeCalculations';

const ExpenseCategoryChart: React.FC = () => {
    const { expenses, categories } = useFinance();
    const { selectedMonth, selectedYear } = useDateSelection();

    const data = useMemo(() => {
        // Filter current month expenses
        const monthlyExpenses = expenses.filter(e => {
            if (e.excludeFromBudget) return false;
            if (e.amount < 0 && e.status === 'pending') return false;
            return isItemInMonthAndYear(e, selectedMonth, selectedYear);
        });

        // Group by category
        const grouped: Record<string, number> = {};
        monthlyExpenses.forEach(e => {
            if (!grouped[e.categoryId]) grouped[e.categoryId] = 0;
            grouped[e.categoryId] += e.amount;
        });

        // Map to Recharts data format
        return Object.entries(grouped).map(([catId, value]) => {
            const category = categories.find(c => c.id === catId);
            return {
                name: category ? category.name : 'Desconocido',
                value: value,
                color: category ? category.color : '#999'
            };
        }).filter(item => item.value > 0); // Only show categories with expenses

    }, [expenses, categories, selectedMonth, selectedYear]);

    if (data.length === 0) {
        return (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No hay gastos registrados este mes para mostrar la gráfica.
            </div>
        );
    }

    return (
        <div className="glass-panel" style={{ padding: 'var(--space-md)', height: '100%' }}>
            <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>Gastos por Categoría</h3>
            <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: any, name: any) => [formatMoney(Number(value)), `Gasto en ${name}`]} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ExpenseCategoryChart;
