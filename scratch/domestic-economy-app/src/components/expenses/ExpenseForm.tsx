import React, { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { useLanguage } from '../../contexts/LanguageContext';
import type { Expense } from '../../types/finance';

const ExpenseForm: React.FC<{ expenseToEdit?: Expense, onClose?: () => void }> = ({ expenseToEdit, onClose }) => {
    const { addExpense, updateExpense, accounts, cards, savings, categories } = useFinance();
    const { t } = useLanguage();
    const [description, setDescription] = useState(expenseToEdit?.description || '');
    const [amount, setAmount] = useState(expenseToEdit?.amount.toString() || '');
    const [categoryId, setCategoryId] = useState(expenseToEdit?.categoryId || (categories.length > 0 ? categories[0].id : ''));
    const [paymentMethodType, setPaymentMethodType] = useState<'account' | 'card' | 'cash'>(expenseToEdit?.paymentMethod.type || 'account');
    const [selectedMethodId, setSelectedMethodId] = useState(
        expenseToEdit?.paymentMethod.type === 'account' ? expenseToEdit.paymentMethod.accountId :
            expenseToEdit?.paymentMethod.type === 'card' ? expenseToEdit.paymentMethod.cardId : ''
    );
    const [selectedDate, setSelectedDate] = useState(
        expenseToEdit?.date
            ? new Date(expenseToEdit.date).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]
    );

    const [status, setStatus] = useState<'pending' | 'paid'>(expenseToEdit?.status || 'paid');
    const [settlementAdjustment, setSettlementAdjustment] = useState<number>(
        (expenseToEdit?.paymentMethod.type === 'card' ? expenseToEdit.paymentMethod.settlementAdjustment : 0) || 0
    );
    const [linkedSavingGoalId, setLinkedSavingGoalId] = useState(expenseToEdit?.linkedSavingGoalId || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description || !amount || !selectedDate || isSubmitting) return;

        setIsSubmitting(true);
        try {
            let paymentMethod: any;
            if (paymentMethodType === 'account') {
                if (!selectedMethodId) return; // Must select account
                paymentMethod = { type: 'account', accountId: selectedMethodId };
            } else if (paymentMethodType === 'card') {
                if (!selectedMethodId) return; // Must select card
                paymentMethod = {
                    type: 'card',
                    cardId: selectedMethodId,
                    settlementAdjustment
                };
            } else {
                paymentMethod = { type: 'cash' };
            }

            const expenseData = {
                description,
                amount: Math.round(parseFloat(amount) * 100) / 100,
                currency: 'EUR' as const,
                date: new Date(selectedDate).getTime(),
                categoryId,
                paymentMethod,
                isFixed: expenseToEdit?.isFixed || false,
                status,
                linkedSavingGoalId: linkedSavingGoalId || undefined
            };

            if (expenseToEdit) {
                await updateExpense({
                    ...expenseToEdit,
                    ...expenseData
                });
            } else {
                await addExpense(expenseData);
            }

            setDescription('');
            setAmount('');
            // Keep current date or reset? Let's keep it for convenience or reset to today. 
            // Resetting to today is safer.
            setSelectedDate(new Date().toISOString().split('T')[0]);
            if (onClose) onClose();
        } catch (error) {
            console.error("Error submitting expense:", error);
            alert("Error al guardar el gasto. Inténtelo de nuevo.");
        } finally {
            setIsSubmitting(false);
        }
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

            {/* Date Selection */}
            <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Fecha</label>
                <input type="date" style={inputStyle} value={selectedDate} onChange={e => setSelectedDate(e.target.value)} required />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Categoría</label>
                    <select style={inputStyle} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                        {categories.map(cat => (
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

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Estado</label>
                    <select style={inputStyle} value={status} onChange={e => setStatus(e.target.value as any)}>
                        <option value="paid">{parseFloat(amount) < 0 ? 'Recibido (Efectivo)' : 'Pagado (Efectivo)'}</option>
                        <option value="pending">{parseFloat(amount) < 0 ? 'Pendiente de cobro' : 'Pendiente de pago'}</option>
                    </select>
                </div>
                {paymentMethodType === 'card' && (
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            {t('dashboard.settlementAdjustment')}
                        </label>
                        <select
                            style={inputStyle}
                            value={settlementAdjustment}
                            onChange={e => setSettlementAdjustment(parseInt(e.target.value))}
                        >
                            <option value={0}>{t('dashboard.adjAuto')}</option>
                            <option value={-1}>{t('dashboard.adjPrevious')}</option>
                            <option value={1}>{t('dashboard.adjNext')}</option>
                        </select>
                    </div>
                )}
            </div>

            {paymentMethodType === 'account' && (
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Seleccionar Cuenta
                    </label>
                    <select style={inputStyle} value={selectedMethodId} onChange={e => setSelectedMethodId(e.target.value)} required>
                        <option value="">Seleccione...</option>
                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                </div>
            )}

            {paymentMethodType === 'card' && (
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Seleccionar Tarjeta
                    </label>
                    <select style={inputStyle} value={selectedMethodId} onChange={e => setSelectedMethodId(e.target.value)} required>
                        <option value="">Seleccione...</option>
                        {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            )}

            <div style={{ padding: '1rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-main)', fontWeight: 500 }}>
                    <input
                        type="checkbox"
                        checked={!!linkedSavingGoalId}
                        onChange={(e) => setLinkedSavingGoalId(e.target.checked ? (savings[0]?.id || '') : '')}
                        style={{ width: '18px', height: '18px' }}
                    />
                    ¿Financiar con una hucha?
                </label>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem', marginLeft: '1.7rem' }}>
                    Si se marca, el dinero se descontará del saldo de la hucha y no afectará al disponible del mes.
                </p>

                {linkedSavingGoalId && (
                    <div style={{ marginTop: '1rem', marginLeft: '1.7rem' }}>
                        <select
                            style={{ ...inputStyle, marginBottom: 0 }}
                            value={linkedSavingGoalId}
                            onChange={e => setLinkedSavingGoalId(e.target.value)}
                            required
                        >
                            <option value="">Seleccionar hucha...</option>
                            {savings.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.currentAmount.toLocaleString('es-ES')} €)</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary" style={{
                marginTop: '0.5rem',
                padding: '1rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: isSubmitting ? 'var(--text-muted)' : 'var(--btn-primary-bg)',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}>
                {isSubmitting ? 'Guardando...' : (expenseToEdit ? 'Guardar Cambios' : (parseFloat(amount) < 0 ? 'Añadir Devolución' : 'Añadir Gasto'))}
            </button>
        </form>
    );
};

export default ExpenseForm;
