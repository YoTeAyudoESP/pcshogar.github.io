import React, { useState, useEffect } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import type { Account } from '../../types/finance';
import ColorPicker from '../common/ColorPicker';

interface AccountFormProps {
    onClose?: () => void;
    editingAccount?: Account;
    onCancelEdit?: () => void;
}

const AccountForm: React.FC<AccountFormProps> = ({ onClose, editingAccount, onCancelEdit }) => {
    const { addAccount, updateAccount } = useFinance();
    const [name, setName] = useState('');
    const [balance, setBalance] = useState('');
    const [type, setType] = useState<'bank' | 'cash'>('bank');
    const [color, setColor] = useState('#3b82f6');

    useEffect(() => {
        if (editingAccount) {
            setName(editingAccount.name);
            setBalance(editingAccount.balance.toString());
            setType(editingAccount.type);
            setColor(editingAccount.color || '#3b82f6');
        } else {
            setName('');
            setBalance('');
            setType('bank');
            setColor('#3b82f6');
        }
    }, [editingAccount]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        if (editingAccount) {
            await updateAccount({
                ...editingAccount,
                name,
                balance: parseFloat(balance) || 0,
                type,
                color
            });
            if (onCancelEdit) onCancelEdit();
        } else {
            await addAccount(name, type, parseFloat(balance) || 0, color);
        }

        setName('');
        setBalance('');
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
            }}>{editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta'}</h2>

            <div style={{ 
                display: 'flex', 
                background: 'rgba(255, 255, 255, 0.05)', 
                borderRadius: '0.75rem', 
                padding: '0.35rem'
            }}>
                <button 
                    type="button" 
                    onClick={() => setType('bank')} 
                    style={{ 
                        flex: 1, 
                        padding: '0.8rem', 
                        background: type === 'bank' ? 'var(--color-primary)' : 'transparent', 
                        border: 'none', 
                        borderRadius: '0.5rem', 
                        color: 'white',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                >Banco</button>
                <button 
                    type="button" 
                    onClick={() => setType('cash')} 
                    style={{ 
                        flex: 1, 
                        padding: '0.8rem', 
                        background: type === 'cash' ? 'var(--color-primary)' : 'transparent', 
                        border: 'none', 
                        borderRadius: '0.5rem', 
                        color: 'white',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                >Efectivo</button>
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>Nombre</label>
                <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Main Bank" required />
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>Saldo Actual</label>
                <input type="number" step="0.01" style={inputStyle} value={balance} onChange={e => setBalance(e.target.value)} placeholder="0.00" required />
            </div>

            <ColorPicker 
                label="Color Identificativo"
                selectedColor={color}
                onColorSelect={setColor}
            />

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                {editingAccount && (
                    <button type="button" onClick={onCancelEdit} style={{
                        flex: 1, 
                        padding: '1.2rem', 
                        borderRadius: '0.75rem', 
                        border: '1px solid rgba(255, 255, 255, 0.1)', 
                        background: 'transparent', 
                        color: 'white', 
                        cursor: 'pointer',
                        fontWeight: 600
                    }}>Cancelar</button>
                )}
                <button type="submit" style={{
                    flex: 2,
                    padding: '1.2rem',
                    borderRadius: '1rem',
                    border: 'none',
                    background: 'var(--color-primary)',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(124, 58, 237, 0.4)'
                }}>
                    {editingAccount ? 'Guardar Cambios' : 'Crear Cuenta'}
                </button>
            </div>
        </form>
    );
};

export default AccountForm;
