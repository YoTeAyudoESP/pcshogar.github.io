import React, { useState } from 'react';
import { X, Check, CreditCard, DollarSign, Calendar, MessageSquare } from 'lucide-react';
import { useFinance } from '../../contexts/FinanceContext';
import type { Loan } from '../../types/finance';
import { formatMoney, calculateAmortizationEffect } from '../../utils/financeCalculations';

interface AmortizeLoanModalProps {
    loan: Loan;
    onClose: () => void;
}

const AmortizeLoanModal: React.FC<AmortizeLoanModalProps> = ({ loan, onClose }) => {
    const { accounts, amortizeLoan } = useFinance();
    const [amount, setAmount] = useState('');
    const [accountId, setAccountId] = useState(accounts.find(a => a.isMain)?.id || accounts[0]?.id || '');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [reduceType, setReduceType] = useState<'quota' | 'term'>('quota');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !accountId) return;

        setLoading(true);
        try {
            const parsedAmount = parseFloat(amount);
            const feeAmount = (loan.earlyAmortizationFee && loan.earlyAmortizationFee > 0) ? (parsedAmount * loan.earlyAmortizationFee / 100) : 0;
            const totalToPay = parsedAmount + feeAmount;

            let finalNotes = notes;
            if (feeAmount > 0) {
                finalNotes += ` (Incluye ${formatMoney(feeAmount)} de comisión por amortización anticipada)`;
            }

            let effect: any = null;
            if (loan.mode === 'intelligent' && parsedAmount > 0) {
                effect = calculateAmortizationEffect(loan.currentDebt, loan.monthlyPayment, loan.tin || 0, loan.durationMonths || 0, parsedAmount, reduceType);
            }

            await amortizeLoan(
                loan.id, 
                parsedAmount, 
                accountId, 
                new Date(date).getTime(), 
                finalNotes,
                loan.mode === 'intelligent' ? reduceType : undefined,
                effect?.newInstallment,
                effect?.newDuration,
                feeAmount
            );
            onClose();
        } catch (error) {
            console.error("Error amortizing loan:", error);
            alert("Error al amortizar el préstamo.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
        }}>
            <div className="glass-panel" style={{
                width: '100%',
                maxWidth: '450px',
                padding: '2rem',
                position: 'relative',
                animation: 'slideUp 0.3s ease-out'
            }}>
                <button 
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255, 255, 255, 0.5)',
                        cursor: 'pointer'
                    }}
                >
                    <X size={24} />
                </button>

                <h2 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#f59e0b' }}>
                    <DollarSign size={24} /> Amortizar Préstamo
                </h2>
                <p style={{ opacity: 0.6, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    {loan.name} — Deuda pendiente: <strong>{formatMoney(loan.currentDebt)}</strong>
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.85rem', opacity: 0.6 }}>Importe a pagar (€)</label>
                        <input 
                            autoFocus
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder={loan.currentDebt.toString()}
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                padding: '1rem',
                                borderRadius: '0.75rem',
                                color: 'white',
                                fontSize: '1.25rem',
                                fontWeight: 700,
                                width: '100%'
                            }}
                            required
                        />
                    </div>

                    {loan.mode === 'intelligent' && parseFloat(amount) > 0 && (
                        <div style={{ background: 'rgba(245, 158, 11, 0.05)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                            <p style={{ color: '#f59e0b', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 600 }}>Opciones de Amortización</p>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                    <input type="radio" checked={reduceType === 'quota'} onChange={() => setReduceType('quota')} /> Reducir Cuota
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                    <input type="radio" checked={reduceType === 'term'} onChange={() => setReduceType('term')} /> Reducir Plazo
                                </label>
                            </div>
                            
                            {(() => {
                                const effect = calculateAmortizationEffect(loan.currentDebt, loan.monthlyPayment, loan.tin || 0, loan.durationMonths || 0, parseFloat(amount), reduceType);
                                const fee = (loan.earlyAmortizationFee && loan.earlyAmortizationFee > 0) ? (parseFloat(amount) * loan.earlyAmortizationFee / 100) : 0;
                                return (
                                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>
                                        <p><strong>Comisión a cobrar ({loan.earlyAmortizationFee || 0}%):</strong> {formatMoney(fee)}</p>
                                        <p><strong>Total a descontar de tu cuenta:</strong> {formatMoney(parseFloat(amount) + fee)}</p>
                                        {reduceType === 'quota' ? (
                                            <p><strong>Nueva cuota estimada:</strong> {formatMoney(effect.newInstallment)}</p>
                                        ) : (
                                            <p><strong>Nuevo plazo estimado:</strong> {effect.newDuration} meses</p>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.85rem', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <CreditCard size={14} /> Pagar desde Cuenta
                        </label>
                        <select 
                            value={accountId}
                            onChange={(e) => setAccountId(e.target.value)}
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                padding: '0.75rem',
                                borderRadius: '0.75rem',
                                color: 'white',
                                width: '100%',
                                outline: 'none'
                            }}
                            required
                        >
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.name} ({formatMoney(acc.balance)})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.85rem', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Calendar size={14} /> Fecha del Pago
                        </label>
                        <input 
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                padding: '0.75rem',
                                borderRadius: '0.75rem',
                                color: 'white',
                                width: '100%',
                                outline: 'none'
                            }}
                            required
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.85rem', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <MessageSquare size={14} /> Notas / Concepto
                        </label>
                        <input 
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Amortización parcial / Liquidación"
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                padding: '0.75rem',
                                borderRadius: '0.75rem',
                                color: 'white',
                                width: '100%',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button 
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1,
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                padding: '1rem',
                                borderRadius: '1rem',
                                color: 'white',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit"
                            disabled={loading}
                            style={{
                                flex: 2,
                                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                border: 'none',
                                padding: '1rem',
                                borderRadius: '1rem',
                                color: 'white',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            <Check size={20} /> {loading ? 'Procesando...' : 'Confirmar Amortización'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AmortizeLoanModal;
