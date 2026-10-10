import React, { useState, useEffect, useMemo } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { X, Calculator, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import type { Loan, PaymentMethod } from '../../types/finance';
import { formatMoney, computeTae, computeCommissionsFromTae, isItemInMonthAndYear } from '../../utils/financeCalculations';
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
    const { addLoan, updateLoan, accounts, cards = [], recurringExpenses = [], expenses = [], updateExpense, addRecurringExpense } = useFinance();
    
    // Basic Details
    const [name, setName] = useState('');
    const [linkedAccountId, setLinkedAccountId] = useState(accounts.find(a => a.isMain)?.id || accounts[0]?.id || '');
    const [supportedByCardId, setSupportedByCardId] = useState<string>('');
    const [doesNotConsumeCardLimit, setDoesNotConsumeCardLimit] = useState<boolean>(editingLoan?.doesNotConsumeCardLimit || false);
    const [showImportCardModal, setShowImportCardModal] = useState<boolean>(false);
    const [selectedImportCardId, setSelectedImportCardId] = useState<string>('');
    const [selectedImportExpenseIds, setSelectedImportExpenseIds] = useState<string[]>([]);
    const [importedExpenseIds, setImportedExpenseIds] = useState<string[]>([]);
    
    // Mathematics
    const [amount, setAmount] = useState<number | ''>('');
    const [amortizedAmount, setAmortizedAmount] = useState<number | ''>('');
    const [tin, setTin] = useState<number | ''>('');
    
    // Dates
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0];
    const [grantDate, setGrantDate] = useState(today);
    const [startDate, setStartDate] = useState(nextMonth); // First payment date
    
    // Current month payment toggle state
    const [isCurrentMonthPaid, setIsCurrentMonthPaid] = useState<boolean>(true);
    const [isCurrentMonthPaidLocked, setIsCurrentMonthPaidLocked] = useState<boolean>(false);

    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const currentMonthName = monthNames[new Date().getMonth()];

    const [calculationMode, setCalculationMode] = useState<'quota' | 'months'>('quota');
    const [monthlyQuota, setMonthlyQuota] = useState<number | ''>('');
    const [months, setMonths] = useState<number | ''>('');
    
    // Advanced Settings
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [overrideFirstQuota, setOverrideFirstQuota] = useState<number | ''>('');
    const [overrideFirstQuotaInterest, setOverrideFirstQuotaInterest] = useState<number | ''>('');
    const [firstInstallmentInterestOnly, setFirstInstallmentInterestOnly] = useState<boolean>(false);
    const [overrideLastQuota, setOverrideLastQuota] = useState<number | ''>('');
    const [openingFee, setOpeningFee] = useState<number | ''>('');
    const [tae, setTae] = useState<number | ''>('');
    const [earlyAmortizationFee, setEarlyAmortizationFee] = useState<number | ''>('');
    const [commissionType, setCommissionType] = useState<'legal_standard' | 'manual'>('legal_standard');
    const [commissionRateOver1Year, setCommissionRateOver1Year] = useState<number | ''>(1.0);
    const [commissionRateUnder1Year, setCommissionRateUnder1Year] = useState<number | ''>(0.5);
    const [commissionRate, setCommissionRate] = useState<number | ''>('');
    const [amountMode, setAmountMode] = useState<'principal' | 'total_cost'>('principal');

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        if (editingLoan) {
            setName(editingLoan.name || '');
            const cardId = editingLoan.supportedByCardId || editingLoan.issuingCardId;
            const cardObj = cardId ? cards.find(c => c.id === cardId) : null;
            const resolvedAccount = editingLoan.linkedAccountId || (cardObj?.linkedAccountId || accounts.find(a => a.isMain)?.id || accounts[0]?.id || '');
            setLinkedAccountId(resolvedAccount);
            setSupportedByCardId(cardId || '');
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

            // Check if current month is in ignoredPeriods or has paid expense of linked recurring expense
            if (editingLoan.linkedRecurringExpenseId) {
                const rec = recurringExpenses.find(r => r.id === editingLoan.linkedRecurringExpenseId);
                const now = new Date();
                const curMonth = now.getMonth() + 1;
                const curYear = now.getFullYear();
                const curPeriod = `${curYear}-${String(curMonth).padStart(2, '0')}`;

                const isIgnored = !!rec?.ignoredPeriods?.includes(curPeriod);
                const hasPaidExpense = expenses.some(exp => 
                    exp.recurringExpenseId === editingLoan.linkedRecurringExpenseId && 
                    isItemInMonthAndYear(exp, curMonth, curYear)
                );

                if (isIgnored || hasPaidExpense) {
                    setIsCurrentMonthPaid(true);
                    setIsCurrentMonthPaidLocked(true);
                } else {
                    setIsCurrentMonthPaid(false);
                    setIsCurrentMonthPaidLocked(false);
                }
            } else {
                setIsCurrentMonthPaidLocked(false);
            }
            
            if (editingLoan.monthlyPayment) {
                setCalculationMode('quota');
                setMonthlyQuota(editingLoan.monthlyPayment);
            }
            if (editingLoan.months) {
                setMonths(editingLoan.months);
            }
            
            setCommissionType(editingLoan.commissionType || 'legal_standard');
            setCommissionRateOver1Year(editingLoan.commissionRateOver1Year !== undefined ? editingLoan.commissionRateOver1Year : 1.0);
            setCommissionRateUnder1Year(editingLoan.commissionRateUnder1Year !== undefined ? editingLoan.commissionRateUnder1Year : 0.5);
            setCommissionRate(editingLoan.commissionRate !== undefined ? editingLoan.commissionRate : '');

            if (editingLoan.firstInstallmentAmount !== undefined || editingLoan.firstInstallmentInterestAmount !== undefined || editingLoan.lastInstallmentAmount !== undefined || editingLoan.openingFee !== undefined || editingLoan.earlyAmortizationFee !== undefined || editingLoan.firstInstallmentInterestOnly || editingLoan.commissionType !== undefined) {
                setOverrideFirstQuota(editingLoan.firstInstallmentAmount !== undefined ? editingLoan.firstInstallmentAmount : '');
                setOverrideFirstQuotaInterest(editingLoan.firstInstallmentInterestAmount !== undefined ? editingLoan.firstInstallmentInterestAmount : '');
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
            setIsCurrentMonthPaidLocked(false);
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
            setIsCurrentMonthPaidLocked(false);
        }
    }, [editingLoan, initialData, accounts, recurringExpenses]);

    useEffect(() => {
        if (!editingLoan && startDate) {
            const now = new Date();
            const curY = now.getFullYear();
            const curM = now.getMonth() + 1;
            const curD = now.getDate();
            const curPeriod = `${curY}-${String(curM).padStart(2, '0')}`;

            const parts = startDate.split('-');
            if (parts.length === 3) {
                const startY = Number(parts[0]);
                const startM = Number(parts[1]);
                const payDay = Number(parts[2]);
                const startPeriod = `${startY}-${String(startM).padStart(2, '0')}`;

                if (startPeriod < curPeriod) {
                    setIsCurrentMonthPaid(true);
                } else if (startPeriod === curPeriod) {
                    setIsCurrentMonthPaid(curD >= payDay);
                } else {
                    setIsCurrentMonthPaid(false);
                }
            }
        }
    }, [startDate, editingLoan]);

    const calculateDaysBetween = (start: string, end: string) => {
        const d1 = new Date(start);
        const d2 = new Date(end);
        const timeDiff = d2.getTime() - d1.getTime();
        return Math.ceil(timeDiff / (1000 * 3600 * 24));
    };

    const round2 = (num: number) => Math.round(num * 100) / 100;

    useEffect(() => {
        if (overrideFirstQuota !== '' && !firstInstallmentInterestOnly && overrideFirstQuotaInterest === '' && grantDate && startDate && tin !== '' && amount !== '') {
            const days = calculateDaysBetween(grantDate, startDate);
            if (days > 0 && days < 30) {
                const suggestedInt = round2((Number(amount) * (Number(tin) / 100 / 360)) * days);
                if (suggestedInt > 0 && suggestedInt < Number(overrideFirstQuota)) {
                    setOverrideFirstQuotaInterest(suggestedInt);
                }
            }
        }
    }, [overrideFirstQuota, firstInstallmentInterestOnly, grantDate, startDate, tin, amount]);

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

            const now = new Date();
            const curY = now.getFullYear();
            const curM = now.getMonth();
            const curPeriod = `${curY}-${String(curM + 1).padStart(2, '0')}`;

            const startD = new Date(startDate);
            const startY = startD.getFullYear();
            const startM = startD.getMonth();
            
            // Build ignoredPeriods array for all past months & months prior to startDate
            const ignoredSet = new Set<string>();
            const existingRec = editingLoan?.linkedRecurringExpenseId
                ? recurringExpenses.find(r => r.id === editingLoan.linkedRecurringExpenseId)
                : undefined;
            (existingRec?.ignoredPeriods || []).forEach(p => ignoredSet.add(p));

            // If start date is in the past, ignore months between start date and current month
            let tempY = startY;
            let tempM = startM;
            while (tempY < curY || (tempY === curY && tempM < curM)) {
                const pStr = `${tempY}-${String(tempM + 1).padStart(2, '0')}`;
                ignoredSet.add(pStr);
                tempM++;
                if (tempM > 11) {
                    tempM = 0;
                    tempY++;
                }
            }

            // If start date is in the future, ignore all months between current month and start date (excluding start month)
            if (startY > curY || (startY === curY && startM > curM)) {
                let loopY = curY;
                let loopM = curM;
                while (loopY < startY || (loopY === startY && loopM < startM)) {
                    const pStr = `${loopY}-${String(loopM + 1).padStart(2, '0')}`;
                    ignoredSet.add(pStr);
                    loopM++;
                    if (loopM > 11) {
                        loopM = 0;
                        loopY++;
                    }
                }
            }

            if (isCurrentMonthPaid) {
                ignoredSet.add(curPeriod);
            } else if (startY < curY || (startY === curY && startM <= curM)) {
                // Only un-ignore current period if startDate is at or before current month
                ignoredSet.delete(curPeriod);
            }

            const finalIgnoredPeriods = Array.from(ignoredSet);

            const cardObj = supportedByCardId ? cards.find(c => c.id === supportedByCardId) : null;
            const targetAccountId = supportedByCardId
                ? (cardObj?.linkedAccountId || linkedAccountId || accounts.find(a => a.isMain)?.id || accounts[0]?.id || '')
                : (linkedAccountId || accounts.find(a => a.isMain)?.id || accounts[0]?.id || '');

            const recPaymentMethod: PaymentMethod = {
                type: 'account',
                accountId: targetAccountId
            };

            const loanMonths = Number((results as any).months) || 0;
            let loanExpirationDate: number | undefined = undefined;
            if (startDate && loanMonths > 0) {
                const startDObj = new Date(startDate);
                const endDObj = new Date(startDObj.getFullYear(), startDObj.getMonth() + loanMonths, payDay || startDObj.getDate());
                loanExpirationDate = endDObj.getTime();
            }

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
                    linkedAccountId: targetAccountId || undefined,
                    supportedByCardId: supportedByCardId || undefined,
                    issuingCardId: supportedByCardId || undefined,
                    doesNotConsumeCardLimit: supportedByCardId ? doesNotConsumeCardLimit : false,
                    paymentChargeType: supportedByCardId ? 'card' : 'account',
                    firstInstallmentAmount: overrideFirstQuota !== '' ? Number(overrideFirstQuota) : undefined,
                    firstInstallmentInterestOnly: firstInstallmentInterestOnly,
                    firstInstallmentInterestAmount: overrideFirstQuotaInterest !== '' ? Number(overrideFirstQuotaInterest) : undefined,
                    lastInstallmentAmount: overrideLastQuota !== '' ? Number(overrideLastQuota) : ((results as any).lastQuota || undefined),
                    openingFee: openingFee !== '' ? Number(openingFee) : undefined,
                    earlyAmortizationFee: earlyAmortizationFee !== '' ? Number(earlyAmortizationFee) : undefined,
                    commissionType,
                    commissionRateOver1Year: commissionType === 'legal_standard' ? (commissionRateOver1Year !== '' ? Number(commissionRateOver1Year) : 1.0) : undefined,
                    commissionRateUnder1Year: commissionType === 'legal_standard' ? (commissionRateUnder1Year !== '' ? Number(commissionRateUnder1Year) : 0.5) : undefined,
                    commissionRate: commissionType === 'manual' ? (commissionRate !== '' ? Number(commissionRate) : 0) : undefined,
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
                        sourceAccountId: targetAccountId,
                        paymentMethod: recPaymentMethod,
                        categoryId: 'cat_loans',
                        ignoredPeriods: finalIgnoredPeriods,
                        expirationDate: loanExpirationDate
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
                    sourceAccountId: targetAccountId,
                    paymentMethod: recPaymentMethod,
                    categoryId: 'cat_loans',
                    ignoredPeriods: finalIgnoredPeriods,
                    expirationDate: loanExpirationDate
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
                    linkedAccountId: targetAccountId || undefined,
                    supportedByCardId: supportedByCardId || undefined,
                    issuingCardId: supportedByCardId || undefined,
                    doesNotConsumeCardLimit: supportedByCardId ? doesNotConsumeCardLimit : false,
                    paymentChargeType: supportedByCardId ? 'card' : 'account',
                    linkedRecurringExpenseId: recId,
                    firstInstallmentAmount: overrideFirstQuota !== '' ? Number(overrideFirstQuota) : undefined,
                    firstInstallmentInterestOnly: firstInstallmentInterestOnly,
                    firstInstallmentInterestAmount: overrideFirstQuotaInterest !== '' ? Number(overrideFirstQuotaInterest) : undefined,
                    lastInstallmentAmount: overrideLastQuota !== '' ? Number(overrideLastQuota) : ((results as any).lastQuota || undefined),
                    openingFee: openingFee !== '' ? Number(openingFee) : undefined,
                    earlyAmortizationFee: earlyAmortizationFee !== '' ? Number(earlyAmortizationFee) : undefined,
                    commissionType,
                    commissionRateOver1Year: commissionType === 'legal_standard' ? (commissionRateOver1Year !== '' ? Number(commissionRateOver1Year) : 1.0) : undefined,
                    commissionRateUnder1Year: commissionType === 'legal_standard' ? (commissionRateUnder1Year !== '' ? Number(commissionRateUnder1Year) : 0.5) : undefined,
                    commissionRate: commissionType === 'manual' ? (commissionRate !== '' ? Number(commissionRate) : 0) : undefined,
                    status: remaining === 0 ? 'paid' : 'active'
                };

                await addLoan(newLoan);

                if (importedExpenseIds.length > 0) {
                    for (const expId of importedExpenseIds) {
                        const expToUpdate = expenses.find(e => e.id === expId);
                        if (expToUpdate) {
                            await updateExpense({ ...expToUpdate, isFinanced: true, financedLoanId: newLoan.id });
                        }
                    }
                }
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>
                    {editingLoan ? 'Editar Préstamo' : 'Nuevo Préstamo'}
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {!editingLoan && cards.some(c => c.type === 'credit') && (
                        <button
                            type="button"
                            onClick={() => {
                                const firstCard = cards.find(c => c.type === 'credit');
                                setSelectedImportCardId(firstCard?.id || '');
                                setShowImportCardModal(true);
                            }}
                            style={{
                                background: 'rgba(99, 102, 241, 0.15)',
                                color: '#818cf8',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                padding: '0.4rem 0.75rem',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem'
                            }}
                        >
                            📥 Importar compra de tarjeta
                        </button>
                    )}
                    {(onClose || onCancelEdit) && (
                        <button type="button" onClick={onCancelEdit || onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                            <X size={20} />
                        </button>
                    )}
                </div>
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
                            const cardId = val.replace('card:', '');
                            setSupportedByCardId(cardId);
                            const cardObj = cards.find(c => c.id === cardId);
                            if (cardObj?.linkedAccountId) {
                                setLinkedAccountId(cardObj.linkedAccountId);
                            }
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

                {supportedByCardId && (
                    <div style={{ marginTop: '0.6rem', background: 'rgba(99, 102, 241, 0.1)', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={doesNotConsumeCardLimit}
                                onChange={e => setDoesNotConsumeCardLimit(e.target.checked)}
                                style={{ width: '16px', height: '16px', accentColor: '#6366f1' }}
                            />
                            Financiación Promocional / Especial (No descuenta del límite disponible de la tarjeta)
                        </label>
                        <p style={{ margin: '0.3rem 0 0 1.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)', lineHeight: '1.4' }}>
                            Actívalo para compras a plazos sin intereses (ej. Carrefour 3 meses), Dinero Express o préstamos preautorizados que no consumen tu límite habitual.
                        </p>
                    </div>
                )}
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

            {/* Current Month Paid Toggle */}
            <div style={{
                padding: '0.85rem 1rem',
                borderRadius: '0.75rem',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.12)'
            }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: isCurrentMonthPaidLocked ? 'not-allowed' : 'pointer', margin: 0 }}>
                    <div style={{ paddingRight: '0.75rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'white', display: 'block' }}>
                            ¿Cuota del mes actual ({currentMonthName}) ya pagada?
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '2px', display: 'block' }}>
                            Si la marcas como pagada, no aparecerá como pendiente en el Dashboard de este mes.
                        </span>
                        {isCurrentMonthPaidLocked && (
                            <span style={{ fontSize: '0.72rem', color: '#10b981', marginTop: '4px', display: 'block', fontWeight: 600 }}>
                                ✓ La cuota de este mes ya consta como pagada en tus registros y no se puede desmarcar.
                            </span>
                        )}
                    </div>
                    <input
                        type="checkbox"
                        checked={isCurrentMonthPaid}
                        disabled={isCurrentMonthPaidLocked}
                        onChange={e => !isCurrentMonthPaidLocked && setIsCurrentMonthPaid(e.target.checked)}
                        style={{
                            width: '18px',
                            height: '18px',
                            cursor: isCurrentMonthPaidLocked ? 'not-allowed' : 'pointer',
                            accentColor: 'var(--color-primary)',
                            opacity: isCurrentMonthPaidLocked ? 0.6 : 1
                        }}
                    />
                </label>
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
                        {overrideFirstQuota !== '' && !firstInstallmentInterestOnly && (
                            <div style={{ marginTop: '0.4rem' }}>
                                <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.2rem' }}>Intereses 1ª cuota (€)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={overrideFirstQuotaInterest}
                                    onChange={e => setOverrideFirstQuotaInterest(e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder="Ej. 24.88"
                                    style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '0.4rem', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: 'white', fontSize: '0.8rem', boxSizing: 'border-box' }}
                                />
                            </div>
                        )}
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

            {/* Comisión por Amortización Anticipada */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', padding: '0.85rem', borderRadius: '0.75rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: '0.5rem' }}>
                    ⚖️ Comisión por Amortización Anticipada
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <button
                        type="button"
                        onClick={() => setCommissionType('legal_standard')}
                        style={{
                            flex: 1,
                            padding: '0.45rem 0.6rem',
                            borderRadius: '0.5rem',
                            border: commissionType === 'legal_standard' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                            background: commissionType === 'legal_standard' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.04)',
                            color: commissionType === 'legal_standard' ? '#10b981' : 'rgba(255,255,255,0.6)',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Estándar Legal (Por Plazo)
                    </button>
                    <button
                        type="button"
                        onClick={() => setCommissionType('manual')}
                        style={{
                            flex: 1,
                            padding: '0.45rem 0.6rem',
                            borderRadius: '0.5rem',
                            border: commissionType === 'manual' ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
                            background: commissionType === 'manual' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.04)',
                            color: commissionType === 'manual' ? '#818cf8' : 'rgba(255,255,255,0.6)',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Porcentaje Fijo / Exento
                    </button>
                </div>

                {commissionType === 'legal_standard' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.3rem' }}>Quedando &gt; 1 año (%)</label>
                            <input
                                type="number"
                                step="0.05"
                                min="0"
                                max="10"
                                value={commissionRateOver1Year}
                                onChange={e => setCommissionRateOver1Year(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="1.0"
                                style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: 'white', fontSize: '0.85rem', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.3rem' }}>Quedando ≤ 1 año (%)</label>
                            <input
                                type="number"
                                step="0.05"
                                min="0"
                                max="10"
                                value={commissionRateUnder1Year}
                                onChange={e => setCommissionRateUnder1Year(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="0.5"
                                style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: 'white', fontSize: '0.85rem', boxSizing: 'border-box' }}
                            />
                        </div>
                    </div>
                ) : (
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.3rem' }}>Porcentaje de Comisión Fijo (%)</label>
                        <input
                            type="number"
                            step="0.05"
                            min="0"
                            max="10"
                            value={commissionRate}
                            onChange={e => setCommissionRate(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="0.0 (Sin comisión)"
                            style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: 'white', fontSize: '0.85rem', boxSizing: 'border-box' }}
                        />
                    </div>
                )}
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

    const importModalContent = showImportCardModal && (
        <ModalPortal>
            <div className="modal-overlay" onClick={() => setShowImportCardModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
                <div className="modal-container glass-panel" style={{ padding: '1.5rem', maxWidth: '480px', width: '100%', position: 'relative', background: '#1e2028', borderRadius: '1.25rem', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Importar Compra de Tarjeta a Plazos</h3>
                        <button type="button" onClick={() => setShowImportCardModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
                            <X size={20} />
                        </button>
                    </div>

                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.4rem', fontWeight: 600 }}>1. Selecciona la Tarjeta de Crédito:</label>
                        <select
                            value={selectedImportCardId}
                            onChange={e => {
                                setSelectedImportCardId(e.target.value);
                                setSelectedImportExpenseIds([]);
                            }}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.9rem' }}
                        >
                            <option value="">-- Elige una tarjeta --</option>
                            {cards.filter(c => c.type === 'credit').map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {selectedImportCardId && (() => {
                        const cardExpenses = expenses.filter(exp => 
                            exp.paymentMethod?.type === 'card' && 
                            exp.paymentMethod.cardId === selectedImportCardId &&
                            !exp.isFinanced
                        ).sort((a, b) => b.date - a.date);

                        if (cardExpenses.length === 0) {
                            return (
                                <div style={{ padding: '1.5rem', textAlign: 'center', opacity: 0.6, fontSize: '0.85rem' }}>
                                    No hay compras disponibles para financiar en esta tarjeta.
                                </div>
                            );
                        }

                        const selectedExpenses = cardExpenses.filter(e => selectedImportExpenseIds.includes(e.id));
                        const totalSelectedAmount = selectedExpenses.reduce((sum, e) => sum + e.amount, 0);
                        const impCard = cards.find(c => c.id === selectedImportCardId);

                        const toggleSelectAll = () => {
                            if (selectedImportExpenseIds.length === cardExpenses.length) {
                                setSelectedImportExpenseIds([]);
                            } else {
                                setSelectedImportExpenseIds(cardExpenses.map(e => e.id));
                            }
                        };

                        const toggleItem = (id: string) => {
                            if (selectedImportExpenseIds.includes(id)) {
                                setSelectedImportExpenseIds(selectedImportExpenseIds.filter(i => i !== id));
                            } else {
                                setSelectedImportExpenseIds([...selectedImportExpenseIds, id]);
                            }
                        };

                        return (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>2. Selecciona las compras a financiar:</label>
                                    <button
                                        type="button"
                                        onClick={toggleSelectAll}
                                        style={{ background: 'transparent', border: 'none', color: '#818cf8', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        {selectedImportExpenseIds.length === cardExpenses.length ? 'Desmarcar todas' : 'Seleccionar todas'}
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '220px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                                    {cardExpenses.map(exp => {
                                        const isSelected = selectedImportExpenseIds.includes(exp.id);
                                        return (
                                            <div
                                                key={exp.id}
                                                onClick={() => toggleItem(exp.id)}
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '0.75rem 1rem',
                                                    borderRadius: '10px',
                                                    background: isSelected ? 'rgba(99, 102, 241, 0.18)' : 'rgba(255,255,255,0.05)',
                                                    border: isSelected ? '1px solid #818cf8' : '1px solid rgba(255,255,255,0.1)',
                                                    color: 'white',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => {}} // handled by parent div onClick
                                                        style={{ accentColor: '#6366f1', width: '16px', height: '16px', cursor: 'pointer' }}
                                                    />
                                                    <div>
                                                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{exp.description}</div>
                                                        <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{new Date(exp.date).toLocaleDateString('es-ES')}</div>
                                                    </div>
                                                </div>
                                                <div style={{ fontWeight: 800, color: isSelected ? '#a5b4fc' : '#818cf8', fontSize: '0.95rem' }}>
                                                    {formatMoney(exp.amount)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div style={{ fontSize: '0.85rem' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.7)' }}>Seleccionado: </span>
                                        <strong>{selectedImportExpenseIds.length} compras</strong> ({formatMoney(totalSelectedAmount)})
                                    </div>
                                    <button
                                        type="button"
                                        disabled={selectedImportExpenseIds.length === 0}
                                        onClick={() => {
                                            if (selectedImportExpenseIds.length === 0) return;

                                            setAmount(totalSelectedAmount);

                                            if (!name || name.trim() === '') {
                                                if (selectedExpenses.length === 1) {
                                                    setName(selectedExpenses[0].description);
                                                } else {
                                                    setName(`Financiación ${selectedExpenses.length} compras ${impCard?.name || 'Tarjeta'}`);
                                                }
                                            }

                                            setSupportedByCardId(selectedImportCardId);
                                            if (impCard?.linkedAccountId) {
                                                setLinkedAccountId(impCard.linkedAccountId);
                                            }
                                            setImportedExpenseIds(selectedImportExpenseIds);
                                            setShowImportCardModal(false);
                                        }}
                                        style={{
                                            background: selectedImportExpenseIds.length > 0 ? '#6366f1' : 'rgba(255,255,255,0.1)',
                                            color: selectedImportExpenseIds.length > 0 ? 'white' : 'rgba(255,255,255,0.4)',
                                            border: 'none',
                                            padding: '0.6rem 1.1rem',
                                            borderRadius: '8px',
                                            fontWeight: 700,
                                            fontSize: '0.85rem',
                                            cursor: selectedImportExpenseIds.length > 0 ? 'pointer' : 'not-allowed',
                                            transition: 'background 0.2s ease'
                                        }}
                                    >
                                        📥 Importar {selectedImportExpenseIds.length} {selectedImportExpenseIds.length === 1 ? 'compra' : 'compras'}
                                    </button>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>
        </ModalPortal>
    );

    if (onClose || onCancelEdit) {
        return (
            <>
                {importModalContent}
                <ModalPortal>
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                        <div style={{ background: 'linear-gradient(145deg, #1e1e2d 0%, #151521 100%)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '1.25rem', width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem', color: 'white' }}>
                            {formContent}
                        </div>
                    </div>
                </ModalPortal>
            </>
        );
    }

    return (
        <>
            {importModalContent}
            {formContent}
        </>
    );
};

export default LoanForm;