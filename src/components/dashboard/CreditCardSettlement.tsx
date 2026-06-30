import React, { useMemo, useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { useDateSelection } from '../../contexts/DateSelectionContext';
import { CreditCard as CardIcon, CheckCircle2, Calendar, AlertCircle, X } from 'lucide-react';
import type { CreditCard, Expense } from '../../types/finance';
import { formatMoney, calculateCardCycleDates } from '../../utils/financeCalculations';
import { getCurrencySymbol } from '../../utils/financeCalculations';

const CreditCardSettlement: React.FC = () => {
    const { cards = [], expenses = [], settleCardCycle } = useFinance();
    const { selectedYear } = useDateSelection();

    const getEffectiveSettlementDate = (exp: Expense) => {
        if (!exp) return new Date();
        const d = new Date(exp.date || Date.now());
        const adjustment = (exp.paymentMethod as any)?.settlementAdjustment || 0;
        if (adjustment !== 0) {
            d.setMonth(d.getMonth() + adjustment);
        }
        return d;
    };



    const creditCards = useMemo(() => {
        return (cards || []).filter(c => {
            if (!c || c.type !== 'credit') return false;

            const cycleDates = calculateCardCycleDates(c);
            
            const activeExpenses = (expenses || []).filter(exp => {
                if (!exp?.paymentMethod) return false;
                const isCard = exp.paymentMethod.type === 'card' && exp.paymentMethod.cardId === c.id;
                if (!isCard || exp.isSettled) return false;
                if (exp.status === 'pending') return false;
                const expDate = getEffectiveSettlementDate(exp);
                return expDate >= cycleDates.active.start && expDate <= cycleDates.active.cutoff;
            });
            const activeTotal = activeExpenses.reduce((sum, exp) => sum + exp.amount, 0);

            const pendingExpenses = (expenses || []).filter(exp => {
                if (!exp?.paymentMethod) return false;
                const isCard = exp.paymentMethod.type === 'card' && exp.paymentMethod.cardId === c.id;
                if (!isCard || exp.isSettled) return false;
                if (exp.status === 'pending') return false;
                const expDate = getEffectiveSettlementDate(exp);
                return expDate >= cycleDates.pending.start && expDate <= cycleDates.pending.cutoff;
            });
            const pendingTotal = pendingExpenses.reduce((sum, exp) => sum + exp.amount, 0);

            return activeTotal > 0.009 || pendingTotal > 0.009;
        });
    }, [cards, expenses]);

    const formatDate = (date: Date) => {
        if (!date || isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    };

    const [settlingCard, setSettlingCard] = useState<{ card: CreditCard, total: number, range: { start: number, end: number } } | null>(null);
    const [settleAmount, setSettleAmount] = useState<string>('');
    const [settleDate, setSettleDate] = useState<string>(new Date().toISOString().split('T')[0]);

    const handleSettleStart = (card: CreditCard, total: number, range: { start: number, end: number }) => {
        setSettlingCard({ card, total, range });
        setSettleAmount(total.toFixed(2));
        setSettleDate(new Date().toISOString().split('T')[0]);
    };

    const confirmSettle = async () => {
        if (!settlingCard) return;
        const amount = parseFloat(settleAmount);
        if (isNaN(amount) || amount <= 0) {
            alert('Importe no válido');
            return;
        }

        if (settleCardCycle) {
            await settleCardCycle(
                settlingCard.card.id,
                amount,
                settlingCard.total,
                new Date(settleDate).getTime(),
                settlingCard.card.linkedAccountId || '',
                settlingCard.range.start,
                settlingCard.range.end
            );
        }
        setSettlingCard(null);
    };

    if (creditCards.length === 0) return null;

    return (
        <section style={{ marginBottom: 'var(--space-md)' }}>
            <h3 style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem', 
                fontSize: '1.1rem', 
                marginBottom: '1rem', 
                color: 'var(--text-muted)',
                fontWeight: 600
            }}>
                <CardIcon size={20} /> Liquidación y Ciclos
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {creditCards.map((card: CreditCard) => {
                    const cycleDates = calculateCardCycleDates(card);
                    
                    const activeExpenses = (expenses || []).filter(exp => {
                        if (!exp?.paymentMethod) return false;
                        const isCard = exp.paymentMethod.type === 'card' && exp.paymentMethod.cardId === card.id;
                        if (!isCard || exp.isSettled) return false;
                        if (exp.status === 'pending') return false;
                        const expDate = getEffectiveSettlementDate(exp);
                        return expDate >= cycleDates.active.start && expDate <= cycleDates.active.cutoff;
                    });
                    const activeTotal = activeExpenses.reduce((sum, exp) => sum + exp.amount, 0);

                    const pendingExpenses = (expenses || []).filter(exp => {
                        if (!exp?.paymentMethod) return false;
                        const isCard = exp.paymentMethod.type === 'card' && exp.paymentMethod.cardId === card.id;
                        if (!isCard || exp.isSettled) return false;
                        if (exp.status === 'pending') return false;
                        const expDate = getEffectiveSettlementDate(exp);
                        return expDate >= cycleDates.pending.start && expDate <= cycleDates.pending.cutoff;
                    });
                    const pendingTotal = pendingExpenses.reduce((sum, exp) => sum + exp.amount, 0);

                    const yearExpenses = (expenses || []).filter(exp => {
                        if (!exp?.paymentMethod) return false;
                        const isCard = exp.paymentMethod.type === 'card' && exp.paymentMethod.cardId === card.id;
                        if (!isCard) return false;
                        if (exp.status === 'pending') return false;
                        const expDate = getEffectiveSettlementDate(exp);
                        return expDate.getFullYear() === selectedYear;
                    });
                    const yearTotal = yearExpenses.reduce((sum, exp) => sum + exp.amount, 0);

                    return (
                        <div key={card.id} className="glass-panel" style={{ 
                            padding: '1.5rem', 
                            borderLeft: `4px solid ${card.color || '#fbbf24'}`,
                            position: 'relative',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1.25rem'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(var(--color-rgb-light),0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        TARJETA DE CRÉDITO
                                    </div>
                                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: card.color || '#fbbf24', marginTop: '0.15rem' }}>
                                        {card.name.toUpperCase()}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                        {formatMoney(activeTotal)}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: card.color || '#fbbf24', textTransform: 'uppercase' }}>
                                        CICLO ACTUAL (EN CURSO)
                                    </div>
                                </div>
                            </div>

                            {pendingTotal > 0 && (
                                <div style={{ 
                                    background: 'rgba(var(--color-rgb-light),0.03)', 
                                    borderRadius: '1rem', 
                                    padding: '1rem',
                                    border: '1px solid var(--panel-bg-2)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.75rem'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <AlertCircle size={14} style={{ color: '#fbbf24' }} />
                                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(var(--color-rgb-light),0.7)' }}>LIQUIDACIÓN PENDIENTE</span>
                                        </div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                            {formatMoney(pendingTotal)}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                                        <div style={{ fontSize: '0.7rem', color: 'rgba(var(--color-rgb-light),0.4)' }}>
                                            Cerrado el {formatDate(cycleDates.pending.cutoff)} • Pago: {formatDate(cycleDates.pending.payment)}
                                        </div>
                                         <button 
                                            onClick={() => handleSettleStart(card, pendingTotal, { start: cycleDates.pending.start.getTime(), end: cycleDates.pending.cutoff.getTime() })}
                                            style={{
                                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                color: 'var(--text-main)',
                                                border: 'none',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '0.75rem',
                                                fontSize: '0.8rem',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem',
                                                boxShadow: '0 4px 12px rgba(var(--color-success-rgb), 0.2)'
                                            }}
                                        >
                                            <CheckCircle2 size={14} /> LIQUIDAR
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                paddingTop: '0.75rem',
                                borderTop: '1px solid var(--panel-bg-2)',
                                marginTop: '0.25rem'
                            }}>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(var(--color-rgb-light),0.3)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Calendar size={12} />
                                    Uso total en {selectedYear}
                                </div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(var(--color-rgb-light),0.5)' }}>
                                    {formatMoney(yearTotal)}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            {settlingCard && (
                <div className="modal-overlay" onClick={() => setSettlingCard(null)}>
                    <div className="modal-container glass-panel" style={{ padding: '2rem', maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
                        <button 
                            onClick={() => setSettlingCard(null)}
                            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'rgba(var(--color-rgb-light),0.5)', cursor: 'pointer' }}
                        >
                            <X size={20} />
                        </button>

                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-main)' }}>
                            Confirmar Liquidación: {settlingCard.card.name}
                        </h3>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', color: 'rgba(var(--color-rgb-light),0.5)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Importe a pagar ({getCurrencySymbol()})</label>
                            <input 
                                type="number" 
                                step="0.01" 
                                value={settleAmount} 
                                onChange={e => setSettleAmount(e.target.value)}
                                style={{
                                    width: '100%',
                                    background: 'var(--panel-bg-2)',
                                    border: '1px solid var(--panel-bg-3)',
                                    borderRadius: '12px',
                                    padding: '0.8rem',
                                    color: 'var(--text-main)',
                                    fontSize: '1.1rem',
                                    fontWeight: 700
                                }}
                            />
                            {parseFloat(settleAmount) < settlingCard.total && (
                                <p style={{ color: '#fbbf24', fontSize: '0.75rem', marginTop: '0.5rem', fontWeight: 600 }}>
                                    <AlertCircle size={12} style={{ display: 'inline', marginRight: '4px' }} />
                                    La diferencia de {formatMoney(settlingCard.total - parseFloat(settleAmount))} se pasará a la próxima liquidación.
                                </p>
                            )}
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', color: 'rgba(var(--color-rgb-light),0.5)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Fecha de Pago</label>
                            <input 
                                type="date" 
                                value={settleDate} 
                                onChange={e => setSettleDate(e.target.value)}
                                style={{
                                    width: '100%',
                                    background: 'var(--panel-bg-2)',
                                    border: '1px solid var(--panel-bg-3)',
                                    borderRadius: '12px',
                                    padding: '0.8rem',
                                    color: 'var(--text-main)',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>

                        <button 
                            onClick={confirmSettle}
                            style={{
                                width: '100%',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'var(--text-main)',
                                border: 'none',
                                padding: '1rem',
                                borderRadius: '12px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                boxShadow: '0 4px 15px rgba(var(--color-success-rgb), 0.3)'
                            }}
                        >
                            REALIZAR PAGO
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
};

export default CreditCardSettlement;
