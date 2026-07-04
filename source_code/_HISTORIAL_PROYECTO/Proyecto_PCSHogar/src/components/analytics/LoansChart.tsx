import React, { useMemo } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const LoansChart: React.FC = () => {
    const { loans } = useFinance();

    const data = useMemo(() => {
        return loans.map(loan => ({
            name: loan.name,
            'Total': loan.totalAmount,
            'Pagado': loan.totalAmount - loan.remainingAmount,
            'Deuda': loan.remainingAmount
        }));
    }, [loans]);

    if (loans.length === 0) return null;

    return (
        <div className="glass-panel" style={{ padding: 'var(--space-md)', height: '100%', minHeight: '400px' }}>
            <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>Estado de Préstamos</h3>
            <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tick={{ fill: 'var(--text-muted)' }} />
                        <YAxis stroke="var(--text-muted)" fontSize={12} tick={{ fill: 'var(--text-muted)' }} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1a1a2e', borderColor: '#333', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(value: any) => `${Number(value).toFixed(2)}€`}
                        />
                        <Legend 
                            verticalAlign="bottom" 
                            align="center"
                            wrapperStyle={{ paddingTop: '30px', bottom: 10 }} 
                        />
                        <Bar dataKey="Pagado" fill="#2ecc71" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Deuda" fill="#f39c12" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );

};

export default LoansChart;
