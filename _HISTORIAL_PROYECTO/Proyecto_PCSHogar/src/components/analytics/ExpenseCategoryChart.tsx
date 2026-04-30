import React, { useMemo } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { DEFAULT_CATEGORIES } from '../../types/finance';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const ExpenseCategoryChart: React.FC = () => {
    const { expenses } = useFinance();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const data = useMemo(() => {
        // Filter current month expenses
        const monthlyExpenses = expenses.filter(e => {
            const d = new Date(e.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        // Group by category
        const grouped: Record<string, number> = {};
        monthlyExpenses.forEach(e => {
            if (!grouped[e.categoryId]) grouped[e.categoryId] = 0;
            grouped[e.categoryId] += e.amount;
        });

        // Map to Recharts data format
        return Object.entries(grouped).map(([catId, value]) => {
            const category = DEFAULT_CATEGORIES.find(c => c.id === catId);
            return {
                name: category ? category.name : 'Desconocido',
                value: value,
                color: category ? category.color : '#999'
            };
        }).filter(item => item.value > 0); // Only show categories with expenses

    }, [expenses, currentMonth, currentYear]);

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
                    <PieChart margin={{ bottom: 20 }}>
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
                        <Tooltip formatter={(value: any) => `${Number(value).toFixed(2)}€`} />
                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '20px' }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ExpenseCategoryChart;
