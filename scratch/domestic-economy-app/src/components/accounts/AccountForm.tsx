import React, { useState, useEffect } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import type { Account } from '../../types/finance';

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

    useEffect(() => {
        if (editingAccount) {
            setName(editingAccount.name);
            setBalance(editingAccount.balance.toString());
            setType(editingAccount.type);
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
                type
            });
            if (onCancelEdit) onCancelEdit();
        } else {
            await addAccount(name, type, parseFloat(balance) || 0);
        }

        setName('');
        setBalance('');
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
        <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: 'var(--space-md)' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>{editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta'}</h3>

            <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
                {/* ... Type buttons ... */}
                <button type="button" onClick={() => setType('bank')} style={{ flex: 1, padding: '0.5rem', background: type === 'bank' ? 'var(--color-primary)' : 'var(--btn-ghost-bg)', border: 'none', borderRadius: 'var(--radius-sm)', color: type === 'bank' ? 'var(--btn-primary-text)' : 'var(--btn-ghost-text)' }}>Banco</button>
                <button type="button" onClick={() => setType('cash')} style={{ flex: 1, padding: '0.5rem', background: type === 'cash' ? 'var(--color-secondary)' : 'var(--btn-ghost-bg)', border: 'none', borderRadius: 'var(--radius-sm)', color: type === 'cash' ? 'var(--btn-secondary-text)' : 'var(--btn-ghost-text)' }}>Efectivo</button>
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Nombre</label>
                <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Main Bank" required />
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Saldo Actual</label>
                <input type="number" step="0.01" style={inputStyle} value={balance} onChange={e => setBalance(e.target.value)} placeholder="0.00" required />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
                {editingAccount && (
                    <button type="button" onClick={onCancelEdit} className="btn-icon" style={{
                        flex: 1, padding: '1rem', borderRadius: 'var(--radius-sm)', border: 'var(--card-border)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer'
                    }}>Cancelar</button>
                )}
                <button type="submit" className="btn-primary" style={{
                    flex: 2,
                    padding: '1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '1rem',
                    cursor: 'pointer'
                }}>
                    {editingAccount ? 'Guardar Cambios' : 'Crear Cuenta'}
                </button>
            </div>
        </form>
    );
};

export default AccountForm;
