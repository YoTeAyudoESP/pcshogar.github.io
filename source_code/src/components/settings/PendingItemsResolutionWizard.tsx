import React, { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { 
    Calendar, 
    CheckCircle2, 
    Clock, 
    XCircle, 
    ArrowRight, 
    CreditCard, 
    AlertCircle,
    ArrowUpRight,
    ArrowDownLeft
} from 'lucide-react';
import { formatMoney } from '../../utils/financeCalculations';
import ModalPortal from '../common/ModalPortal';

interface PendingItem {
    id: string;
    type: 'expense' | 'income';
    name: string;
    amount: number;
    currency?: string;
    categoryId?: string;
    paymentMethod?: any;
    linkedAccountId?: string;
    originalItem: any;
}

interface PendingItemsResolutionWizardProps {
    pendingExpenses: any[];
    pendingIncomes: any[];
    fromYear: number;
    fromMonth: number;
    onComplete: () => void;
    onClose: () => void;
}

const PendingItemsResolutionWizard: React.FC<PendingItemsResolutionWizardProps> = ({
    pendingExpenses,
    pendingIncomes,
    fromYear,
    fromMonth,
    onComplete,
    onClose
}) => {
    const { 
        accounts, 
        addExpense, 
        addExtraIncome, 
        updateRecurringExpense, 
        updateIncome 
    } = useFinance();

    const fromPeriod = `${fromYear}-${(fromMonth + 1).toString().padStart(2, '0')}`;
    const nextMonthObj = new Date(fromYear, fromMonth + 1, 1);
    const targetPeriod = `${nextMonthObj.getFullYear()}-${(nextMonthObj.getMonth() + 1).toString().padStart(2, '0')}`;
    const targetYear = nextMonthObj.getFullYear();
    const targetMonth = nextMonthObj.getMonth();

    // Combine pending items into a unified list
    const pendingList: PendingItem[] = [
        ...pendingExpenses.map(re => ({
            id: re.id,
            type: 'expense' as const,
            name: re.description || re.name || 'Gasto Recurrente',
            amount: Math.abs(re.amount),
            currency: re.currency,
            categoryId: re.categoryId,
            paymentMethod: re.paymentMethod,
            originalItem: re
        })),
        ...pendingIncomes.map(inc => ({
            id: inc.id,
            type: 'income' as const,
            name: inc.name || 'Ingreso Fijo',
            amount: Math.abs(inc.amount),
            currency: inc.currency,
            categoryId: inc.categoryId,
            linkedAccountId: inc.linkedAccountId,
            originalItem: inc
        }))
    ];

    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAction, setSelectedAction] = useState<'paid' | 'postpone' | 'cancel' | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Form inputs for 'paid' option
    const lastDayOfMonth = new Date(fromYear, fromMonth + 1, 0).getDate();
    const defaultDateStr = `${fromPeriod}-${lastDayOfMonth.toString().padStart(2, '0')}`;
    const [paidDate, setPaidDate] = useState(defaultDateStr);
    const [accountId, setAccountId] = useState(() => accounts.find(a => a.isMain)?.id || accounts[0]?.id || '');

    const currentItem = pendingList[currentIndex];
    const isExpense = currentItem?.type === 'expense';
    const totalItems = pendingList.length;

    if (!currentItem || currentIndex >= totalItems) {
        onComplete();
        return null;
    }

    const minDateStr = `${fromPeriod}-01`;
    const maxDateStr = `${fromPeriod}-${lastDayOfMonth.toString().padStart(2, '0')}`;

    const handleConfirmStep = async () => {
        if (!selectedAction) return;
        setIsProcessing(true);

        try {
            const item = currentItem.originalItem;
            const ignored = item.ignoredPeriods || [];

            if (selectedAction === 'paid') {
                const paidTime = new Date(paidDate).getTime();
                if (currentItem.type === 'expense') {
                    await addExpense({
                        description: currentItem.name,
                        amount: currentItem.amount,
                        currency: (currentItem.currency as any) || 'EUR',
                        date: paidTime,
                        categoryId: currentItem.categoryId || 'cat_other',
                        paymentMethod: { type: 'account', accountId: accountId || accounts[0]?.id },
                        isFixed: false,
                        status: 'paid',
                        period: fromPeriod,
                        recurringExpenseId: currentItem.id
                    });
                } else {
                    await addExtraIncome({
                        name: currentItem.name,
                        amount: currentItem.amount,
                        currency: (currentItem.currency as any) || 'EUR',
                        receivedDate: paidTime,
                        effectiveDate: paidTime,
                        budgetMonth: fromMonth,
                        budgetYear: fromYear,
                        status: 'received',
                        categoryId: currentItem.categoryId,
                        fixedIncomeId: currentItem.id,
                        linkedAccountId: accountId || accounts[0]?.id
                    });
                }
            } else if (selectedAction === 'postpone') {
                // Ignore in fromPeriod
                if (!ignored.includes(fromPeriod)) {
                    const newIgnored = [...ignored, fromPeriod];
                    if (currentItem.type === 'expense') {
                        await updateRecurringExpense({ ...item, ignoredPeriods: newIgnored });
                    } else {
                        await updateIncome({ ...item, ignoredPeriods: newIgnored });
                    }
                }
                // Add delayed pending item to targetPeriod (dated 1st of targetPeriod)
                const targetTime = new Date(targetYear, targetMonth, 1).getTime();
                if (currentItem.type === 'expense') {
                    await addExpense({
                        description: `(Aplazado) ${currentItem.name}`,
                        amount: currentItem.amount,
                        currency: (currentItem.currency as any) || 'EUR',
                        date: targetTime,
                        categoryId: currentItem.categoryId || 'cat_other',
                        paymentMethod: { type: 'account', accountId: accountId || accounts[0]?.id },
                        isFixed: false,
                        status: 'pending',
                        period: targetPeriod
                    });
                } else {
                    await addExtraIncome({
                        name: `(Aplazado) ${currentItem.name}`,
                        amount: currentItem.amount,
                        currency: (currentItem.currency as any) || 'EUR',
                        receivedDate: targetTime,
                        effectiveDate: targetTime,
                        budgetMonth: targetMonth,
                        budgetYear: targetYear,
                        status: 'pending',
                        categoryId: currentItem.categoryId
                    });
                }
            } else if (selectedAction === 'cancel') {
                // Ignore in fromPeriod
                if (!ignored.includes(fromPeriod)) {
                    const newIgnored = [...ignored, fromPeriod];
                    if (currentItem.type === 'expense') {
                        await updateRecurringExpense({ ...item, ignoredPeriods: newIgnored });
                    } else {
                        await updateIncome({ ...item, ignoredPeriods: newIgnored });
                    }
                }
            }

            // Move to next item
            setSelectedAction(null);
            if (currentIndex + 1 >= totalItems) {
                onComplete();
            } else {
                setCurrentIndex(prev => prev + 1);
            }
        } catch (err) {
            console.error("Error processing pending item step", err);
            alert("Hubo un error al guardar la decisión.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <ModalPortal>
            <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1100,
                padding: '1rem'
            }}>
                <div className="glass-panel" style={{
                    width: '100%',
                    maxWidth: '560px',
                    padding: '2rem',
                    borderRadius: '1.5rem',
                    background: 'rgba(25, 27, 40, 0.98)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                }}>
                    {/* Header Progress */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span style={{ fontSize: '0.85rem', color: '#60a5fa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Cierre de Mes ({fromPeriod}) • Paso 1 de 2
                            </span>
                            <h2 style={{ margin: '0.25rem 0 0 0', fontSize: '1.4rem', color: 'white', fontWeight: 700 }}>
                                Resolver Movimiento Pendiente ({currentIndex + 1} de {totalItems})
                            </h2>
                        </div>
                        <div style={{
                            padding: '0.4rem 0.8rem',
                            background: 'rgba(59, 130, 246, 0.15)',
                            color: '#60a5fa',
                            borderRadius: '2rem',
                            fontSize: '0.85rem',
                            fontWeight: 700
                        }}>
                            {currentIndex + 1} / {totalItems}
                        </div>
                    </div>

                    {/* Pending Item Info Card */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        padding: '1.25rem',
                        borderRadius: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '12px',
                                background: isExpense ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: isExpense ? '#f43f5e' : '#10b981'
                            }}>
                                {isExpense ? <ArrowUpRight size={24} /> : <ArrowDownLeft size={24} />}
                            </div>
                            <div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>
                                    {currentItem.name}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                                    {isExpense ? 'Gasto Fijo Pendiente' : 'Ingreso Fijo Pendiente'} • {fromPeriod}
                                </div>
                            </div>
                        </div>
                        <div style={{
                            fontSize: '1.4rem',
                            fontWeight: 800,
                            color: isExpense ? '#f43f5e' : '#10b981'
                        }}>
                            {formatMoney(currentItem.amount)}
                        </div>
                    </div>

                    <div style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
                        ¿Qué deseas hacer con este movimiento en el mes de {fromPeriod}?
                    </div>

                    {/* Options Selection */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {/* Option A: Paid */}
                        <div 
                            onClick={() => setSelectedAction('paid')}
                            style={{
                                padding: '1rem',
                                borderRadius: '0.9rem',
                                border: selectedAction === 'paid' ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                                background: selectedAction === 'paid' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.75rem'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <CheckCircle2 size={20} style={{ color: selectedAction === 'paid' ? '#10b981' : 'rgba(255,255,255,0.4)' }} />
                                <div>
                                    <div style={{ fontWeight: 700, color: 'white', fontSize: '1rem' }}>
                                        Sí, se {isExpense ? 'pagó' : 'cobró'} en {fromPeriod}
                                    </div>
                                    <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)' }}>
                                        Registrar el movimiento real en el mes de {fromPeriod}.
                                    </div>
                                </div>
                            </div>

                            {selectedAction === 'paid' && (
                                <div style={{
                                    marginTop: '0.5rem',
                                    paddingTop: '0.75rem',
                                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '0.75rem'
                                }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>
                                            Fecha en {fromPeriod}:
                                        </label>
                                        <input 
                                            type="date"
                                            value={paidDate}
                                            min={minDateStr}
                                            max={maxDateStr}
                                            onChange={(e) => setPaidDate(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '0.5rem',
                                                borderRadius: '0.5rem',
                                                background: 'rgba(0,0,0,0.4)',
                                                border: '1px solid rgba(255,255,255,0.2)',
                                                color: 'white',
                                                fontSize: '0.9rem'
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>
                                            Cuenta bancaria:
                                        </label>
                                        <select 
                                            value={accountId}
                                            onChange={(e) => setAccountId(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '0.5rem',
                                                borderRadius: '0.5rem',
                                                background: 'rgba(0,0,0,0.4)',
                                                border: '1px solid rgba(255,255,255,0.2)',
                                                color: 'white',
                                                fontSize: '0.9rem'
                                            }}
                                        >
                                            {accounts.map(acc => (
                                                <option key={acc.id} value={acc.id} style={{ background: '#191b28', color: 'white' }}>
                                                    {acc.name} ({formatMoney(acc.balance)})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Option B: Postpone */}
                        <div 
                            onClick={() => setSelectedAction('postpone')}
                            style={{
                                padding: '1rem',
                                borderRadius: '0.9rem',
                                border: selectedAction === 'postpone' ? '2px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                                background: selectedAction === 'postpone' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem'
                            }}
                        >
                            <Clock size={20} style={{ color: selectedAction === 'postpone' ? '#3b82f6' : 'rgba(255,255,255,0.4)' }} />
                            <div>
                                <div style={{ fontWeight: 700, color: 'white', fontSize: '1rem' }}>
                                    No se ha {isExpense ? 'pagado' : 'cobrado'} aún (Aplazar a {targetPeriod})
                                </div>
                                <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)' }}>
                                    Mover a {targetPeriod} como atraso pendiente y aumentar el disponible libre de {fromPeriod}.
                                </div>
                            </div>
                        </div>

                        {/* Option C: Cancel */}
                        <div 
                            onClick={() => setSelectedAction('cancel')}
                            style={{
                                padding: '1rem',
                                borderRadius: '0.9rem',
                                border: selectedAction === 'cancel' ? '2px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                                background: selectedAction === 'cancel' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem'
                            }}
                        >
                            <XCircle size={20} style={{ color: selectedAction === 'cancel' ? '#ef4444' : 'rgba(255,255,255,0.4)' }} />
                            <div>
                                <div style={{ fontWeight: 700, color: 'white', fontSize: '1rem' }}>
                                    No se {isExpense ? 'pagó' : 'cobró'} ni se {isExpense ? 'pagará' : 'cobrará'} (Omitir/Cancelar)
                                </div>
                                <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)' }}>
                                    Omitir definitivamente en {fromPeriod} y liberar su importe en el sobrante.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                        <button
                            onClick={onClose}
                            disabled={isProcessing}
                            style={{
                                flex: 1,
                                padding: '0.85rem',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'white',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '0.75rem',
                                fontWeight: 600,
                                cursor: isProcessing ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Cancelar Cierre
                        </button>
                        <button
                            onClick={handleConfirmStep}
                            disabled={!selectedAction || isProcessing}
                            style={{
                                flex: 2,
                                padding: '0.85rem',
                                background: selectedAction ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                                color: selectedAction ? 'white' : 'rgba(255,255,255,0.4)',
                                border: 'none',
                                borderRadius: '0.75rem',
                                fontWeight: 700,
                                cursor: (!selectedAction || isProcessing) ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            {isProcessing ? 'Guardando...' : (
                                <>
                                    Siguiente apunte ({currentIndex + 1}/{totalItems})
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

export default PendingItemsResolutionWizard;
