import React, { useMemo } from 'react';
import { 
    ResponsiveContainer, 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend 
} from 'recharts';
import { useFinance } from '../../contexts/FinanceContext';
import { useDateSelection } from '../../contexts/DateSelectionContext';

const PiggyBankChart: React.FC = () => {
    const { savings, allocations } = useFinance();
    const { selectedYear } = useDateSelection();

    const monthNames = [
        'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
        'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ];

    const chartData = useMemo(() => {
        if (!savings || savings.length === 0) return [];

        const data = [];

        // Evolution month by month for the current selected year
        for (let month = 0; month < 12; month++) {
            // Last moment of the month
            const endOfMonth = new Date(selectedYear, month + 1, 0, 23, 59, 59, 999).getTime();
            
            const monthData: any = { 
                name: monthNames[month]
            };

            savings.forEach(goal => {
                // Sum all allocations for this goal up to the end of this month
                const balanceAtEndOfMonth = allocations
                    .filter(a => a.goalId === goal.id && a.date <= endOfMonth)
                    .reduce((sum, a) => sum + a.amount, 0);
                
                monthData[goal.name] = balanceAtEndOfMonth;
            });

            data.push(monthData);
        }

        return data;
    }, [savings, allocations, selectedYear]);

    if (!savings || savings.length === 0) return null;

    const colors = [
        '#6366f1', '#ec4899', '#f59e0b', '#10b981', 
        '#3b82f6', '#f43f5e', '#8b5cf6', '#06b6d4'
    ];

    return (
        <div className="glass-panel" style={{ padding: 'var(--space-md)', height: '350px', marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '1rem', textAlign: 'center', width: '100%', fontWeight: 500 }}>Evolución Anual de Huchas ({selectedYear})</h3>
            <ResponsiveContainer width="100%" height="90%">
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis 
                        dataKey="name" 
                        stroke="rgba(255,255,255,0.3)" 
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                    />
                    <YAxis 
                        stroke="rgba(255,255,255,0.3)" 
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}€`}
                        domain={[0, 'auto']}
                    />
                    <Tooltip 
                        contentStyle={{ 
                            background: 'rgba(30, 32, 47, 0.95)', 
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            fontSize: '0.85rem'
                        }}
                    />
                    <Legend />
                    {savings.map((goal, index) => (
                        <Line 
                            key={goal.id}
                            type="monotone" 
                            dataKey={goal.name} 
                            stroke={goal.color || colors[index % colors.length]} 
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default PiggyBankChart;
