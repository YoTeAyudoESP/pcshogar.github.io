import React, { useMemo } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { useDateSelection } from '../../contexts/DateSelectionContext';
import { CreditCard as CardIcon, CheckCircle2, Calendar, AlertCircle } from 'lucide-react';
import type { CreditCard } from '../../types/finance';

const CreditCardSettlement: React.FC = () => {
    const { cards } = useFinance();

    const creditCards = useMemo(() => {
        return cards.filter(c => c.type === 'credit');
    }, [cards]);

    if (creditCards.length === 0) return null;

    const calculateDates = (card: CreditCard) => {
        const { cutoffDay, paymentDay } = card;
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        const day = today.getDate();

        let activeCutoff: Date;
        let activeStart: Date;
        let activePayment: Date;

        let pendingCutoff: Date;
        let pendingStart: Date;
        let pendingPayment: Date;

        if (day > cutoffDay) {
            // Active cycle is the one that will end next month
            activeCutoff = new Date(year, month + 1, cutoffDay, 23, 59, 59);
            activeStart = new Date(year, month, cutoffDay + 1, 0, 0, 0);
            activePayment = new Date(year, month + 1, paymentDay, 12, 0, 0);
            if (paymentDay <= cutoffDay) activePayment = new Date(year, month + 2, paymentDay, 12, 0, 0);

            // Pending cycle is the one that just closed this month
            pendingCutoff = new Date(year, month, cutoffDay, 23, 59, 59);
            pendingStart = new Date(year, month - 1, cutoffDay + 1, 0, 0, 0);
            pendingPayment = new Date(year, month, paymentDay, 12, 0, 0);
            if (paymentDay <= cutoffDay) pendingPayment = new Date(year, month + 1, paymentDay, 12, 0, 0);
        } else {
            // Active cycle is the one that ends this month
            activeCutoff = new Date(year, month, cutoffDay, 23, 59, 59);
            activeStart = new Date(year, month - 1, cutoffDay + 1, 0, 0, 0);
            activePayment = new Date(year, month, paymentDay, 12, 0, 0);
            if (paymentDay <= cutoffDay) activePayment = new Date(year, month + 1, paymentDay, 12, 0, 0);

            // Pending cycle is the one that ended last month
            pendingCutoff = new Date(year, month - 1, cutoffDay, 23, 59, 59);
            pendingStart = new Date(year, month - 2, cutoffDay + 1, 0, 0, 0);
            pendingPayment = new Date(year, month - 1, paymentDay, 12, 0, 0);
            if (paymentDay <= cutoffDay) pendingPayment = new Date(year, month, paymentDay, 12, 0, 0);
        }

        return {
            active: { start: activeStart, cutoff: activeCutoff, payment: activePayment },
            pending: { start: pendingStart, cutoff: pendingCutoff, payment: pendingPayment }
        };
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    };

    const formatDateFull = (date: Date) => {
        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    };

    const { expenses, settleCardCycle } = useFinance();

    const handleSettle = async (cardId: string, amount: number, accountId: string) => {
        if (amount <= 0) {
            alert('No hay importe pendiente para liquidar.');
            return;
        }
        if (window.confirm(`¿Confirmas el pago de ${amount.toFixed(2)}€ de la tarjeta? Se descontará de la cuenta vinculada.`)) {
            await settleCardCycle(cardId, amount, Date.now(), accountId);
        }
    };

    const { selectedYear } = useDateSelection();

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
                    const cycleDates = calculateDates(card);
                    
                    // 1. Current Active Cycle Spending
                    const activeExpenses = expenses.filter(exp => {
                        const isCard = exp.paymentMethod.type === 'card' && exp.paymentMethod.cardId === card.id;
                        if (!isCard || exp.isSettled) return false;
                        const expDate = new Date(exp.date);
                        return expDate >= cycleDates.active.start && expDate <= cycleDates.active.cutoff;
                    });
                    const activeTotal = activeExpenses.reduce((sum, exp) => sum + exp.amount, 0);

                    // 2. Pending Settlement Cycle Spending
                    const pendingExpenses = expenses.filter(exp => {
                        const isCard = exp.paymentMethod.type === 'card' && exp.paymentMethod.cardId === card.id;
                        if (!isCard || exp.isSettled) return false;
                        const expDate = new Date(exp.date);
                        return expDate >= cycleDates.pending.start && expDate <= cycleDates.pending.cutoff;
                    });
                    const pendingTotal = pendingExpenses.reduce((sum, exp) => sum + exp.amount, 0);

                    // 3. Yearly Usage (All year)
                    const yearExpenses = expenses.filter(exp => {
                        const isCard = exp.paymentMethod.type === 'card' && exp.paymentMethod.cardId === card.id;
                        if (!isCard) return false;
                        const expDate = new Date(exp.date);
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
                            {/* Header & Active Cycle */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        TARJETA DE CRÉDITO
                                    </div>
                                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: card.color || '#fbbf24', marginTop: '0.15rem' }}>
                                        {card.name.toUpperCase()}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>
                                        {activeTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                                    </div>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: card.color || '#fbbf24', textTransform: 'uppercase' }}>
                                        CICLO ACTUAL (EN CURSO)
                                    </div>
                                </div>
                            </div>

                            {/* Pending Settlement Section (if exists) */}
                            {pendingTotal > 0 && (
                                <div style={{ 
                                    background: 'rgba(255,255,255,0.03)', 
                                    borderRadius: '1rem', 
                                    padding: '1rem',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.75rem'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <AlertCircle size={14} style={{ color: '#fbbf24' }} />
                                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>LIQUIDACIÓN PENDIENTE</span>
                                        </div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white' }}>
                                            {pendingTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                                            Cerrado el {formatDate(cycleDates.pending.cutoff)} • Pago: {formatDate(cycleDates.pending.payment)}
                                        </div>
                                        <button 
                                            onClick={() => handleSettle(card.id, pendingTotal, card.linkedAccountId)}
                                            style={{
                                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                color: 'white',
                                                border: 'none',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '0.75rem',
                                                fontSize: '0.8rem',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem',
                                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                                            }}
                                        >
                                            <CheckCircle2 size={14} /> LIQUIDAR
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Yearly Usage Footer */}
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                paddingTop: '0.75rem',
                                borderTop: '1px solid rgba(255,255,255,0.05)',
                                marginTop: '0.25rem'
                            }}>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Calendar size={12} />
                                    Uso total en {selectedYear}
                                </div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>
                                    {yearTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

export default CreditCardSettlement;
