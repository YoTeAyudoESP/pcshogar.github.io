import React, { useMemo, useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { calculateAvailableBalanceForMonth, formatMoney } from '../../utils/financeCalculations';
import type { FixedIncome } from '../../types/income';

const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const ClosedMonthRebalanceAlert: React.FC = () => {
    const { 
        closings, fixedIncomes, incomes, expenses, 
        allocations, savings, recurringExpenses, overrides, cards,
        updateIncome, addExtraIncome
    } = useFinance();

    const [isProcessing, setIsProcessing] = useState(false);
    const [rebalancedMonth, setRebalancedMonth] = useState<string | null>(null);

    // Detect the most recent processed closing whose actual calculated balance differs from closing.finalBalance
    const outOfSyncClosing = useMemo(() => {
        const processedClosings = closings
            .filter(c => c.status === 'processed')
            .sort((a, b) => {
                if (a.year !== b.year) return b.year - a.year;
                return b.month - a.month;
            });

        for (const closing of processedClosings) {
            const { availableToSpend: currentAvailable } = calculateAvailableBalanceForMonth(closing.year, closing.month, {
                fixedIncomes: fixedIncomes.filter((i): i is FixedIncome => i.type === 'fixed'),
                extraIncomes: incomes.filter(i => i.type === 'extra' || i.type === 'rollover'),
                expenses,
                allocations,
                savings,
                recurringExpenses,
                overrides,
                cards
            });

            const diff = currentAvailable - (closing.finalBalance || 0);
            if (Math.abs(diff) >= 0.01) {
                return {
                    closing,
                    currentAvailable,
                    oldBalance: closing.finalBalance || 0,
                    diff
                };
            }
        }
        return null;
    }, [closings, fixedIncomes, incomes, expenses, allocations, savings, recurringExpenses, overrides, cards]);

    if (!outOfSyncClosing) return null;

    const { closing, currentAvailable, oldBalance, diff } = outOfSyncClosing;
    const monthName = MONTH_NAMES[closing.month];

    // Find the next month target for rollover update
    let nextMonth = closing.month + 1;
    let nextYear = closing.year;
    if (nextMonth > 11) {
        nextMonth = 0;
        nextYear++;
    }
    const nextMonthName = MONTH_NAMES[nextMonth];

    const handleRebalance = async () => {
        setIsProcessing(true);
        try {
            // Find existing rollover income for the target next month
            const existingRollover = incomes.find(i => 
                i.type === 'rollover' && 
                i.budgetMonth === nextMonth && 
                i.budgetYear === nextYear
            );

            if (existingRollover) {
                const newRolloverAmount = (existingRollover.amount || 0) + diff;
                await updateIncome({
                    ...existingRollover,
                    amount: newRolloverAmount,
                    updatedAt: Date.now()
                });
            } else if (currentAvailable > 0) {
                await addExtraIncome({
                    name: `Remanente ${monthName} (Ajustado)`,
                    amount: currentAvailable,
                    currency: 'EUR',
                    period: `${nextYear}-${(nextMonth + 1).toString().padStart(2, '0')}`,
                    budgetMonth: nextMonth,
                    budgetYear: nextYear,
                    receivedDate: new Date(nextYear, nextMonth, 1).getTime(),
                    effectiveDate: new Date(nextYear, nextMonth, 1).getTime(),
                    status: 'received',
                    excludeFromBudget: false
                });
            }

            // Update closing record finalBalance
            closing.finalBalance = currentAvailable;
            closing.updatedAt = Date.now();

            setRebalancedMonth(monthName);
            setTimeout(() => setRebalancedMonth(null), 4000);
        } catch (e) {
            console.error("Error rebalancing closed month:", e);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.1) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: '1rem',
            padding: '1rem 1.25rem',
            marginBottom: '1.25rem',
            boxShadow: '0 4px 15px rgba(245, 158, 11, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
        }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{
                    background: 'rgba(245, 158, 11, 0.2)',
                    color: '#fbbf24',
                    borderRadius: '50%',
                    padding: '0.4rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                    <AlertTriangle size={20} />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fef3c7', marginBottom: '0.2rem' }}>
                        Aviso de Cierre Modificado: {monthName} {closing.year}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.45 }}>
                        Se han detectado movimientos añadidos o modificados en <strong>{monthName}</strong>. 
                        Su disponible real ha cambiado de <strong>{formatMoney(oldBalance)}</strong> a <strong>{formatMoney(currentAvailable)}</strong> 
                        (diferencia de <strong style={{ color: diff >= 0 ? '#34d399' : '#f87171' }}>{diff >= 0 ? '+' : ''}{formatMoney(diff)}</strong>).
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                {rebalancedMonth ? (
                    <span style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <CheckCircle2 size={16} /> ¡Remanente sincronizado con {nextMonthName}!
                    </span>
                ) : (
                    <button
                        type="button"
                        onClick={handleRebalance}
                        disabled={isProcessing}
                        style={{
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.75rem',
                            padding: '0.55rem 1.1rem',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: isProcessing ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <RefreshCw size={15} className={isProcessing ? 'spin' : ''} />
                        {isProcessing ? 'Sincronizando...' : `Re-ajustar Remanente en ${nextMonthName}`}
                    </button>
                )}
            </div>
        </div>
    );
};

export default ClosedMonthRebalanceAlert;
