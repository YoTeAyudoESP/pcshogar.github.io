import React, { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';

const RecurringExpenseForm: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
    const { addRecurringExpense, categories } = useFinance();
    const expenseCategories = categories.filter(c => c.type === 'expense');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState(expenseCategories[0]?.id || '');
    const [paymentDay, setPaymentDay] = useState('1');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description || !amount || !addRecurringExpense) return;

        await addRecurringExpense({
            description,
            amount: parseFloat(amount),
            currency: 'EUR',
            frequency: 'monthly',
            paymentDay: parseInt(paymentDay),
            categoryId,
            active: true,
            sourceAccountId: ''
        });

        setDescription('');
        setAmount('');
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
        <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: 'var(--space-md)' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--hue-danger)' }}>Nuevo Gasto Fijo</h3>

            <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Concepto</label>
                <input style={inputStyle} value={description} onChange={e => setDescription(e.target.value)} placeholder="ej. Alquiler, Netflix" required />
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Monto Mensual</label>
                <input type="number" step="0.01" style={inputStyle} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Categoría</label>
                    <select style={inputStyle} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                        {expenseCategories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
                <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Día de Pago</label>
                    <input type="number" min="1" max="31" style={inputStyle} value={paymentDay} onChange={e => setPaymentDay(e.target.value)} required />
                </div>
            </div>

            <button type="submit" style={{
                width: '100%',
                padding: '1rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'linear-gradient(135deg, var(--hue-danger), #ff6b6b)',
                color: 'white',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: 'pointer'
            }}>
                Guardar Gasto Fijo
            </button>
        </form>
    );
};

export default RecurringExpenseForm;
