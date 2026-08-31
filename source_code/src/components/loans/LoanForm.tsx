import React, { useState, useEffect, useMemo } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { X, Calculator, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import type { Loan } from '../../types/finance';
import { formatMoney, computeTae, computeCommissionsFromTae } from '../../utils/financeCalculations';
import { v4 as uuidv4 } from 'uuid';
import ModalPortal from '../common/ModalPortal';

interface LoanFormProps {
    editingLoan?: Loan;
    initialData?: {
        name?: string;
        amount?: number;
        tin?: number;
        tae?: number;
        months?: number;
        monthlyQuota?: number;
    };
    onCancelEdit?: () => void;
    onClose?: () => void;
}

const LoanForm: React.FC<LoanFormProps> = ({ editingLoan, initialData, onCancelEdit, onClose }) => {
    const { addLoan, updateLoan, accounts, cards = [], addRecurringExpense } = useFinance();
    
    // Basic Details
    const [name, setName] = useState('');
    const [linkedAccountId, setLinkedAccountId] = useState(accounts.find(a => a.isMain)?.id || accounts[0]?.id || '');
    const [supportedByCardId, setSupportedByCardId] = useState<string>('');
    
    // Mathematics
    const [amount, setAmount] = useState<number | ''>('');
    const [amortizedAmount, setAmortizedAmount] = useState<number | ''>('');
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
    const [firstInstallmentInterestOnly, setFirstInstallmentInterestOnly] = useState<boolean>(false);
    const [overrideLastQuota, setOverrideLastQuota] = useState<number | ''>('');
    const [openingFee, setOpeningFee] = useState<number | ''>('');
    const [tae, setTae] = useState<number | ''>('');
    const [earlyAmortizationFee, setEarlyAmortizationFee] = useState<number | ''>('');
    const [amountMode, setAmountMode] = useState<'principal' | 'total_cost'>('principal');

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        if (editingLoan) {
            setName(editingLoan.name || '');
            setLinkedAccountId(editingLoan.linkedAccountId || '');
            setSupportedByCardId(editingLoan.supportedByCardId || '');
            setAmount(editingLoan.totalAmount || '');
            setAmortizedAmount((editingLoan.totalAmount || 0) - (editingLoan.remainingAmount || 0));
            setTin(editingLoan.tin !== undefined ? editingLoan.tin : '');
            setTae(editingLoan.tae !== undefined ? editingLoan.tae : '');
            setAmountMode(editingLoan.amountMode || 'principal');
            
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
            if (editingLoan.months) {
                setMonths(editingLoan.months);
            }
            
            if (editingLoan.firstInstallmentAmount !== undefined || editingLoan.lastInstallmentAmount !== undefined || editingLoan.openingFee !== undefined || editingLoan.earlyAmortizationFee !== undefined) {
                setOverrideFirstQuota(editingLoan.firstInstallmentAmount !== undefined ? editingLoan.firstInstallmentAmount : '');
                setFirstInstallmentInterestOnly(!!editingLoan.firstInstallmentInterestOnly);
                setOverrideLastQuota(editingLoan.lastInstallmentAmount !== undefined ? editingLoan.lastInstallmentAmount : '');
                if (editingLoan.openingFee !== undefined) setOpeningFee(editingLoan.openingFee);
                if (editingLoan.earlyAmortizationFee !== undefined) setEarlyAmortizationFee(editingLoan.earlyAmortizationFee);
                setShowAdvanced(true);
            }
        } else if (initialData) {
            if (initialData.name) setName(initialData.name);
            if (initialData.amount) setAmount(initialData.amount);
            if (initialData.tin !== undefined) setTin(initialData.tin);
            if (initialData.tae !== undefined) setTae(initialData.tae);
            if (initialData.months) setMonths(initialData.months);
            if (initialData.monthlyQuota) {
                setCalculationMode('quota');
                setMonthlyQuota(initialData.monthlyQuota);
            }
        } else {
            setName('');
            setLinkedAccountId(accounts.find(a => a.isMain)?.id || accounts[0]?.id || '');
            setSupportedByCardId('');
            setAmount('');
            setAmortizedAmount('');
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
    }, [editingLoan, initialData, accounts]);

    const calculateDaysBetween = (start: string, end: string) => {
        const d1 = new Date(start);
        const d2 = new Date(end);
        const timeDiff = d2.getTime() - d1.getTime();
        return Math.ceil(timeDiff / (1000 * 3600 * 24));
    };

    const round2 = (num: number) => Math.round(num * 100) / 100;

    const results = useMemo(() => {
        let P = Number(amount);
        const actualTin = tin === '' ? 0 : Number(tin);
        if (!P) return null;
        
        const annualRate = actualTin / 100;
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

                currentTotalInt += interest;

                let quotaToPay = M;
                if (currentMonths === 0 && firstQ !== undefined) {
                    quotaToPay = firstQ;
                }

                let amortization = round2(quotaToPay - interest);

                if (amortization <= 0 && monthlyRate > 0 && !(currentMonths === 0 && firstQ !== undefined)) {
                    return { error: 'La cuota es menor o igual a los intereses generados.' };
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
        }

        return null;
    }, [amount, tin, calculationMode, monthlyQuota, months, grantDate, startDate, overrideFirstQuota]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !amount || !results || (results as any).error) return;
        
        setIsSubmitting(true);
        try {
            const totalAmt = Number(amount);
            const amortized = amortizedAmount === '' ? 0 : Number(amortizedAmount);
            const remaining = Math.max(0, totalAmt - amortized);
            const payDay = new Date(startDate).getDate() || 1;

            if (editingLoan) {
                const updatedLoan: Loan = {
                    ...editingLoan,
                    name,
                    totalAmount: totalAmt,
                    remainingAmount: remaining,
                    currentDebt: remaining,
                    monthlyPayment: (results as any).quota,
                    monthlyInstallment: (results as any).quota,
                    currency: 'EUR',
                    tin: tin === '' ? undefined : Number(tin),
                    tae: tae === '' ? undefined : Number(tae),
                    amountMode: amountMode,
                    grantDate: new Date(grantDate).getTime(),
                    startDate: new Date(startDate).getTime(),
                    linkedAccountId: supportedByCardId ? undefined : linkedAccountId,
                    supportedByCardId: supportedByCardId || undefined,
                    firstInstallmentAmount: overrideFirstQuota !== '' ? Number(overrideFirstQuota) : undefined,
                    lastInstallmentAmount: (results as any).lastQuota || undefined,
                    openingFee: openingFee !== '' ? Number(openingFee) : undefined,
                    earlyAmortizationFee: earlyAmortizationFee !== '' ? Number(earlyAmortizationFee) : undefined,
                    status: remaining === 0 ? 'paid' : 'active'
                };

                await updateLoan(updatedLoan);

                if (editingLoan.linkedRecurringExpenseId) {
                    await addRecurringExpense({
                        id: editingLoan.linkedRecurringExpenseId,
                        description: `Cuota Préstamo: ${name}`,
                        amount: (results as any).quota,
                        currency: 'EUR',
                        frequency: 'monthly',
                        paymentDay: payDay,
                        active: remaining > 0,
                        sourceAccountId: supportedByCardId ? undefined : linkedAccountId,
                        categoryId: 'cat_loans'
                    } as any);
                }
            } else {
                const recId = uuidv4();
                
                await addRecurringExpense({
                    id: recId,
                    description: `Cuota Préstamo: ${name}`,
                    amount: (results as any).quota,
                    currency: 'EUR',
                    frequency: 'monthly',
                    paymentDay: payDay,
                    active: true,
                    sourceAccountId: supportedByCardId ? undefined : linkedAccountId,
                    categoryId: 'cat_loans'
                } as any);

                const newLoan: Loan = {
                    id: uuidv4(),
                    name,
                    totalAmount: totalAmt,
                    remainingAmount: remaining,
                    currentDebt: remaining,
                    monthlyPayment: (results as any).quota,
                    monthlyInstallment: (results as any).quota,
                    months: (results as any).months,
                    currency: 'EUR',
                    tin: tin === '' ? undefined : Number(tin),
                    tae: tae === '' ? undefined : Number(tae),
                    amountMode: amountMode,
                    grantDate: new Date(grantDate).getTime(),
                    startDate: new Date(startDate).getTime(),
                    linkedAccountId: supportedByCardId ? undefined : linkedAccountId,
                    supportedByCardId: supportedByCardId || undefined,
                    linkedRecurringExpenseId: recId,
                    firstInstallmentAmount: overrideFirstQuota !== '' ? Number(overrideFirstQuota) : undefined,
                    firstInstallmentInterestOnly: firstInstallmentInterestOnly,
                    lastInstallmentAmount: (results as any).lastQuota || undefined,
                    openingFee: openingFee !== '' ? Number(openingFee) : undefined,
                    earlyAmortizationFee: earlyAmortizationFee !== '' ? Number(earlyAmortizationFee) : undefined,
                    status: remaining === 0 ? 'paid' : 'active'
                };

                await addLoan(newLoan);
            }

            if (onCancelEdit) onCancelEdit();
            if (onClose) onClose();
        } catch (err) {
            console.error('Error saving loan:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const formContent = (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>
                    {editingLoan ? 'Editar Préstamo' : 'Nuevo Préstamo'}
                </h3>
                {(onClose || onCancelEdit) && (
                    <button type="button" onClick={onCancelEdit || onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                )}
            </div>

            <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem' }}>Nombre del Préstamo</label>
                <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ej. Coche Nuevo, Reforma Cocina"
                    required
                    style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '0.95rem', boxSizing: 'border-box' }}
                />
            </div>

            <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem' }}>Pago / Cargo asociado a:</label>
                <select
                    value={supportedByCardId ? `card:${supportedByCardId}` : linkedAccountId}
                    onChange={e => {
                        const val = e.target.value;
                        if (val.startsWith('card:')) {
                            setSupportedByCardId(val.replace('card:', ''));
                            setLinkedAccountId('');
                        } else {
                            setSupportedByCardId('');
                            setLinkedAccountId(val);
                        }
                    }}
                    style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '0.95rem', boxSizing: 'border-box' }}
                    required
                >
                    <optgroup label="Cuentas Bancarias">
                        {accounts.map(a => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                    </optgroup>
                    <optgroup label="Tarjetas de Crédito">
                        {cards.filter(c => c.type === 'credit').map(c => (
                            <option key={c.id} value={`card:${c.id}`}>{c.name}</option>
                        ))}
                    </optgroup>
                </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem' }}>Importe Total (€)</label>
                    <input
                        type="number"
                        step="0.01"
                        min="1"
                        value={amount}
                        onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="Ej. 10000"
                        required
                        style={{ width: '100%', padding: '0.85rem 0.75rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '0.9rem', boxSizing: 'border-box' }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem' }}>TIN (%)</label>
                    <input
                        type="number"
                        step="0.0001"
                        min="0"
                        value={tin}
                        onChange={e => setTin(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="Ej. 6.7913"
                        style={{ width: '100%', padding: '0.85rem 0.75rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '0.9rem', boxSizing: 'border-box' }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem' }}>TAE (%)</label>
                    <input
                        type="number"
                        step="0.0001"
                        min="0"
                        value={tae}
                        onChange={e => setTae(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="Ej. 6.8125"
                        style={{ width: '100%', padding: '0.85rem 0.75rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '0.9rem', boxSizing: 'border-box' }}
                    />
                </div>
            </div>

            {(tin !== '' || tae !== '') && (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '0.85rem', borderRadius: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#60a5fa', marginBottom: '0.5rem' }}>
                        ¿Qué representa el Importe Total configurado ({amount ? formatMoney(Number(amount)) : '0 €'})?
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                name="amountMode"
                                checked={amountMode === 'principal'}
                                onChange={() => setAmountMode('principal')}
                                style={{ marginTop: '2px' }}
                            />
                            <div>
                                <strong>Capital Solicitado al Banco</strong>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Dinero principal líquido que prestó la entidad (sin intereses).</div>
                            </div>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                name="amountMode"
                                checked={amountMode === 'total_cost'}
                                onChange={() => setAmountMode('total_cost')}
                                style={{ marginTop: '2px' }}
                            />
                            <div>
                                <strong>Coste Total del Préstamo (Suma de Cuotas)</strong>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Suma total acumulada de todas las cuotas incluyendo intereses.</div>
                            </div>
                        </label>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem' }}>Fecha Concesión</label>
                    <input
                        type="date"
                        value={grantDate}
                        onChange={e => setGrantDate(e.target.value)}
                        required
                        style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '0.95rem', boxSizing: 'border-box' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem' }}>Primer Pago (Cuota)</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        required
                        style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '0.95rem', boxSizing: 'border-box' }}
                    />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem' }}>Modo de Cálculo</label>
                    <select
                        value={calculationMode}
                        onChange={e => setCalculationMode(e.target.value as any)}
                        style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '0.95rem', boxSizing: 'border-box' }}
                    >
                        <option value="quota">Indicar Cuota Mensual</option>
                        <option value="months">Indicar Plazo (Meses)</option>
                    </select>
                </div>

                {calculationMode === 'quota' ? (
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem' }}>Cuota Mensual (€)</label>
                        <input
                            type="number"
                            step="0.01"
                            min="1"
                            value={monthlyQuota}
                            onChange={e => setMonthlyQuota(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="Ej. 185"
                            required
                            style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '0.95rem', boxSizing: 'border-box' }}
                        />
                    </div>
                ) : (
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem' }}>Duración (Meses)</label>
                        <input
                            type="number"
                            min="1"
                            value={months}
                            onChange={e => setMonths(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="Ej. 60"
                            required
                            style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '0.95rem', boxSizing: 'border-box' }}
                        />
                    </div>
                )}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', padding: '0.85rem', borderRadius: '0.75rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: '0.5rem' }}>
                    Cuotas Especiales (Opcional)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.3rem' }}>Primera Cuota (€)</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={overrideFirstQuota}
                            onChange={e => setOverrideFirstQuota(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="Misma cuota"
                            style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: 'white', fontSize: '0.85rem', boxSizing: 'border-box' }}
                        />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: '#93c5fd', marginTop: '0.4rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={firstInstallmentInterestOnly}
                                onChange={e => setFirstInstallmentInterestOnly(e.target.checked)}
                            />
                            <span>1ª cuota solo intereses (Carencia)</span>
                        </label>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.3rem' }}>Última Cuota (€)</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={overrideLastQuota}
                            onChange={e => setOverrideLastQuota(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="Misma cuota"
                            style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: 'white', fontSize: '0.85rem', boxSizing: 'border-box' }}
                        />
                    </div>
                </div>
            </div>

            {results && !(results as any).error && (
                <div style={{ background: 'rgba(99, 102, 241, 0.08)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(99, 102, 241, 0.2)', fontSize: '0.85rem', lineHeight: '1.6' }}>
                    <div><strong>Cuota estimada:</strong> {formatMoney((results as any).quota)} / mes</div>
                    <div><strong>Plazo total:</strong> {(results as any).months} meses</div>
                    {startDate && (results as any).months && (
                        <div><strong>Fecha Fin Estimada:</strong> {(() => {
                            const d = new Date(startDate);
                            d.setMonth(d.getMonth() + (results as any).months - 1);
                            const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                            return `${monthNames[d.getMonth()]} de ${d.getFullYear()}`;
                        })()}</div>
                    )}
                    <div><strong>Total Intereses:</strong> {formatMoney((results as any).totalInterest)}</div>
                    <div><strong>Total Amortizado:</strong> {formatMoney((results as any).totalPaid)}</div>
                </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                {(onCancelEdit || onClose) && (
                    <button
                        type="button"
                        onClick={onCancelEdit || onClose}
                        style={{ flex: 1, padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'white', fontWeight: 600, cursor: 'pointer' }}
                    >
                        Cancelar
                    </button>
                )}
                <button
                    type="submit"
                    disabled={isSubmitting || !results || !!(results as any).error}
                    style={{ flex: 1.5, padding: '0.85rem', borderRadius: '0.75rem', border: 'none', background: 'var(--color-primary)', color: 'white', fontWeight: 700, cursor: 'pointer', opacity: isSubmitting ? 0.6 : 1 }}
                >
                    {editingLoan ? 'Guardar Cambios' : 'Crear Préstamo'}
                </button>
            </div>
        </form>
    );

    if (onClose || onCancelEdit) {
        return (
            <ModalPortal>
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div style={{ background: 'linear-gradient(145deg, #1e1e2d 0%, #151521 100%)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '1.25rem', width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem', color: 'white' }}>
                        {formContent}
                    </div>
                </div>
            </ModalPortal>
        );
    }

    return formContent;
};

export default LoanForm;