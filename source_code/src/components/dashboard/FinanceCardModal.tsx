import React, { useState, useEffect, useMemo } from 'react';
import { X, RefreshCw, Calculator, ChevronDown, ChevronUp } from 'lucide-react';
import { useFinance } from '../../contexts/FinanceContext';
import { formatMoney, computeTae, computeCommissionsFromTae } from '../../utils/financeCalculations';
import type { CreditCard, Loan, RecurringExpense } from '../../types/finance';
import ModalPortal from '../common/ModalPortal';


interface FinanceCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    cardId: string;
    amount: number;
    expenseId?: string; // If financing a specific expense
    onSuccess?: () => void;
}

const FinanceCardModal: React.FC<FinanceCardModalProps> = ({ isOpen, onClose, cardId, amount, expenseId, onSuccess }) => {

    const { 
        loans = [], cards = [], updateExpense, expenses = [], 
        addLoan, updateLoan, addRecurringExpense, updateRecurringExpense,
        recurringExpenses = []
    } = useFinance();

    const [card, setCard] = useState<CreditCard | null>(null);
    const [existingLoan, setExistingLoan] = useState<Loan | null>(null);
    const [existingRec, setExistingRec] = useState<RecurringExpense | null>(null);

    const [calculationMode, setCalculationMode] = useState<'quota' | 'months'>('quota');
    const [monthlyQuota, setMonthlyQuota] = useState<number | ''>('');
    const [months, setMonths] = useState<number | ''>('');
    const [tin, setTin] = useState<number | ''>('');
    const [firstQuotaDate, setFirstQuotaDate] = useState<string>('');
    
    // Advanced settings
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [overrideFirstQuota, setOverrideFirstQuota] = useState<number | ''>('');
    const [overrideLastQuota, setOverrideLastQuota] = useState<number | ''>('');
    const [openingFee, setOpeningFee] = useState<number | ''>('');
    const [tae, setTae] = useState<number | ''>('');

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const foundCard = cards.find(c => c.id === cardId);
        if (foundCard) {
            setCard(foundCard);
            const now = new Date();
            const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, foundCard.paymentDay || 1);
            setFirstQuotaDate(nextMonthDate.toISOString().split('T')[0]);
        }

        const foundLoan = loans.find(l => l.linkedAccountId === cardId && l.status === 'active');
        if (foundLoan) {
            setExistingLoan(foundLoan);
            setMonthlyQuota(foundLoan.monthlyInstallment);
            setTin(foundLoan.tin || '');
        } else {
            setExistingLoan(null);
            setMonthlyQuota('');
            setMonths('');
            setTin('');
            setOverrideFirstQuota('');
            setOverrideLastQuota('');
            setShowAdvanced(false);
        }
    }, [isOpen, cardId, cards, loans]);
    
    useEffect(() => {
        if (existingLoan?.linkedRecurringExpenseId) {
            const foundRec = recurringExpenses.find(r => r.id === existingLoan.linkedRecurringExpenseId);
            if (foundRec) setExistingRec(foundRec);
        }
    }, [existingLoan, recurringExpenses]);

    const results = useMemo(() => {
        // We simulate based on the amount + any existing debt
        const totalAmount = amount + (existingLoan?.currentDebt || 0);
        if (!totalAmount || tin === '') return null;
        
        let P = totalAmount; // Principal
        const r = (Number(tin) / 100) / 12; // Monthly interest rate

        // Adjust principal if first quota is overridden
        let firstQ = overrideFirstQuota !== '' ? Number(overrideFirstQuota) : undefined;
        let monthsCount = 0;
        let totalInterest = 0;
        let M = 0;
        let finalLastQ = 0;

        if (calculationMode === 'months' && months && Number(months) > 0) {
            const n = Number(months);
            
            // Si hay interés 0%, es división exacta
            if (r === 0) {
                M = firstQ !== undefined ? (P - firstQ) / (n - 1) : P / n;
            } else {
                if (firstQ !== undefined) {
                    // El primer mes pagamos firstQ, que incluye los intereses del primer mes
                    const firstInterest = P * r;
                    const firstAmortization = firstQ - firstInterest;
                    P -= firstAmortization;
                    totalInterest += firstInterest;
                    monthsCount = 1;
                    // Ahora calculamos para n-1 meses con el nuevo P
                    M = n > 1 ? (P * r * Math.pow(1 + r, n - 1)) / (Math.pow(1 + r, n - 1) - 1) : 0;
                } else {
                    M = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
                }
            }
            
            // Loop para ver exactamente cómo se paga y cuál es la última cuota real
            let currentP = totalAmount;
            let currentMonths = 0;
            let currentTotalInt = 0;

            while (currentP > 0.01 && currentMonths < 1200) { // max 100 years safeguard
                const interest = currentP * r;
                currentTotalInt += interest;
                
                let quotaToPay = M;
                if (currentMonths === 0 && firstQ !== undefined) {
                    quotaToPay = firstQ;
                }

                let amortization = quotaToPay - interest;
                
                if (amortization <= 0 && r > 0) {
                    return { error: 'La cuota es menor que los intereses generados.' };
                }

                if (currentP - amortization < 0.01) {
                    // Última cuota ajustada
                    finalLastQ = currentP + interest;
                    currentP = 0;
                } else {
                    currentP -= amortization;
                }
                currentMonths++;
            }

            return {
                quota: M,
                months: currentMonths,
                totalPaid: totalAmount + currentTotalInt,
                totalInterest: currentTotalInt,
                lastQuota: finalLastQ
            };

        } else if (calculationMode === 'quota' && monthlyQuota && Number(monthlyQuota) > 0) {
            M = Number(monthlyQuota);
            
            let currentP = totalAmount;
            let currentMonths = 0;
            let currentTotalInt = 0;

            // Loop amortization
            while (currentP > 0.01 && currentMonths < 1200) {
                const interest = currentP * r;
                
                let quotaToPay = M;
                if (currentMonths === 0 && firstQ !== undefined) {
                    quotaToPay = firstQ;
                }
                
                if (quotaToPay <= interest && r > 0) {
                    return { error: 'La cuota es menor que los intereses del mes.' };
                }

                currentTotalInt += interest;
                let amortization = quotaToPay - interest;

                if (currentP - amortization < 0.01) {
                    finalLastQ = currentP + interest;
                    currentP = 0;
                } else {
                    currentP -= amortization;
                }
                currentMonths++;
            }
            
            return {
                quota: M,
                months: currentMonths,
                totalPaid: totalAmount + currentTotalInt,
                totalInterest: currentTotalInt,
                lastQuota: finalLastQ
            };
        }
        return null;
    }, [amount, existingLoan, calculationMode, monthlyQuota, months, tin, overrideFirstQuota]);



    const handleOpeningFeeChange = (val: string) => {
        const fee = val ? Number(val) : '';
        setOpeningFee(fee);
        const totalAmount = amount + (existingLoan?.currentDebt || 0);
        if (fee !== '' && totalAmount && tin !== '' && results?.months) {
            setTae(computeTae(Number(totalAmount), results.months, Number(tin), Number(fee)));
        } else {
            setTae('');
        }
    };

    const handleTaeChange = (val: string) => {
        const t = val ? Number(val) : '';
        setTae(t);
        const totalAmount = amount + (existingLoan?.currentDebt || 0);
        if (t !== '' && totalAmount && tin !== '' && results?.months) {
            setOpeningFee(computeCommissionsFromTae(Number(totalAmount), results.months, Number(tin), Number(t)));
        } else {
            setOpeningFee('');
        }
    };

    useEffect(() => {
        const totalAmount = amount + (existingLoan?.currentDebt || 0);
        if (openingFee !== '' && totalAmount && tin !== '' && results?.months) {
            setTae(computeTae(Number(totalAmount), results.months, Number(tin), Number(openingFee)));
        } else {
            setTae('');
        }
    }, [amount, existingLoan, tin, results?.months]); 

    const handleFinance = async () => {
        if (!results || 'error' in results) return;
        setIsSubmitting(true);

        const targetQuota = results.quota;

        try {
            // 1. Process the specific expense if provided
            if (expenseId) {
                const expense = expenses.find(e => e.id === expenseId);
                if (expense) {
                    await updateExpense({ 
                        ...expense, 
                        excludeFromBudget: true, 
                        isFinanced: true,
                        isSettled: true,
                        updatedAt: Date.now() 
                    });
                }
            }

            // 2. Handle Loan creation or update
            if (existingLoan) {
                const newTotal = (existingLoan.totalAmount || 0) + amount;
                const newDebt = (existingLoan.currentDebt || 0) + amount;
                
                await updateLoan({
                    ...existingLoan,
                    totalAmount: newTotal,
                    currentDebt: newDebt,
                    remainingAmount: newDebt,
                    monthlyInstallment: targetQuota,
                    monthlyPayment: targetQuota,
                    tin: Number(tin) || 0,
                    openingFee: openingFee !== '' ? Number(openingFee) : undefined,
                    firstInstallmentAmount: overrideFirstQuota !== '' ? Number(overrideFirstQuota) : undefined,
                    lastInstallmentAmount: overrideLastQuota !== '' ? Number(overrideLastQuota) : results.lastQuota,
                    updatedAt: Date.now()
                });

                if (existingRec && existingRec.amount !== targetQuota) {
                    await updateRecurringExpense({
                        ...existingRec,
                        amount: targetQuota,
                        updatedAt: Date.now()
                    });
                }
            } else {
                // Create new revolving loan for this card
                const now = new Date();
                let startDate = now.getTime();
                
                let nextPaymentDate = now.getTime();
                if (firstQuotaDate) {
                    nextPaymentDate = new Date(firstQuotaDate).getTime();
                }

                const recData: Omit<RecurringExpense, 'id'> = {
                    description: `Cuota Tarjeta: ${card?.name || 'Revolving'}`,
                    amount: targetQuota,
                    currency: 'EUR',
                    frequency: 'monthly',
                    paymentDay: card?.paymentDay || 1,
                    categoryId: 'loan_revolving', // generic category
                    active: true,
                    updatedAt: Date.now()
                };

                const recId = await addRecurringExpense(recData);

                const loanData: Omit<Loan, 'id'> = {
                    name: `Financiación ${card?.name || 'Tarjeta'}`,
                    totalAmount: amount,
                    currentDebt: amount,
                    remainingAmount: amount,
                    monthlyInstallment: targetQuota,
                    monthlyPayment: targetQuota,
                    startDate: startDate,
                    currency: 'EUR',
                    paymentDay: card?.paymentDay || 1,
                    status: 'active',
                    linkedAccountId: cardId,
                    linkedRecurringExpenseId: recId,
                    tin: Number(tin) || 0,
                    openingFee: openingFee !== '' ? Number(openingFee) : undefined,
                    firstInstallmentAmount: overrideFirstQuota !== '' ? Number(overrideFirstQuota) : undefined,
                    lastInstallmentAmount: overrideLastQuota !== '' ? Number(overrideLastQuota) : results.lastQuota,
                    updatedAt: Date.now()
                };

                await addLoan(loanData);
            }

            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error('Error financing:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const overlayStyle: React.CSSProperties = {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 3000,
        display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '16px', overflowY: 'auto'
    };
    const modalStyle: React.CSSProperties = {
        backgroundColor: '#1e1e2d', borderRadius: '16px', padding: '24px',
        width: '100%', maxWidth: '450px', display: 'flex', flexDirection: 'column', gap: '20px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)', margin: 'auto'
    };
    const inputStyle: React.CSSProperties = {
        backgroundColor: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px', padding: '12px', color: '#ffffff', width: '100%',
        boxSizing: 'border-box'
    };

    const tabStyle = (active: boolean): React.CSSProperties => ({
        flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
        backgroundColor: active ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
        color: active ? '#3b82f6' : 'rgba(255,255,255,0.5)',
        cursor: 'pointer', transition: 'all 0.2s', fontWeight: active ? 600 : 400
    });

    return (
        <ModalPortal><div className="modal-overlay" style={{ zIndex: 3000 }}>
            <div style={modalStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }}>
                            <Calculator size={24} />
                        </div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#ffffff', fontWeight: 600 }}>Simulador de Financiación</h2>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Importe a financiar:</span>
                    <span style={{ color: '#ffffff', fontSize: '1.25rem', fontWeight: 700 }}>{formatMoney(amount)}</span>
                </div>

                {existingLoan && (
                    <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '8px', color: '#f59e0b', fontSize: '0.85rem' }}>
                        Esta tarjeta ya tiene una financiación activa. Se sumarán {formatMoney(amount)} a tu deuda actual de {formatMoney(existingLoan.currentDebt || 0)}. El simulador calcula sobre el total.
                    </div>
                )}

                <div style={{ display: 'flex', gap: '8px', backgroundColor: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '10px' }}>
                    <button type="button" style={tabStyle(calculationMode === 'quota')} onClick={() => setCalculationMode('quota')}>
                        Quiero fijar Cuota
                    </button>
                    <button type="button" style={tabStyle(calculationMode === 'months')} onClick={() => setCalculationMode('months')}>
                        Quiero fijar Plazo
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>TIN Anual (%) <span style={{ color: '#ef4444' }}>*</span></label>
                        <input 
                            type="number" 
                            style={inputStyle} 
                            value={tin} 
                            onChange={e => setTin(e.target.value !== '' ? Number(e.target.value) : '')} 
                            placeholder="Ej. 18.5 (0 para sin intereses)" 
                        />
                    </div>

                    {calculationMode === 'quota' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>Cuota Mensual Fija (€) <span style={{ color: '#ef4444' }}>*</span></label>
                            <input 
                                type="number" 
                                style={inputStyle} 
                                value={monthlyQuota} 
                                onChange={e => setMonthlyQuota(e.target.value !== '' ? Number(e.target.value) : '')} 
                                placeholder="Ej. 50" 
                            />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>Plazo (Meses) <span style={{ color: '#ef4444' }}>*</span></label>
                            <input 
                                type="number" 
                                style={inputStyle} 
                                value={months} 
                                onChange={e => setMonths(e.target.value !== '' ? Number(e.target.value) : '')} 
                                placeholder="Ej. 6" 
                            />
                        </div>
                    )}
                </div>

                {results && (
                    <div style={{ marginTop: '8px', padding: '16px', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {'error' in results ? (
                            <div style={{ color: '#ef4444', fontSize: '0.9rem', textAlign: 'center' }}>{results.error}</div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'rgba(255,255,255, 0.7)', fontSize: '0.9rem' }}>Cuota Mensual "Normal"</span>
                                    <span style={{ color: '#ffffff', fontSize: '1.2rem', fontWeight: 600 }}>{formatMoney(results.quota)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'rgba(255,255,255, 0.7)', fontSize: '0.9rem' }}>Tiempo de amortización</span>
                                    <span style={{ color: '#ffffff', fontSize: '1rem', fontWeight: 500 }}>{results.months} meses</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'rgba(255,255,255, 0.7)', fontSize: '0.9rem' }}>Última Cuota (Ajuste final)</span>
                                    <span style={{ color: '#10b981', fontSize: '1rem', fontWeight: 500 }}>
                                        {overrideLastQuota !== '' ? formatMoney(Number(overrideLastQuota)) : formatMoney(results.lastQuota)}
                                    </span>
                                </div>
                                <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'rgba(255,255,255, 0.7)', fontSize: '0.9rem' }}>Intereses Totales</span>
                                    <span style={{ color: '#ef4444', fontSize: '1rem', fontWeight: 500 }}>{formatMoney(results.totalInterest)}</span>
                                </div>
                                <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'rgba(255,255,255, 0.7)', fontSize: '0.9rem' }}>Total a pagar (Importe + Int. + Com.)</span>
                                    <span style={{ color: '#ffffff', fontSize: '1.2rem', fontWeight: 700 }}>
                                        {formatMoney((amount + (existingLoan?.currentDebt || 0)) + results.totalInterest + (openingFee !== '' ? Number(openingFee) : 0))}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                )}

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                    <button 
                        type="button"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                        {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        Ajustes Avanzados de Banco (Opcional)
                    </button>

                    {showAdvanced && (
                        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Comisiones / Gastos extra (€)</label>
                                    <input type="number" step="0.01" style={{...inputStyle, padding: '8px'}} value={openingFee} onChange={e => handleOpeningFeeChange(e.target.value)} placeholder="Ej. 15" />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>TAE Real (%)</label>
                                    <input type="number" step="0.01" style={{...inputStyle, padding: '8px', color: '#10b981', fontWeight: 'bold'}} value={tae} onChange={e => handleTaeChange(e.target.value)} placeholder="Ej. 24" />
                                </div>
                            </div>
                            <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Fijar 1ª Cuota</label>
                                    <input type="number" step="0.01" style={{...inputStyle, padding: '8px'}} value={overrideFirstQuota} onChange={e => setOverrideFirstQuota(e.target.value ? Number(e.target.value) : '')} placeholder="Auto" />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Fijar Última Cuota</label>
                                    <input type="number" step="0.01" style={{...inputStyle, padding: '8px'}} value={overrideLastQuota} onChange={e => setOverrideLastQuota(e.target.value ? Number(e.target.value) : '')} placeholder="Auto" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {!existingLoan && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>¿Cuándo se cobrará la primera cuota?</label>
                        <input 
                            type="date"
                            style={inputStyle}
                            value={firstQuotaDate}
                            onChange={(e) => setFirstQuotaDate(e.target.value)}
                        />
                    </div>
                )}

                <button 
                    onClick={handleFinance}
                    disabled={isSubmitting || !results || 'error' in results}
                    style={{
                        backgroundColor: '#3b82f6',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '14px',
                        fontSize: '1rem',
                        fontWeight: 600,
                        cursor: (isSubmitting || !results || 'error' in results) ? 'not-allowed' : 'pointer',
                        opacity: (isSubmitting || !results || 'error' in results) ? 0.5 : 1,
                        marginTop: '10px'
                    }}
                >
                    Confirmar Financiación
                </button>
            </div>
        </div></ModalPortal>
    );
};

export default FinanceCardModal;
