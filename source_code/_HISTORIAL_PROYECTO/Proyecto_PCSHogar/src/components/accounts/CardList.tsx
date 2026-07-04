import React, { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import type { CreditCard } from '../../types/finance';
import { Edit2, Trash2 } from 'lucide-react';
import DeleteCardDialog from './DeleteCardDialog';

interface CardListProps {
    onEdit?: (card: CreditCard) => void;
}

const CardList: React.FC<CardListProps> = ({ onEdit }) => {
    const { cards, accounts } = useFinance();
    const [cardToDelete, setCardToDelete] = useState<CreditCard | null>(null);

    const handleDeleteClick = (card: CreditCard) => {
        setCardToDelete(card);
    };

    const getAccountName = (id: string) => {
        return accounts.find(a => a.id === id)?.name || 'Cuenta Desconocida';
    };

    return (
        <div className="glass-panel" style={{ padding: 'var(--space-md)' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Mis Tarjetas</h3>
            {cards.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No hay tarjetas configuradas.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {cards.map(card => (
                        <div key={card.id} style={{
                            background: 'rgba(255,255,255,0.03)',
                            padding: '1.25rem',
                            borderRadius: '1rem',
                            borderLeft: `5px solid ${card.color || (card.type === 'credit' ? 'var(--color-primary)' : '#EC4899')}`,
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderLeftWidth: '5px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{card.name}</div>
                                    <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                        {card.type === 'credit' ? 'Crédito' : 'Débito'}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {onEdit && (
                                        <button onClick={() => onEdit(card)} style={{
                                            background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '0.5rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center'
                                        }}>
                                            <Edit2 size={16} />
                                        </button>
                                    )}
                                    <button onClick={() => handleDeleteClick(card)} style={{
                                        background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center'
                                    }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.75rem' }}>
                                Vinculada a: <span style={{ color: 'rgba(255,255,255,0.8)' }}>{getAccountName(card.linkedAccountId)}</span>
                            </div>
                            {card.type === 'credit' && (
                                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem' }}>
                                    Cierra el {card.cutoffDay} • Paga el {card.paymentDay}
                                </div>
                            )}
                        </div>
                    ))}

                    {cardToDelete && (
                        <DeleteCardDialog 
                            card={cardToDelete} 
                            onClose={() => setCardToDelete(null)} 
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default CardList;
