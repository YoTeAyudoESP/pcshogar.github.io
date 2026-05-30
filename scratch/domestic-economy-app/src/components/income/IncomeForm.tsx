import React, { useState } from 'react';
import { useIncome } from '../../contexts/IncomeContext';
import { useFinance } from '../../contexts/FinanceContext';
import { type Frequency, type Income } from '../../types/income';

const IncomeForm: React.FC<{
    incomeToEdit?: Income,
    onClose?: () => void,
    initialType?: 'fixed' | 'extra',
    restrictedType?: 'fixed' | 'extra'
}> = ({ incomeToEdit, onClose, initialType, restrictedType }) => {
    const { addFixedIncome, addExtraIncome, updateIncome } = useIncome();
    const { accounts, refreshFinance, savings, incomeCategories } = useFinance();
    const [linkedSavingGoalId, setLinkedSavingGoalId] = useState(incomeToEdit?.linkedSavingGoalId || '');
    const [type, setType] = useState<'fixed' | 'extra'>((incomeToEdit?.type as 'fixed' | 'extra') || restrictedType || initialType || 'fixed');
    const [name, setName] = useState(incomeToEdit?.name || '');
    const [amount, setAmount] = useState(incomeToEdit?.amount.toString() || '');
    const [currency, setCurrency] = useState(incomeToEdit?.currency || 'EUR');

    // Fixed specific
    const [frequency, setFrequency] = useState<Frequency>(
        (incomeToEdit?.type === 'fixed' ? incomeToEdit.frequency : 'monthly') as Frequency
    );
    const [expirationDate, setExpirationDate] = useState(
        incomeToEdit?.type === 'fixed' && incomeToEdit.expirationDate
            ? new Date(incomeToEdit.expirationDate).toISOString().split('T')[0]
            : ''
    );

    // Extra specific
    const [receivedDate, setReceivedDate] = useState(
        incomeToEdit?.type === 'extra'
            ? new Date(incomeToEdit.receivedDate).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]
    );
    const [category, setCategory] = useState(
        incomeToEdit?.type === 'extra'
            ? incomeToEdit.category || (incomeCategories.length > 0 ? incomeCategories[0].id : '')
            : (incomeCategories.length > 0 ? incomeCategories[0].id : '')
    );

    const [linkedAccountId, setLinkedAccountId] = useState(incomeToEdit?.linkedAccountId || (accounts.length > 0 ? accounts[0].id : ''));

    // Status logic: 
    // If editing, use existing status. 
    // If new, default to 'received' (pending=false) unless user checks it? 
    // Or default 'pending' for fixed?
    // Let's stick to: Fixed -> pending (template), Extra -> received (usually).
    // User wants "Pending Income Feature" for Extra incomes too.
    const [pending, setPending] = useState(
        incomeToEdit ? incomeToEdit.status === 'pending' : (initialType === 'fixed')
    );

    const [useManualBudget, setUseManualBudget] = useState(incomeToEdit?.budgetMonth !== undefined);
    const [budgetMonth, setBudgetMonth] = useState(incomeToEdit?.budgetMonth || new Date().getMonth());
    const [budgetYear, setBudgetYear] = useState(incomeToEdit?.budgetYear || new Date().getFullYear());

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !amount) return;

        const finalStatus = pending ? 'pending' : 'received';
        // Effective Date: for confirmed extra income, use receivedDate. For pending, undefined? 
        // For Dashboard, we only care if received.
        const finalEffectiveDate = !pending
            ? (type === 'extra' ? new Date(receivedDate).getTime() : new Date().getTime())
            : undefined;

        if (incomeToEdit) {
            const updatedIncome: any = {
                ...incomeToEdit,
                name,
                amount: Math.round(parseFloat(amount) * 100) / 100,
                currency,
                linkedAccountId: linkedAccountId,
                effectiveDate: finalEffectiveDate,
                status: finalStatus,
                budgetMonth: useManualBudget ? budgetMonth : undefined,
                budgetYear: useManualBudget ? budgetYear : undefined
            };

            if (type === 'fixed') {
                updatedIncome.frequency = frequency;
                updatedIncome.expirationDate = expirationDate ? new Date(expirationDate).getTime() : undefined;
            } else {
                updatedIncome.receivedDate = new Date(receivedDate).getTime();
                updatedIncome.category = category;
            }

            await updateIncome(updatedIncome);
        } else {
            if (type === 'fixed') {
                await addFixedIncome({
                    name,
                    amount: Math.round(parseFloat(amount) * 100) / 100,
                    currency,
                    frequency,
                    expirationDate: expirationDate ? new Date(expirationDate).getTime() : undefined,
                    linkedAccountId,
                    active: true,
                    status: 'pending' // Fixed incomes always start as pending templates
                });
            } else {
                await addExtraIncome({
                    name,
                    amount: Math.round(parseFloat(amount) * 100) / 100,
                    currency,
                    receivedDate: new Date(receivedDate).getTime(),
                    category,
                    linkedAccountId,
                    effectiveDate: finalEffectiveDate,
                    notes: '',
                    status: finalStatus,
                    linkedSavingGoalId: linkedSavingGoalId || undefined
                });
            }
        }

        // Refresh finance context to update account balances
        await refreshFinance();

        // Reset form
        setName('');
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

    const labelStyle = {
        display: 'block',
        marginBottom: '0.5rem',
        color: 'var(--text-muted)',
        fontSize: '0.875rem'
    };

    return (
        <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: 'var(--space-md)' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>{incomeToEdit ? 'Editar Ingreso' : 'Añadir Nuevo Ingreso'}</h3>

            {!incomeToEdit && !restrictedType && (
                <div style={{ marginBottom: '2rem' }}>
                    <label style={{ ...labelStyle, textAlign: 'center', marginBottom: '1rem', fontSize: '1rem', display: 'block' }}>¿Qué tipo de ingreso quieres añadir?</label>
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                        <button
                            type="button"
                            onClick={() => setType('fixed')}
                            style={{
                                flex: 1,
                                padding: '1.25rem 1rem',
                                borderRadius: 'var(--radius-md)',
                                border: type === 'fixed' ? '2px solid var(--color-primary)' : 'var(--card-border)',
                                background: type === 'fixed' ? 'var(--btn-ghost-bg)' : 'transparent',
                                color: type === 'fixed' ? 'var(--text-main)' : 'var(--text-muted)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Ingreso Fijo</span>
                            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>(Nómina, Ayuda, Renta...)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('extra')}
                            style={{
                                flex: 1,
                                padding: '1.25rem 1rem',
                                borderRadius: 'var(--radius-md)',
                                border: type === 'extra' ? '2px solid var(--color-secondary)' : 'var(--card-border)',
                                background: type === 'extra' ? 'var(--btn-ghost-bg)' : 'transparent',
                                color: type === 'extra' ? 'var(--text-main)' : 'var(--text-muted)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Ingreso Extra</span>
                            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>(Regalo, Venta, Bonus...)</span>
                        </button>
                    </div>
                </div>
            )}

            <div>
                <label style={labelStyle}>Nombre / Fuente</label>
                <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="ej. Salario, Dividendo" required />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 2 }}>
                    <label style={labelStyle}>Monto</label>
                    <input type="number" step="0.01" style={inputStyle} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
                </div>
                <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Moneda</label>
                    <select style={inputStyle} value={currency} onChange={e => setCurrency(e.target.value)}>
                        <option value="EUR">€ EUR</option>
                        <option value="USD">$ USD</option>
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
                        <select style={inputStyle} value={category} onChange={e => setCategory(e.target.value)}>
                            {incomeCategories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                </>
            )}

            {(type === 'fixed' || !pending) && (
                <div>
                    <label style={labelStyle}>Cuenta o Efectivo (Destino)</label>
                    <select style={inputStyle} value={linkedAccountId} onChange={e => setLinkedAccountId(e.target.value)} required>
                        <option value="">Seleccionar Destino...</option>
                        {accounts.map((acc: any) => (
                            <option key={acc.id} value={acc.id}>
                                {acc.type === 'cash' ? '💵' : '🏦'} {acc.name} ({acc.currency})
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {type === 'extra' && (
                <>
                    <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: pending ? 'var(--hue-warning)' : 'var(--text-main)', fontWeight: pending ? 600 : 400 }}>
                            <input type="checkbox" checked={pending} onChange={e => setPending(e.target.checked)} />
                            Marcar como Pendiente (Dinero aún no recibido)
                        </label>

                        <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={useManualBudget} onChange={e => setUseManualBudget(e.target.checked)} />
                            Asignar liquidez a un mes específico
                        </label>
                        {useManualBudget && (
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                <select style={{ ...inputStyle, marginBottom: 0 }} value={budgetMonth} onChange={e => setBudgetMonth(parseInt(e.target.value))}>
                                    {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                                        <option key={i} value={i}>{m}</option>
                                    ))}
                                </select>
                                <input type="number" style={{ ...inputStyle, marginBottom: 0 }} value={budgetYear} onChange={e => setBudgetYear(parseInt(e.target.value))} />
                            </div>
                        )}
                    </div>

                    <div style={{ padding: '1rem', background: 'rgba(236, 72, 153, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(236, 72, 153, 0.2)', marginBottom: '1rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-main)', fontWeight: 500 }}>
                            <input
                                type="checkbox"
                                checked={!!linkedSavingGoalId}
                                onChange={(e) => setLinkedSavingGoalId(e.target.checked ? (savings[0]?.id || '') : '')}
                                style={{ width: '18px', height: '18px' }}
                            />
                            ¿Enviar directamente a una hucha?
                        </label>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem', marginLeft: '1.7rem' }}>
                            Si se marca, el dinero se sumará al saldo de la hucha y no aparecerá en el "Disponible" del mes.
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
                </>
            )}

            <button type="submit" className="btn-primary" style={{
                width: '100%',
                padding: '1rem',
                marginTop: '1rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: 'pointer'
            }}>
                {incomeToEdit ? 'Guardar Cambios' : 'Añadir Ingreso'}
            </button>
        </form>
    );
};

export default IncomeForm;
