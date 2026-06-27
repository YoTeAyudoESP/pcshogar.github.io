import React from 'react';
import { useFinance } from '../../contexts/FinanceContext';

const ExpenseList: React.FC = () => {
    const { expenses } = useFinance();

    const listItemStyle = {
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 'var(--radius-sm)',
        padding: '1rem',
        marginBottom: '0.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    };

    return (
        <div className="glass-panel" style={{ padding: 'var(--space-md)' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--hue-danger)' }}>Gastos Recientes</h3>
            {expenses.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No hay gastos registrados.</p>
            ) : (
                expenses.map(expense => (
                    <div key={expense.id} style={listItemStyle}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{expense.description}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {new Date(expense.date).toLocaleDateString()} • {expense.isFixed ? 'Fijo' : 'Puntual'}
                            </div>
                        </div>
                        <div style={{ fontWeight: 700, color: 'var(--hue-danger)', whiteSpace: 'nowrap', flexShrink: 0, marginLeft: '1rem' }}>
                            -{expense.amount.toFixed(2)}€
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default ExpenseList;
