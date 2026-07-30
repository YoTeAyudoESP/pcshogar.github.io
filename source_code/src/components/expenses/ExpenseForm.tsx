import React, { useState, useEffect } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { X, Calendar, Info, Clock, CheckCircle } from 'lucide-react';
import { predictSettlementDate, formatMoney } from '../../utils/financeCalculations';
import type { CreditCard } from '../../types/finance';
import FinanceCardModal from '../dashboard/FinanceCardModal';
import ModalPortal from '../common/ModalPortal';

interface ExpenseFormProps {
    onClose: () => void;
    isRefund?: boolean;
    onNavigateToSettings?: (tab?: string) => void;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onClose, isRefund = false, onNavigateToSettings }) => {
    const { addExpense, addRecurringExpense, accounts, cards, categories, savings } = useFinance();
    const expenseCategories = categories
        .filter(c => c.type === 'expense')
        .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    
    const [type, setType] = useState<'puntual' | 'fixed'>('puntual');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [categoryId, setCategoryId] = useState('');
    const [paymentMethodType, setPaymentMethodType] = useState<'account' | 'card' | 'cash'>('account');
    const [selectedMethodId, setSelectedMethodId] = useState('');
    const [status, setStatus] = useState<'paid' | 'pending'>('paid');
    const [showFinanceModal, setShowFinanceModal] = useState(false);
    
    // Fixed specific
    const [frequency, setFrequency] = useState<any>('monthly');
    const [paymentDay, setPaymentDay] = useState('1');

    // Huchas specific
    const [isFinancedByHucha, setIsFinancedByHucha] = useState(false);
    const [selectedHuchas, setSelectedHuchas] = useState<Record<string, boolean>>({});
    const [savingGoalFunding, setSavingGoalFunding] = useState<Record<string, string>>({});
    const [isHuchaConfigOpen, setIsHuchaConfigOpen] = useState(false);
    
    const [settlementAdjustment, setSettlementAdjustment] = useState<number>(0);

    useEffect(() => {
        if (!categoryId && expenseCategories.length > 0) {
            setCategoryId(expenseCategories[0].id);
        }
    }, [expenseCategories, categoryId]);

    useEffect(() => {
        if (paymentMethodType === 'account' && accounts.length === 1) {
            setSelectedMethodId(accounts[0].id);
        } else if (paymentMethodType === 'card' && cards.length === 1) {
            setSelectedMethodId(cards[0].id);
        } else if (paymentMethodType === 'cash') {
            const cashAccs = accounts.filter(a => a.type === 'cash');
            if (cashAccs.length === 1) {
                setSelectedMethodId(cashAccs[0].id);
            }
        }
    }, [paymentMethodType, accounts, cards]);

    const expenseTotal = parseFloat(amount) || 0;
    const hasNoAccounts = accounts.length === 0;

    const totalAllocated = Object.entries(savingGoalFunding)
        .filter(([id]) => selectedHuchas[id])
        .reduce((sum, [_, val]) => sum + (parseFloat(val) || 0), 0);

    const hasBalanceError = savings.some(h => 
        selectedHuchas[h.id] && (parseFloat(savingGoalFunding[h.id]) || 0) > Math.max(0, h.currentAmount)
    );

    const hasNegativeError = Object.entries(savingGoalFunding)
        .some(([id, val]) => selectedHuchas[id] && (parseFloat(val) || 0) < 0);

    const isFundingInvalid = type === 'puntual' && isFinancedByHucha && (
        totalAllocated > expenseTotal ||
        totalAllocated <= 0 ||
        hasBalanceError ||
        hasNegativeError
    );

    const handleAutofill = (goalId: string, availableAmount: number) => {
        const otherAllocated = Object.entries(savingGoalFunding)
            .filter(([id]) => id !== goalId && selectedHuchas[id])
            .reduce((sum, [_, val]) => sum + (parseFloat(val) || 0), 0);
        
        const remaining = Math.max(0, expenseTotal - otherAllocated);
        const toAlloc = Math.min(availableAmount, remaining);
        
        setSelectedHuchas(prev => ({ ...prev, [goalId]: true }));
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
        } else if (paymentMethodType === 'cash') {
            if (!selectedMethodId) return;
            paymentMethod = { type: 'cash', accountId: selectedMethodId };
        }

        const parsedAmount = parseFloat(amount);
        const finalAmount = isRefund ? -Math.abs(parsedAmount) : parsedAmount;

        let finalDescription = description.trim();
        if (isRefund && !finalDescription.toLowerCase().startsWith('devolución')) {
            finalDescription = `Devolución: ${finalDescription}`;
        }

        if (type === 'fixed' && !isRefund) {
            const recurringId = await addRecurringExpense({
                description: finalDescription,
                amount: finalAmount,
                currency: 'EUR',
                frequency,
                paymentDay: parseInt(paymentDay) || 1,
                active: true,
                categoryId,
                paymentMethod,
                sourceAccountId: paymentMethodType === 'account' ? selectedMethodId : undefined
            });

            if (status === 'paid') {
                const dateObj = new Date(date);
                const period = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
                
                await addExpense({
                    description: finalDescription,
                    amount: finalAmount,
                    currency: 'EUR',
                    date: dateObj.getTime(),
                    categoryId,
                    paymentMethod,
                    isFixed: true,
                    status: 'paid',
                    recurringExpenseId: recurringId,
                    period: period
                });
            }
        } else {
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
        }

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

    const toggleButtonStyle = (active: boolean, color: string = '#ef4444'): React.CSSProperties => ({
        flex: 1,
        padding: '0.8rem',
        borderRadius: '10px',
        border: active ? `1px solid ${color}` : '1px solid rgba(255,255,255,0.1)',
        background: active ? `${color}20` : 'rgba(255,255,255,0.03)',
        color: active ? color : 'rgba(255,255,255,0.4)',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'all 0.2s ease'
    });

    return (
        <>
        <ModalPortal><div className="modal-overlay" onClick={onClose}>
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

                {hasNoAccounts && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '12px',
                        padding: '1rem',
                        marginBottom: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.75rem',
                        textAlign: 'center'
                    }}>
                        <span style={{ fontSize: '0.9rem', color: '#f87171', fontWeight: 600 }}>
                            ⚠️ Debes crear al menos una Cuenta Bancaria o Monedero en Ajustes antes de poder registrar movimientos.
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                if (onNavigateToSettings) onNavigateToSettings('accounts');
                                onClose();
                            }}
                            style={{
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '0.5rem 1rem',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Crear Cuenta / Monedero
                        </button>
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {!isRefund && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                type="button"
                                onClick={() => setType('puntual')}
                                style={toggleButtonStyle(type === 'puntual', '#ef4444')}
                            >
                                <Clock size={18} /> Puntual
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('fixed')}
                                style={toggleButtonStyle(type === 'fixed', '#8b5cf6')}
                            >
                                <Calendar size={18} /> Fijo
                            </button>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            type="button"
                            onClick={() => setStatus('paid')}
                            style={toggleButtonStyle(status === 'paid', isRefund ? '#10b981' : '#ef4444')}
                        >
                            <CheckCircle size={18} /> {isRefund ? 'Recibida' : 'Pagado'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatus('pending')}
                            style={toggleButtonStyle(status === 'pending', '#f59e0b')}
                        >
                            <Clock size={18} /> {isRefund ? 'Pendiente de recibir' : 'Pendiente'}
                        </button>
                    </div>

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

                    {type === 'puntual' ? (
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
                    ) : (
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Frecuencia</label>
                                <select style={inputStyle} value={frequency} onChange={e => setFrequency(e.target.value)}>
                                    <option value="weekly">Semanal</option>
                                    <option value="monthly">Mensual</option>
                                    <option value="bi-monthly">Bimestral</option>
                                    <option value="quarterly">Trimestral</option>
                                    <option value="four-monthly">Cuatrimestral</option>
                                    <option value="semi-annually">Semestral</option>
                                    <option value="yearly">Anual</option>
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Día de cobro</label>
                                <input 
                                    type="number" 
                                    min="1" 
                                    max="31" 
                                    style={inputStyle} 
                                    value={paymentDay} 
                                    onChange={e => setPaymentDay(e.target.value)} 
                                    required 
                                />
                            </div>
                        </div>
                    )}

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

                    {type === 'puntual' && paymentMethodType === 'card' && selectedMethodId && cards.find(c => c.id === selectedMethodId)?.type !== 'virtual' && (
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

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={labelStyle}>
                            {paymentMethodType === 'account' ? 'Seleccionar Cuenta' : paymentMethodType === 'card' ? 'Seleccionar Tarjeta' : 'Seleccionar Cartera Efectivo'}
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {paymentMethodType === 'cash' && accounts.filter(a => a.type === 'cash').length === 0 ? (
                                <p style={{ color: '#ef4444', fontSize: '0.9rem', margin: 0, padding: '0.8rem 0' }}>
                                    No tienes carteras de efectivo. Crea una en Ajustes.
                                </p>
                            ) : (
                                <select style={{ ...inputStyle, flex: 1, marginTop: 0 }} value={selectedMethodId} onChange={e => setSelectedMethodId(e.target.value)} required>
                                    <option value="">Seleccione...</option>
                                    {paymentMethodType === 'account'
                                        ? accounts.filter(a => a.type === 'bank').map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({formatMoney(acc.balance)})</option>)
                                        : paymentMethodType === 'card'
                                            ? cards.map(c => <option key={c.id} value={c.id}>{c.name} {c.type === 'virtual' ? `(${formatMoney(c.currentBalance)})` : ''}</option>)
                                            : accounts.filter(a => a.type === 'cash').map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({formatMoney(acc.balance)})</option>)
                                    }
                                </select>
                            )}
                        </div>
                    </div>


                    {/* Hucha Financing (Only for Puntual) */}
                    {type === 'puntual' && !isRefund && (
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
                                    onChange={e => {
                                        const checked = e.target.checked;
                                        setIsFinancedByHucha(checked);
                                        if (checked) {
                                            setIsHuchaConfigOpen(true);
                                        } else {
                                            setSelectedHuchas({});
                                            setSavingGoalFunding({});
                                        }
                                    }}
                                />
                                ¿Financiar con huchas?
                            </label>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginTop: '8px', marginLeft: '32px' }}>
                                Si se marca, el dinero se descontará del saldo de la/s hucha/s seleccionada/s y no afectará al disponible del mes.
                            </p>
                            
                            {isFinancedByHucha && (
                                <div style={{ marginTop: '1rem', marginLeft: '32px' }}>
                                    <div style={{
                                        background: 'rgba(99, 102, 241, 0.08)',
                                        border: '1px solid rgba(99, 102, 241, 0.2)',
                                        padding: '1rem',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.75rem'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.9rem', color: '#818cf8', fontWeight: 600 }}>
                                                Financiación Configurada
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setIsHuchaConfigOpen(true)}
                                                style={{
                                                    background: '#4f46e5',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    padding: '6px 12px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 600,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Ajustar importes
                                            </button>
                                        </div>
                                        
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {Object.entries(savingGoalFunding)
                                                .filter(([id, val]) => selectedHuchas[id] && parseFloat(val) > 0)
                                                .map(([id, val]) => {
                                                    const h = savings.find(s => s.id === id);
                                                    return (
                                                        <div key={id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                                            <span style={{ color: 'rgba(255,255,255,0.7)' }}>{h ? h.name : 'Hucha'}</span>
                                                            <span style={{ color: 'white', fontWeight: 600 }}>{formatMoney(parseFloat(val))}</span>
                                                        </div>
                                                    );
                                                })}
                                            {totalAllocated === 0 && (
                                                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                                                    Ninguna hucha financia este gasto todavía. Pulsa en 'Ajustar importes'.
                                                </span>
                                            )}
                                        </div>

                                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Total financiado:</span>
                                            <span style={{ color: '#818cf8', fontWeight: 700 }}>{formatMoney(totalAllocated)} / {formatMoney(expenseTotal)}</span>
                                        </div>

                                        {isFundingInvalid && (
                                            <div style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600, marginTop: '4px' }}>
                                                {totalAllocated > expenseTotal ? (
                                                    <span>La cantidad financiada supera el total del gasto.</span>
                                                ) : hasBalanceError ? (
                                                    <span>Una o más asignaciones superan el saldo disponible de la hucha.</span>
                                                ) : hasNegativeError ? (
                                                    <span>Las cantidades asignadas no pueden ser negativas.</span>
                                                ) : totalAllocated <= 0 ? (
                                                    <span>El total financiado debe ser mayor que 0.</span>
                                                ) : null}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <button type="submit" disabled={isFundingInvalid || hasNoAccounts} style={{
                        marginTop: '1rem',
                        padding: '1.2rem',
                        borderRadius: '12px',
                        border: 'none',
                        background: (isFundingInvalid || hasNoAccounts) ? '#3e3f4b' : (isRefund ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' : '#ef4444'),
                        color: (isFundingInvalid || hasNoAccounts) ? 'rgba(255,255,255,0.3)' : 'white',
                        fontWeight: 700,
                        fontSize: '1.1rem',
                        cursor: (isFundingInvalid || hasNoAccounts) ? 'not-allowed' : 'pointer',
                        transition: 'background 0.2s',
                        boxShadow: (isFundingInvalid || hasNoAccounts) ? 'none' : (isRefund ? '0 4px 15px rgba(14, 165, 233, 0.3)' : '0 4px 15px rgba(239, 68, 68, 0.3)')
                    }}>
                        {isRefund ? 'Añadir Devolución' : (type === 'fixed' ? 'Añadir Gasto Fijo' : 'Añadir Gasto')}
                    </button>
                </form>
            </div>
        </div></ModalPortal>

        {/* Fullscreen config overlay modal for Huchas */}
        {isHuchaConfigOpen && (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(10, 11, 18, 0.95)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                zIndex: 2100,
                display: 'flex',
                flexDirection: 'column',
                padding: '1.5rem',
                paddingTop: 'calc(1.5rem + env(safe-area-inset-top, 24px))',
                paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 16px))',
                color: 'white',
                boxSizing: 'border-box'
            }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Financiación con Huchas</h3>
                        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                            Total Gasto: <strong style={{ color: 'white' }}>{formatMoney(expenseTotal)}</strong>
                        </div>
                    </div>
                    <button 
                        type="button" 
                        onClick={() => setIsHuchaConfigOpen(false)}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: 'none',
                            color: 'white',
                            padding: '8px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable list of saving goals */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '1rem' }}>
                    {savings.length === 0 ? (
                        <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: '2rem' }}>No tienes huchas creadas.</p>
                    ) : (
                        savings.map(h => {
                            const isChecked = !!selectedHuchas[h.id];
                            const available = Math.max(0, h.currentAmount);
                            return (
                                <div 
                                    key={h.id} 
                                    style={{
                                        background: isChecked ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255,255,255,0.03)',
                                        border: isChecked ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '14px',
                                        padding: '1rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '1rem',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', margin: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={isChecked}
                                                onChange={e => {
                                                    setSelectedHuchas(prev => ({ ...prev, [h.id]: e.target.checked }));
                                                    if (!e.target.checked) {
                                                        setSavingGoalFunding(prev => ({ ...prev, [h.id]: '' }));
                                                    }
                                                }}
                                                style={{ width: '22px', height: '22px', accentColor: '#6366f1', cursor: 'pointer' }}
                                            />
                                            <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'white' }}>{h.name}</span>
                                        </div>
                                        <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                                            Disponible: <span style={{ color: '#10b981' }}>{formatMoney(available)}</span>
                                        </span>
                                    </label>

                                    {isChecked && (
                                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                            <div style={{ position: 'relative', flex: 1 }}>
                                                <input 
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={savingGoalFunding[h.id] || ''}
                                                    onChange={e => setSavingGoalFunding(prev => ({ ...prev, [h.id]: e.target.value }))}
                                                    style={{
                                                        background: '#12141c',
                                                        border: '1px solid rgba(255,255,255,0.15)',
                                                        borderRadius: '8px',
                                                        padding: '12px 16px',
                                                        color: 'white',
                                                        width: '100%',
                                                        fontSize: '1.1rem',
                                                        outline: 'none',
                                                        boxSizing: 'border-box'
                                                    }}
                                                />
                                                <span style={{ position: 'absolute', right: '16px', top: '12px', color: 'rgba(255,255,255,0.4)', fontSize: '1.1rem' }}>€</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleAutofill(h.id, available)}
                                                style={{
                                                    background: '#6366f1',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    padding: '12px 20px',
                                                    color: 'white',
                                                    fontSize: '1rem',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    boxShadow: '0 4px 10px rgba(99,102,241,0.2)',
                                                    height: '48px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                Máx
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div style={{ 
                    borderTop: '1px solid rgba(255,255,255,0.1)', 
                    paddingTop: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    background: 'transparent'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)' }}>Total Asignado:</span>
                        <span style={{ 
                            fontSize: '1.25rem', 
                            fontWeight: 800, 
                            color: totalAllocated > expenseTotal || hasBalanceError || hasNegativeError ? '#ef4444' : '#818cf8' 
                        }}>
                            {formatMoney(totalAllocated)} / {formatMoney(expenseTotal)}
                        </span>
                    </div>

                    {(totalAllocated > expenseTotal || hasBalanceError || hasNegativeError) && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            color: '#f87171',
                            fontSize: '0.85rem',
                            fontWeight: 600
                        }}>
                            {totalAllocated > expenseTotal ? (
                                'La cantidad financiada no puede superar el total del gasto.'
                            ) : hasBalanceError ? (
                                'Una o más asignaciones superan el saldo disponible de la hucha.'
                            ) : hasNegativeError ? (
                                'Las cantidades no pueden ser negativas.'
                            ) : null}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => setIsHuchaConfigOpen(false)}
                        style={{
                            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '1rem',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '1.1rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
                            textAlign: 'center'
                        }}
                    >
                        Confirmar financiación
                    </button>
                </div>
            </div>
        )}
    </>
);
};

export default ExpenseForm;
