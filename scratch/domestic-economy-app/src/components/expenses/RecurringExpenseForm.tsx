import React, { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { useLanguage } from '../../contexts/LanguageContext';
import type { RecurringExpense } from '../../types/finance';

const RecurringExpenseForm: React.FC<{ expenseToEdit?: RecurringExpense, onClose?: () => void }> = ({ expenseToEdit, onClose }) => {
    const { addRecurringExpense, updateRecurringExpense, accounts, cards, categories } = useFinance();
    const { t } = useLanguage();
    const [description, setDescription] = useState(expenseToEdit?.description || '');
    const [amount, setAmount] = useState(expenseToEdit?.amount.toString() || '');
    const [paymentDay, setPaymentDay] = useState(expenseToEdit?.paymentDay.toString() || '1');
    const [frequency, setFrequency] = useState<RecurringExpense['frequency']>(expenseToEdit?.frequency || 'monthly');
    const [paymentMonth, setPaymentMonth] = useState(expenseToEdit?.paymentMonth !== undefined ? expenseToEdit.paymentMonth.toString() : '0');
    const [splitStartMonth, setSplitStartMonth] = useState(expenseToEdit?.splitStartMonth !== undefined ? expenseToEdit.splitStartMonth.toString() : '0');

    // Parse initial payment method
    const initialPaymentType = expenseToEdit?.paymentMethod?.type || 'account';
    const initialPaymentId =
        expenseToEdit?.paymentMethod?.type === 'account' ? expenseToEdit.paymentMethod.accountId :
            expenseToEdit?.paymentMethod?.type === 'card' ? expenseToEdit.paymentMethod.cardId : '';

    const [paymentMethodType, setPaymentMethodType] = useState<'account' | 'card' | 'cash'>(initialPaymentType);
    const [paymentMethodId, setPaymentMethodId] = useState(initialPaymentId);

    const [categoryId, setCategoryId] = useState(expenseToEdit?.categoryId || 'cat_other');

    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const paymentMethod: any = { type: paymentMethodType };
        if (paymentMethodType === 'account') paymentMethod.accountId = paymentMethodId;
        if (paymentMethodType === 'card') paymentMethod.cardId = paymentMethodId;

        const expenseData = {
            description,
            amount: parseFloat(amount),
            currency: 'EUR' as const,
            frequency,
            paymentDay: parseInt(paymentDay),
            paymentMonth: (frequency !== 'monthly' && frequency !== 'split-annual') ? parseInt(paymentMonth) : undefined,
            splitStartMonth: frequency === 'split-annual' ? parseInt(splitStartMonth) : undefined,
            active: true,
            paymentMethod,
            categoryId
        };

        if (expenseToEdit) {
            await updateRecurringExpense({
                ...expenseToEdit,
                ...expenseData
            });
        } else {
            await addRecurringExpense(expenseData);
        }

        setDescription('');
        setAmount('');
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
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--hue-danger)' }}>
                {expenseToEdit ? t('common.edit') : t('common.add')} {t('settings.tabs.recurring')}
            </h3>

            <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Concepto</label>
                <input style={inputStyle} value={description} onChange={e => setDescription(e.target.value)} placeholder="ej. Alquiler, Seguros" required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                        {frequency === 'split-annual' ? 'Cuota Mensual' : 'Monto'}
                    </label>
                    <input type="number" step="0.01" style={inputStyle} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Frecuencia</label>
                    <select style={inputStyle} value={frequency} onChange={e => setFrequency(e.target.value as any)}>
                        <option value="monthly">Mensual</option>
                        <option value="bi-monthly">Bimestral</option>
                        <option value="quarterly">Trimestral</option>
                        <option value="half-yearly">Semestral</option>
                        <option value="yearly">Anual</option>
                        <option value="split-annual">Anual (Repartido 3 meses)</option>
                    </select>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Día de Pago</label>
                    <input type="number" min="1" max="31" style={inputStyle} value={paymentDay} onChange={e => setPaymentDay(e.target.value)} required />
                </div>

                {frequency !== 'monthly' && frequency !== 'split-annual' && (
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Mes (Referencia)</label>
                        <select style={inputStyle} value={paymentMonth} onChange={e => setPaymentMonth(e.target.value)}>
                            {months.map((m, i) => (
                                <option key={i} value={i}>{m}</option>
                            ))}
                        </select>
                    </div>
                )}

                {frequency === 'split-annual' && (
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Mes de Inicio</label>
                        <select style={inputStyle} value={splitStartMonth} onChange={e => setSplitStartMonth(e.target.value)}>
                            {months.map((m, i) => (
                                <option key={i} value={i}>{m}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Categoría</label>
                <select style={inputStyle} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                    {categories.map((cat: any) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
            </div>
            <div>
            </div>

            {/* Payment Method Section */}
            <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Método de Pago</label>
                <div style={{
                    background: 'var(--bg-surface-elevated)',
                    border: 'var(--card-border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.75rem'
                }}>
                    <select
                        style={{
                            width: '100%',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-main)',
                            fontSize: '1rem',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                        value={paymentMethodType}
                        onChange={(e) => {
                            const newType = e.target.value as 'account' | 'card' | 'cash';
                            setPaymentMethodType(newType);
                            // Set default ID for new type selection
                            if (newType === 'account' && accounts.length > 0) setPaymentMethodId(accounts[0].id);
                            else if (newType === 'card' && cards.length > 0) setPaymentMethodId(cards[0].id);
                            else setPaymentMethodId('');
                        }}
                    >
                        <option value="account">Cuenta Bancaria</option>
                        <option value="card">Tarjeta de Crédito/Débito</option>
                        <option value="cash">Efectivo</option>
                    </select>

                    {paymentMethodType !== 'cash' && (
                        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: 'var(--card-border)' }}>
                            <select
                                style={{
                                    width: '100%',
                                    background: 'var(--bg-surface)',
                                    border: 'var(--card-border)',
                                    borderRadius: '4px',
                                    color: 'var(--text-main)',
                                    padding: '0.5rem'
                                }}
                                value={paymentMethodId}
                                onChange={(e) => setPaymentMethodId(e.target.value)}
                                required
                            >
                                <option value="">Seleccionar...</option>
                                {paymentMethodType === 'account' ? (
                                    accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.type === 'cash' ? '💵' : '🏦'} {acc.name}</option>
                                    ))
                                ) : (
                                    cards.map(card => (
                                        <option key={card.id} value={card.id}>💳 {card.name}</option>
                                    ))
                                )}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            <button type="submit" className="btn-primary" style={{
                width: '100%',
                padding: '1rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: 'pointer'
            }}>
                {expenseToEdit ? 'Guardar Cambios' : 'Guardar Gasto Fijo'}
            </button>
        </form>
    );
};

export default RecurringExpenseForm;
