import React, { useState, useEffect } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import type { FixedIncome, Frequency } from '../../types/income';
import { Save, X, Plus, Calendar, Tag, Landmark, Wallet, Coins, Clock4, CalendarRange } from 'lucide-react';

interface FixedIncomeFormProps {
    editingIncome?: FixedIncome;
    onClose: () => void;
}

const FixedIncomeForm: React.FC<FixedIncomeFormProps> = ({ editingIncome, onClose }) => {
    const { addFixedIncome, updateIncome, accounts } = useFinance();
    const [name, setName] = useState(editingIncome?.name || '');
    const [amount, setAmount] = useState(editingIncome?.amount?.toString() || '');
    const [currency, setCurrency] = useState(editingIncome?.currency || 'EUR');
    const [frequency, setFrequency] = useState<Frequency>(editingIncome?.frequency || 'monthly');
    const [expirationDate, setExpirationDate] = useState(editingIncome?.expirationDate ? new Date(editingIncome.expirationDate).toISOString().split('T')[0] : '');
    const [paymentDay, setPaymentDay] = useState(editingIncome?.paymentDay?.toString() || '1');
    const [paymentMonth, setPaymentMonth] = useState(editingIncome?.paymentMonth?.toString() || '1');
    const [accountId, setAccountId] = useState(editingIncome?.linkedAccountId || '');

    useEffect(() => {
        const handleBack = (e: Event) => {
            e.preventDefault();
            const isDirty = name !== '' || amount !== '' || frequency !== 'monthly' || paymentDay !== '1' || accountId !== '';
            if (!editingIncome && isDirty) {
                if (window.confirm('Tienes cambios sin guardar. ¿Deseas descartarlos y volver?')) {
                    onClose();
                }
            } else if (editingIncome) {
                const isModified = name !== editingIncome.name ||
                    amount !== (editingIncome.amount?.toString() || '') ||
                    frequency !== editingIncome.frequency ||
                    paymentDay !== (editingIncome.paymentDay?.toString() || '1') ||
                    paymentMonth !== (editingIncome.paymentMonth?.toString() || '1') ||
                    accountId !== (editingIncome.linkedAccountId || '');
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

        window.addEventListener('app-back-pressed', handleBack);
        return () => window.removeEventListener('app-back-pressed', handleBack);
    }, [name, amount, frequency, paymentDay, paymentMonth, accountId, editingIncome, onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !amount) return;

        const incomeData = {
            name,
            amount: parseFloat(amount),
            currency,
            frequency,
            paymentDay: parseInt(paymentDay) || 1,
            paymentMonth: (frequency !== 'monthly' && frequency !== 'weekly') ? parseInt(paymentMonth) : undefined,
            active: true,
            linkedAccountId: accountId || undefined,
            status: 'pending' as const,
            type: 'fixed' as const,
            expirationDate: expirationDate ? new Date(expirationDate).getTime() : undefined,
            createdAt: editingIncome?.createdAt || Date.now()
        };

        if (editingIncome) {
            await updateIncome({ ...editingIncome, ...incomeData, updatedAt: Date.now() } as any);
        } else {
            await addFixedIncome(incomeData as any);
        }
        onClose();
    };

    const inputStyle = {
        background: 'rgba(25, 27, 34, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '0.75rem',
        padding: '0.875rem',
        color: 'white',
        width: '100%',
        fontSize: '1rem',
        outline: 'none',
        transition: 'border-color 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
    };

    const labelStyle = {
        display: 'block',
        marginBottom: '0.65rem',
        fontSize: '0.9rem',
        color: 'rgba(255, 255, 255, 0.7)',
        fontWeight: 500
    };

    const containerStyle = {
        marginBottom: '1.25rem'
    };

    return (
        <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '1.75rem', animation: 'slideDown 0.3s ease-out', maxWidth: '500px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
                    {editingIncome ? 'Editar Ingreso Fijo' : 'Añadir Nuevo Ingreso'}
                </h3>
                <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255, 255, 255, 0.4)', cursor: 'pointer' }}>
                    <X size={24} />
                </button>
            </div>

            {/* Nombre / Fuente */}
            <div style={containerStyle}>
                <label style={labelStyle}>Nombre / Fuente</label>
                <div style={{ position: 'relative' }}>
                    <input 
                        style={inputStyle} 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        placeholder="ej. Salario, Dividendo" 
                        required 
                    />
                </div>
            </div>

            {/* Monto y Moneda */}
            <div style={{ display: 'flex', gap: '1rem', ...containerStyle }}>
                <div style={{ flex: 2 }}>
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
                    <label style={labelStyle}>Moneda</label>
                    <select 
                        style={{ ...inputStyle, appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'rgba(255,255,255,0.4)\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center' }} 
                        value={currency} 
                        onChange={e => setCurrency(e.target.value)}
                    >
                        <option value="EUR">€ EUR</option>
                        <option value="USD">$ USD</option>
                        <option value="GBP">£ GBP</option>
                    </select>
                </div>
            </div>

            {/* Frecuencia y Día de Cobro */}
            <div style={{ display: 'flex', gap: '1rem', ...containerStyle }}>
                <div style={{ flex: 2 }}>
                    <label style={labelStyle}>Frecuencia</label>
                    <select 
                        style={{ ...inputStyle, appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'rgba(255,255,255,0.4)\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center' }} 
                        value={frequency} 
                        onChange={e => setFrequency(e.target.value as Frequency)}
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
                <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Día</label>
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

            {/* Mes de Pago si aplica */}
            {(frequency !== 'monthly' && frequency !== 'weekly') && (
                <div style={containerStyle}>
                    <label style={labelStyle}>Mes de Referencia</label>
                    <select 
                        style={{ ...inputStyle, appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'rgba(255,255,255,0.4)\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center' }} 
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

            {/* Fecha de Expiración */}
            <div style={containerStyle}>
                <label style={labelStyle}>Fecha de Expiración (Opcional)</label>
                <div style={{ position: 'relative' }}>
                    <input 
                        type="date" 
                        style={{ ...inputStyle, colorScheme: 'dark' }} 
                        value={expirationDate} 
                        onChange={e => setExpirationDate(e.target.value)} 
                    />
                </div>
            </div>

            {/* Cuenta o Efectivo */}
            <div style={containerStyle}>
                <label style={labelStyle}>Cuenta o Efectivo (Destino)</label>
                <div style={{ position: 'relative' }}>
                    <select 
                        style={{ ...inputStyle, paddingLeft: '2.75rem', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'rgba(255,255,255,0.4)\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center' }} 
                        value={accountId} 
                        onChange={e => setAccountId(e.target.value)}
                    >
                        <option value="">Selecciona una cuenta...</option>
                        {accounts.filter(a => a.type === 'bank').length > 0 && <optgroup label="Bancos">
                            {accounts.filter(a => a.type === 'bank').map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>
                            ))}
                        </optgroup>}
                        {accounts.filter(a => a.type === 'cash').length > 0 && <optgroup label="Efectivo">
                            {accounts.filter(a => a.type === 'cash').map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>
                            ))}
                        </optgroup>}
                    </select>
                    <div style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, pointerEvents: 'none' }}>
                        {accountId ? (accounts.find(a => a.id === accountId)?.type === 'bank' ? <Landmark size={18} /> : <Wallet size={18} />) : <Landmark size={18} />}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={onClose} style={{
                    flex: 1,
                    padding: '1.15rem',
                    borderRadius: '0.75rem',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    cursor: 'pointer',
                    transition: 'opacity 0.2s'
                }}>
                    Cancelar
                </button>
                <button type="submit" style={{
                    flex: 2,
                    padding: '1.15rem',
                    borderRadius: '0.75rem',
                    border: 'none',
                    background: '#6366f1',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 8px 25px rgba(99, 102, 241, 0.3)',
                    transition: 'transform 0.2s, opacity 0.2s'
                }}>
                    {editingIncome ? <Save size={20} /> : null}
                    {editingIncome ? 'Actualizar Ingreso' : 'Añadir Ingreso'}
                </button>
            </div>
        </form>
    );
};

export default FixedIncomeForm;
