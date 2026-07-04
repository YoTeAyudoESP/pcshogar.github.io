import React, { useState } from 'react';
import { useIncome } from '../../contexts/IncomeContext';
import { useFinance } from '../../contexts/FinanceContext';
import type { Frequency, Income } from '../../types/income';

const IncomeForm: React.FC<{ initialData?: Income | null, onClose?: () => void }> = ({ initialData, onClose }) => {
    const { addFixedIncome, addExtraIncome, updateIncome } = useIncome();
    const { accounts, categories, savings, allocateSavings } = useFinance();
    const incomeCategories = categories.filter(c => c.type === 'income');
    
    const [type, setType] = useState<'fixed' | 'extra'>(initialData?.type || 'fixed');
    const [name, setName] = useState(initialData?.name || '');
    const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
    const [currency, setCurrency] = useState(initialData?.currency || 'EUR');

    // Common fields
    const [status, setStatus] = useState<'pending' | 'received'>(initialData?.status || 'pending');
    const [linkedAccountId, setLinkedAccountId] = useState(initialData?.linkedAccountId || '');
    const [effectiveDate, setEffectiveDate] = useState(initialData?.effectiveDate ? new Date(initialData.effectiveDate).toISOString().split('T')[0] : '');
    const [budgetMonth, setBudgetMonth] = useState((initialData?.budgetMonth !== undefined ? initialData.budgetMonth : new Date().getMonth()).toString());
    const [budgetYear, setBudgetYear] = useState((initialData?.budgetYear !== undefined ? initialData.budgetYear : new Date().getFullYear()).toString());

    // Fixed specific
    const [frequency, setFrequency] = useState<Frequency>(initialData?.type === 'fixed' ? initialData.frequency : 'monthly');
    const [expirationDate, setExpirationDate] = useState(initialData?.type === 'fixed' && initialData.expirationDate ? new Date(initialData.expirationDate).toISOString().split('T')[0] : '');

    // Extra specific
    const [receivedDate, setReceivedDate] = useState(initialData?.type === 'extra' && initialData.receivedDate ? new Date(initialData.receivedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    const [categoryId, setCategoryId] = useState(initialData?.type === 'extra' ? initialData.categoryId : (incomeCategories[0]?.id || ''));
    
    // Savings allocation
    const [sendToHucha, setSendToHucha] = useState(false);
    const [targetHuchaId, setTargetHuchaId] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !amount) return;

        const incomeAmount = parseFloat(amount);
        const commonData = {
            name,
            amount: incomeAmount,
            currency,
            linkedAccountId: linkedAccountId || undefined,
            status,
            effectiveDate: effectiveDate ? new Date(effectiveDate).getTime() : undefined,
            budgetMonth: parseInt(budgetMonth),
            budgetYear: parseInt(budgetYear),
        };

        if (initialData) {
            // Update mode
            const updatedIncome: Income = type === 'fixed' 
                ? { ...initialData, ...commonData, type: 'fixed', frequency, expirationDate: expirationDate ? new Date(expirationDate).getTime() : undefined, active: (initialData as any).active }
                : { ...initialData, ...commonData, type: 'extra', receivedDate: new Date(receivedDate).getTime(), categoryId };
            
            await updateIncome(updatedIncome);
            
            // Handle Hucha allocation if it was marked as received and sendToHucha is active
            if (sendToHucha && targetHuchaId && status === 'received' && linkedAccountId) {
                await allocateSavings(targetHuchaId, linkedAccountId, incomeAmount);
            }
        } else {
            // Add mode
            if (type === 'fixed') {
                await addFixedIncome({
                    ...commonData,
                    frequency,
                    expirationDate: expirationDate ? new Date(expirationDate).getTime() : undefined,
                    active: true
                });
            } else {
                await addExtraIncome({
                    ...commonData,
                    receivedDate: new Date(receivedDate).getTime(),
                    categoryId,
                    notes: ''
                });
            }
            
            // Handle Hucha allocation for new income
            if (sendToHucha && targetHuchaId && status === 'received' && linkedAccountId) {
                // We need the ID of the newly created income, but addExtraIncome doesn't return it currently.
                // However, allocateSavings just needs the account and amount.
                await allocateSavings(targetHuchaId, linkedAccountId, incomeAmount);
            }
        }

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

    const labelStyle = {
        display: 'block',
        marginBottom: '0.5rem',
        color: 'var(--text-muted)',
        fontSize: '0.875rem'
    };

    return (
        <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: 'var(--space-md)' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>{initialData ? 'Editar' : 'Añadir Nuevo'} Ingreso</h3>

            {!initialData && (
                <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
                    <button
                        type="button"
                        onClick={() => setType('fixed')}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            border: 'none',
                            background: type === 'fixed' ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        Fijo
                    </button>
                    <button
                        type="button"
                        onClick={() => setType('extra')}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            border: 'none',
                            background: type === 'extra' ? 'var(--color-secondary)' : 'rgba(255,255,255,0.05)',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        Extra
                    </button>
                </div>
            )}

            <div>
                <label style={labelStyle}>Concepto</label>
                <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="ej. Salario, Dividendo, Venta Wallapop" required />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Monto</label>
                    <input type="number" step="0.01" style={inputStyle} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
                </div>
                <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Estado</label>
                    <select style={inputStyle} value={status} onChange={e => setStatus(e.target.value as any)}>
                        <option value="pending">Pendiente ⏳</option>
                        <option value="received">Recibido ✅</option>
                    </select>
                </div>
            </div>

            {type === 'fixed' ? (
                <>
                    <div>
                        <label style={labelStyle}>Frecuencia</label>
                        <select style={inputStyle} value={frequency} onChange={e => setFrequency(e.target.value as Frequency)}>
                            <option value="weekly">Semanal</option>
                            <option value="monthly">Mensual</option>
                            <option value="yearly">Anual</option>
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>Fecha de Expiración (Opcional)</label>
                        <input type="date" style={inputStyle} value={expirationDate} onChange={e => setExpirationDate(e.target.value)} />
                    </div>
                </>
            ) : (
                <>
                    <div>
                        <label style={labelStyle}>Fecha de Recepción</label>
                        <input type="date" style={inputStyle} value={receivedDate} onChange={e => setReceivedDate(e.target.value)} required />
                    </div>
                    <div>
                        <label style={labelStyle}>Categoría</label>
                        <select style={inputStyle} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                            {incomeCategories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                </>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                    <label style={labelStyle}>Banco / Método</label>
                    <select style={inputStyle} value={linkedAccountId} onChange={e => setLinkedAccountId(e.target.value)} >
                        <option value="">Seleccionar Cuenta...</option>
                        {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label style={labelStyle}>Fecha Efectiva (Cobro)</label>
                    <input type="date" style={inputStyle} value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} disabled={status === 'pending'} />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                    <label style={labelStyle}>Mes Presupuesto</label>
                    <select style={inputStyle} value={budgetMonth} onChange={e => setBudgetMonth(e.target.value)}>
                        {[...Array(12)].map((_, i) => (
                            <option key={i} value={i}>{new Date(0, i).toLocaleString('es-ES', { month: 'long' })}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label style={labelStyle}>Año Presupuesto</label>
                    <select style={inputStyle} value={budgetYear} onChange={e => setBudgetYear(e.target.value)}>
                        {[2024, 2025, 2026, 2027].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '0.75rem', marginBottom: '1rem', background: 'rgba(255,255,255,0.02)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input type="checkbox" checked={sendToHucha} onChange={e => setSendToHucha(e.target.checked)} />
                    Enviar este importe a una Hucha
                </label>
                {sendToHucha && (
                    <div style={{ marginTop: '0.75rem' }}>
                        <select style={{ ...inputStyle, marginBottom: 0 }} value={targetHuchaId} onChange={e => setTargetHuchaId(e.target.value)} required>
                            <option value="">Seleccionar Hucha...</option>
                            {savings.map(goal => (
                                <option key={goal.id} value={goal.id}>{goal.name} (Saldo: €{goal.currentAmount})</option>
                            ))}
                        </select>
                        <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                            El traspaso se realizará al marcar como "Recibido".
                        </small>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
                {initialData && (
                    <button type="button" onClick={onClose} style={{
                        flex: 1, padding: '1rem', marginTop: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'white', fontWeight: 600, fontSize: '1rem', cursor: 'pointer'
                    }}>Cancelar</button>
                )}
                <button type="submit" style={{
                    flex: 2,
                    padding: '1rem',
                    marginTop: '1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '1rem',
                    cursor: 'pointer'
                }}>
                    {initialData ? 'Guardar Cambios' : 'Añadir Ingreso'}
                </button>
            </div>
        </form>
    );
};

export default IncomeForm;
