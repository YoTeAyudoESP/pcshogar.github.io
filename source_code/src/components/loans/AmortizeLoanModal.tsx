import React, { useState, useEffect } from 'react';
import { X, Check, CreditCard, DollarSign, Calendar, MessageSquare, Percent, TrendingDown, Clock, ShieldAlert } from 'lucide-react';
import { useFinance } from '../../contexts/FinanceContext';
import type { Loan } from '../../types/finance';
import { formatMoney, calculatePartialAmortizationEffect, calculateLoanAmortization } from '../../utils/financeCalculations';
import { incomeDB } from '../../services/db';

interface AmortizeLoanModalProps {
    loan: Loan;
    onClose: () => void;
}

const AmortizeLoanModal: React.FC<AmortizeLoanModalProps> = ({ loan, onClose }) => {
    const { accounts, amortizeLoan, recurringExpenses, refreshFinance } = useFinance();
    const currentDebt = loan.currentDebt ?? loan.remainingAmount ?? 0;
    
    const [amount, setAmount] = useState<string>(currentDebt.toString());
    const [accountId, setAccountId] = useState(accounts.find(a => a.isMain)?.id || accounts[0]?.id || '');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    // Amortization mode: 'reduce_quota' | 'reduce_term' | 'total'
    const [amortizationMode, setAmortizationMode] = useState<'reduce_quota' | 'reduce_term' | 'total'>('reduce_quota');

    // Commission logic
    const calc = calculateLoanAmortization(loan);
    const remainingMonths = calc?.schedule ? calc.schedule.filter(r => !r.isPaid).length : (loan.months || 12);

    const defaultCommissionRate = (() => {
        if (loan.commissionType === 'manual' && loan.commissionRate !== undefined) {
            return loan.commissionRate;
        }
        if (loan.commissionType === 'legal_standard') {
            return remainingMonths > 12 
                ? (loan.commissionRateOver1Year !== undefined ? loan.commissionRateOver1Year : 1.0) 
                : (loan.commissionRateUnder1Year !== undefined ? loan.commissionRateUnder1Year : 0.5);
        }
        // Default legal standard fallback
        return remainingMonths > 12 ? 1.0 : 0.5;
    })();

    const [commissionRate, setCommissionRate] = useState<number | ''>(defaultCommissionRate);
    const [saveCommissionToLoan, setSaveCommissionToLoan] = useState<boolean>(false);

    const capitalToAmortize = parseFloat(amount) || 0;
    const isTotalAmortization = capitalToAmortize >= currentDebt;

    // Automatically switch to 'total' if capital >= current debt
    useEffect(() => {
        if (isTotalAmortization) {
            setAmortizationMode('total');
        } else if (amortizationMode === 'total') {
            setAmortizationMode('reduce_quota');
        }
    }, [capitalToAmortize, currentDebt]);

    const numCommissionRate = typeof commissionRate === 'number' ? commissionRate : 0;
    const commissionAmount = Math.round(capitalToAmortize * (numCommissionRate / 100) * 100) / 100;
    const totalCharge = Math.round((capitalToAmortize + commissionAmount) * 100) / 100;

    const effect = calculatePartialAmortizationEffect(loan, capitalToAmortize, amortizationMode === 'total' ? 'reduce_quota' : amortizationMode);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || capitalToAmortize <= 0 || !accountId) return;

        setLoading(true);
        try {
            const updatedLoanData: Partial<Loan> = {};

            if (saveCommissionToLoan) {
                updatedLoanData.commissionType = 'manual';
                updatedLoanData.commissionRate = numCommissionRate;
            }

            if (isTotalAmortization || amortizationMode === 'total') {
                updatedLoanData.status = 'completed';
                updatedLoanData.isPaid = true;
                updatedLoanData.currentDebt = 0;
                updatedLoanData.remainingAmount = 0;
            } else if (amortizationMode === 'reduce_quota') {
                updatedLoanData.monthlyInstallment = effect.newQuota;
                updatedLoanData.monthlyPayment = effect.newQuota;

                // Update linked recurring expense amount
                if (loan.linkedRecurringExpenseId) {
                    const rec = recurringExpenses.find(r => r.id === loan.linkedRecurringExpenseId);
                    if (rec) {
                        await incomeDB.updateRecurringExpense({ ...rec, amount: effect.newQuota, updatedAt: Date.now() });
                    }
                }
            } else if (amortizationMode === 'reduce_term') {
                updatedLoanData.months = effect.newMonths;
                
                // Recalculate estimated end date
                const now = new Date(date);
                const endDate = new Date(now.setMonth(now.getMonth() + effect.newMonths));
                updatedLoanData.estimatedEndDate = endDate.getTime();

                // Update linked recurring expense expirationDate
                if (loan.linkedRecurringExpenseId) {
                    const rec = recurringExpenses.find(r => r.id === loan.linkedRecurringExpenseId);
                    if (rec) {
                        await incomeDB.updateRecurringExpense({ ...rec, expirationDate: endDate.getTime(), updatedAt: Date.now() });
                    }
                }
            }

            await amortizeLoan(
                loan.id, 
                capitalToAmortize, 
                accountId, 
                new Date(date).getTime(), 
                notes,
                {
                    totalCharge,
                    commissionAmount,
                    updatedLoanData
                }
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
                maxWidth: '520px',
                padding: '1.75rem',
                position: 'relative',
                maxHeight: '92vh',
                overflowY: 'auto',
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

                <h2 style={{ margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#f59e0b', fontSize: '1.4rem' }}>
                    <DollarSign size={24} /> Amortizar Préstamo
                </h2>
                <p style={{ opacity: 0.7, fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                    {loan.name} — Deuda actual: <strong style={{ color: '#f59e0b' }}>{formatMoney(currentDebt)}</strong>
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                    
                    {/* Capital input */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.85rem', opacity: 0.8, fontWeight: 600 }}>Capital a Amortizar (€)</label>
                        <input 
                            autoFocus
                            type="number"
                            step="0.01"
                            max={currentDebt}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder={currentDebt.toString()}
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(245, 158, 11, 0.4)',
                                padding: '0.85rem',
                                borderRadius: '0.75rem',
                                color: 'white',
                                fontSize: '1.25rem',
                                fontWeight: 700,
                                width: '100%'
                            }}
                            required
                        />

                        {/* Quick Percentage Actions */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginTop: '0.2rem' }}>
                            {[0.25, 0.50, 0.75, 1.0].map(pct => {
                                const pctVal = Math.round(currentDebt * pct * 100) / 100;
                                const label = pct === 1 ? '100% (Total)' : `${pct * 100}%`;
                                return (
                                    <button
                                        type="button"
                                        key={pct}
                                        onClick={() => setAmount(pctVal.toString())}
                                        style={{
                                            background: capitalToAmortize === pctVal ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                                            border: capitalToAmortize === pctVal ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.1)',
                                            color: capitalToAmortize === pctVal ? '#f59e0b' : 'rgba(255, 255, 255, 0.8)',
                                            padding: '0.4rem',
                                            borderRadius: '0.5rem',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Mode selector (if not total) */}
                    {!isTotalAmortization ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.85rem', opacity: 0.8, fontWeight: 600 }}>Tipo de Amortización Parcial</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setAmortizationMode('reduce_quota')}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        padding: '0.75rem',
                                        borderRadius: '0.75rem',
                                        background: amortizationMode === 'reduce_quota' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                                        border: amortizationMode === 'reduce_quota' ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                                        color: amortizationMode === 'reduce_quota' ? '#60a5fa' : 'rgba(255, 255, 255, 0.7)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <TrendingDown size={18} />
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Reducir Cuota</span>
                                    <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>Mantener plazo</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setAmortizationMode('reduce_term')}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        padding: '0.75rem',
                                        borderRadius: '0.75rem',
                                        background: amortizationMode === 'reduce_term' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                                        border: amortizationMode === 'reduce_term' ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                                        color: amortizationMode === 'reduce_term' ? '#34d399' : 'rgba(255, 255, 255, 0.7)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <Clock size={18} />
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Reducir Plazo</span>
                                    <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>Mantener cuota</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            padding: '0.75rem 1rem',
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: '0.75rem',
                            color: '#34d399',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <span>🎉</span> <strong>Liquidación Total del Préstamo</strong>
                        </div>
                    )}

                    {/* Effect Preview Card */}
                    {capitalToAmortize > 0 && !isTotalAmortization && (
                        <div style={{
                            padding: '0.75rem 1rem',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '0.75rem',
                            fontSize: '0.82rem',
                            lineHeight: 1.4
                        }}>
                            {amortizationMode === 'reduce_quota' ? (
                                <div style={{ color: '#60a5fa' }}>
                                    📉 Tu cuota mensual pasará de <strong>{formatMoney(loan.monthlyPayment || loan.monthlyInstallment)}</strong> a <strong>{formatMoney(effect.newQuota)}</strong> (ahorro de {formatMoney(effect.quotaSaved)}/mes).
                                </div>
                            ) : (
                                <div style={{ color: '#34d399' }}>
                                    ⏳ Reducirás el préstamo en aprox. <strong>{effect.monthsSaved} meses</strong> (de {remainingMonths} a {effect.newMonths} meses restantes).
                                </div>
                            )}
                        </div>
                    )}

                    {/* Commission section */}
                    <div style={{
                        padding: '0.85rem',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.6rem'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: '0.85rem', opacity: 0.8, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <Percent size={14} style={{ color: '#f59e0b' }} /> Comisión Banco (%)
                            </label>
                            <input 
                                type="number"
                                step="0.01"
                                min="0"
                                max="10"
                                value={commissionRate}
                                onChange={(e) => setCommissionRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                style={{
                                    width: '80px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    padding: '0.35rem 0.5rem',
                                    borderRadius: '0.5rem',
                                    color: 'white',
                                    fontWeight: 700,
                                    textAlign: 'right',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        {numCommissionRate > 0 && (
                            <div style={{ fontSize: '0.8rem', opacity: 0.7, display: 'flex', justifyContent: 'space-between' }}>
                                <span>Importe Comisión ({numCommissionRate}%):</span>
                                <strong>+{formatMoney(commissionAmount)}</strong>
                            </div>
                        )}

                        <div style={{ fontSize: '0.88rem', fontWeight: 700, display: 'flex', justifyContent: 'space-between', color: '#f59e0b', paddingTop: '0.25rem', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                            <span>Total a Cargar en Cuenta:</span>
                            <span>{formatMoney(totalCharge)}</span>
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', opacity: 0.7, cursor: 'pointer', marginTop: '0.2rem' }}>
                            <input 
                                type="checkbox"
                                checked={saveCommissionToLoan}
                                onChange={(e) => setSaveCommissionToLoan(e.target.checked)}
                                style={{ accentColor: '#f59e0b' }}
                            />
                            Guardar este % de comisión en la ficha del préstamo
                        </label>
                    </div>

                    {/* Bank Account Selection */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.85rem', opacity: 0.8, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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

                    {/* Date picker */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.85rem', opacity: 0.8, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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

                    {/* Concept / Notes */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.85rem', opacity: 0.8, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <MessageSquare size={14} /> Notas / Concepto
                        </label>
                        <input 
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Amortización parcial / Cancelación anticipada"
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

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
                        <button 
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1,
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                padding: '0.85rem',
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
                            disabled={loading || capitalToAmortize <= 0}
                            style={{
                                flex: 2,
                                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                border: 'none',
                                padding: '0.85rem',
                                borderRadius: '1rem',
                                color: 'white',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)',
                                opacity: (loading || capitalToAmortize <= 0) ? 0.6 : 1
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
