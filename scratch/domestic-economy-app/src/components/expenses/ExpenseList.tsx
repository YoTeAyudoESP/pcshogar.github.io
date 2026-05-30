import React, { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { useDateSelection } from '../../contexts/DateSelectionContext';
import { formatCurrency } from '../../utils/formatters';
import { Minus, Plus, Trash2, Edit2, X, Check, Clock } from 'lucide-react';
import ExpenseForm from './ExpenseForm';
import type { Expense } from '../../types/finance';

const ExpenseList: React.FC = () => {
    const { expenses, deleteExpense, updateExpense, accounts, cards, categories } = useFinance();
    const { selectedMonth, selectedYear } = useDateSelection();
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

    const filteredExpenses = expenses
        .filter(exp => {
            if (exp.period) {
                const [y, m] = exp.period.split('-').map(Number);
                return y === selectedYear && (m - 1) === selectedMonth;
            }
            const date = new Date(exp.date);
            return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
        })
        .sort((a, b) => b.date - a.date);

    // Grouping logic
    const grouped = filteredExpenses.reduce((acc, exp) => {
        let key = 'Other';
        let name = 'Otros';
        let type = 'other';
        let subInfo = '';

        if (exp.paymentMethod.type === 'account') {
            const accountId = exp.paymentMethod.accountId;
            const account = accounts.find(a => a.id === accountId);

            // Unify cash accounts with cash payment method
            if (account?.name === 'Efectivo' || account?.name === 'Cash') {
                key = 'cash';
                name = 'Efectivo';
                type = 'cash';
            } else {
                key = `acc_${accountId}`;
                name = account?.name || 'Cuenta Desconocida';
                type = 'account';
            }
        } else if (exp.paymentMethod.type === 'card') {
            const cardId = exp.paymentMethod.cardId;
            const card = cards.find(c => c.id === cardId);
            key = `card_${cardId}`;
            name = card?.name || 'Tarjeta Desconocida';
            type = 'card';

            // Credit card settlement logic
            if (card && card.type === 'credit' && card.cutoffDay) {
                const expDate = new Date(exp.date);
                if (expDate.getDate() > card.cutoffDay) {
                    subInfo = ' (Próx. Liquidación)';
                }
            }
        } else if (exp.paymentMethod.type === 'cash') {
            key = 'cash';
            name = 'Efectivo';
            type = 'cash';
        }

        if (!acc[key]) acc[key] = { name, total: 0, expenses: [], type, subInfo };
        acc[key].expenses.push({ ...exp, settlementInfo: subInfo });
        if (exp.status === 'paid') {
            acc[key].total += exp.amount;
        }
        return acc;
    }, {} as Record<string, { name: string, total: number, expenses: any[], type: string, subInfo: string }>);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {filteredExpenses.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No hay gastos en este periodo.</p>
            ) : (
                Object.values(grouped).map(group => (
                    <div key={group.name}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0 0.5rem',
                            marginBottom: '0.5rem',
                            borderBottom: 'var(--card-border)'
                        }}>
                            <h4 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                {group.name}
                            </h4>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-accent)' }}>
                                Total: {formatCurrency(group.total)}
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {group.expenses.map(expense => {
                                const category = categories.find(c => c.id === expense.categoryId);
                                return (
                                    <div key={expense.id} className="glass-panel" style={{
                                        padding: '0.75rem 1rem',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        background: 'var(--bg-surface-elevated)',
                                        borderLeft: expense.settlementInfo ? '3px solid var(--hue-warning)' : 'none'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{
                                                width: '32px', height: '32px', borderRadius: '8px',
                                                background: expense.status === 'pending' ? 'var(--alert-warning-bg)' : (expense.amount < 0 ? 'var(--alert-success-bg)' : 'var(--alert-error-bg)'),
                                                color: expense.status === 'pending' ? 'var(--hue-warning)' : (expense.amount < 0 ? 'var(--color-success)' : 'var(--hue-danger)'),
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                border: expense.status === 'pending' ? '1px solid var(--hue-warning)' : (expense.amount < 0 ? '1px solid var(--color-success)' : '1px solid var(--hue-danger)')
                                            }}>
                                                {expense.amount < 0 ? <Plus size={16} /> : <Minus size={16} />}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {expense.description}
                                                    {expense.status === 'pending' && (
                                                        <span style={{
                                                            fontSize: '0.65rem',
                                                            background: 'var(--hue-warning)',
                                                            color: 'white',
                                                            padding: '1px 5px',
                                                            borderRadius: '4px',
                                                            fontWeight: 700,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.2rem'
                                                        }}>
                                                            <Clock size={10} /> {expense.amount < 0 ? 'PENDIENTE COBRO' : 'PENDIENTE PAGO'}
                                                        </span>
                                                    )}
                                                    {expense.settlementInfo && (
                                                        <span style={{ fontSize: '0.7rem', color: 'var(--hue-warning)', marginLeft: '0.5rem', fontStyle: 'italic' }}>
                                                            {expense.settlementInfo}
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                                                    {category?.name} • {new Date(expense.date).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{
                                                color: expense.status === 'pending' ? 'var(--hue-warning)' : (expense.amount < 0 ? 'var(--color-success)' : 'var(--color-accent)'),
                                                fontWeight: 700,
                                                opacity: expense.status === 'pending' ? 0.8 : 1
                                            }}>
                                                {expense.amount < 0 ? '+' : '-'}{formatCurrency(Math.abs(expense.amount))}
                                            </div>
                                            {expense.status === 'pending' && (
                                                <button
                                                    onClick={async () => {
                                                        await updateExpense({ ...expense, status: 'paid' });
                                                    }}
                                                    className="btn-icon"
                                                    style={{ color: 'var(--color-success)', background: 'var(--alert-success-bg)' }}
                                                    title="Confirmar"
                                                >
                                                    <Check size={16} />
                                                </button>
                                            )}
                                            <button onClick={() => setEditingExpense(expense)} className="btn-icon" style={{ color: 'var(--color-primary)' }}>
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => deleteExpense(expense.id!)} className="btn-icon" style={{ color: 'var(--hue-danger)' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))
            )}

            {editingExpense && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
                    <div className="glass-panel" style={{ maxWidth: '600px', width: '100%', position: 'relative', padding: '2rem' }}>
                        <button
                            onClick={() => setEditingExpense(null)}
                            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            title="Cerrar"
                        >
                            <X size={24} />
                        </button>
                        <h3 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Editar Gasto</h3>
                        <ExpenseForm expenseToEdit={editingExpense} onClose={() => setEditingExpense(null)} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExpenseList;
