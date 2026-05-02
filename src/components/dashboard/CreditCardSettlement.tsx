import React, { useMemo } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
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

        let cutoffDate: Date;
        let startDate: Date;
        let paymentDate: Date;

        // The "Next Settlement" we care about is the one that JUST closed or is about to close.
        // If today is after the cutoff day of the PREVIOUS month, that's the one we likely haven't paid yet.
        
        if (day > cutoffDay) {
            // We are in the "Next month's" active period, but the CURRENT month's cycle just closed.
            cutoffDate = new Date(year, month, cutoffDay, 23, 59, 59);
            startDate = new Date(year, month - 1, cutoffDay + 1, 0, 0, 0);
            paymentDate = new Date(year, month, paymentDay, 12, 0, 0);
            if (paymentDay <= cutoffDay) {
                paymentDate = new Date(year, month + 1, paymentDay, 12, 0, 0);
            }
        } else {
            // We are BEFORE the cutoff of the current month.
            // So the cycle that ended LAST month is the one pending/recently paid.
            cutoffDate = new Date(year, month - 1, cutoffDay, 23, 59, 59);
            startDate = new Date(year, month - 2, cutoffDay + 1, 0, 0, 0);
            paymentDate = new Date(year, month - 1, paymentDay, 12, 0, 0);
            if (paymentDay <= cutoffDay) {
                paymentDate = new Date(year, month, paymentDay, 12, 0, 0);
            }
        }

        return {
            start: startDate,
            cutoff: cutoffDate,
            payment: paymentDate,
            isCycleClosed: true // For this logic, it's always the closed/closing cycle
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
                <CardIcon size={20} /> Próxima Liquidación
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {creditCards.map((card: CreditCard) => {
                    const dates = calculateDates(card);
                    
                    // Dynamic calculation of cycle spending
                    const cycleExpenses = expenses.filter(exp => {
                        const isCard = exp.paymentMethod.type === 'card' && exp.paymentMethod.cardId === card.id;
                        if (!isCard) return false;
                        const expDate = new Date(exp.date);
                        return expDate >= dates.start && expDate <= dates.cutoff;
                    });
                    
                    const cycleTotal = cycleExpenses.reduce((sum, exp) => sum + exp.amount, 0);
                    
                    // Logic to determine if we show the settle button
                    // The cycle is closed if today is between cutoff and payment, or after cutoff
                    const today = new Date();
                    const isSettlementPending = today > dates.cutoff || (today.getDate() > card.cutoffDay);

                    return (
                        <div key={card.id} className="glass-panel" style={{ 
                            padding: '1.5rem', 
                            borderLeft: `4px solid ${card.color || '#fbbf24'}`,
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        TARJETA DE CRÉDITO
                                    </div>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: card.color || '#fbbf24', marginTop: '0.25rem' }}>
                                        {card.name.toUpperCase()}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>
                                        {cycleTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                                    </div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: card.color || '#fbbf24', textTransform: 'uppercase' }}>
                                        GASTO CICLO
                                    </div>
                                </div>
                            </div>

                            {/* Timeline */}
                            <div style={{ position: 'relative', height: '60px', marginTop: '2rem', padding: '0 10px' }}>
                                {/* Line */}
                                <div style={{ 
                                    position: 'absolute', 
                                    top: '10px', 
                                    left: '0', 
                                    right: '0', 
                                    height: '2px', 
                                    background: 'rgba(255,255,255,0.1)' 
                                }} />
                                
                                {/* Points and Labels */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', width: '100%' }}>
                                    {/* Inicio */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '2px solid #1a1f2e', zIndex: 2 }} />
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>INICIO</div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{formatDate(dates.start)}</div>
                                        </div>
                                    </div>

                                    {/* Cierre */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ 
                                            width: '16px', 
                                            height: '16px', 
                                            borderRadius: '50%', 
                                            background: today > dates.cutoff ? '#10b981' : (card.color || '#fbbf24'), 
                                            border: '3px solid #1a1f2e', 
                                            zIndex: 2, 
                                            boxShadow: today > dates.cutoff ? '0 0 10px rgba(16, 185, 129, 0.4)' : `0 0 10px ${card.color || 'rgba(251, 191, 36, 0.4)'}` 
                                        }} />
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>CIERRE</div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: today > dates.cutoff ? '#10b981' : (card.color || '#fbbf24') }}>{formatDate(dates.cutoff)}</div>
                                        </div>
                                    </div>

                                    {/* Pago */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '2px solid #1a1f2e', zIndex: 2 }} />
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>PAGO</div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{formatDate(dates.payment)}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions / Settle Button */}
                            <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Calendar size={12} />
                                    {formatDateFull(dates.start)} - {formatDateFull(dates.cutoff)}
                                </div>

                                {isSettlementPending && (
                                    <button 
                                        onClick={() => handleSettle(card.id, cycleTotal, card.linkedAccountId)}
                                        style={{
                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                            color: 'white',
                                            border: 'none',
                                            padding: '0.6rem 1.2rem',
                                            borderRadius: '0.75rem',
                                            fontSize: '0.85rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                                        }}
                                    >
                                        <CheckCircle2 size={16} /> Confirmar Pago
                                    </button>
                                )}
                            </div>
                            
                            {/* Warning if balance mismatch (total vs cycle) - optional helper */}
                            {Math.abs(card.currentBalance - cycleTotal) > 1 && (
                                <div style={{ 
                                    marginTop: '1rem', 
                                    fontSize: '0.7rem', 
                                    color: 'rgba(255,255,255,0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    padding: '0.5rem',
                                    background: 'rgba(0,0,0,0.1)',
                                    borderRadius: '4px'
                                }}>
                                    <AlertCircle size={12} />
                                    Deuda total acumulada: {card.currentBalance.toFixed(2)}€
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

export default CreditCardSettlement;
