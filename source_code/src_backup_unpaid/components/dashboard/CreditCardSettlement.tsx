import React, { useMemo } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { CreditCard as CardIcon } from 'lucide-react';

const CreditCardSettlement: React.FC = () => {
    const { cards } = useFinance();

    const creditCards = useMemo(() => {
        return cards.filter(c => c.type === 'credit');
    }, [cards]);

    if (creditCards.length === 0) return null;

    const calculateDates = (cutoffDay: number, paymentDay: number) => {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        const day = today.getDate();

        let cutoffDate: Date;
        let startDate: Date;
        let paymentDate: Date;

        if (day <= cutoffDay) {
            cutoffDate = new Date(year, month, cutoffDay);
            startDate = new Date(year, month - 1, cutoffDay + 1);
            paymentDate = new Date(year, month, paymentDay);
            // If paymentDay <= cutoffDay, payment of the current cycle is usually NEXT month
            if (paymentDay <= cutoffDay) {
                paymentDate = new Date(year, month + 1, paymentDay);
            }
        } else {
            cutoffDate = new Date(year, month + 1, cutoffDay);
            startDate = new Date(year, month, cutoffDay + 1);
            paymentDate = new Date(year, month + 1, paymentDay);
            if (paymentDay <= cutoffDay) {
                paymentDate = new Date(year, month + 2, paymentDay);
            }
        }

        return {
            start: startDate,
            cutoff: cutoffDate,
            payment: paymentDate
        };
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    };

    const formatDateFull = (date: Date) => {
        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
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
                {creditCards.map(card => {
                    const dates = calculateDates(card.cutoffDay, card.paymentDay);
                    
                    return (
                        <div key={card.id} className="glass-panel" style={{ 
                            padding: '1.5rem', 
                            borderLeft: '4px solid #fbbf24', // Use yellowish for credit cards
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        TARJETA DE CRÉDITO
                                    </div>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.25rem' }}>
                                        {card.name.toUpperCase()}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>
                                        {card.currentBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                                    </div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase' }}>
                                        CICLO ACTUAL
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
                                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#fbbf24', border: '3px solid #1a1f2e', zIndex: 2, boxShadow: '0 0 10px rgba(251, 191, 36, 0.4)' }} />
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>CIERRE</div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fbbf24' }}>{formatDate(dates.cutoff)}</div>
                                        </div>
                                    </div>

                                    {/* Pago */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '2px solid #1a1f2e', zIndex: 2 }} />
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>FECHA DE PAGO</div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{formatDate(dates.payment)}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Range */}
                            <div style={{ 
                                marginTop: '1.5rem', 
                                background: 'rgba(255,255,255,0.03)', 
                                padding: '0.75rem', 
                                borderRadius: '0.5rem', 
                                textAlign: 'center', 
                                fontSize: '0.8rem', 
                                color: 'rgba(255,255,255,0.5)' 
                            }}>
                                Periodo actual: {formatDateFull(dates.start)} - {formatDateFull(dates.cutoff)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

export default CreditCardSettlement;
