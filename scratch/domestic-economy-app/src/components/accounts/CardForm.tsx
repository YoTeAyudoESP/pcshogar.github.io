import React, { useState, useEffect } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import type { CreditCard } from '../../types/finance';

interface CardFormProps {
    onClose?: () => void;
    editingCard?: CreditCard;
    onCancelEdit?: () => void;
}

const CardForm: React.FC<CardFormProps> = ({ onClose, editingCard, onCancelEdit }) => {
    const { accounts, addCard, updateCard } = useFinance();
    const [name, setName] = useState('');
    const [type, setType] = useState<'debit' | 'credit'>('credit');
    const [linkedAccountId, setLinkedAccountId] = useState('');
    const [limit, setLimit] = useState('');
    const [cutoffDay, setCutoffDay] = useState('20');
    const [paymentDay, setPaymentDay] = useState('5');

    useEffect(() => {
        if (editingCard) {
            setName(editingCard.name);
            setType(editingCard.type);
            setLinkedAccountId(editingCard.linkedAccountId);
            setLimit(editingCard.limit.toString());
            setCutoffDay(editingCard.cutoffDay.toString());
            setPaymentDay(editingCard.paymentDay.toString());
        } else {
            // Reset form when not editing
            setName('');
            setType('credit');
            setLinkedAccountId('');
            setLimit('');
            setCutoffDay('20');
            setPaymentDay('5');
        }
    }, [editingCard]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !linkedAccountId) return;

        if (editingCard) {
            await updateCard({
                ...editingCard,
                name,
                type,
                linkedAccountId,
                limit: parseFloat(limit) || 0,
                cutoffDay: parseInt(cutoffDay),
                paymentDay: parseInt(paymentDay)
            });
            if (onCancelEdit) onCancelEdit();
        } else {
            // For debit cards, billing cycle days are irrelevant, setting defaults
            await addCard(
                name,
                linkedAccountId,
                parseFloat(limit) || 0,
                parseInt(cutoffDay),
                parseInt(paymentDay),
                type
            );
        }

        setName('');
        setLinkedAccountId('');
        setLimit('');
        if (onClose) onClose();
    };

    const inputStyle = {
        background: 'var(--bg-surface-elevated)',
        border: 'var(--card-border)',
        borderRadius: 'var(--radius-sm)',
        padding: '0.75rem',
        color: 'var(--text-main)',
        width: '100%',
        marginBottom: '1rem',
        fontSize: '1rem'
    };

    return (
        <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>{editingCard ? 'Editar Tarjeta' : 'Añadir Tarjeta'}</h3>

            <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
                <button
                    type="button"
                    onClick={() => setType('credit')}
                    style={{
                        flex: 1,
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: type === 'credit' ? 'var(--color-primary)' : 'var(--btn-ghost-bg)',
                        color: type === 'credit' ? 'var(--btn-primary-text)' : 'var(--btn-ghost-text)',
                        cursor: 'pointer'
                    }}
                >
                    Crédito
                </button>
                <button
                    type="button"
                    onClick={() => setType('debit')}
                    style={{
                        flex: 1,
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: type === 'debit' ? 'var(--color-secondary)' : 'var(--btn-ghost-bg)',
                        color: type === 'debit' ? 'var(--btn-secondary-text)' : 'var(--btn-ghost-text)',
                        cursor: 'pointer'
                    }}
                >
                    Débito
                </button>
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Nombre</label>
                <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="ej. VISA Oro" required />
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Cuenta Asociada</label>
                <select style={inputStyle} value={linkedAccountId} onChange={e => setLinkedAccountId(e.target.value)} required>
                    <option value="">Seleccionar Cuenta vinculada...</option>
                    {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                </select>
            </div>

            {type === 'credit' && (
                <>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Límite de Crédito</label>
                        <input type="number" style={inputStyle} value={limit} onChange={e => setLimit(e.target.value)} placeholder="3000" />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Día Cierre</label>
                            <input type="number" min="1" max="31" style={inputStyle} value={cutoffDay} onChange={e => setCutoffDay(e.target.value)} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Día Pago</label>
                            <input type="number" min="1" max="31" style={inputStyle} value={paymentDay} onChange={e => setPaymentDay(e.target.value)} />
                        </div>
                    </div>
                </>
            )}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
                {editingCard && (
                    <button type="button" onClick={onCancelEdit} className="btn-secondary" style={{
                        flex: 1, padding: '1rem', borderRadius: 'var(--radius-sm)', color: 'var(--btn-secondary-text)', cursor: 'pointer'
                    }}>Cancelar</button>
                )}
                <button type="submit" className="btn-primary" style={{
                    flex: editingCard ? 2 : 'none',
                    width: editingCard ? 'auto' : '100%',
                    padding: '1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '1rem',
                    cursor: 'pointer'
                }}>
                    {editingCard ? 'Guardar Cambios' : 'Añadir Tarjeta'}
                </button>
            </div>
        </form>
    );
};

export default CardForm;
