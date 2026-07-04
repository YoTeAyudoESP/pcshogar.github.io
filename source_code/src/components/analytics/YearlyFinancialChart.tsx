import React, { useMemo } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { useDateSelection } from '../../contexts/DateSelectionContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { isRecurringActiveInMonth, formatMoney, isItemInMonthAndYear, calculateAvailableBalanceForMonth } from '../../utils/financeCalculations';

const YearlyFinancialChart: React.FC = () => {
    const { 
        expenses, fixedIncomes, extraIncomes, allocations, savings, 
        recurringExpenses, overrides, cards, incomes 
    } = useFinance();
    
    const { selectedYear, selectedMonth } = useDateSelection();

    const currentYear = selectedYear;

    const data = useMemo(() => {
        const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
        const actualDate = new Date();
        const isCurrentYear = currentYear === actualDate.getFullYear();
        const currentMonth = actualDate.getMonth();

        const rawData = monthNames.map((monthName, index) => {
            const { 
                totalMonthIncome, 
                grossAccountExpenses, 
                grossCardExpenses, 
                grossCashExpenses 
            } = calculateAvailableBalanceForMonth(currentYear, index, {
                fixedIncomes: incomes.filter((i: any) => i.type === 'fixed') as any[],
                extraIncomes: incomes.filter(i => i.type === 'extra' || i.type === 'rollover'),
                expenses,
                allocations,
                savings,
                recurringExpenses,
                overrides,
                cards
            });

            const totalExpense = (grossAccountExpenses || 0) + (grossCardExpenses || 0) + (grossCashExpenses || 0);

            return {
                name: monthName,
                Ingresos: totalMonthIncome,
                Gastos: totalExpense,
                index
            };
        });

        let maxMonthToShow = isCurrentYear ? currentMonth : 11;
        
        if (isCurrentYear) {
            for (let i = 11; i > currentMonth; i--) {
                const hasMovement = extraIncomes.some(inc => isItemInMonthAndYear(inc, i, currentYear) && inc.status !== 'pending') ||
                                    expenses.some(exp => isItemInMonthAndYear(exp, i, currentYear) && exp.status !== 'pending');
                if (hasMovement) {
                    maxMonthToShow = i;
                    break;
                }
            }
        }

        return rawData.map(d => {
            if (isCurrentYear && d.index > maxMonthToShow) {
                return { name: d.name };
            }
            return {
                name: d.name,
                Ingresos: d.Ingresos,
                Gastos: d.Gastos
            };
        });

    }, [expenses, fixedIncomes, extraIncomes, allocations, savings, recurringExpenses, overrides, cards, incomes, currentYear, selectedMonth]);

    return (
        <div className="glass-panel" style={{ padding: '2rem 1.5rem', height: '100%', background: 'rgba(25, 27, 34, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.8)' }}>
                    Evolución {currentYear}
                </h3>
            </div>
            
            <div style={{ height: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={data}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2ed573" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#2ed573" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ff4757" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#ff4757" stopOpacity={0}/>
                            </linearGradient>
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
                            formatter={(value: any, name: any) => {
                                const formattedValue = formatMoney(Number(value));
                                if (name === 'Ingresos') return [`+${formattedValue}`, 'Ingresos'];
                                if (name === 'Gastos') return [`-${formattedValue}`, 'Gastos'];
                                return [formattedValue, name];
                            }}
                        />
                        
                        <Legend 
                            verticalAlign="top" 
                            align="center" 
                            height={40}
                            iconType="circle"
                            formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500, marginLeft: '8px' }}>{value}</span>}
                        />
                        
                        <Area 
                            type="monotone" 
                            dataKey="Ingresos" 
                            stroke="#2ed573" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorIngresos)" 
                        />
                        
                        <Area 
                            type="monotone" 
                            dataKey="Gastos" 
                            stroke="#ff4757" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorGastos)" 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default YearlyFinancialChart;
