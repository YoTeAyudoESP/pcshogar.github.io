
import React, { useState, useEffect } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { X, Calendar } from 'lucide-react';

interface ExpenseFormProps {
    onClose: () => void;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onClose }) => {
    const { addExpense, accounts, cards, categories, savings } = useFinance();
    const expenseCategories = categories.filter(c => c.type === 'expense');
    
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [categoryId, setCategoryId] = useState('');
    const [paymentMethodType, setPaymentMethodType] = useState<'account' | 'card' | 'cash'>('account');
    const [selectedMethodId, setSelectedMethodId] = useState('');
    const [status, setStatus] = useState<'paid' | 'pending'>('paid');
    const [isFinancedByHucha, setIsFinancedByHucha] = useState(false);
    const [selectedHuchaId, setSelectedHuchaId] = useState('');

    useEffect(() => {
        if (!categoryId && expenseCategories.length > 0) {
            setCategoryId(expenseCategories[0].id);
        }
    }, [expenseCategories, categoryId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description || !amount) return;

        let paymentMethod: any;
        if (paymentMethodType === 'account') {
            if (!selectedMethodId) return;
            paymentMethod = { type: 'account', accountId: selectedMethodId };
        } else if (paymentMethodType === 'card') {
            if (!selectedMethodId) return;
            paymentMethod = { type: 'card', cardId: selectedMethodId };
        } else {
            paymentMethod = { type: 'cash' };
        }

        await addExpense({
            description,
            amount: parseFloat(amount),
            currency: 'EUR',
            date: new Date(date).getTime(),
            categoryId,
            paymentMethod,
            isFixed: false,
            status,
            linkedSavingGoalId: isFinancedByHucha ? selectedHuchaId : undefined
        });

        onClose();
    };

    const inputStyle: React.CSSProperties = {
        background: '#1e2029',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px',
        padding: '0.8rem',
        color: 'white',
        width: '100%',
        fontSize: '1rem',
        outline: 'none',
        marginTop: '0.5rem'
    };

    const labelStyle: React.CSSProperties = {
        color: 'rgba(255,255,255,0.5)',
        fontSize: '0.9rem',
        fontWeight: 500
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" style={{ padding: '2rem' }} onClick={e => e.stopPropagation()}>
                
                {/* Header with Close X */}
                <button onClick={onClose} style={{
                    position: 'absolute',
                    top: '1.5rem',
                    right: '1.5rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: 'none',
                    color: 'white',
                    padding: '8px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex'
                }}>
                    <X size={20} />
                </button>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* Rows */}
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 2 }}>
                            <label style={labelStyle}>Concepto</label>
                            <input 
                                style={inputStyle} 
                                value={description} 
                                onChange={e => setDescription(e.target.value)} 
                                placeholder="Ej. Supermercado" 
                                required 
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Importe (€)</label>
                            <input 
                                type="number" 
                                step="0.01" 
                                style={inputStyle} 
                                value={amount} 
                                onChange={e => setAmount(e.target.value)} 
                                placeholder="0.00" 
                                required 
                            />
                        </div>
                    </div>

                    <div>
                        <label style={labelStyle}>Fecha</label>
                        <div style={{ position: 'relative' }}>
                            <input 
                                type="date" 
                                style={{ ...inputStyle, paddingRight: '2.5rem' }} 
                                value={date} 
                                onChange={e => setDate(e.target.value)} 
                                required 
                            />
                            <Calendar 
                                size={18} 
                                style={{ position: 'absolute', right: '1rem', top: '1.3rem', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} 
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Categoría</label>
                            <select style={inputStyle} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                                {expenseCategories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Método Pago</label>
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

                    <div>
                        <label style={labelStyle}>Estado</label>
                        <select 
                            style={inputStyle} 
                            value={status} 
                            onChange={e => setStatus(e.target.value as any)}
                        >
                            <option value="paid">Pagado ({paymentMethodType === 'account' ? 'Banco' : paymentMethodType === 'card' ? 'Tarjeta' : 'Efectivo'})</option>
                            <option value="pending">Pendiente</option>
                        </select>
                    </div>

                    {paymentMethodType !== 'cash' && (
                        <div>
                            <label style={labelStyle}>
                                {paymentMethodType === 'account' ? 'Seleccionar Cuenta' : 'Seleccionar Tarjeta'}
                            </label>
                            <select style={inputStyle} value={selectedMethodId} onChange={e => setSelectedMethodId(e.target.value)} required>
                                <option value="">Seleccione...</option>
                                {paymentMethodType === 'account'
                                    ? accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.balance.toFixed(2)}€)</option>)
                                    : cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                                }
                            </select>
                        </div>
                    )}

                    {/* Hucha Financing */}
                    <div style={{ 
                        background: 'rgba(99, 102, 241, 0.05)', 
                        padding: '1.5rem', 
                        borderRadius: '12px',
                        border: '1px solid rgba(99, 102, 241, 0.1)',
                        marginTop: '0.5rem'
                    }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', color: 'white', fontSize: '1.1rem', fontWeight: 600 }}>
                            <input 
                                type="checkbox" 
                                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#4f46e5' }}
                                checked={isFinancedByHucha}
                                onChange={e => setIsFinancedByHucha(e.target.checked)}
                            />
                            ¿Financiar con una hucha?
                        </label>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginTop: '8px', marginLeft: '32px' }}>
                            Si se marca, el dinero se descontará del saldo de la hucha y no afectará al disponible del mes.
                        </p>
                        
                        {isFinancedByHucha && (
                            <div style={{ marginTop: '1rem', marginLeft: '32px' }}>
                                <label style={labelStyle}>Seleccionar Hucha</label>
                                <select 
                                    style={{ ...inputStyle, background: '#12141c' }} 
                                    value={selectedHuchaId} 
                                    onChange={e => setSelectedHuchaId(e.target.value)}
                                    required
                                >
                                    <option value="">Seleccione Hucha...</option>
                                    {savings.map(h => (
                                        <option key={h.id} value={h.id}>{h.name} ({h.currentAmount.toFixed(2)}€)</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <button type="submit" style={{
                        marginTop: '1rem',
                        padding: '1.2rem',
                        borderRadius: '12px',
                        border: 'none',
                        background: '#4f46e5',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '1.1rem',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                    }}>
                        Añadir Gasto
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ExpenseForm;
