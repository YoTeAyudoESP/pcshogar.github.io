import React, { useState, useEffect } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import type { Expense, Category, PaymentMethod, CreditCard } from '../../types/finance';
import type { Income } from '../../types/income';
import { X, Calendar, Info } from 'lucide-react';
import { predictSettlementDate, formatMoney } from '../../utils/financeCalculations';

interface EditTransactionModalProps {
    transaction: Expense | Income;
    type: 'expense' | 'income';
    onClose: () => void;
}

const EditTransactionModal: React.FC<EditTransactionModalProps> = ({ transaction, type, onClose }) => {
    const { updateIncome, updateExpense, accounts, cards, categories, savings } = useFinance();
    
    // Common fields
    const [description, setDescription] = useState(type === 'expense' ? (transaction as Expense).description : (transaction as Income).name);
    const [amount, setAmount] = useState(transaction.amount.toString());
    const [categoryId, setCategoryId] = useState(transaction.categoryId || '');
    const [date, setDate] = useState(() => {
        const tx = transaction as any;
        const val = tx.date || tx.effectiveDate || tx.receivedDate || tx.createdAt || Date.now();
        return new Date(val).toISOString().split('T')[0];
    });
    
    // Expense specific fields
    const [paymentMethodType, setPaymentMethodType] = useState<'account' | 'card' | 'cash'>(
        type === 'expense' ? (transaction as Expense).paymentMethod.type : 'account'
    );
    const [selectedMethodId, setSelectedMethodId] = useState(() => {
        if (type !== 'expense') return '';
        const method = (transaction as Expense).paymentMethod;
        if (method.type === 'card') return method.cardId;
        if (method.type === 'account') return method.accountId;
        return '';
    });
    const [settlementAdjustment, setSettlementAdjustment] = useState<number>(
        type === 'expense' ? ((transaction as Expense).paymentMethod as any).settlementAdjustment || 0 : 0
    );
    const [status, setStatus] = useState<'paid' | 'pending'>(
        type === 'expense' ? (transaction as Expense).status : 'paid'
    );
    const [isFinancedByHucha, setIsFinancedByHucha] = useState(
        type === 'expense' ? !!(transaction as Expense).linkedSavingGoalId : false
    );
    const [selectedHuchaId, setSelectedHuchaId] = useState(
        type === 'expense' ? (transaction as Expense).linkedSavingGoalId || '' : ''
    );

    const expenseCategories = categories
        .filter(c => c.type === 'expense')
        .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    const incomeCategories = categories
        .filter(c => c.type === 'income')
        .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (type === 'expense') {
                let paymentMethod: PaymentMethod;
                if (paymentMethodType === 'account') {
                    paymentMethod = { type: 'account', accountId: selectedMethodId, settlementAdjustment: 0 };
                } else if (paymentMethodType === 'card') {
                    paymentMethod = { type: 'card', cardId: selectedMethodId, settlementAdjustment };
                } else {
                    paymentMethod = { type: 'cash' };
                }

                // Check if settlement-related fields changed to un-settle if needed
                const oldExpense = transaction as Expense;
                let isSettled = oldExpense.isSettled;
                
                const oldAdj = (oldExpense.paymentMethod as any).settlementAdjustment || 0;
                const oldCardId = oldExpense.paymentMethod.type === 'card' ? oldExpense.paymentMethod.cardId : '';
                
                if (isSettled && (
                    settlementAdjustment !== oldAdj || 
                    paymentMethodType !== oldExpense.paymentMethod.type ||
                    (paymentMethodType === 'card' && selectedMethodId !== oldCardId) ||
                    new Date(date).getTime() !== oldExpense.date ||
                    parseFloat(amount) !== oldExpense.amount
                )) {
                    isSettled = false;
                }

                const updated = {
                    ...transaction as Expense,
                    description,
                    amount: parseFloat(amount),
                    date: new Date(date).getTime(),
                    categoryId,
                    paymentMethod,
                    status,
                    isSettled,
                    linkedSavingGoalId: isFinancedByHucha ? selectedHuchaId : undefined,
                    updatedAt: Date.now()
                };
                await updateExpense(updated);
            } else {
                const updated = {
                    ...transaction as Income,
                    name: description,
                    amount: parseFloat(amount),
                    date: new Date(date).getTime(),
                    categoryId,
                    updatedAt: Date.now()
                };
                await updateIncome(updated);
            }
            onClose();
        } catch (err) {
            console.error(err);
            alert('Error al actualizar');
        }
    };

    const inputStyle: React.CSSProperties = {
        background: 'rgba(30, 32, 41, 0.8)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '0.8rem',
        color: 'white',
        width: '100%',
        fontSize: '1rem',
        outline: 'none',
        marginTop: '0.5rem'
    };

    const labelStyle: React.CSSProperties = {
        color: 'rgba(255,255,255,0.6)',
        fontSize: '0.9rem',
        fontWeight: 500
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container glass-panel" style={{ 
                padding: '2rem', 
                maxWidth: '500px', 
                width: '95%',
                maxHeight: '90vh',
                overflowY: 'auto'
            }} onClick={e => e.stopPropagation()}>
                <button 
                    onClick={onClose}
                    style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '8px', borderRadius: '50%' }}
                >
                    <X size={20} />
                </button>

                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '2rem', color: 'white' }}>
                    Editar {type === 'expense' ? 'Gasto' : 'Ingreso'}
                </h2>

                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 2 }}>
                            <label style={labelStyle}>Concepto</label>
                            <input style={inputStyle} value={description} onChange={e => setDescription(e.target.value)} required />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Importe (€)</label>
                            <input type="number" step="0.01" style={inputStyle} value={amount} onChange={e => setAmount(e.target.value)} required />
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
                                style={{ position: 'absolute', right: '1rem', top: '1.6rem', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} 
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Categoría</label>
                            <select style={inputStyle} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                                {(type === 'expense' ? expenseCategories : incomeCategories).map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        {type === 'expense' && (
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Método Pago</label>
                                <select style={inputStyle} value={paymentMethodType} onChange={e => {
                                    setPaymentMethodType(e.target.value as any);
                                    setSelectedMethodId('');
                                }}>
                                    <option value="account">Banco</option>
                                    <option value="card">Tarjeta</option>
                                    <option value="cash">Efectivo</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {type === 'expense' && (
                        <>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>Estado</label>
                                    <select style={inputStyle} value={status} onChange={e => setStatus(e.target.value as any)}>
                                        <option value="paid">Pagado ({paymentMethodType === 'account' ? 'Banco' : paymentMethodType === 'card' ? 'Tarjeta' : 'Efectivo'})</option>
                                        <option value="pending">Pendiente</option>
                                    </select>
                                </div>
                                {paymentMethodType === 'card' && selectedMethodId && cards.find(c => c.id === selectedMethodId)?.type !== 'virtual' && (
                                    <div style={{ flex: 1 }}>
                                        <label style={labelStyle}>Ajuste de Liquidación</label>
                                        <select 
                                            style={inputStyle} 
                                            value={settlementAdjustment} 
                                            onChange={e => setSettlementAdjustment(parseInt(e.target.value))}
                                        >
                                            <option value={-1}>Forzar Mes Anterior</option>
                                            <option value={0}>Mes Actual (Auto)</option>
                                            <option value={1}>Forzar Mes Siguiente</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            {paymentMethodType === 'card' && selectedMethodId && cards.find(c => c.id === selectedMethodId)?.type !== 'virtual' && (
                                <div style={{ 
                                    background: 'rgba(251, 191, 36, 0.05)', 
                                    border: '1px solid rgba(251, 191, 36, 0.15)',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    marginTop: '-0.5rem'
                                }}>
                                    <Info size={16} style={{ color: '#fbbf24' }} />
                                    <span style={{ fontSize: '0.85rem', color: '#fbbf24', fontWeight: 600 }}>
                                        Se liquidará aprox. el: {
                                            predictSettlementDate(
                                                cards.find(c => c.id === selectedMethodId) as CreditCard,
                                                new Date(date).getTime(),
                                                settlementAdjustment
                                            ).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
                                        }
                                    </span>
                                </div>
                            )}

                            {paymentMethodType !== 'cash' && (
                                <div>
                                    <label style={labelStyle}>
                                        {paymentMethodType === 'account' ? 'Seleccionar Cuenta' : 'Seleccionar Tarjeta'}
                                    </label>
                                    <select style={inputStyle} value={selectedMethodId} onChange={e => setSelectedMethodId(e.target.value)} required>
                                        <option value="">Seleccione...</option>
                                        {paymentMethodType === 'account'
                                            ? accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({formatMoney(acc.balance)})</option>)
                                            : cards.map(c => <option key={c.id} value={c.id}>{c.name} {c.type === 'virtual' ? `(${formatMoney(c.currentBalance)})` : ''}</option>)
                                        }
                                    </select>
                                </div>
                            )}

                            {/* Hucha Financing */}
                            <div style={{ 
                                background: 'rgba(99, 102, 241, 0.05)', 
                                padding: '1.25rem', 
                                borderRadius: '12px',
                                border: '1px solid rgba(99, 102, 241, 0.1)',
                                marginTop: '0.5rem'
                            }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', color: 'white', fontSize: '1rem', fontWeight: 600 }}>
                                    <input 
                                        type="checkbox" 
                                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#4f46e5' }}
                                        checked={isFinancedByHucha}
                                        onChange={e => setIsFinancedByHucha(e.target.checked)}
                                    />
                                    ¿Financiar con una hucha?
                                </label>
                                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: '6px', marginLeft: '30px' }}>
                                    Si se marca, el dinero se descontará del saldo de la hucha y no afectará al disponible del mes.
                                </p>
                                
                                {isFinancedByHucha && (
                                    <div style={{ marginTop: '1rem', marginLeft: '30px' }}>
                                        <label style={labelStyle}>Seleccionar Hucha</label>
                                        <select 
                                            style={{ ...inputStyle, background: 'rgba(0,0,0,0.2)' }} 
                                            value={selectedHuchaId} 
                                            onChange={e => setSelectedHuchaId(e.target.value)}
                                            required
                                        >
                                            <option value="">Seleccione Hucha...</option>
                                            {savings.map(h => (
                                                <option key={h.id} value={h.id}>{h.name} ({formatMoney(h.currentAmount)})</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    <button type="submit" style={{
                        width: '100%',
                        padding: '1.1rem',
                        borderRadius: '16px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '1.1rem',
                        cursor: 'pointer',
                        marginTop: '1rem',
                        boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                        transition: 'transform 0.1s'
                    }}>
                        Guardar Cambios
                    </button>
                </form>
            </div>
        </div>
    );
};

export default EditTransactionModal;
