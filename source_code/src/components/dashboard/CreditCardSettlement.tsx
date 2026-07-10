import React, { useMemo, useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { useDateSelection } from '../../contexts/DateSelectionContext';
import { CreditCard as CardIcon, CheckCircle2, Calendar, AlertCircle, X, Zap } from 'lucide-react';
import type { CreditCard, Expense } from '../../types/finance';
import { formatMoney } from '../../utils/financeCalculations';
import FinanceCardModal from './FinanceCardModal';

const CreditCardSettlement: React.FC = () => {
    const { cards = [], expenses = [], settleCardCycle } = useFinance();
    const { selectedYear } = useDateSelection();
    
    const [financeCardId, setFinanceCardId] = useState<string | null>(null);
    const [financeAmount, setFinanceAmount] = useState<number>(0);

    const getEffectiveSettlementDate = (exp: Expense) => {
        if (!exp) return new Date();
        const d = new Date(exp.date || Date.now());
        const adjustment = (exp.paymentMethod as any)?.settlementAdjustment || 0;
        if (adjustment !== 0) {
            d.setMonth(d.getMonth() + adjustment);
        }
        return d;
    };

    const calculateDates = (card: CreditCard) => {
        const cutoffDay = card.cutoffDay || 1;
        const paymentDay = card.paymentDay || 1;
        
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
            activeCutoff = new Date(year, month + 1, cutoffDay, 23, 59, 59);
            activeStart = new Date(year, month, cutoffDay + 1, 0, 0, 0);
            activePayment = new Date(year, month + 1, paymentDay, 12, 0, 0);
            if (paymentDay <= cutoffDay) activePayment = new Date(year, month + 2, paymentDay, 12, 0, 0);

            pendingCutoff = new Date(year, month, cutoffDay, 23, 59, 59);
            pendingStart = new Date(year, month - 1, cutoffDay + 1, 0, 0, 0);
            pendingPayment = new Date(year, month, paymentDay, 12, 0, 0);
            if (paymentDay <= cutoffDay) pendingPayment = new Date(year, month + 1, paymentDay, 12, 0, 0);
        } else {
            activeCutoff = new Date(year, month, cutoffDay, 23, 59, 59);
            activeStart = new Date(year, month - 1, cutoffDay + 1, 0, 0, 0);
            activePayment = new Date(year, month, paymentDay, 12, 0, 0);
            if (paymentDay <= cutoffDay) activePayment = new Date(year, month + 1, paymentDay, 12, 0, 0);

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

    // Separar tarjetas en uso de las disponibles (sin gasto actual)
    const { activeCards, availableCards } = useMemo(() => {
        const creditOnly = (cards || []).filter(c => c && c.type === 'credit');
        const active: CreditCard[] = [];
        const available: CreditCard[] = [];

        creditOnly.forEach(c => {
            const cycleDates = calculateDates(c);

            const activeExpenses = (expenses || []).filter(exp => {
                if (!exp?.paymentMethod) return false;
                const isCard = exp.paymentMethod.type === 'card' && exp.paymentMethod.cardId === c.id;
                if (!isCard || exp.isSettled) return false;
                if (exp.amount < 0 && exp.status === 'pending') return false;
                const expDate = getEffectiveSettlementDate(exp);
                return expDate >= cycleDates.active.start && expDate <= cycleDates.active.cutoff;
            });
            const activeTotal = activeExpenses.reduce((sum, exp) => sum + exp.amount, 0);

            const pendingExpenses = (expenses || []).filter(exp => {
                if (!exp?.paymentMethod) return false;
                const isCard = exp.paymentMethod.type === 'card' && exp.paymentMethod.cardId === c.id;
                if (!isCard || exp.isSettled) return false;
                if (exp.amount < 0 && exp.status === 'pending') return false;
                const expDate = getEffectiveSettlementDate(exp);
                return expDate >= cycleDates.pending.start && expDate <= cycleDates.pending.cutoff;
            });
            const pendingTotal = pendingExpenses.reduce((sum, exp) => sum + exp.amount, 0);

            if (activeTotal > 0.009 || pendingTotal > 0.009) {
                active.push(c);
            } else {
                available.push(c);
            }
        });

        return { activeCards: active, availableCards: available };
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

    // Componente de barra de progreso reutilizable
    const UsageBar = ({ used, limit, color }: { used: number, limit: number, color: string }) => {
        const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
        const barColor = pct >= 85 ? '#ef4444' : pct >= 60 ? '#f59e0b' : pct >= 30 ? color : '#10b981';
        return (
            <div style={{ width: '100%' }}>
                <div style={{
                    width: '100%',
                    height: '6px',
                    background: 'rgba(255,255,255,0.07)',
                    borderRadius: '99px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: barColor,
                        borderRadius: '99px',
                        transition: 'width 0.6s ease',
                        boxShadow: `0 0 8px ${barColor}55`
                    }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)' }}>
                        {pct.toFixed(0)}% usado
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)' }}>
                        Límite: {formatMoney(limit)}
                    </span>
                </div>
            </div>
        );
    };

    if (activeCards.length === 0 && availableCards.length === 0) return null;

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

            {/* Tarjetas en uso */}
            {activeCards.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {activeCards.map((card: CreditCard) => {
                        const cycleDates = calculateDates(card);
                        const limit = card.limit || 0;
                        
                        const activeExpenses = (expenses || []).filter(exp => {
                            if (!exp?.paymentMethod) return false;
                            const isCard = exp.paymentMethod.type === 'card' && exp.paymentMethod.cardId === card.id;
                            if (!isCard || exp.isSettled) return false;
                            if (exp.amount < 0 && exp.status === 'pending') return false;
                            const expDate = getEffectiveSettlementDate(exp);
                            return expDate >= cycleDates.active.start && expDate <= cycleDates.active.cutoff;
                        });
                        const activeTotal = activeExpenses.reduce((sum, exp) => sum + exp.amount, 0);

                        const pendingExpenses = (expenses || []).filter(exp => {
                            if (!exp?.paymentMethod) return false;
                            const isCard = exp.paymentMethod.type === 'card' && exp.paymentMethod.cardId === card.id;
                            if (!isCard || exp.isSettled) return false;
                            if (exp.amount < 0 && exp.status === 'pending') return false;
                            const expDate = getEffectiveSettlementDate(exp);
                            return expDate >= cycleDates.pending.start && expDate <= cycleDates.pending.cutoff;
                        });
                        const pendingTotal = pendingExpenses.reduce((sum, exp) => sum + exp.amount, 0);

                        const yearExpenses = (expenses || []).filter(exp => {
                            if (!exp?.paymentMethod) return false;
                            const isCard = exp.paymentMethod.type === 'card' && exp.paymentMethod.cardId === card.id;
                            if (!isCard) return false;
                            if (exp.amount < 0 && exp.status === 'pending') return false;
                            const expDate = getEffectiveSettlementDate(exp);
                            return expDate.getFullYear() === selectedYear;
                        });
                        const yearTotal = yearExpenses.reduce((sum, exp) => sum + exp.amount, 0);

                        // Disponible = límite - gasto ciclo ACTUAL (no se cuenta el pendiente anterior)
                        const available = limit > 0 ? Math.max(0, limit - activeTotal) : null;

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
                                {/* Cabecera: nombre + total ciclo actual */}
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
                                            {formatMoney(activeTotal)}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: card.color || '#fbbf24', textTransform: 'uppercase' }}>
                                            CICLO ACTUAL (EN CURSO)
                                        </div>
                                        {available !== null && (
                                            <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, marginTop: '0.15rem' }}>
                                                {formatMoney(available)} disponible
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Barra de progreso visual */}
                                {limit > 0 && (
                                    <UsageBar used={activeTotal} limit={limit} color={card.color || '#fbbf24'} />
                                )}

                                {/* Botón financiar ciclo actual */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFinanceCardId(card.id);
                                        setFinanceAmount(activeTotal);
                                    }}
                                    disabled={activeTotal <= 0}
                                    style={{
                                        background: activeTotal > 0 ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255,255,255,0.04)',
                                        color: activeTotal > 0 ? '#818cf8' : 'rgba(255,255,255,0.2)',
                                        border: `1px solid ${activeTotal > 0 ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255,255,255,0.06)'}`,
                                        padding: '0.6rem 1rem',
                                        borderRadius: '0.75rem',
                                        fontSize: '0.8rem',
                                        fontWeight: 800,
                                        cursor: activeTotal > 0 ? 'pointer' : 'default',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        transition: 'all 0.2s ease',
                                        width: '100%',
                                        justifyContent: 'center'
                                    }}
                                    onMouseOver={e => { if (activeTotal > 0) e.currentTarget.style.background = 'rgba(99, 102, 241, 0.22)'; }}
                                    onMouseOut={e => { if (activeTotal > 0) e.currentTarget.style.background = 'rgba(99, 102, 241, 0.12)'; }}
                                >
                                    <Zap size={14} />
                                    FINANCIAR CICLO ACTUAL {activeTotal > 0 ? `(${formatMoney(activeTotal)})` : '— Sin gastos'}
                                </button>

                                {/* Liquidación pendiente (ciclo anterior) */}
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
                                                {formatMoney(pendingTotal)}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                                                Cerrado el {formatDate(cycleDates.pending.cutoff)} • Pago: {formatDate(cycleDates.pending.payment)}
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        setFinanceCardId(card.id);
                                                        setFinanceAmount(pendingTotal);
                                                    }}
                                                    style={{
                                                        background: 'rgba(255,255,255,0.1)',
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
                                                        transition: 'all 0.2s ease',
                                                    }}
                                                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                                                    onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                                >
                                                    FINANCIAR
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => handleSettleStart(card, pendingTotal, { start: cycleDates.pending.start.getTime(), end: cycleDates.pending.cutoff.getTime() })}
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
                                    </div>
                                )}

                                {/* Uso anual */}
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
                                        {formatMoney(yearTotal)}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Sección: Tarjetas Disponibles (sin uso en ciclo actual) */}
            {availableCards.length > 0 && (
                <div style={{ marginTop: activeCards.length > 0 ? '2rem' : '0' }}>
                    <div style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: 'rgba(255,255,255,0.3)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        marginBottom: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <CheckCircle2 size={13} style={{ color: '#10b981' }} />
                        Tarjetas Disponibles
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {availableCards.map((card: CreditCard) => {
                            const limit = card.limit || 0;
                            return (
                                <div key={card.id} className="glass-panel" style={{
                                    padding: '1rem 1.25rem',
                                    borderLeft: `3px solid ${card.color || '#10b981'}`,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.75rem'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>
                                                TARJETA DISPONIBLE
                                            </div>
                                            <div style={{ fontSize: '1rem', fontWeight: 800, color: card.color || '#10b981' }}>
                                                {card.name.toUpperCase()}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>
                                                {limit > 0 ? formatMoney(limit) : '—'}
                                            </div>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', opacity: 0.7 }}>
                                                100% disponible
                                            </div>
                                        </div>
                                    </div>
                                    {limit > 0 && (
                                        <UsageBar used={0} limit={limit} color={card.color || '#10b981'} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Modal de confirmación de liquidación */}
            {settlingCard && (
                <div className="modal-overlay" onClick={() => setSettlingCard(null)}>
                    <div className="modal-container glass-panel" style={{ padding: '2rem', maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
                        <button 
                            type="button"
                            onClick={() => setSettlingCard(null)}
                            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                        >
                            <X size={20} />
                        </button>

                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', color: 'white' }}>
                            Confirmar Liquidación: {settlingCard.card.name}
                        </h3>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Importe a pagar (€)</label>
                            <input 
                                type="number" 
                                step="0.01" 
                                value={settleAmount} 
                                onChange={e => setSettleAmount(e.target.value)}
                                style={{
                                    width: '100%',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    padding: '0.8rem',
                                    color: 'white',
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
                            <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Fecha de Pago</label>
                            <input 
                                type="date" 
                                value={settleDate} 
                                onChange={e => setSettleDate(e.target.value)}
                                style={{
                                    width: '100%',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    padding: '0.8rem',
                                    color: 'white',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>

                        <button 
                            type="button"
                            onClick={confirmSettle}
                            style={{
                                width: '100%',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '1rem',
                                borderRadius: '12px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                            }}
                        >
                            REALIZAR PAGO
                        </button>
                    </div>
                </div>
            )}
            
            {financeCardId && (
                <FinanceCardModal
                    isOpen={!!financeCardId}
                    onClose={() => {
                        setFinanceCardId(null);
                        setFinanceAmount(0);
                    }}
                    cardId={financeCardId}
                    amount={financeAmount}
                    onSuccess={() => {
                        setFinanceCardId(null);
                        setFinanceAmount(0);
                    }}
                />
            )}
        </section>
    );
};

export default CreditCardSettlement;
