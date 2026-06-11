
import React, { useState, useEffect } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { X, Calendar, Info } from 'lucide-react';
import { predictSettlementDate, formatMoney } from '../../utils/financeCalculations';
import type { CreditCard } from '../../types/finance';

interface ExpenseFormProps {
    onClose: () => void;
    isRefund?: boolean;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onClose, isRefund = false }) => {
    const { addExpense, accounts, cards, categories, savings } = useFinance();
    const expenseCategories = categories
        .filter(c => c.type === 'expense')
        .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [categoryId, setCategoryId] = useState('');
    const [paymentMethodType, setPaymentMethodType] = useState<'account' | 'card' | 'cash'>('account');
    const [selectedMethodId, setSelectedMethodId] = useState('');
    const [status, setStatus] = useState<'paid' | 'pending'>('paid');
    const [isFinancedByHucha, setIsFinancedByHucha] = useState(false);
    const [selectedHuchas, setSelectedHuchas] = useState<Record<string, boolean>>({});
    const [savingGoalFunding, setSavingGoalFunding] = useState<Record<string, string>>({});
    const [settlementAdjustment, setSettlementAdjustment] = useState<number>(0);

    useEffect(() => {
        if (!categoryId && expenseCategories.length > 0) {
            setCategoryId(expenseCategories[0].id);
        }
    }, [expenseCategories, categoryId]);

    const expenseTotal = parseFloat(amount) || 0;

    const totalAllocated = Object.entries(savingGoalFunding)
        .filter(([id]) => selectedHuchas[id])
        .reduce((sum, [_, val]) => sum + (parseFloat(val) || 0), 0);

    const hasBalanceError = savings.some(h => 
        selectedHuchas[h.id] && (parseFloat(savingGoalFunding[h.id]) || 0) > Math.max(0, h.currentAmount)
    );

    const hasNegativeError = Object.entries(savingGoalFunding)
        .some(([id, val]) => selectedHuchas[id] && (parseFloat(val) || 0) < 0);

    const isFundingInvalid = isFinancedByHucha && (
        totalAllocated > expenseTotal ||
        totalAllocated <= 0 ||
        hasBalanceError ||
        hasNegativeError
    );

    const handleAutofill = (goalId: string, availableAmount: number) => {
        // Calculate total allocated except this hucha
        const otherAllocated = Object.entries(savingGoalFunding)
            .filter(([id]) => id !== goalId && selectedHuchas[id])
            .reduce((sum, [_, val]) => sum + (parseFloat(val) || 0), 0);
        
        const remaining = Math.max(0, expenseTotal - otherAllocated);
        const toAlloc = Math.min(availableAmount, remaining);
        
        // Set checked to true
        setSelectedHuchas(prev => ({ ...prev, [goalId]: true }));
        // Update funding amount
        setSavingGoalFunding(prev => ({ ...prev, [goalId]: toAlloc.toFixed(2) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description || !amount || isFundingInvalid) return;

        let paymentMethod: any;
        if (paymentMethodType === 'account') {
            if (!selectedMethodId) return;
            paymentMethod = { type: 'account', accountId: selectedMethodId };
        } else if (paymentMethodType === 'card') {
            if (!selectedMethodId) return;
            paymentMethod = { type: 'card', cardId: selectedMethodId, settlementAdjustment };
        } else {
            paymentMethod = { type: 'cash' };
        }

        const parsedAmount = parseFloat(amount);
        const finalAmount = isRefund ? -Math.abs(parsedAmount) : parsedAmount;

        let finalDescription = description.trim();
        if (isRefund && !finalDescription.toLowerCase().startsWith('devolución')) {
            finalDescription = `Devolución: ${finalDescription}`;
        }

        const fundingList = isFinancedByHucha
            ? Object.entries(savingGoalFunding)
                .filter(([id, val]) => selectedHuchas[id] && parseFloat(val) > 0)
                .map(([id, val]) => ({ goalId: id, amount: parseFloat(val) }))
            : undefined;

        await addExpense({
            description: finalDescription,
            amount: finalAmount,
            currency: 'EUR',
            date: new Date(date).getTime(),
            categoryId,
            paymentMethod,
            isFixed: false,
            status,
            savingGoalFunding: fundingList
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

                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', margin: '0 0 1.5rem 0' }}>
                    {isRefund ? 'Nueva Devolución' : 'Nuevo Gasto'}
                </h2>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* Rows */}
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 2 }}>
                            <label style={labelStyle}>Concepto</label>
                            <input 
                                style={inputStyle} 
                                value={description} 
                                onChange={e => setDescription(e.target.value)} 
                                placeholder={isRefund ? "Ej. Amazon (Zapatillas)" : "Ej. Supermercado"} 
                                required 
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>{isRefund ? 'Importe Devolución (€)' : 'Importe (€)'}</label>
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

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Estado</label>
                            <select 
                                style={inputStyle} 
                                value={status} 
                                onChange={e => setStatus(e.target.value as any)}
                            >
                                <option value="paid">
                                    {isRefund 
                                        ? `Recibida (${paymentMethodType === 'account' ? 'Banco' : paymentMethodType === 'card' ? 'Tarjeta' : 'Efectivo'})`
                                        : `Pagado (${paymentMethodType === 'account' ? 'Banco' : paymentMethodType === 'card' ? 'Tarjeta' : 'Efectivo'})`
                                    }
                                </option>
                                <option value="pending">{isRefund ? 'Pendiente de recibir' : 'Pendiente'}</option>
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
                    {!isRefund && (
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
                                ¿Financiar con huchas?
                            </label>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginTop: '8px', marginLeft: '32px' }}>
                                Si se marca, el dinero se descontará del saldo de la/s hucha/s seleccionada/s y no afectará al disponible del mes.
                            </p>
                            
                            {isFinancedByHucha && (
                                <div style={{ marginTop: '1rem', marginLeft: '32px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <label style={labelStyle}>Seleccionar Huchas y asignar importes</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                                        {savings.length === 0 ? (
                                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>No tienes huchas creadas.</p>
                                        ) : (
                                            savings.map(h => {
                                                const isChecked = !!selectedHuchas[h.id];
                                                const available = Math.max(0, h.currentAmount);
                                                return (
                                                    <div key={h.id} style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        gap: '0.75rem',
                                                        background: isChecked ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255,255,255,0.02)',
                                                        padding: '0.5rem 0.75rem',
                                                        borderRadius: '8px',
                                                        border: isChecked ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                                                        transition: 'all 0.2s'
                                                    }}>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1, margin: 0 }}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={isChecked}
                                                                onChange={e => {
                                                                    setSelectedHuchas(prev => ({ ...prev, [h.id]: e.target.checked }));
                                                                    if (!e.target.checked) {
                                                                        setSavingGoalFunding(prev => ({ ...prev, [h.id]: '' }));
                                                                    }
                                                                }}
                                                                style={{ accentColor: '#4f46e5', width: '16px', height: '16px' }}
                                                            />
                                                            <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: 500 }}>{h.name}</span>
                                                        </label>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                                                                Dispon.: {formatMoney(available)}
                                                            </span>
                                                            {isChecked && (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                    <input 
                                                                        type="number"
                                                                        step="0.01"
                                                                        placeholder="0.00"
                                                                        value={savingGoalFunding[h.id] || ''}
                                                                        onChange={e => setSavingGoalFunding(prev => ({ ...prev, [h.id]: e.target.value }))}
                                                                        style={{
                                                                            background: '#12141c',
                                                                            border: '1px solid rgba(255,255,255,0.1)',
                                                                            borderRadius: '4px',
                                                                            padding: '4px 8px',
                                                                            color: 'white',
                                                                            width: '80px',
                                                                            fontSize: '0.85rem',
                                                                            outline: 'none'
                                                                        }}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleAutofill(h.id, available)}
                                                                        style={{
                                                                            background: '#4f46e5',
                                                                            border: 'none',
                                                                            borderRadius: '4px',
                                                                            padding: '4px 8px',
                                                                            color: 'white',
                                                                            fontSize: '0.75rem',
                                                                            cursor: 'pointer',
                                                                            fontWeight: 600
                                                                        }}
                                                                    >
                                                                        Máx
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                    {isFinancedByHucha && (
                                        <div style={{ 
                                            background: 'rgba(99, 102, 241, 0.08)', 
                                            border: '1px solid rgba(99, 102, 241, 0.2)',
                                            padding: '0.75rem 1rem',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px',
                                            marginTop: '0.75rem'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Info size={16} style={{ color: '#818cf8' }} />
                                                <span style={{ fontSize: '0.85rem', color: '#818cf8', fontWeight: 600 }}>
                                                    Resumen de Financiación
                                                </span>
                                            </div>
                                            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginLeft: '1.5rem' }}>
                                                {totalAllocated > expenseTotal ? (
                                                    <span style={{ color: '#ef4444', fontWeight: 600 }}>
                                                        La cantidad financiada ({formatMoney(totalAllocated)}) no puede superar el total del gasto ({formatMoney(expenseTotal)}).
                                                    </span>
                                                ) : hasBalanceError ? (
                                                    <span style={{ color: '#ef4444', fontWeight: 600 }}>
                                                        Una o más asignaciones superan el saldo disponible de la hucha.
                                                    </span>
                                                ) : hasNegativeError ? (
                                                    <span style={{ color: '#ef4444', fontWeight: 600 }}>
                                                        Las cantidades asignadas no pueden ser negativas.
                                                    </span>
                                                ) : (
                                                    <>
                                                        Se financiarán <strong>{formatMoney(totalAllocated)}</strong> con huchas. 
                                                        {expenseTotal - totalAllocated > 0 ? (
                                                            <> El resto (<strong>{formatMoney(expenseTotal - totalAllocated)}</strong>) se descontará del disponible mensual.</>
                                                        ) : (
                                                            <> Se financiará el 100% del gasto con las huchas.</>
                                                        )}
                                                    </>
                                                )}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <button type="submit" disabled={isFundingInvalid} style={{
                        marginTop: '1rem',
                        padding: '1.2rem',
                        borderRadius: '12px',
                        border: 'none',
                        background: isFundingInvalid ? '#3e3f4b' : (isRefund ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' : '#4f46e5'),
                        color: isFundingInvalid ? 'rgba(255,255,255,0.3)' : 'white',
                        fontWeight: 700,
                        fontSize: '1.1rem',
                        cursor: isFundingInvalid ? 'not-allowed' : 'pointer',
                        transition: 'background 0.2s',
                        boxShadow: isFundingInvalid ? 'none' : (isRefund ? '0 4px 15px rgba(14, 165, 233, 0.3)' : 'none')
                    }}>
                        {isRefund ? 'Añadir Devolución' : 'Añadir Gasto'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ExpenseForm;
