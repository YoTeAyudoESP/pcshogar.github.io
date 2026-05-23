import React, { useMemo } from 'react';
import { 
    ResponsiveContainer, 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend 
} from 'recharts';
import { useFinance } from '../../contexts/FinanceContext';
import { useDateSelection } from '../../contexts/DateSelectionContext';
import { formatMoney } from '../../utils/financeCalculations';

const PiggyBankChart: React.FC = () => {
    const { savings, allocations } = useFinance();
    const { selectedYear } = useDateSelection();

    const chartData = useMemo(() => {
        if (!savings || savings.length === 0) return [];

        const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
        const actualDate = new Date();
        const isCurrentYear = selectedYear === actualDate.getFullYear();
        const currentMonth = actualDate.getMonth();

        return monthNames.map((monthName, monthIndex) => {
            if (isCurrentYear && monthIndex > currentMonth) {
                return { name: monthName };
            }

            // Last moment of the month
            const endOfMonth = new Date(selectedYear, monthIndex + 1, 0, 23, 59, 59, 999).getTime();
            
            const monthData: any = { 
                name: monthName
            };

            savings.forEach(goal => {
                // 1. Filtrar asignaciones de esta hucha
                const goalAllocations = allocations.filter(a => a.goalId === goal.id);
                
                // 2. Determinar la fecha de creación de la hucha (retrocompatible)
                const creationDate = goal.createdAt !== undefined
                    ? goal.createdAt
                    : (goalAllocations.length > 0 ? Math.min(...goalAllocations.map(a => a.date)) : 0);

                // 3. Si el fin de mes es anterior a la creación de la hucha, el saldo era 0
                if (endOfMonth < creationDate) {
                    monthData[goal.name] = 0;
                    return;
                }

                // 4. Sumar todas las asignaciones ocurridas después del fin de este mes
                const allocationsAfter = goalAllocations.filter(a => a.date > endOfMonth);
                const sumAfter = allocationsAfter.reduce((sum, a) => sum + a.amount, 0);
                
                // 5. Restar la suma posterior del saldo actual para obtener el saldo histórico
                const balanceAtEndOfMonth = Math.max(0, goal.currentAmount - sumAfter);
                
                monthData[goal.name] = balanceAtEndOfMonth;
            });

            return monthData;
        });
    }, [savings, allocations, selectedYear]);

    if (!savings || savings.length === 0) return null;

    const colors = [
        '#6366f1', '#ec4899', '#f59e0b', '#10b981', 
        '#3b82f6', '#f43f5e', '#8b5cf6', '#06b6d4'
    ];

    return (
        <div className="glass-panel" style={{ 
            padding: '2rem 1.5rem', 
            height: '400px', 
            marginBottom: '1.5rem',
            background: 'rgba(25, 27, 34, 0.3)'
        }}>
            <h3 style={{ 
                margin: '0 0 1.5rem 0', 
                fontSize: '1.4rem', 
                fontWeight: 700, 
                color: 'rgba(255, 255, 255, 0.8)',
                textAlign: 'left'
            }}>
                Evolución Huchas {selectedYear}
            </h3>
            
            <ResponsiveContainer width="100%" height="80%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        {savings.map((goal, index) => {
                            const color = goal.color || colors[index % colors.length];
                            return (
                                <linearGradient key={`grad-${goal.id}`} id={`color-${goal.id}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor={color} stopOpacity={0}/>
                                </linearGradient>
                            );
                        })}
                    </defs>
                    
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    
                    <XAxis 
                        dataKey="name" 
                        stroke="rgba(255,255,255,0.3)" 
                        interval={0} 
                        fontSize={12} 
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                    />
                    
                    <YAxis 
                        stroke="rgba(255,255,255,0.3)" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(value) => `${value}€`}
                    />
                    
                    <Tooltip 
                        contentStyle={{ 
                            backgroundColor: 'rgba(26, 27, 34, 0.9)', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            borderRadius: '12px',
                            color: '#fff',
                            backdropFilter: 'blur(10px)'
                        }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value: any, name: any) => [formatMoney(Number(value)), name]}
                    />
                    
                    <Legend 
                        verticalAlign="bottom" 
                        align="center" 
                        height={40}
                        iconType="circle"
                        formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500, marginLeft: '8px' }}>{value}</span>}
                    />
                    
                    {savings.map((goal, index) => (
                        <Area 
                            key={goal.id}
                            type="monotone" 
                            dataKey={goal.name} 
                            stroke={goal.color || colors[index % colors.length]} 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill={`url(#color-${goal.id})`}
                        />
                    ))}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default PiggyBankChart;
