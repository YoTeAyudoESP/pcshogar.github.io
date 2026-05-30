import React, { useState, useEffect } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import type { Loan } from '../../types/finance';
import { X } from 'lucide-react';

interface LoanFormProps {
    onClose?: () => void;
    editingLoan?: Loan;
}

const LoanForm: React.FC<LoanFormProps> = ({ onClose, editingLoan }) => {
    const { addLoan, updateLoan, accounts, cards, categories } = useFinance();
    const [name, setName] = useState('');
    const [totalAmount, setTotalAmount] = useState('');
    const [remainingAmount, setRemainingAmount] = useState('');
    const [monthlyInstallment, setMonthlyInstallment] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentDay, setPaymentDay] = useState('1');
    const [categoryId, setCategoryId] = useState('cat_loans');
    const [paymentMethodType, setPaymentMethodType] = useState<'account' | 'card' | 'cash'>('account');
    const [paymentMethodId, setPaymentMethodId] = useState('');

    useEffect(() => {
        if (editingLoan) {
            setName(editingLoan.name);
            setTotalAmount(editingLoan.totalAmount.toString());
            setRemainingAmount(editingLoan.remainingAmount.toString());
            setMonthlyInstallment(editingLoan.monthlyInstallment.toString());
            setStartDate(new Date(editingLoan.startDate).toISOString().split('T')[0]);
            setPaymentDay((editingLoan.paymentDay || 1).toString());
            setCategoryId(editingLoan.categoryId || 'cat_loans');

            if (editingLoan.paymentMethod) {
                setPaymentMethodType(editingLoan.paymentMethod.type);
                if (editingLoan.paymentMethod.type === 'account') setPaymentMethodId(editingLoan.paymentMethod.accountId);
                else if (editingLoan.paymentMethod.type === 'card') setPaymentMethodId(editingLoan.paymentMethod.cardId);
            } else {
                setPaymentMethodType('account');
                if (accounts.length > 0) setPaymentMethodId(accounts[0].id);
            }
        } else if (accounts.length > 0) {
            setPaymentMethodId(accounts[0].id);
        }
    }, [editingLoan, accounts]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !totalAmount || !monthlyInstallment) return;

        const paymentMethod: any = { type: paymentMethodType };
        if (paymentMethodType === 'account') paymentMethod.accountId = paymentMethodId;
        if (paymentMethodType === 'card') paymentMethod.cardId = paymentMethodId;

        const loanData = {
            name,
            totalAmount: parseFloat(totalAmount),
            remainingAmount: parseFloat(remainingAmount || totalAmount),
            monthlyInstallment: parseFloat(monthlyInstallment),
            startDate: new Date(startDate).getTime(),
            currency: 'EUR' as const,
            paymentDay: parseInt(paymentDay),
            categoryId,
            paymentMethod
        };

        if (editingLoan) {
            await updateLoan({
                ...editingLoan,
                ...loanData
            });
        } else {
            await addLoan(loanData);
        }

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
        <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: 'var(--space-md)', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>{editingLoan ? 'Editar Préstamo' : 'Nuevo Préstamo'}</h3>
                {onClose && (
                    <button type="button" onClick={onClose} className="btn-icon">
                        <X size={20} />
                    </button>
                )}
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Nombre del Préstamo</label>
                <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="ej. Hipoteca, Coche..." required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Importe Total</label>
                    <input type="number" step="0.01" style={inputStyle} value={totalAmount} onChange={e => setTotalAmount(e.target.value)} placeholder="0.00" required />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Pendiente Actual</label>
                    <input type="number" step="0.01" style={inputStyle} value={remainingAmount} onChange={e => setRemainingAmount(e.target.value)} placeholder="Opcional" />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Cuota Mensual</label>
                    <input type="number" step="0.01" style={inputStyle} value={monthlyInstallment} onChange={e => setMonthlyInstallment(e.target.value)} placeholder="0.00" required />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Fecha Inicio</label>
                    <input type="date" style={inputStyle} value={startDate} onChange={e => setStartDate(e.target.value)} required />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Día de Pago</label>
                    <input type="number" min="1" max="31" style={inputStyle} value={paymentDay} onChange={e => setPaymentDay(e.target.value)} required />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Categoría</label>
                    <select style={inputStyle} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
            </div>

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
                cursor: 'pointer',
                marginTop: '1rem'
            }}>
                {editingLoan ? 'Guardar Cambios' : 'Crear Préstamo'}
            </button>
        </form>
    );
};

export default LoanForm;
