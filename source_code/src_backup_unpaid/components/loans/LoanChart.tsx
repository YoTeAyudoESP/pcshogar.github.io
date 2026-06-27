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

const LoanChart: React.FC = () => {
    const { loans, expenses } = useFinance();
    const { selectedYear } = useDateSelection();

    const monthNames = [
        'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
        'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ];

    const chartData = useMemo(() => {
        if (!loans || loans.length === 0) return [];

        const data = [];

        for (let month = 0; month < 12; month++) {
            const startOfMonth = new Date(selectedYear, month, 1).getTime();
            const endOfMonth = new Date(selectedYear, month + 1, 0, 23, 59, 59, 999).getTime();
            
            const monthData: any = { 
                name: monthNames[month]
            };

            let totalRemainingDebt = 0;

            loans.forEach(loan => {
                // If the loan hasn't started yet, don't count it or count it as 0
                if (loan.startDate > endOfMonth) {
                    monthData[loan.name] = 0;
                    return;
                }

                // Logic to estimate debt at the end of this specific month
                // Current debt is what we have NOW.
                // Debt at end of month X = Current Debt + (All payments SINCE end of month X)
                
                const paymentsAfterThisMonth = expenses
                    .filter(e => {
                        const isLoanPayment = e.categoryId === 'cat_loans' && 
                            (e.recurringExpenseId === loan.linkedRecurringExpenseId || e.relatedId === loan.id);
                        return isLoanPayment && e.date > endOfMonth;
                    })
                    .reduce((sum, e) => sum + e.amount, 0);

                const debtAtMonthEnd = (loan.currentDebt ?? 0) + paymentsAfterThisMonth;
                
                // Ensure we don't go above totalAmount (though with interest it might, but let's keep it simple)
                const finalVal = Math.min(loan.totalAmount, debtAtMonthEnd);
                monthData[loan.name] = finalVal;
                totalRemainingDebt += finalVal;
            });

            monthData['Total Deuda'] = totalRemainingDebt;
            data.push(monthData);
        }

        return data;
    }, [loans, expenses, selectedYear]);

    if (!loans || loans.length === 0) return null;

    const colors = [
        '#f59e0b', '#ef4444', '#3b82f6', '#10b981', 
        '#8b5cf6', '#ec4899', '#f97316', '#06b6d4'
    ];

    return (
        <div className="glass-panel" style={{ padding: 'var(--space-md)', height: '350px', marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '1rem', textAlign: 'center', width: '100%', fontWeight: 500 }}>
                Evolución de Deuda ({selectedYear})
            </h3>
            <ResponsiveContainer width="100%" height="90%">
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id="colorDebt" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
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
                    {loans.map((loan, index) => (
                        <Area 
                            key={loan.id}
                            type="monotone" 
                            dataKey={loan.name} 
                            stroke={loan.color || colors[index % colors.length]} 
                            fillOpacity={0.1}
                            fill={loan.color || colors[index % colors.length]}
                            strokeWidth={2}
                        />
                    ))}
                    <Area 
                        type="monotone" 
                        dataKey="Total Deuda" 
                        stroke="#f59e0b" 
                        strokeDasharray="5 5"
                        fill="url(#colorDebt)"
                        strokeWidth={3}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default LoanChart;
