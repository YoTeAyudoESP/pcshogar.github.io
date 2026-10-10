import React, { useState, useEffect } from 'react';
import { X, Check, CreditCard, DollarSign, Calendar, MessageSquare, Percent, TrendingDown, Clock, PiggyBank } from 'lucide-react';
import { useFinance } from '../../contexts/FinanceContext';
import type { Loan, SavingGoal } from '../../types/finance';
import { formatMoney, calculatePartialAmortizationEffect, calculateLoanAmortization } from '../../utils/financeCalculations';
import { incomeDB } from '../../services/db';

interface AmortizeLoanModalProps {
    loan: Loan;
    onClose: () => void;
}

const AmortizeLoanModal: React.FC<AmortizeLoanModalProps> = ({ loan, onClose }) => {
    const { accounts, savings = [], amortizeLoan, recurringExpenses } = useFinance();

    // Calculate schedule and effective remaining principal
    const calc = calculateLoanAmortization(loan);
    const currentDebt = (calc && calc.remainingCapital !== undefined && calc.remainingCapital > 0)
        ? calc.remainingCapital
        : (loan.currentDebt ?? loan.remainingAmount ?? 0);

    // Input mode: 'capital' | 'total'
    const [inputMode, setInputMode] = useState<'capital' | 'total'>('capital');
    const [inputAmount, setInputAmount] = useState<string>(currentDebt.toString());

    const [accountId, setAccountId] = useState(accounts.find(a => a.isMain)?.id || accounts[0]?.id || '');
    const [savingGoalId, setSavingGoalId] = useState<string>('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    // Amortization mode: 'reduce_quota' | 'reduce_term' | 'total'
    const [amortizationMode, setAmortizationMode] = useState<'reduce_quota' | 'reduce_term' | 'total'>('reduce_quota');

    // Commission logic
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
        return remainingMonths > 12 ? 1.0 : 0.5;
    })();

    const [commissionRate, setCommissionRate] = useState<number | ''>(defaultCommissionRate);
    const [saveCommissionToLoan, setSaveCommissionToLoan] = useState<boolean>(false);

    const numCommissionRate = typeof commissionRate === 'number' ? commissionRate : 0;
    const commissionFactor = 1 + (numCommissionRate / 100);

    // Bidirectional calculation
    const rawVal = parseFloat(inputAmount) || 0;
    let capitalToAmortize = 0;
    let commissionAmount = 0;
    let totalCharge = 0;

    if (inputMode === 'capital') {
        capitalToAmortize = Math.min(currentDebt, rawVal);
        commissionAmount = Math.round(capitalToAmortize * (numCommissionRate / 100) * 100) / 100;
        totalCharge = Math.round((capitalToAmortize + commissionAmount) * 100) / 100;
    } else {
        // total mode
        totalCharge = rawVal;
        capitalToAmortize = Math.min(currentDebt, Math.round((totalCharge / commissionFactor) * 100) / 100);
        commissionAmount = Math.round((totalCharge - capitalToAmortize) * 100) / 100;
    }

    const isTotalAmortization = capitalToAmortize >= currentDebt;

    // Automatically switch to 'total' if capital >= current debt
    useEffect(() => {
        if (isTotalAmortization) {
            setAmortizationMode('total');
        } else if (amortizationMode === 'total') {
            setAmortizationMode('reduce_quota');
        }
    }, [capitalToAmortize, currentDebt]);

    // Update input amount when switching mode or clicking quick percentage
    const handleModeSwitch = (newMode: 'capital' | 'total') => {
        if (newMode === inputMode) return;
        setInputMode(newMode);
        if (newMode === 'total') {
            setInputAmount(totalCharge > 0 ? totalCharge.toFixed(2) : '');
        } else {
            setInputAmount(capitalToAmortize > 0 ? capitalToAmortize.toFixed(2) : '');
        }
    };

    const handleQuickPct = (pct: number) => {
        const targetCapital = Math.round(currentDebt * pct * 100) / 100;
        if (inputMode === 'capital') {
            setInputAmount(targetCapital.toString());
        } else {
            const targetTotal = Math.round(targetCapital * commissionFactor * 100) / 100;
            setInputAmount(targetTotal.toFixed(2));
        }
    };

    const effect = calculatePartialAmortizationEffect(loan, capitalToAmortize, amortizationMode === 'total' ? 'reduce_quota' : amortizationMode);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputAmount || capitalToAmortize <= 0 || !accountId) return;

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

                if (loan.linkedRecurringExpenseId) {
                    const rec = recurringExpenses.find(r => r.id === loan.linkedRecurringExpenseId);
                    if (rec) {
                        await incomeDB.updateRecurringExpense({ ...rec, amount: effect.newQuota, updatedAt: Date.now() });
                    }
                }
            } else if (amortizationMode === 'reduce_term') {
                updatedLoanData.months = effect.newMonths;
                
                const now = new Date(date);
                const endDate = new Date(now.setMonth(now.getMonth() + effect.newMonths));
                updatedLoanData.estimatedEndDate = endDate.getTime();

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
                    updatedLoanData,
                    savingGoalId: savingGoalId || undefined
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
        <div 
            onClick={onClose}
            style={{
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
                padding: '0.75rem',
                overflowY: 'auto'
            }}
        >
            <div 
                onClick={(e) => e.stopPropagation()}
                className="glass-panel" 
                style={{
                    width: '100%',
                    maxWidth: '520px',
                    padding: '1.5rem',
                    position: 'relative',
                    margin: 'auto 0',
                    animation: 'slideUp 0.3s ease-out'
                }}
            >
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

                <h2 style={{ margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#f59e0b', fontSize: '1.35rem' }}>
                    <DollarSign size={24} /> Amortizar Préstamo
                </h2>
                <p style={{ opacity: 0.75, fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                    {loan.name} — Deuda pendiente: <strong style={{ color: '#f59e0b' }}>{formatMoney(currentDebt)}</strong>
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                    
                    {/* Single Input Mode Selector */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', padding: '3px', borderRadius: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                            <button
                                type="button"
                                onClick={() => handleModeSwitch('capital')}
                                style={{
                                    flex: 1,
                                    padding: '0.5rem',
                                    borderRadius: '0.6rem',
                                    border: 'none',
                                    background: inputMode === 'capital' ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                                    color: inputMode === 'capital' ? '#f59e0b' : 'rgba(255, 255, 255, 0.6)',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                🏦 Capital Neto a Amortizar
                            </button>
                            <button
                                type="button"
                                onClick={() => handleModeSwitch('total')}
                                style={{
                                    flex: 1,
                                    padding: '0.5rem',
                                    borderRadius: '0.6rem',
                                    border: 'none',
                                    background: inputMode === 'total' ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                                    color: inputMode === 'total' ? '#60a5fa' : 'rgba(255, 255, 255, 0.6)',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                💳 Total a Cargar en Cuenta
                            </button>
                        </div>

                        {/* Single Primary Input Box */}
                        <div style={{ position: 'relative' }}>
                            <input 
                                autoFocus
                                type="number"
                                step="0.01"
                                value={inputAmount}
                                onChange={(e) => setInputAmount(e.target.value)}
                                placeholder={inputMode === 'capital' ? currentDebt.toString() : (currentDebt * commissionFactor).toFixed(2)}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: `1px solid ${inputMode === 'capital' ? 'rgba(245, 158, 11, 0.5)' : 'rgba(59, 130, 246, 0.5)'}`,
                                    padding: '0.85rem 1rem',
                                    borderRadius: '0.75rem',
                                    color: 'white',
                                    fontSize: '1.25rem',
                                    fontWeight: 700,
                                    width: '100%',
                                    outline: 'none'
                                }}
                                required
                            />
                            <span style={{
                                position: 'absolute',
                                right: '1rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                color: inputMode === 'capital' ? '#f59e0b' : '#60a5fa',
                                pointerEvents: 'none'
                            }}>
                                {inputMode === 'capital' ? '€ Capital' : '€ Cargo Total'}
                            </span>
                        </div>

                        {/* Quick Percentage Actions */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem', marginTop: '0.1rem' }}>
                            {[0.25, 0.50, 0.75, 1.0].map(pct => {
                                const label = pct === 1 ? '100% (Total)' : `${pct * 100}%`;
                                return (
                                    <button
                                        type="button"
                                        key={pct}
                                        onClick={() => handleQuickPct(pct)}
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.04)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            color: 'rgba(255, 255, 255, 0.85)',
                                            padding: '0.35rem',
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

                    {/* Breakdown Summary Card */}
                    {capitalToAmortize > 0 && (
                        <div style={{
                            padding: '0.85rem 1rem',
                            background: 'rgba(255, 255, 255, 0.025)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '0.75rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.4rem',
                            fontSize: '0.83rem'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b' }}>
                                <span>🏦 Capital Neto que reduce deuda:</span>
                                <strong>{formatMoney(capitalToAmortize)}</strong>
                            </div>
                            {numCommissionRate > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255, 255, 255, 0.7)' }}>
                                    <span>Comisión Banco ({numCommissionRate}%):</span>
                                    <span>+{formatMoney(commissionAmount)}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#60a5fa', fontWeight: 800, paddingTop: '0.3rem', borderTop: '1px dashed rgba(255, 255, 255, 0.1)' }}>
                                <span>💳 Total a Cargar en Cuenta:</span>
                                <span>{formatMoney(totalCharge)}</span>
                            </div>
                        </div>
                    )}

                    {/* Mode selector (if not total) */}
                    {!isTotalAmortization ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.85rem', opacity: 0.8, fontWeight: 600 }}>Efecto de la Amortización Parcial</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setAmortizationMode('reduce_quota')}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '0.2rem',
                                        padding: '0.65rem',
                                        borderRadius: '0.75rem',
                                        background: amortizationMode === 'reduce_quota' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                                        border: amortizationMode === 'reduce_quota' ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                                        color: amortizationMode === 'reduce_quota' ? '#60a5fa' : 'rgba(255, 255, 255, 0.7)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <TrendingDown size={18} />
                                    <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>Reducir Cuota</span>
                                    <span style={{ fontSize: '0.68rem', opacity: 0.6 }}>Mantener plazo</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setAmortizationMode('reduce_term')}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '0.2rem',
                                        padding: '0.65rem',
                                        borderRadius: '0.75rem',
                                        background: amortizationMode === 'reduce_term' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                                        border: amortizationMode === 'reduce_term' ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                                        color: amortizationMode === 'reduce_term' ? '#34d399' : 'rgba(255, 255, 255, 0.7)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <Clock size={18} />
                                    <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>Reducir Plazo</span>
                                    <span style={{ fontSize: '0.68rem', opacity: 0.6 }}>Mantener cuota</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            padding: '0.65rem 1rem',
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
                            padding: '0.65rem 1rem',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '0.75rem',
                            fontSize: '0.8rem',
                            lineHeight: 1.4
                        }}>
                            {amortizationMode === 'reduce_quota' ? (
                                <div style={{ color: '#60a5fa' }}>
                                    📉 Tu cuota pasará de <strong>{formatMoney(loan.monthlyPayment || loan.monthlyInstallment)}</strong> a <strong>{formatMoney(effect.newQuota)}</strong> (-{formatMoney(effect.quotaSaved)}/mes).
                                </div>
                            ) : (
                                <div style={{ color: '#34d399' }}>
                                    ⏳ El plazo se reducirá en <strong>{effect.monthsSaved} meses</strong> (de {remainingMonths} a {effect.newMonths} meses).
                                </div>
                            )}
                        </div>
                    )}

                    {/* Commission Configuration Header */}
                    <div style={{
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: '0.82rem', opacity: 0.8, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
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
                                    width: '75px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    padding: '0.3rem 0.5rem',
                                    borderRadius: '0.5rem',
                                    color: 'white',
                                    fontWeight: 700,
                                    textAlign: 'right',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', opacity: 0.7, cursor: 'pointer' }}>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.82rem', opacity: 0.8, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <CreditCard size={14} /> Pagar desde Cuenta Bancaria
                        </label>
                        <select 
                            value={accountId}
                            onChange={(e) => setAccountId(e.target.value)}
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                padding: '0.65rem 0.75rem',
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

                    {/* Saving Goal (Hucha) Support Dropdown */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.82rem', opacity: 0.8, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#818cf8' }}>
                            <PiggyBank size={14} /> Soportar desde Hucha (Opcional)
                        </label>
                        <select 
                            value={savingGoalId}
                            onChange={(e) => setSavingGoalId(e.target.value)}
                            style={{
                                background: savingGoalId ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                border: savingGoalId ? '1px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.1)',
                                padding: '0.65rem 0.75rem',
                                borderRadius: '0.75rem',
                                color: savingGoalId ? '#a5b4fc' : 'white',
                                width: '100%',
                                outline: 'none'
                            }}
                        >
                            <option value="">🚫 Ninguna (Descontar del disponible del mes)</option>
                            {savings.map((goal: SavingGoal) => (
                                <option key={goal.id} value={goal.id}>
                                    🐷 {goal.name} ({formatMoney(goal.currentAmount)})
                                </option>
                            ))}
                        </select>
                        {savingGoalId && (
                            <span style={{ fontSize: '0.72rem', color: '#a5b4fc', opacity: 0.9 }}>
                                💡 Al elegir hucha, el dinero sale del ahorro guardado y <strong>NO reduce tu disponible del mes</strong>.
                            </span>
                        )}
                    </div>

                    {/* Date picker */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.82rem', opacity: 0.8, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Calendar size={14} /> Fecha del Pago
                        </label>
                        <input 
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                padding: '0.65rem 0.75rem',
                                borderRadius: '0.75rem',
                                color: 'white',
                                width: '100%',
                                outline: 'none'
                            }}
                            required
                        />
                    </div>

                    {/* Concept / Notes */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.82rem', opacity: 0.8, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
                                padding: '0.65rem 0.75rem',
                                borderRadius: '0.75rem',
                                color: 'white',
                                width: '100%',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
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
