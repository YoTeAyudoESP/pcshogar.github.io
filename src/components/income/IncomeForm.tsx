
import React, { useState, useEffect } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { X, Calendar, Clock, TrendingUp, HelpCircle, PlusCircle, PiggyBank } from 'lucide-react';
import type { Income, FixedIncome, ExtraIncome, Frequency } from '../../types/income';
import { formatMoney } from '../../utils/financeCalculations';

interface IncomeFormProps {
    onClose: () => void;
    initialData?: Income;
}

const IncomeForm: React.FC<IncomeFormProps> = ({ onClose, initialData }) => {
    const { addFixedIncome, addExtraIncome, updateIncome, accounts, categories, savings, allocateSavings } = useFinance();
    const incomeCategories = categories
        .filter(c => c.type === 'income')
        .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    const isEditing = !!initialData;

    const [type, setType] = useState<'fixed' | 'extra'>(initialData?.type === 'fixed' ? 'fixed' : 'extra');
    const [name, setName] = useState(initialData?.name || '');
    const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
    const [currency, setCurrency] = useState(initialData?.currency || 'EUR');
    const [status, setStatus] = useState<'pending' | 'received'>(initialData?.status || 'pending');

    // Temporal
    const [budgetMonth, setBudgetMonth] = useState<number>(initialData?.budgetMonth ?? new Date().getMonth());
    const [budgetYear, setBudgetYear] = useState<number>(initialData?.budgetYear ?? new Date().getFullYear());

    // Fixed specific
    const [frequency, setFrequency] = useState<Frequency>((initialData as FixedIncome)?.frequency || 'monthly');
    const [expirationDate, setExpirationDate] = useState((initialData as FixedIncome)?.expirationDate ? new Date((initialData as FixedIncome).expirationDate!).toISOString().split('T')[0] : '');
    const [paymentDay, setPaymentDay] = useState((initialData as FixedIncome)?.paymentDay?.toString() || '1');

    // Extra specific
    const [receivedDate, setReceivedDate] = useState((initialData as ExtraIncome)?.receivedDate ? new Date((initialData as ExtraIncome).receivedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    const [categoryId, setCategoryId] = useState(initialData?.categoryId || '');

    // Saving
    const [targetSavingGoalId, setTargetSavingGoalId] = useState('');

    // Common
    const [linkedAccountId, setLinkedAccountId] = useState(initialData?.linkedAccountId || '');
    const [effectiveDate, setEffectiveDate] = useState(initialData?.effectiveDate ? new Date(initialData.effectiveDate).toISOString().split('T')[0] : '');

    useEffect(() => {
        if (!categoryId && incomeCategories.length > 0 && !isEditing) {
            setCategoryId(incomeCategories[0].id);
        }
    }, [incomeCategories, categoryId, isEditing]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !amount) return;

        const incomeAmount = parseFloat(amount);
        const commonData = {
            name,
            amount: incomeAmount,
            currency,
            linkedAccountId,
            status,
            budgetMonth,
            budgetYear,
            effectiveDate: effectiveDate ? new Date(effectiveDate).getTime() : undefined,
        };

        if (isEditing) {
            const updatedIncome = {
                ...initialData,
                ...commonData,
                type,
                ...(type === 'fixed' ? {
                    frequency,
                    expirationDate: expirationDate ? new Date(expirationDate).getTime() : undefined,
                    paymentDay: parseInt(paymentDay) || 1,
                } : {
                    receivedDate: new Date(receivedDate).getTime(),
                    categoryId,
                })
            } as Income;
            await updateIncome(updatedIncome);
        } else {
            if (type === 'fixed') {
                await addFixedIncome({
                    ...commonData,
                    frequency,
                    expirationDate: expirationDate ? new Date(expirationDate).getTime() : undefined,
                    paymentDay: parseInt(paymentDay) || 1,
                    active: true,
                });
            } else {
                await addExtraIncome({
                    ...commonData,
                    receivedDate: new Date(receivedDate).getTime(),
                    categoryId,
                    notes: '',
                });
            }
        }

        // Handle savings transfer if requested
        if (status === 'received' && targetSavingGoalId && linkedAccountId) {
            await allocateSavings(targetSavingGoalId, linkedAccountId, incomeAmount);
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
        marginTop: '0.4rem'
    };

    const labelStyle: React.CSSProperties = {
        color: 'rgba(255,255,255,0.5)',
        fontSize: '0.85rem',
        fontWeight: 600
    };

    const toggleButtonStyle = (active: boolean, color: string = '#10b981'): React.CSSProperties => ({
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

    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear, currentYear + 1];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" style={{ padding: '2rem', maxWidth: '650px' }} onClick={e => e.stopPropagation()}>
                
                <button onClick={onClose} style={{
                    position: 'absolute', top: '1.5rem', right: '1.5rem',
                    background: 'rgba(255,255,255,0.05)', border: 'none',
                    color: 'white', padding: '8px', borderRadius: '50%', cursor: 'pointer'
                }}>
                    <X size={20} />
                </button>

                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '1.5rem', color: 'white', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', color: '#10b981' }}>
                        <PlusCircle size={24} />
                    </div>
                    {isEditing ? 'Editar Ingreso' : 'Nuevo Ingreso Superior'}
                </h2>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    
                    {/* Status & Type */}
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Estado</label>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                                <button type="button" onClick={() => setStatus('pending')} style={toggleButtonStyle(status === 'pending', '#fbbf24')}>
                                    Pendiente
                                </button>
                                <button type="button" onClick={() => setStatus('received')} style={toggleButtonStyle(status === 'received', '#10b981')}>
                                    Recibido
                                </button>
                            </div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Tipo de Ingreso</label>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                                <button type="button" onClick={() => setType('fixed')} style={toggleButtonStyle(type === 'fixed', '#818cf8')}>
                                    Fijo
                                </button>
                                <button type="button" onClick={() => setType('extra')} style={toggleButtonStyle(type === 'extra', '#d946ef')}>
                                    Extra
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Common Fields */}
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 2 }}>
                            <label style={labelStyle}>Concepto / Fuente</label>
                            <input 
                                style={inputStyle} value={name} onChange={e => setName(e.target.value)} 
                                placeholder="Ej. Nómina Abril, Venta Wallapop" required 
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Importe (€)</label>
                            <input 
                                type="number" step="0.01" style={inputStyle} value={amount} 
                                onChange={e => setAmount(e.target.value)} placeholder="0.00" required 
                            />
                        </div>
                    </div>

                    {/* Budget Period */}
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Mes de Presupuesto</label>
                            <select style={inputStyle} value={budgetMonth} onChange={e => setBudgetMonth(parseInt(e.target.value))}>
                                {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Año de Presupuesto</label>
                            <select style={inputStyle} value={budgetYear} onChange={e => setBudgetYear(parseInt(e.target.value))}>
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>

                    {type === 'fixed' ? (
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Frecuencia</label>
                                <select style={inputStyle} value={frequency} onChange={e => setFrequency(e.target.value as Frequency)}>
                                    <option value="weekly">Semanal</option>
                                    <option value="monthly">Mensual</option>
                                    <option value="yearly">Anual</option>
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Día de Cobro</label>
                                <input type="number" min="1" max="31" style={inputStyle} value={paymentDay} onChange={e => setPaymentDay(e.target.value)} required />
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Categoría</label>
                                <select style={inputStyle} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                                    {incomeCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Fecha de Operación</label>
                                <input type="date" style={inputStyle} value={receivedDate} onChange={e => setReceivedDate(e.target.value)} required />
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Banco / Método de Cobro</label>
                            <select style={inputStyle} value={linkedAccountId} onChange={e => setLinkedAccountId(e.target.value)}>
                                <option value="">Solo efectivo / Sin banco</option>
                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({formatMoney(acc.balance)})</option>)}
                            </select>
                        </div>
                        {status === 'received' && (
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Fecha de Cobro Real</label>
                                <input type="date" style={inputStyle} value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} />
                            </div>
                        )}
                    </div>

                    {status === 'received' && linkedAccountId && savings.length > 0 && (
                        <div style={{ 
                            background: 'rgba(129, 140, 248, 0.05)', padding: '1.2rem', 
                            borderRadius: '16px', border: '1px solid rgba(129, 140, 248, 0.2)',
                            marginTop: '0.5rem'
                        }}>
                            <label style={{ ...labelStyle, color: '#818cf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <PiggyBank size={16} />
                                Enviar directamente a Hucha
                            </label>
                            <select style={inputStyle} value={targetSavingGoalId} onChange={e => setTargetSavingGoalId(e.target.value)}>
                                <option value="">No ahorrar este ingreso</option>
                                {savings.map(goal => (
                                    <option key={goal.id} value={goal.id}>{goal.name} (Meta: {formatMoney(goal.targetAmount)})</option>
                                ))}
                            </select>
                            <small style={{ color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem', display: 'block' }}>
                                Al guardar, el dinero se descontará de la cuenta y se sumará a la hucha.
                            </small>
                        </div>
                    )}

                    <button type="submit" style={{
                        marginTop: '1rem', padding: '1.1rem', borderRadius: '14px', border: 'none',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white', fontWeight: 700, fontSize: '1.05rem', cursor: 'pointer',
                        boxShadow: '0 10px 20px -5px rgba(16, 185, 129, 0.4)',
                        transition: 'all 0.2s ease'
                    }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                       onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                        {isEditing ? 'Confirmar Cambios' : 'Guardar Ingreso Superior'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default IncomeForm;
