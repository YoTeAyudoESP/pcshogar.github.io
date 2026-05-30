import React from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import type { CreditCard } from '../../types/finance';
import { formatCurrency } from '../../utils/formatters';
import { getSettlementCycles } from '../../utils/cardCalculations';
import { useLanguage } from '../../contexts/LanguageContext';

interface CardListProps {
    onEdit?: (card: CreditCard) => void;
}

const CardList: React.FC<CardListProps> = ({ onEdit }) => {
    const { cards, accounts, expenses } = useFinance();
    const { t } = useLanguage();

    const getAccountName = (id: string) => {
        return accounts.find(a => a.id === id)?.name || 'Cuenta Desconocida';
    };

    return (
        <div className="glass-panel" style={{ padding: 'var(--space-md)' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>{t('settings.tabs.cards')}</h3>
            {cards.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No hay tarjetas configuradas.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {cards.map(card => {
                        const cycles = getSettlementCycles(card, expenses);
                        const currentCycle = cycles.find(c => c.type === 'current');
                        return (
                            <div key={card.id} className="glass-panel" style={{
                                background: 'var(--bg-surface-elevated)',
                                padding: '1rem',
                                borderRadius: 'var(--radius-sm)',
                                borderLeft: `6px solid ${card.color || (card.type === 'credit' ? 'var(--color-primary)' : 'var(--color-secondary)')}`
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{card.name}</div>
                                        <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{card.type}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        {card.type === 'credit' && (
                                            <div style={{ color: 'var(--color-primary-light)', fontWeight: 700, fontSize: '1.1rem' }}>
                                                {formatCurrency(currentCycle?.total || 0)}
                                            </div>
                                        )}
                                        {onEdit && (
                                            <button onClick={() => onEdit(card)} className="btn-icon" style={{
                                                border: 'var(--card-border)', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', marginTop: '0.5rem'
                                            }}>
                                                Editar
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                    Vinculada a: {getAccountName(card.linkedAccountId)}
                                </div>
                                {card.type === 'credit' && (
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                        Cierra el {card.cutoffDay} • Paga el {card.paymentDay}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CardList;
