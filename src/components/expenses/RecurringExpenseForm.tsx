import React, { useState, useEffect } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import type { RecurringExpense, Category, PaymentMethod } from '../../types/finance';
import { Save, X, Trash2, Landmark, Wallet, CreditCard, Tag, Calendar, History, AlertCircle } from 'lucide-react';

interface RecurringExpenseFormProps {
    editingExpense?: RecurringExpense;
    onClose: () => void;
    onNavigateToSettings?: (tab?: string) => void;
}

const RecurringExpenseForm: React.FC<RecurringExpenseFormProps> = ({ editingExpense, onClose, onNavigateToSettings }) => {
    const { addRecurringExpense, updateRecurringExpense, accounts, cards, categories, loans } = useFinance();
    const expenseCategories = categories
        .filter(c => c.type === 'expense')
        .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    
    const [description, setDescription] = useState(editingExpense?.description || '');
    const [amount, setAmount] = useState(editingExpense?.amount?.toString() || '');
    const [currency, setCurrency] = useState(editingExpense?.currency || 'EUR');
    const [frequency, setFrequency] = useState<any>(editingExpense?.frequency || 'monthly');
    const [paymentDay, setPaymentDay] = useState(editingExpense?.paymentDay?.toString() || '1');
    const [paymentMonth, setPaymentMonth] = useState(editingExpense?.paymentMonth?.toString() || '1');
    const [categoryId, setCategoryId] = useState(editingExpense?.categoryId || expenseCategories[0]?.id || '');
    
    // Payment Method State
    const [pmType, setPmType] = useState<'account' | 'card' | 'cash'>(
        editingExpense?.paymentMethod?.type || 'account'
    );
    const [pmId, setPmId] = useState(
        editingExpense?.paymentMethod?.type === 'account' ? editingExpense.paymentMethod.accountId :
        editingExpense?.paymentMethod?.type === 'card' ? editingExpense.paymentMethod.cardId : ''
    );

    const hasNoAccounts = accounts.length === 0;
    const hasNoLoans = (loans || []).filter(l => l.status === 'active' && !(l.isPaid || (l.currentDebt ?? 0) <= 0)).length === 0;
    const showLoansWarning = categoryId === 'cat_loans' && hasNoLoans;
    const isFormBlocked = hasNoAccounts || showLoansWarning;

    useEffect(() => {
        const handleBack = (e: Event) => {
            e.preventDefault();
            const isDirty = description !== '' || amount !== '' || frequency !== 'monthly' || paymentDay !== '1';
            if (!editingExpense && isDirty) {
                if (window.confirm('Tienes cambios sin guardar. ¿Deseas descartarlos y volver?')) {
                    onClose();
                }
            } else if (editingExpense) {
                const isModified = description !== editingExpense.description ||
                    amount !== (editingExpense.amount?.toString() || '') ||
                    frequency !== editingExpense.frequency ||
                    paymentDay !== (editingExpense.paymentDay?.toString() || '1') ||
                    paymentMonth !== (editingExpense.paymentMonth?.toString() || '1') ||
                    categoryId !== (editingExpense.categoryId || '') ||
                    pmType !== (editingExpense.paymentMethod?.type || 'account') ||
                    (pmType === 'account' && pmId !== (editingExpense.paymentMethod as any).accountId) ||
                    (pmType === 'card' && pmId !== (editingExpense.paymentMethod as any).cardId);
                if (isModified) {
                    if (window.confirm('Tienes cambios sin guardar. ¿Deseas descartarlos y volver?')) {
                        onClose();
                    }
                } else {
                    onClose();
                }
            } else {
                onClose();
            }
        };

        document.addEventListener('app-back-pressed', handleBack);
        return () => document.removeEventListener('app-back-pressed', handleBack);
    }, [description, amount, frequency, paymentDay, paymentMonth, categoryId, pmType, pmId, editingExpense, onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description || !amount || isFormBlocked) return;

        let paymentMethod: PaymentMethod = { type: 'cash' };
        if (pmType === 'account') {
            paymentMethod = { type: 'account', accountId: pmId };
        } else if (pmType === 'card') {
            paymentMethod = { type: 'card', cardId: pmId };
        }

        const expenseData = {
            description,
            amount: parseFloat(amount),
            currency: currency as any,
            frequency: frequency as any,
            paymentDay: parseInt(paymentDay) || 1,
            paymentMonth: (frequency !== 'monthly' && frequency !== 'weekly') ? parseInt(paymentMonth) : undefined,
            active: true,
            categoryId,
            paymentMethod,
            updatedAt: Date.now(),
            createdAt: editingExpense?.createdAt || Date.now(),
            ignoredPeriods: editingExpense?.ignoredPeriods || []
        };

        if (editingExpense) {
            await updateRecurringExpense({ ...editingExpense, ...expenseData });
        } else {
            await addRecurringExpense(expenseData as any);
        }
        onClose();
    };

    const inputStyle = {
        background: 'rgba(25, 27, 34, 0.4)',
        border: '1px solid var(--panel-bg-3)',
        borderRadius: '0.75rem',
        padding: '0.875rem',
        color: 'var(--text-main)',
        width: '100%',
        fontSize: '1rem',
        outline: 'none',
        transition: 'border-color 0.2s'
    };

    const labelStyle = {
        display: 'block',
        marginBottom: '0.65rem',
        fontSize: '0.9rem',
        color: 'rgba(var(--color-rgb-light), 0.7)',
        fontWeight: 500
    };

    const containerStyle = {
        marginBottom: '1.25rem'
    };

    return (
        <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '1.75rem', animation: 'slideDown 0.3s ease-out', maxWidth: '500px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
                    {editingExpense ? 'Editar Gasto Fijo' : 'Añadir Gasto Fijo'}
                </h3>
                <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(var(--color-rgb-light), 0.4)', cursor: 'pointer' }}>
                    <X size={24} />
                </button>
            </div>

            {hasNoAccounts && (
                <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '12px',
                    padding: '1rem',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.75rem',
                    textAlign: 'center'
                }}>
                    <span style={{ fontSize: '0.85rem', color: '#f87171', fontWeight: 600 }}>
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
                            color: 'var(--text-main)',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Crear Cuenta / Monedero
                    </button>
                </div>
            )}

            {!hasNoAccounts && showLoansWarning && (
                <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '12px',
                    padding: '1rem',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.75rem',
                    textAlign: 'center'
                }}>
                    <span style={{ fontSize: '0.85rem', color: '#f87171', fontWeight: 600 }}>
                        ⚠️ No tienes préstamos creados en la app. Para mayor comodidad, crea primero el Préstamo en Ajustes y este Gasto Fijo se configurará automáticamente.
                    </span>
                    <button
                        type="button"
                        onClick={() => {
                            if (onNavigateToSettings) onNavigateToSettings('loans');
                            onClose();
                        }}
                        style={{
                            background: '#ef4444',
                            color: 'var(--text-main)',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Crear Préstamo
                    </button>
                </div>
            )}

            {/* Concepto */}
            <div style={containerStyle}>
                <label style={labelStyle}>Concepto</label>
                <input 
                    style={inputStyle} 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    placeholder="ej. Alquiler, Seguros" 
                    required 
                />
            </div>

            {/* Monto y Frecuencia */}
            <div style={{ display: 'flex', gap: '1rem', ...containerStyle }}>
                <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Monto</label>
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
                <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Frecuencia</label>
                    <select 
                        style={{ ...inputStyle, appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'rgba(var(--color-rgb-light),0.4)\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center' }} 
                        value={frequency} 
                        onChange={e => setFrequency(e.target.value as any)}
                    >
                        <option value="monthly">Mensual</option>
                        <option value="weekly">Semanal</option>
                        <option value="bi-monthly">Bimensual (cada 2 meses)</option>
                        <option value="quarterly">Trimestral (cada 3 meses)</option>
                        <option value="four-monthly">Cuatrimestral (cada 4 meses)</option>
                        <option value="five-monthly">Cada 5 meses</option>
                        <option value="semi-annually">Semestral (cada 6 meses)</option>
                        <option value="seven-monthly">Cada 7 meses</option>
                        <option value="eight-monthly">Cada 8 meses</option>
                        <option value="nine-monthly">Cada 9 meses</option>
                        <option value="ten-monthly">Cada 10 meses</option>
                        <option value="eleven-monthly">Cada 11 meses</option>
                        <option value="yearly">Anual</option>
                    </select>
                </div>
            </div>

            {/* Día y Mes de Pago */}
            <div style={{ display: 'flex', gap: '1rem', ...containerStyle }}>
                <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Día de Pago</label>
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
                {(frequency !== 'monthly' && frequency !== 'weekly') && (
                    <div style={{ flex: 1 }}>
                        <label style={labelStyle}>Mes de Referencia</label>
                        <select 
                            style={{ ...inputStyle, appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'rgba(var(--color-rgb-light),0.4)\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center' }} 
                            value={paymentMonth} 
                            onChange={e => setPaymentMonth(e.target.value)}
                        >
                            <option value="1">Enero</option>
                            <option value="2">Febrero</option>
                            <option value="3">Marzo</option>
                            <option value="4">Abril</option>
                            <option value="5">Mayo</option>
                            <option value="6">Junio</option>
                            <option value="7">Julio</option>
                            <option value="8">Agosto</option>
                            <option value="9">Septiembre</option>
                            <option value="10">Octubre</option>
                            <option value="11">Noviembre</option>
                            <option value="12">Diciembre</option>
                        </select>
                    </div>
                )}
            </div>

            {/* Categoría */}
            <div style={containerStyle}>
                <label style={labelStyle}>Categoría</label>
                <select 
                    style={{ ...inputStyle, appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'rgba(var(--color-rgb-light),0.4)\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center' }} 
                    value={categoryId} 
                    onChange={e => setCategoryId(e.target.value)}
                >
                    {expenseCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
            </div>

            {/* Método de Pago */}
            <div style={{ ...containerStyle, padding: '1rem', background: 'var(--panel-bg-1)', borderRadius: '1rem', border: '1px solid var(--panel-bg-2)' }}>
                <label style={labelStyle}>Método de Pago</label>
                
                <select 
                    style={{ ...inputStyle, marginBottom: '0.75rem', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'rgba(var(--color-rgb-light),0.4)\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center' }} 
                    value={pmType} 
                    onChange={e => {
                        setPmType(e.target.value as any);
                        setPmId('');
                    }}
                >
                    <option value="account">Cuenta Bancaria</option>
                    <option value="card">Tarjeta de Crédito</option>
                    <option value="cash">Efectivo</option>
                </select>

                {pmType !== 'cash' && (
                    <select 
                        style={{ ...inputStyle, appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'rgba(var(--color-rgb-light),0.4)\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center' }} 
                        value={pmId} 
                        onChange={e => setPmId(e.target.value)}
                        required
                    >
                        <option value="">Seleccionar...</option>
                        {pmType === 'account' ? (
                            accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name} ({acc.balance.toFixed(2)} €)</option>
                            ))
                        ) : (
                            cards.map(card => (
                                <option key={card.id} value={card.id}>{card.name} (Límite: {card.limit} €)</option>
                            ))
                        )}
                    </select>
                )}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={onClose} style={{
                    flex: 1,
                    padding: '1.15rem',
                    borderRadius: '0.75rem',
                    border: '1px solid var(--panel-bg-3)',
                    background: 'var(--panel-bg-2)',
                    color: 'var(--text-main)',
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    cursor: 'pointer'
                }}>
                    Cancelar
                </button>
                <button type="submit" disabled={isFormBlocked} style={{
                    flex: 2,
                    padding: '1.15rem',
                    borderRadius: '0.75rem',
                    border: 'none',
                    background: isFormBlocked ? '#3e3f4b' : '#6366f1',
                    color: isFormBlocked ? 'rgba(var(--color-rgb-light),0.3)' : 'var(--text-main)',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    cursor: isFormBlocked ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: isFormBlocked ? 'none' : '0 8px 25px rgba(99, 102, 241, 0.3)'
                }}>
                    {editingExpense ? <Save size={20} /> : null}
                    {editingExpense ? 'Actualizar Gasto' : 'Añadir Gasto Fijo'}
                </button>
            </div>
        </form>
    );
};

export default RecurringExpenseForm;
