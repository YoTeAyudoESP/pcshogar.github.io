
import React, { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { DEFAULT_CATEGORIES } from '../../types/finance';

const ExpenseForm: React.FC = () => {
    const { addExpense, accounts, cards, categories } = useFinance();
    const expenseCategories = categories.filter(c => c.type === 'expense');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState(expenseCategories[0]?.id || '');
    const [paymentMethodType, setPaymentMethodType] = useState<'account' | 'card' | 'cash'>('account');
    const [selectedMethodId, setSelectedMethodId] = useState(''); // accountId or cardId

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description || !amount) return;

        let paymentMethod: any;
        if (paymentMethodType === 'account') {
            if (!selectedMethodId) return; // Must select account
            paymentMethod = { type: 'account', accountId: selectedMethodId };
        } else if (paymentMethodType === 'card') {
            if (!selectedMethodId) return; // Must select card
            paymentMethod = { type: 'card', cardId: selectedMethodId };
        } else {
            paymentMethod = { type: 'cash' };
        }

        await addExpense({
            description,
            amount: parseFloat(amount),
            currency: 'EUR',
            date: Date.now(),
            categoryId,
            paymentMethod,
            isFixed: false, // For now manual expenses are not fixed
            status: 'paid' // Assumed paid immediately for manual entry
        });

        setDescription('');
        setAmount('');
        // Keep category and payment method preference
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
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 2 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Concepto</label>
                    <input style={inputStyle} value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej. Supermercado" required />
                </div>
                <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Importe (€)</label>
                    <input type="number" step="0.01" style={inputStyle} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Categoría</label>
                    <select style={inputStyle} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                        {expenseCategories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
                <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Método Pago</label>
                    <select style={inputStyle} value={paymentMethodType} onChange={e => {
                        setPaymentMethodType(e.target.value as any);
                        setSelectedMethodId('');
                    }}>
                        <option value="account">Cuenta Bancaria</option>
                        <option value="card">Tarjeta</option>
                        <option value="cash">Efectivo</option>
                    </select>
                </div>
            </div>

            {/* Dynamic Selector for Account/Card */}
            {paymentMethodType !== 'cash' && (
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        {paymentMethodType === 'account' ? 'Seleccionar Cuenta' : 'Seleccionar Tarjeta'}
                    </label>
                    <select style={inputStyle} value={selectedMethodId} onChange={e => setSelectedMethodId(e.target.value)} required>
                        <option value="">Seleccione...</option>
                        {paymentMethodType === 'account'
                            ? accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.balance}€)</option>)
                            : cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                        }
                    </select>
                </div>
            )}

            <button type="submit" style={{
                marginTop: '0.5rem',
                padding: '1rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'var(--hue-danger)',
                color: 'white',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: 'pointer'
            }}>
                Añadir Gasto
            </button>
        </form>
    );
};

export default ExpenseForm;

