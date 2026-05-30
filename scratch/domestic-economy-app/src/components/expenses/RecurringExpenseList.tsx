import React, { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { useDateSelection } from '../../contexts/DateSelectionContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatCurrency } from '../../utils/formatters';
import { Check, Calendar, Edit2, Trash2, X } from 'lucide-react';
import RecurringExpenseForm from './RecurringExpenseForm';
import type { RecurringExpense } from '../../types/finance';

const RecurringExpenseList: React.FC = () => {
    const { recurringExpenses, confirmRecurringExpense, deleteRecurringExpense, accounts, cards } = useFinance();
    const { selectedMonth, selectedYear } = useDateSelection();
    const { t } = useLanguage();
    const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null);
    const [confirmingId, setConfirmingId] = useState<string | null>(null);
    const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
    const [customAmount, setCustomAmount] = useState<string>('0');

    const isDueInSelectedMonth = (expense: RecurringExpense) => {
        const { frequency, paymentMonth, splitStartMonth } = expense;

        switch (frequency) {
            case 'monthly':
                return true;
            case 'bi-monthly':
                // Jan is 0, so even months (Jan, Mar, May...) are due if starting from 0
                const referenceMonth = paymentMonth || 0;
                return (selectedMonth - referenceMonth) % 2 === 0;
            case 'quarterly':
                const qRef = paymentMonth || 0;
                return (selectedMonth - qRef) % 3 === 0;
            case 'half-yearly':
                const hRef = paymentMonth || 0;
                return (selectedMonth - hRef) % 6 === 0;
            case 'yearly':
                return selectedMonth === (paymentMonth || 0);
            case 'split-annual':
                const start = splitStartMonth || 0;
                // Active for 3 consecutive months (handle wrap around if needed, though usually fixed within year)
                if (start <= selectedMonth && selectedMonth < start + 3) return true;
                // Wrap around logic (e.g. Dec, Jan, Feb)
                if (start + 3 > 12) {
                    const endWrap = (start + 3) % 12;
                    return selectedMonth < endWrap;
                }
                return false;
            default:
                return true;
        }
    };

    const filteredExpenses = recurringExpenses.filter(isDueInSelectedMonth);

    if (recurringExpenses.length === 0) {
        return (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No hay gastos fijos configurados.
            </div>
        );
    }

    if (filteredExpenses.length === 0) {
        return (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No hay gastos fijos pendientes para este mes.
            </div>
        );
    }

    const getFrequencyLabel = (freq: RecurringExpense['frequency']) => {
        return t(`recurring.frequencies.${freq}` as any) || freq;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filteredExpenses.map(expense => (
                <div key={expense.id} className="glass-panel" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '1rem',
                    background: 'var(--bg-surface-elevated)',
                    gap: '1rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '12px',
                                background: 'rgba(235, 77, 75, 0.1)', color: 'var(--hue-danger)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Calendar size={20} />
                            </div>
                            <div>
                                <div style={{ fontWeight: 600 }}>{expense.description}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {t('recurring.day')} {expense.paymentDay} • {getFrequencyLabel(expense.frequency)}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-accent)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    {(() => {
                                        const pm = expense.paymentMethod;
                                        if (pm) {
                                            if (pm.type === 'card') {
                                                const card = cards.find(c => c.id === pm.cardId);
                                                return <><span style={{ fontSize: '1rem' }}>💳</span> {card?.name || 'Tarjeta desconocida'}</>;
                                            } else if (pm.type === 'account') {
                                                const acc = accounts.find(a => a.id === pm.accountId);
                                                return <><span style={{ fontSize: '1rem' }}>🏦</span> {acc?.name || 'Cuenta desconocida'}</>;
                                            } else {
                                                return <><span style={{ fontSize: '1rem' }}>💵</span> Efectivo</>;
                                            }
                                        } else if (expense.sourceAccountId) {
                                            const acc = accounts.find(a => a.id === expense.sourceAccountId);
                                            return <><span style={{ fontSize: '1rem' }}>🏦</span> {acc?.name || 'Cuenta desconocida'}</>;
                                        }
                                        return null;
                                    })()}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                                color: expense.amount < 0 ? 'var(--color-success)' : 'var(--hue-danger)',
                                fontWeight: 700,
                                fontSize: '1.1rem',
                                marginRight: '0.5rem'
                            }}>
                                {expense.amount < 0 ? '+' : '-'}{formatCurrency(Math.abs(expense.amount), expense.currency)}
                            </div>
                            <button
                                onClick={() => {
                                    if (confirmingId === expense.id) {
                                        setConfirmingId(null);
                                    } else {
                                        setConfirmingId(expense.id);
                                        setCustomAmount(expense.amount.toString());
                                    }
                                }}
                                className="btn-icon"
                                style={{ color: confirmingId === expense.id ? 'var(--btn-primary-text)' : 'var(--color-success)', background: confirmingId === expense.id ? 'var(--color-success)' : 'var(--alert-success-bg)' }}
                                title="Confirmar pago"
                            >
                                {confirmingId === expense.id ? <X size={16} /> : <Check size={16} />}
                            </button>
                            <button onClick={() => setEditingExpense(expense)} className="btn-icon" style={{ color: 'var(--color-primary)' }}>
                                <Edit2 size={16} />
                            </button>
                            <button onClick={() => deleteRecurringExpense(expense.id)} className="btn-icon" style={{ color: 'var(--hue-danger)' }}>
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>

                    {confirmingId === expense.id && (
                        <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', display: 'flex', gap: '0.5rem', alignItems: 'center', border: 'var(--card-border)' }}>
                            <input
                                type="date"
                                value={customDate}
                                onChange={e => setCustomDate(e.target.value)}
                                style={{ background: 'var(--bg-surface-elevated)', border: 'var(--card-border)', color: 'var(--text-main)', padding: '0.4rem', borderRadius: '4px', flex: 1 }}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-surface-elevated)', border: 'var(--card-border)', borderRadius: '4px', paddingLeft: '0.5rem', flex: 1 }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>€</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={customAmount}
                                    onChange={e => setCustomAmount(e.target.value)}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-main)', padding: '0.4rem', width: '100%', outline: 'none' }}
                                    placeholder="Importe"
                                />
                            </div>
                            <button
                                onClick={() => {
                                    const [y, m, d] = customDate.split('-').map(Number);
                                    const localTimestamp = new Date(y, m - 1, d).getTime();
                                    confirmRecurringExpense(
                                        expense.id,
                                        selectedMonth,
                                        selectedYear,
                                        localTimestamp,
                                        parseFloat(customAmount)
                                    );
                                    setConfirmingId(null);
                                }}
                                className="btn-primary"
                                style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                            >
                                Confirmar
                            </button>
                        </div>
                    )}
                </div>
            ))}

            {editingExpense && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
                    <div style={{ maxWidth: '600px', width: '100%', position: 'relative' }}>
                        <button
                            onClick={() => setEditingExpense(null)}
                            style={{ position: 'absolute', top: '-2.5rem', right: 0, background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <X size={20} /> Cerrar
                        </button>
                        <RecurringExpenseForm expenseToEdit={editingExpense} onClose={() => setEditingExpense(null)} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecurringExpenseList;
