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
    const [type, setType] = useState<'debit' | 'credit' | 'virtual'>('credit');
    const [linkedAccountId, setLinkedAccountId] = useState('');
    const [limit, setLimit] = useState('');
    const [cutoffDay, setCutoffDay] = useState('20');
    const [paymentDay, setPaymentDay] = useState('5');
    const [color, setColor] = useState('#f87171');
    const [hasAdditionalFinanceLimit, setHasAdditionalFinanceLimit] = useState(false);
    const [financeLimit, setFinanceLimit] = useState('');

    useEffect(() => {
        if (editingCard) {
            setName(editingCard.name);
            setType(editingCard.type);
            setLinkedAccountId(editingCard.linkedAccountId || '');
            setLimit(editingCard.type === 'virtual' ? editingCard.currentBalance.toString() : editingCard.limit.toString());
            setCutoffDay(editingCard.cutoffDay.toString());
            setPaymentDay(editingCard.paymentDay.toString());
            setColor(editingCard.color || '#f87171');
            setHasAdditionalFinanceLimit(editingCard.hasAdditionalFinanceLimit || false);
            setFinanceLimit(editingCard.financeLimit ? editingCard.financeLimit.toString() : '');
        } else {
            // Reset form when not editing
            setName('');
            setType('credit');
            setLinkedAccountId('');
            setLimit('');
            setCutoffDay('20');
            setPaymentDay('5');
            setColor('#f87171');
            setHasAdditionalFinanceLimit(false);
            setFinanceLimit('');
        }
    }, [editingCard]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || (type !== 'virtual' && !linkedAccountId)) return;

        if (editingCard) {
            await updateCard({
                ...editingCard,
                name,
                type,
                linkedAccountId: type === 'virtual' ? '' : linkedAccountId,
                limit: type === 'virtual' ? 0 : (parseFloat(limit) || 0),
                cutoffDay: type === 'virtual' ? 0 : parseInt(cutoffDay),
                paymentDay: type === 'virtual' ? 0 : parseInt(paymentDay),
                currentBalance: type === 'virtual' ? (parseFloat(limit) || 0) : editingCard.currentBalance,
                color,
                hasAdditionalFinanceLimit: type === 'credit' ? hasAdditionalFinanceLimit : false,
                financeLimit: (type === 'credit' && hasAdditionalFinanceLimit) ? (parseFloat(financeLimit) || 0) : undefined
            });
            if (onCancelEdit) onCancelEdit();
        } else {
            const newCard = {
                name,
                linkedAccountId: type === 'virtual' ? '' : linkedAccountId,
                limit: type === 'virtual' ? 0 : (parseFloat(limit) || 0),
                cutoffDay: type === 'virtual' ? 0 : parseInt(cutoffDay),
                paymentDay: type === 'virtual' ? 0 : parseInt(paymentDay),
                type,
                color,
                currentBalance: type === 'virtual' ? (parseFloat(limit) || 0) : 0,
                hasAdditionalFinanceLimit: type === 'credit' ? hasAdditionalFinanceLimit : false,
                financeLimit: (type === 'credit' && hasAdditionalFinanceLimit) ? (parseFloat(financeLimit) || 0) : undefined
            } as CreditCard;
            await addCard(
                newCard.name,
                newCard.linkedAccountId || '',
                newCard.limit,
                newCard.cutoffDay,
                newCard.paymentDay,
                newCard.type,
                newCard.color || '',
                newCard.currentBalance,
                newCard.hasAdditionalFinanceLimit,
                newCard.financeLimit
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
                <button 
                    type="button" 
                    onClick={() => setType('virtual')} 
                    style={{ 
                        flex: 1, 
                        padding: '0.8rem', 
                        background: type === 'virtual' ? '#10B981' : 'transparent', 
                        border: 'none', 
                        borderRadius: '0.5rem', 
                        color: 'white',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                >Virtual</button>
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>Nombre</label>
                <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="ej. Tarjeta Virtual Prepago" required />
            </div>

            {type !== 'virtual' && (
                <div>
                    <label style={{ display: 'block', marginBottom: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>Cuenta Asociada</label>
                    <select style={inputStyle} value={linkedAccountId} onChange={e => setLinkedAccountId(e.target.value)} required>
                        <option value="">Seleccionar Cuenta vinculada...</option>
                        {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                    </select>
                </div>
            )}

            {type === 'virtual' && (
                <div>
                    <label style={{ display: 'block', marginBottom: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>Saldo Inicial (€)</label>
                    <input type="number" step="0.01" style={inputStyle} value={limit} onChange={e => setLimit(e.target.value)} placeholder="0.00" />
                </div>
            )}

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
                    
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)', marginTop: '0.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', marginBottom: hasAdditionalFinanceLimit ? '1rem' : '0' }}>
                            <input 
                                type="checkbox" 
                                checked={hasAdditionalFinanceLimit}
                                onChange={e => setHasAdditionalFinanceLimit(e.target.checked)}
                                style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }}
                            />
                            <span style={{ fontSize: '0.9rem', color: 'white' }}>Tiene límite adicional de crédito a plazos</span>
                        </label>
                        
                        {hasAdditionalFinanceLimit && (
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>Límite de Financiación Adicional (€)</label>
                                <input type="number" step="0.01" style={inputStyle} value={financeLimit} onChange={e => setFinanceLimit(e.target.value)} placeholder="Ej. 1500" />
                                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '-0.5rem' }}>
                                    Las financiaciones de esta tarjeta restarán de este límite sin afectar al límite del ciclo normal.
                                </div>
                            </div>
                        )}
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
                    background: type === 'credit' ? 'var(--color-primary)' : type === 'virtual' ? '#10B981' : '#EC4899',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    cursor: 'pointer',
                    boxShadow: `0 4px 15px ${type === 'credit' ? 'rgba(124, 58, 237, 0.4)' : type === 'virtual' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(236, 72, 153, 0.4)'}`,
                    transition: 'all 0.2s ease'
                }}>
                    {editingCard ? 'Guardar Cambios' : 'Añadir Tarjeta'}
                </button>
            </div>
        </form>
    );
};

export default CardForm;
