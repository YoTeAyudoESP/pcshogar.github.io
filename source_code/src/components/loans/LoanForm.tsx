import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { X, Calculator, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import type { Loan } from '../../types/finance';
import { formatMoney, computeTae, computeCommissionsFromTae } from '../../utils/financeCalculations';
import { v4 as uuidv4 } from 'uuid';

interface LoanFormProps {
    editingLoan?: Loan;
    onCancelEdit?: () => void;
    onClose?: () => void;
}

const LoanForm: React.FC<LoanFormProps> = ({ editingLoan, onCancelEdit, onClose }) => {
    const { addLoan, updateLoan, accounts, addRecurringExpense } = useFinance();
    
    // Basic Details
    const [name, setName] = useState('');
    const [linkedAccountId, setLinkedAccountId] = useState(accounts.find(a => a.isMain)?.id || accounts[0]?.id || '');
    
    // Mathematics
    const [amount, setAmount] = useState<number | ''>('');
    const [tin, setTin] = useState<number | ''>('');
    
    // Dates
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0];
    const [grantDate, setGrantDate] = useState(today);
    const [startDate, setStartDate] = useState(nextMonth); // First payment date
    
    const [calculationMode, setCalculationMode] = useState<'quota' | 'months'>('quota');
    const [monthlyQuota, setMonthlyQuota] = useState<number | ''>('');
    const [months, setMonths] = useState<number | ''>('');
    
    // Advanced Settings
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [overrideFirstQuota, setOverrideFirstQuota] = useState<number | ''>('');
    const [overrideLastQuota, setOverrideLastQuota] = useState<number | ''>('');
    const [openingFee, setOpeningFee] = useState<number | ''>('');
    const [tae, setTae] = useState<number | ''>('');
    const [earlyAmortizationFee, setEarlyAmortizationFee] = useState<number | ''>('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (overlayRef.current) {
            overlayRef.current.scrollTop = 0;
        }
    }, []);

    useEffect(() => {
        if (editingLoan) {
            setName(editingLoan.name || '');
            setLinkedAccountId(editingLoan.linkedAccountId || '');
            setAmount(editingLoan.totalAmount || '');
            setTin(editingLoan.tin !== undefined ? editingLoan.tin : '');
            
            if (editingLoan.grantDate) {
                setGrantDate(new Date(editingLoan.grantDate).toISOString().split('T')[0]);
            }
            if (editingLoan.startDate) {
                setStartDate(new Date(editingLoan.startDate).toISOString().split('T')[0]);
            }
            
            if (editingLoan.monthlyPayment) {
                setCalculationMode('quota');
                setMonthlyQuota(editingLoan.monthlyPayment);
            }
            
            if (editingLoan.firstInstallmentAmount !== undefined || editingLoan.lastInstallmentAmount !== undefined || editingLoan.openingFee !== undefined || editingLoan.earlyAmortizationFee !== undefined) {
                if (editingLoan.firstInstallmentAmount !== undefined) setOverrideFirstQuota(editingLoan.firstInstallmentAmount);
                if (editingLoan.lastInstallmentAmount !== undefined) setOverrideLastQuota(editingLoan.lastInstallmentAmount);
                if (editingLoan.openingFee !== undefined) setOpeningFee(editingLoan.openingFee);
                if (editingLoan.earlyAmortizationFee !== undefined) setEarlyAmortizationFee(editingLoan.earlyAmortizationFee);
                setShowAdvanced(true);
            }
        } else {
            setName('');
            setLinkedAccountId(accounts.find(a => a.isMain)?.id || accounts[0]?.id || '');
            setAmount('');
            setTin('');
            setGrantDate(today);
            setStartDate(nextMonth);
            setCalculationMode('quota');
            setMonthlyQuota('');
            setMonths('');
            setOverrideFirstQuota('');
            setOverrideLastQuota('');
            setOpeningFee('');
            setEarlyAmortizationFee('');
            setShowAdvanced(false);
        }
    }, [editingLoan, accounts]);

    const calculateDaysBetween = (start: string, end: string) => {
        const d1 = new Date(start);
        const d2 = new Date(end);
        const timeDiff = d2.getTime() - d1.getTime();
        return Math.ceil(timeDiff / (1000 * 3600 * 24));
    };

    const round2 = (num: number) => Math.round(num * 100) / 100;

    const results = useMemo(() => {
        let P = Number(amount);
        if (!P || tin === '') return null;
        
        const annualRate = Number(tin) / 100;
        const monthlyRate = annualRate / 12;
        
        let daysToFirstPayment = 30; // Default if dates are missing or invalid
        if (grantDate && startDate) {
            const exactDays = calculateDaysBetween(grantDate, startDate);
            if (exactDays > 0 && exactDays < 100) { // Sane limits
                daysToFirstPayment = exactDays;
            }
        }

        let firstQ = overrideFirstQuota !== '' ? Number(overrideFirstQuota) : undefined;
        let monthsCount = 0;
        let totalInterest = 0;
        let M = 0;
        let finalLastQ = 0;
        
        const firstInterest = round2(P * (annualRate / 365) * daysToFirstPayment);

        if (calculationMode === 'months' && months && Number(months) > 0) {
            const n = Number(months);
            
            if (monthlyRate === 0) {
                M = firstQ !== undefined ? (P - firstQ) / (n - 1) : P / n;
                M = round2(M);
            } else {
                if (firstQ !== undefined) {
                    const firstAmortization = round2(firstQ - firstInterest);
                    let newP = P - firstAmortization;
                    totalInterest += firstInterest;
                    monthsCount = 1;
                    M = n > 1 ? (newP * monthlyRate * Math.pow(1 + monthlyRate, n - 1)) / (Math.pow(1 + monthlyRate, n - 1) - 1) : 0;
                    M = round2(M);
                } else {
                    M = (P * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
                    M = round2(M);
                }
            }
            
            let currentP = P;
            let currentTotalInt = 0;
            let currentMonths = 0;

            while (currentP > 0.01 && currentMonths < 1200) {
                let interest = 0;
                if (currentMonths === 0) {
                    interest = firstInterest;
                } else {
                    interest = round2(currentP * monthlyRate);
                }
                
                currentTotalInt += interest;
                
                let quotaToPay = M;
                if (currentMonths === 0 && firstQ !== undefined) {
                    quotaToPay = firstQ;
                }

                let amortization = round2(quotaToPay - interest);
                
                if (amortization <= 0 && monthlyRate > 0 && !(currentMonths === 0 && firstQ !== undefined)) {
                    return { error: 'La cuota es menor que los intereses.' };
                }

                if (currentP - amortization < 0.01) {
                    finalLastQ = round2(currentP + interest);
                    currentP = 0;
                } else {
                    currentP = round2(currentP - amortization);
                }
                currentMonths++;
            }

            return {
                quota: M,
                months: currentMonths,
                totalPaid: round2(P + currentTotalInt),
                totalInterest: round2(currentTotalInt),
                lastQuota: finalLastQ
            };

        } else if (calculationMode === 'quota' && monthlyQuota && Number(monthlyQuota) > 0) {
            M = Number(monthlyQuota);
            
            let currentP = P;
            let currentMonths = 0;
            let currentTotalInt = 0;

            while (currentP > 0.01 && currentMonths < 1200) {
                let interest = 0;
                if (currentMonths === 0) {
                    interest = firstInterest;
                } else {
                    interest = round2(currentP * monthlyRate);
                }
                
                let quotaToPay = M;
                if (currentMonths === 0 && firstQ !== undefined) {
                    quotaToPay = firstQ;
                }

                let amortization = round2(quotaToPay - interest);
                
                if (amortization <= 0 && monthlyRate > 0 && !(currentMonths === 0 && firstQ !== undefined)) {
                    return { error: 'La cuota no cubre ni los intereses.' };
                }
                
                currentTotalInt += interest;

                if (currentP - amortization < 0.01) {
                    finalLastQ = round2(currentP + interest);
                    currentP = 0;
                } else {
                    currentP = round2(currentP - amortization);
                }
                currentMonths++;
            }

            return {
                quota: M,
                months: currentMonths,
                totalPaid: round2(P + currentTotalInt),
                totalInterest: round2(currentTotalInt),
                lastQuota: finalLastQ
            };
        }

        return null;
    }, [amount, tin, calculationMode, monthlyQuota, months, overrideFirstQuota, grantDate, startDate]);


    const handleOpeningFeeChange = (val: string) => {
        const fee = val ? Number(val) : '';
        setOpeningFee(fee);
        if (fee !== '' && amount && tin !== '' && results?.months) {
            setTae(computeTae(Number(amount), results.months, Number(tin), Number(fee)));
        } else {
            setTae('');
        }
    };

    const handleTaeChange = (val: string) => {
        const t = val ? Number(val) : '';
        setTae(t);
        if (t !== '' && amount && tin !== '' && results?.months) {
            setOpeningFee(computeCommissionsFromTae(Number(amount), results.months, Number(tin), Number(t)));
        } else {
            setOpeningFee('');
        }
    };

    useEffect(() => {
        if (openingFee !== '' && amount && tin !== '' && results?.months) {
            setTae(computeTae(Number(amount), results.months, Number(tin), Number(openingFee)));
        } else {
            setTae('');
        }
    }, [amount, tin, results?.months]); // Auto-sync when loan parameters change

    const handleSubmit = async () => {
        if (!name.trim()) return;
        if (!amount || Number(amount) <= 0) return;
        if (tin === '') return;
        if (!results || results.error) return;

        setIsSubmitting(true);
        
        try {
            const P = Number(amount);
            const loanData: Partial<Loan> = {
                name,
                totalAmount: P,
                currentDebt: P,
                remainingAmount: P,
                monthlyPayment: results.quota,
                monthlyInstallment: results.quota,
                firstInstallmentAmount: overrideFirstQuota !== '' ? Number(overrideFirstQuota) : undefined,
                lastInstallmentAmount: overrideLastQuota !== '' ? Number(overrideLastQuota) : undefined,
                grantDate: grantDate ? new Date(grantDate).getTime() : undefined,
                startDate: startDate ? new Date(startDate).getTime() : Date.now(),
                linkedAccountId,
                currency: 'EUR',
                status: 'active',
                isPaid: false,
                color: '#10b981',
                tin: Number(tin),
                openingFee: openingFee !== '' ? Number(openingFee) : undefined,
                earlyAmortizationFee: earlyAmortizationFee !== '' ? Number(earlyAmortizationFee) : undefined,
                updatedAt: Date.now()
            };

            let loanId = editingLoan ? editingLoan.id : uuidv4();
            let recId = editingLoan?.linkedRecurringExpenseId || uuidv4();

            if (!editingLoan) {
                const payDay = new Date(startDate).getDate();
                const newRecId = await addRecurringExpense({
                    description: `Cuota Préstamo: ${name}`,
                    amount: results.quota as number,
                    currency: 'EUR',
                    frequency: 'monthly',
                    paymentDay: payDay,
                    active: true,
                    sourceAccountId: linkedAccountId,
                    categoryId: 'cat_loans'
                });
                await addLoan({ ...loanData, id: loanId, linkedRecurringExpenseId: newRecId } as Loan);
            } else {
                await updateLoan({ ...editingLoan, ...loanData } as Loan);
            }
            
            if (onCancelEdit) onCancelEdit();
            if (onClose) onClose();
        } catch (error) {
            console.error('Error guardando préstamo:', error);
            setIsSubmitting(false);
        }
    };

    const inputStyle = { width: '100%', padding: '0.8rem', borderRadius: '0.75rem', border: '1px solid var(--panel-border)', background: 'var(--panel-bg-3)', color: 'var(--text-main)', fontSize: '0.95rem' };
    const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'rgba(var(--color-rgb-light), 0.7)', marginBottom: '0.4rem' };
    const requiredSpan = <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>;

    return (
        <div className="modal-overlay" ref={overlayRef}>
            <div style={{
                background: '#121212',
                borderRadius: '1.5rem',
                width: '100%',
                maxWidth: '650px',
                padding: '2rem',
                boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
                border: '1px solid var(--panel-border)',
                position: 'relative',
                maxHeight: '90vh',
                overflowY: 'auto'
            }}>
                <button 
                    type="button" 
                    onClick={() => { if (onCancelEdit) onCancelEdit(); if (onClose) onClose(); }}
                    style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'rgba(var(--color-rgb-light), 0.5)', cursor: 'pointer' }}
                >
                    <X size={24} />
                </button>

                <h2 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Calculator size={24} color="#10b981" />
                    {editingLoan ? 'Editar Préstamo' : 'Simular / Crear Préstamo'}
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                        <label style={labelStyle}>Nombre del Préstamo{requiredSpan}</label>
                        <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Coche, Reforma..." />
                    </div>
                    <div>
                        <label style={labelStyle}>Cuenta de Cobro{requiredSpan}</label>
                        <select style={inputStyle} value={linkedAccountId} onChange={e => setLinkedAccountId(e.target.value)}>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name} ({formatMoney(acc.balance)})</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                        <label style={labelStyle}>Importe a Financiar (€){requiredSpan}</label>
                        <input type="number" step="0.01" style={inputStyle} value={amount} onChange={e => setAmount(e.target.value ? Number(e.target.value) : '')} placeholder="Ej. 15000" />
                    </div>
                    <div>
                        <label style={labelStyle}>TIN Anual (%){requiredSpan}</label>
                        <input type="number" step="0.01" style={inputStyle} value={tin} onChange={e => setTin(e.target.value !== '' ? Number(e.target.value) : '')} placeholder="Ej. 6.5" />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                        <label style={labelStyle}>Fecha Concesión (Dinero en cuenta){requiredSpan}</label>
                        <input type="date" style={inputStyle} value={grantDate} onChange={e => setGrantDate(e.target.value)} />
                    </div>
                    <div>
                        <label style={labelStyle}>Fecha Primer Pago{requiredSpan}</label>
                        <input type="date" style={inputStyle} value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                </div>

                {/* Calculation Mode */}
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '12px', marginBottom: '1rem' }}>
                    <button
                        onClick={() => setCalculationMode('quota')}
                        style={{
                            flex: 1, padding: '10px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600,
                            background: calculationMode === 'quota' ? 'rgba(255,255,255,0.1)' : 'transparent',
                            color: calculationMode === 'quota' ? 'white' : 'rgba(255,255,255,0.5)',
                        }}
                    >
                        Fijar Cuota Mensual
                    </button>
                    <button
                        onClick={() => setCalculationMode('months')}
                        style={{
                            flex: 1, padding: '10px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600,
                            background: calculationMode === 'months' ? 'rgba(255,255,255,0.1)' : 'transparent',
                            color: calculationMode === 'months' ? 'white' : 'rgba(255,255,255,0.5)',
                        }}
                    >
                        Fijar Plazo (Meses)
                    </button>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    {calculationMode === 'quota' ? (
                        <div>
                            <label style={labelStyle}>¿Cuánto quieres pagar al mes? (€){requiredSpan}</label>
                            <input type="number" step="0.01" style={inputStyle} value={monthlyQuota} onChange={e => setMonthlyQuota(e.target.value ? Number(e.target.value) : '')} placeholder="Ej. 300" />
                        </div>
                    ) : (
                        <div>
                            <label style={labelStyle}>¿En cuántos meses quieres pagarlo?{requiredSpan}</label>
                            <input type="number" style={inputStyle} value={months} onChange={e => setMonths(e.target.value ? Number(e.target.value) : '')} placeholder="Ej. 60" />
                        </div>
                    )}
                </div>

                <div style={{ background: results && !results.error ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0,0,0,0.2)', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.5rem', border: `1px solid ${results && !results.error ? 'rgba(16, 185, 129, 0.3)' : 'var(--panel-border)'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: results && !results.error ? '#10b981' : 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                        <RefreshCw size={18} className={!results ? "spin" : ""} />
                        Simulación de Amortización Real
                    </div>
                    
                    {results?.error ? (
                        <div style={{ color: '#ef4444' }}>{results.error}</div>
                    ) : results ? (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.85rem', color: 'rgba(var(--color-rgb-light), 0.7)', marginBottom: '0.2rem' }}>Cuota Normal (Redondeada)</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>{formatMoney(results.quota)}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.85rem', color: 'rgba(var(--color-rgb-light), 0.7)', marginBottom: '0.2rem' }}>Plazo Total</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>{results.months} meses</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.85rem', color: 'rgba(var(--color-rgb-light), 0.7)', marginBottom: '0.2rem' }}>Última Cuota (Ajuste Final)</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#10b981' }}>{overrideLastQuota !== '' ? formatMoney(Number(overrideLastQuota)) + ' (Manual)' : formatMoney(results.lastQuota)}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.85rem', color: 'rgba(var(--color-rgb-light), 0.7)', marginBottom: '0.2rem' }}>Intereses Totales al Banco</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#ef4444' }}>{formatMoney(results.totalInterest)}</div>
                                </div>
                            </div>
                            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                                    Total a pagar (Importe + Intereses + Comisiones)
                                </div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>
                                    {formatMoney(Number(amount) + (results.totalInterest || 0) + (openingFee !== '' ? Number(openingFee) : 0))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>Introduce el importe y el TIN para ver la simulación en tiempo real.</div>
                    )}
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'rgba(var(--color-rgb-light), 0.6)', cursor: 'pointer', fontSize: '0.9rem', padding: '0.5rem 0' }}
                    >
                        {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        Ajustes Avanzados de Banco (Opcional)
                    </button>
                    
                    {showAdvanced && (
                        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={labelStyle}>Comisiones / Gastos extra (€)</label>
                                    <input type="number" step="0.01" style={{...inputStyle, background: 'var(--panel-bg)'}} value={openingFee} onChange={e => handleOpeningFeeChange(e.target.value)} placeholder="Ej. 150" />
                                </div>
                                <div>
                                    <label style={labelStyle}>TAE Real (%)</label>
                                    <input type="number" step="0.01" style={{...inputStyle, background: 'var(--panel-bg)', color: '#10b981', fontWeight: 'bold'}} value={tae} onChange={e => handleTaeChange(e.target.value)} placeholder="Ej. 6.8" />
                                </div>
                                <div>
                                    <label style={labelStyle}>Penalización Amort. Anticipada (%)</label>
                                    <input type="number" step="0.01" style={{...inputStyle, background: 'var(--panel-bg)'}} value={earlyAmortizationFee} onChange={e => setEarlyAmortizationFee(e.target.value ? Number(e.target.value) : '')} placeholder="Ej. 1.0" />
                                </div>
                            </div>
                            <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={labelStyle}>Fijar Primera Cuota (€)</label>
                                    <input type="number" step="0.01" style={{...inputStyle, background: 'var(--panel-bg)'}} value={overrideFirstQuota} onChange={e => setOverrideFirstQuota(e.target.value ? Number(e.target.value) : '')} placeholder="Copia de tu recibo" />
                                </div>
                                <div>
                                    <label style={labelStyle}>Fijar Última Cuota (€)</label>
                                    <input type="number" step="0.01" style={{...inputStyle, background: 'var(--panel-bg)'}} value={overrideLastQuota} onChange={e => setOverrideLastQuota(e.target.value ? Number(e.target.value) : '')} placeholder="Copia de tu recibo" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button 
                        type="button" 
                        onClick={() => { if (onCancelEdit) onCancelEdit(); if (onClose) onClose(); }}
                        style={{ flex: 1, padding: '1rem', borderRadius: '1rem', border: '1px solid var(--panel-border)', background: 'transparent', color: 'white', fontWeight: 600, cursor: 'pointer' }}
                    >
                        Cerrar (Sólo Simulación)
                    </button>
                    <button 
                        onClick={handleSubmit}
                        disabled={!name || !amount || tin === '' || !results || !!results.error || isSubmitting}
                        style={{ flex: 1, padding: '1rem', borderRadius: '1rem', border: 'none', background: (!name || !amount || tin === '' || !results || !!results.error || isSubmitting) ? 'var(--panel-border)' : 'var(--primary-color)', color: 'white', fontWeight: 600, cursor: (!name || !amount || tin === '' || !results || !!results.error || isSubmitting) ? 'not-allowed' : 'pointer' }}
                    >
                        {isSubmitting ? 'Guardando...' : 'Confirmar Préstamo'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoanForm;