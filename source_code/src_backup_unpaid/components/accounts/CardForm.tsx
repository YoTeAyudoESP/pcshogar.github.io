import React, { useState, useEffect } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import type { CreditCard } from '../../types/finance';
import ColorPicker from '../common/ColorPicker';

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
    const [color, setColor] = useState('#f87171');

    useEffect(() => {
        if (editingCard) {
            setName(editingCard.name);
            setType(editingCard.type);
            setLinkedAccountId(editingCard.linkedAccountId);
            setLimit(editingCard.limit.toString());
            setCutoffDay(editingCard.cutoffDay.toString());
            setPaymentDay(editingCard.paymentDay.toString());
            setColor(editingCard.color || '#f87171');
        } else {
            // Reset form when not editing
            setName('');
            setType('credit');
            setLinkedAccountId('');
            setLimit('');
            setCutoffDay('20');
            setPaymentDay('5');
            setColor('#f87171');
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
                paymentDay: parseInt(paymentDay),
                color
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
                type,
                color
            );
        }

        setName('');
        setLinkedAccountId('');
        setLimit('');
        if (onClose) onClose();
    };

    const inputStyle = {
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 'var(--radius-sm)',
        padding: '0.75rem',
        color: 'var(--text-main)',
        width: '100%',
        marginBottom: '1rem',
        fontSize: '1rem'
    };

    return (
        <form onSubmit={handleSubmit} className="glass-panel" style={{ 
            padding: '2rem', 
            borderRadius: '1.5rem',
            background: 'rgba(30, 32, 47, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
        }}>
            <h2 style={{ 
                margin: 0, 
                fontSize: '1.5rem', 
                fontWeight: 700,
                color: 'white'
            }}>{editingCard ? 'Editar Tarjeta' : 'Añadir Tarjeta'}</h2>

            <div style={{ 
                display: 'flex', 
                background: 'rgba(255, 255, 255, 0.05)', 
                borderRadius: '0.75rem', 
                padding: '0.35rem'
            }}>
                <button 
                    type="button" 
                    onClick={() => setType('credit')} 
                    style={{ 
                        flex: 1, 
                        padding: '0.8rem', 
                        background: type === 'credit' ? 'var(--color-primary)' : 'transparent', 
                        border: 'none', 
                        borderRadius: '0.5rem', 
                        color: 'white',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                >Crédito</button>
                <button 
                    type="button" 
                    onClick={() => setType('debit')} 
                    style={{ 
                        flex: 1, 
                        padding: '0.8rem', 
                        background: type === 'debit' ? '#EC4899' : 'transparent', 
                        border: 'none', 
                        borderRadius: '0.5rem', 
                        color: 'white',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                >Débito</button>
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>Nombre</label>
                <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="ej. VISA Oro" required />
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>Cuenta Asociada</label>
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
                        <label style={{ display: 'block', marginBottom: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>Límite de Crédito</label>
                        <input type="number" style={inputStyle} value={limit} onChange={e => setLimit(e.target.value)} placeholder="3000" />
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>Día Cierre</label>
                            <input type="number" min="1" max="31" style={inputStyle} value={cutoffDay} onChange={e => setCutoffDay(e.target.value)} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>Día Pago</label>
                            <input type="number" min="1" max="31" style={inputStyle} value={paymentDay} onChange={e => setPaymentDay(e.target.value)} />
                        </div>
                    </div>
                </>
            )}

            <ColorPicker 
                label="Color Identificativo"
                selectedColor={color}
                onColorSelect={setColor}
            />

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button 
                    type="button" 
                    onClick={onCancelEdit || onClose} 
                    style={{
                        flex: 1, 
                        padding: '1.2rem', 
                        borderRadius: '0.75rem', 
                        border: '1px solid rgba(255, 255, 255, 0.1)', 
                        background: 'transparent', 
                        color: 'white', 
                        cursor: 'pointer',
                        fontWeight: 600,
                        transition: 'all 0.2s ease'
                    }}
                >Cancelar</button>
                <button type="submit" style={{
                    flex: 1.5,
                    padding: '1.2rem',
                    borderRadius: '1rem',
                    border: 'none',
                    background: type === 'credit' ? 'var(--color-primary)' : '#EC4899',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    cursor: 'pointer',
                    boxShadow: `0 4px 15px ${type === 'credit' ? 'rgba(124, 58, 237, 0.4)' : 'rgba(236, 72, 153, 0.4)'}`,
                    transition: 'all 0.2s ease'
                }}>
                    {editingCard ? 'Guardar Cambios' : 'Añadir Tarjeta'}
                </button>
            </div>
        </form>
    );
};

export default CardForm;
