import React, { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { formatCurrency } from '../../utils/formatters';
import { X } from 'lucide-react';
import type { Loan } from '../../types/finance';

interface LoanAmortizationModalProps {
    loan: Loan;
    onClose: () => void;
}

const LoanAmortizationModal: React.FC<LoanAmortizationModalProps> = ({ loan, onClose }) => {
    const { amortizeLoan, accounts } = useFinance();
    const [amount, setAmount] = useState('');
    const [accountId, setAccountId] = useState('');
    const [type, setType] = useState<'partial' | 'total'>('partial');
    const [impact, setImpact] = useState<'reduce_time' | 'reduce_installment'>('reduce_time');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amortAmount = type === 'total' ? loan.remainingAmount : parseFloat(amount);
        if (!amortAmount || !accountId) return;

        await amortizeLoan(loan.id, amortAmount, accountId, type, type === 'partial' ? impact : undefined);
        onClose();
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
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1200, padding: '2rem'
        }}>
            <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '2rem', maxWidth: '450px', width: '100%', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0 }}>Amortizar Préstamo</h3>
                    <button type="button" onClick={onClose} className="btn-icon">
                        <X size={20} />
                    </button>
                </div>

                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', border: 'var(--card-border)' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Pendiente Actual:</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>{formatCurrency(loan.remainingAmount)}</div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-main)' }}>
                        <input type="radio" checked={type === 'partial'} onChange={() => setType('partial')} /> Parcial
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-main)' }}>
                        <input type="radio" checked={type === 'total'} onChange={() => setType('total')} /> Total
                    </label>
                </div>

                {type === 'partial' && (
                    <>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Monto a Amortizar</label>
                            <input type="number" step="0.01" style={inputStyle} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Impacto de la Amortización</label>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                    <input type="radio" checked={impact === 'reduce_time'} onChange={() => setImpact('reduce_time')} /> Reducir Tiempo
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                    <input type="radio" checked={impact === 'reduce_installment'} onChange={() => setImpact('reduce_installment')} /> Reducir Cuota
                                </label>
                            </div>
                        </div>
                    </>
                )}

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Cuenta Bancaria</label>
                    <select style={inputStyle} value={accountId} onChange={e => setAccountId(e.target.value)} required>
                        <option value="">Seleccionar cuenta...</option>
                        {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</option>
                        ))}
                    </select>
                </div>

                <button type="submit" className="btn-primary" style={{
                    width: '100%',
                    padding: '1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '1rem',
                    cursor: 'pointer',
                    marginTop: '0.5rem'
                }}>
                    Confirmar Pago
                </button>
            </form>
        </div>
    );
};

export default LoanAmortizationModal;
