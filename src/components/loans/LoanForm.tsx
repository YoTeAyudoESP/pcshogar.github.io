import React, { useState, useEffect } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { X, Check, Calendar, CreditCard, DollarSign, Info } from 'lucide-react';
import type { Loan } from '../../types/finance';
import { formatMoney } from '../../utils/financeCalculations';
import { v4 as uuidv4 } from 'uuid';

interface LoanFormProps {
    editingLoan?: Loan;
    onCancelEdit?: () => void;
    onClose?: () => void;
}

const LoanForm: React.FC<LoanFormProps> = ({ editingLoan, onCancelEdit, onClose }) => {
    const { addLoan, updateLoan, accounts, addRecurringExpense } = useFinance();
    const [name, setName] = useState('');
    const [totalAmount, setTotalAmount] = useState('');
    const [currentDebt, setCurrentDebt] = useState('');
    const [monthlyPayment, setMonthlyPayment] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [estimatedEndDate, setEstimatedEndDate] = useState('');
    const [firstInstallment, setFirstInstallment] = useState('');
    const [lastInstallment, setLastInstallment] = useState('');
    const [linkedAccountId, setLinkedAccountId] = useState(accounts.find(a => a.isMain)?.id || accounts[0]?.id || '');
    const [color, setColor] = useState('#f59e0b');
    const [autoCreateExpense, setAutoCreateExpense] = useState(true);

    useEffect(() => {
        if (editingLoan) {
            setName(editingLoan.name || '');
            setTotalAmount((editingLoan.totalAmount ?? 0).toString());
            setCurrentDebt((editingLoan.currentDebt ?? 0).toString());
            setMonthlyPayment((editingLoan.monthlyPayment ?? 0).toString());
            setStartDate(new Date(editingLoan.startDate || Date.now()).toISOString().split('T')[0]);
            setEstimatedEndDate(editingLoan.estimatedEndDate ? new Date(editingLoan.estimatedEndDate).toISOString().split('T')[0] : '');
            setFirstInstallment((editingLoan.firstInstallmentAmount ?? 0).toString());
            setLastInstallment((editingLoan.lastInstallmentAmount ?? 0).toString());
            setLinkedAccountId(editingLoan.linkedAccountId || '');
            setColor(editingLoan.color || '#f59e0b');
        } else {
            setName('');
            setTotalAmount('');
            setCurrentDebt('');
            setMonthlyPayment('');
            setStartDate(new Date().toISOString().split('T')[0]);
            setEstimatedEndDate('');
            setFirstInstallment('');
            setLastInstallment('');
            setLinkedAccountId(accounts.find(a => a.isMain)?.id || accounts[0]?.id || '');
            setColor('#f59e0b');
        }
    }, [editingLoan, accounts]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !totalAmount) return;

        const total = parseFloat(totalAmount) || 0;
        const current = parseFloat(currentDebt) || total; // Default to total if not provided
        const monthly = parseFloat(monthlyPayment) || 0;
        const first = parseFloat(firstInstallment) || 0;
        const last = parseFloat(lastInstallment) || 0;

        const loanData = {
            name,
            totalAmount: total,
            currentDebt: current,
            remainingAmount: current,
            monthlyPayment: monthly,
            monthlyInstallment: monthly,
            firstInstallmentAmount: first,
            lastInstallmentAmount: last,
            startDate: new Date(startDate).getTime(),
            estimatedEndDate: estimatedEndDate ? new Date(estimatedEndDate).getTime() : undefined,
            linkedAccountId,
            currency: 'EUR' as const,
            status: (current <= 0 ? 'paid' : 'active') as 'active' | 'paid',
            isPaid: current <= 0,
            color,
            updatedAt: Date.now()
        };

        if (editingLoan) {
            await updateLoan({ ...editingLoan, ...loanData });
            if (onCancelEdit) onCancelEdit();
        } else {
            if (autoCreateExpense && current > 0 && monthly > 0) {
                const loanId = uuidv4();
                const recId = uuidv4();
                const payDay = new Date(startDate).getDate();

                const recurringExpenseData = {
                    id: recId,
                    description: `Cuota Préstamo: ${name}`,
                    amount: monthly,
                    currency: 'EUR' as const,
                    frequency: 'monthly' as const,
                    paymentDay: payDay,
                    active: true,
                    categoryId: 'cat_loans',
                    paymentMethod: linkedAccountId ? { type: 'account' as const, accountId: linkedAccountId } : { type: 'cash' as const },
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    ignoredPeriods: []
                };

                await addRecurringExpense(recurringExpenseData as any);
                await addLoan({
                    ...loanData,
                    id: loanId,
                    linkedRecurringExpenseId: recId
                } as any);
            } else {
                await addLoan(loanData);
            }
        }

        if (onClose) onClose();
    };

    const inputStyle = {
        background: 'var(--panel-bg-2)',
        border: '1px solid var(--panel-bg-3)',
        borderRadius: '0.75rem',
        padding: '0.75rem 1rem',
        color: 'var(--text-main)',
        width: '100%',
        fontSize: '1rem',
        outline: 'none'
    };

    const labelStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        fontSize: '0.85rem',
        opacity: 0.6,
        marginBottom: '0.4rem'
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container glass-panel" style={{ padding: '2rem', maxWidth: '550px' }} onClick={e => e.stopPropagation()}>
                <button 
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(var(--color-rgb-light), 0.5)',
                        cursor: 'pointer'
                    }}
                >
                    <X size={24} />
                </button>

                <h2 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <CreditCard size={24} color="#f59e0b" />
                    {editingLoan ? 'Editar Préstamo' : 'Nuevo Préstamo'}
                </h2>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Basic Info */}
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 2 }}>
                            <label style={labelStyle}>Nombre del Préstamo</label>
                            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Hipoteca, Préstamo Coche..." required />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Color Distintivo</label>
                            <input type="color" style={{ ...inputStyle, padding: '0.2rem', height: '42px', cursor: 'pointer' }} value={color} onChange={e => setColor(e.target.value)} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={labelStyle}><DollarSign size={14} /> Importe Solicitado (€)</label>
                            <input type="number" step="0.01" style={inputStyle} value={totalAmount} onChange={e => setTotalAmount(e.target.value)} placeholder="0.00" required />
                        </div>
                        <div>
                            <label style={labelStyle}><DollarSign size={14} /> Deuda Actual (€)</label>
                            <input type="number" step="0.01" style={inputStyle} value={currentDebt} onChange={e => setCurrentDebt(e.target.value)} placeholder="Opcional" />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={labelStyle}><Calendar size={14} /> Fecha de Inicio</label>
                            <input type="date" style={inputStyle} value={startDate} onChange={e => setStartDate(e.target.value)} required />
                        </div>
                        <div>
                            <label style={labelStyle}><Calendar size={14} /> Finalización Estimada</label>
                            <input type="date" style={inputStyle} value={estimatedEndDate} onChange={e => setEstimatedEndDate(e.target.value)} />
                        </div>
                    </div>

                    <div style={{ background: 'rgba(245, 158, 11, 0.05)', padding: '1rem', borderRadius: '1rem', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                        <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Info size={16} /> Detalles de Cuotas
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ ...labelStyle, fontSize: '0.75rem' }}>Cuota Normal</label>
                                <input type="number" step="0.01" style={{ ...inputStyle, padding: '0.5rem' }} value={monthlyPayment} onChange={e => setMonthlyPayment(e.target.value)} placeholder="0.00" />
                            </div>
                            <div>
                                <label style={{ ...labelStyle, fontSize: '0.75rem' }}>1ª Cuota (Esp)</label>
                                <input type="number" step="0.01" style={{ ...inputStyle, padding: '0.5rem' }} value={firstInstallment} onChange={e => setFirstInstallment(e.target.value)} placeholder="Opcional" />
                            </div>
                            <div>
                                <label style={{ ...labelStyle, fontSize: '0.75rem' }}>Última Cuota (Esp)</label>
                                <input type="number" step="0.01" style={{ ...inputStyle, padding: '0.5rem' }} value={lastInstallment} onChange={e => setLastInstallment(e.target.value)} placeholder="Opcional" />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label style={labelStyle}><CreditCard size={14} /> Cuenta Bancaria Domiciliada</label>
                        <select style={inputStyle} value={linkedAccountId} onChange={e => setLinkedAccountId(e.target.value)}>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name} ({formatMoney(acc.balance)})</option>
                            ))}
                        </select>
                    </div>

                    {!editingLoan && (
                        <div style={{ 
                            background: 'rgba(245, 158, 11, 0.05)', 
                            padding: '1rem', 
                            borderRadius: '12px',
                            border: '1px solid rgba(245, 158, 11, 0.1)',
                            marginTop: '0.5rem'
                        }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 600 }}>
                                <input 
                                    type="checkbox" 
                                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#f59e0b' }}
                                    checked={autoCreateExpense}
                                    onChange={e => setAutoCreateExpense(e.target.checked)}
                                />
                                Crear Gasto Fijo asociado automáticamente
                            </label>
                            <p style={{ color: 'rgba(var(--color-rgb-light),0.4)', fontSize: '0.8rem', marginTop: '6px', marginLeft: '30px', margin: '6px 0 0 30px' }}>
                                Si se activa, se creará un gasto fijo mensual con la misma cuota y método de pago conectado a este préstamo.
                            </p>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button type="button" onClick={onClose} style={{
                            flex: 1, padding: '1rem', borderRadius: '1rem', border: '1px solid var(--panel-bg-3)', background: 'var(--panel-bg-2)', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer'
                        }}>Cancelar</button>
                        <button type="submit" style={{
                            flex: 2, padding: '1rem', borderRadius: '1rem', border: 'none', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'var(--text-main)', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)'
                        }}>
                            {editingLoan ? 'Guardar Cambios' : 'Registrar Préstamo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoanForm;
