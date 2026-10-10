import React, { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { useDateSelection } from '../../contexts/DateSelectionContext';
import { PiggyBank, AlertTriangle, X } from 'lucide-react';
import { formatMoney, isRecurringActiveInMonth, isItemInMonthAndYear } from '../../utils/financeCalculations';

const InsufficientHuchaFundsAlert: React.FC = () => {
    const { savings = [], recurringExpenses = [], fixedIncomes = [], incomes = [] } = useFinance();
    const { selectedMonth, selectedYear } = useDateSelection();

    const period = `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}`;
    const monthStart = new Date(selectedYear, selectedMonth, 1).getTime();
    const monthEnd = new Date(selectedYear, selectedMonth + 1, 0).getTime();

    const [dismissedPeriods, setDismissedPeriods] = useState<Record<string, boolean>>(() => {
        try {
            const stored = localStorage.getItem('pcshogar_hucha_alert_dismissed');
            return stored ? JSON.parse(stored) : {};
        } catch {
            return {};
        }
    });

    if (dismissedPeriods[period]) return null;

    // Find huchas with insufficient projected funds for their financed recurring expenses
    const alerts: Array<{
        huchaName: string;
        expenseName: string;
        expenseAmount: number;
        availableHucha: number;
        shortfall: number;
        reId: string;
    }> = [];

    // Calculate virtual available balance for each hucha in selected month
    const virtualHuchaBalances: Record<string, number> = {};
    savings.forEach(s => {
        let projectedIncoming = 0;
        const start = s.createdAt || 0;
        if (start <= monthEnd) {
            if (s.incomeSources && s.incomeSources.length > 0) {
                for (const src of s.incomeSources) {
                    const linkedIncome = fixedIncomes.find(inc => inc.id === src.fixedIncomeId);
                    if (linkedIncome && linkedIncome.active) {
                        const incStart = linkedIncome.effectiveDate || linkedIncome.createdAt || 0;
                        const incEnd = linkedIncome.expirationDate || new Date(9999, 11, 31).getTime();
                        const isIgnored = linkedIncome.ignoredPeriods?.includes(period);
                        let isTemplateActive = false;
                        if (incStart <= monthEnd && incEnd >= monthStart && !isIgnored) {
                            isTemplateActive = isRecurringActiveInMonth(linkedIncome.frequency, linkedIncome.paymentMonth, selectedMonth, selectedYear, incStart);
                        }
                        const isConfirmed = incomes.some(ei => ei.fixedIncomeId === src.fixedIncomeId && isItemInMonthAndYear(ei, selectedMonth, selectedYear));
                        if (isTemplateActive || isConfirmed) {
                            projectedIncoming += (src.monthlyAmount || 0);
                        }
                    }
                }
            } else if (s.linkedFixedIncomeId) {
                const linkedIncome = fixedIncomes.find(inc => inc.id === s.linkedFixedIncomeId);
                if (linkedIncome && linkedIncome.active) {
                    const incStart = linkedIncome.effectiveDate || linkedIncome.createdAt || 0;
                    const incEnd = linkedIncome.expirationDate || new Date(9999, 11, 31).getTime();
                    const isIgnored = linkedIncome.ignoredPeriods?.includes(period);
                    let isTemplateActive = false;
                    if (incStart <= monthEnd && incEnd >= monthStart && !isIgnored) {
                        isTemplateActive = isRecurringActiveInMonth(linkedIncome.frequency, linkedIncome.paymentMonth, selectedMonth, selectedYear, incStart);
                    }
                    const isConfirmed = incomes.some(ei => ei.fixedIncomeId === s.linkedFixedIncomeId && isItemInMonthAndYear(ei, selectedMonth, selectedYear));
                    if (isTemplateActive || isConfirmed) {
                        projectedIncoming = s.monthlySavingAmount || 0;
                    }
                }
            } else {
                projectedIncoming = s.monthlySavingAmount || 0;
            }
        }
        virtualHuchaBalances[s.id] = (s.currentAmount || 0) + projectedIncoming;
    });

    recurringExpenses.forEach(re => {
        if (!re.active || !re.financingSavingGoalId) return;
        const start = re.createdAt || re.updatedAt || 0;
        const end = re.expirationDate || new Date(9999, 11, 31).getTime();
        if (start > monthEnd || end < monthStart) return;

        const isIgnored = re.ignoredPeriods?.includes(period);
        if (!isIgnored && isRecurringActiveInMonth(re.frequency, re.paymentMonth, selectedMonth, selectedYear, start)) {
            const hucha = savings.find(s => s.id === re.financingSavingGoalId);
            if (!hucha) return;

            const avail = virtualHuchaBalances[re.financingSavingGoalId] ?? (hucha.currentAmount || 0);
            if (avail < re.amount) {
                const shortfall = re.amount - Math.max(0, avail);
                alerts.push({
                    huchaName: hucha.name,
                    expenseName: re.description,
                    expenseAmount: re.amount,
                    availableHucha: Math.max(0, avail),
                    shortfall,
                    reId: re.id
                });
                virtualHuchaBalances[re.financingSavingGoalId] = 0;
            } else {
                virtualHuchaBalances[re.financingSavingGoalId] -= re.amount;
            }
        }
    });

    if (alerts.length === 0) return null;

    const handleDismiss = () => {
        const next = { ...dismissedPeriods, [period]: true };
        setDismissedPeriods(next);
        try {
            localStorage.setItem('pcshogar_hucha_alert_dismissed', JSON.stringify(next));
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.08))',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: '16px',
            padding: '1rem 1.25rem',
            marginBottom: '1.25rem',
            position: 'relative'
        }}>
            <button
                onClick={handleDismiss}
                style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.4)',
                    cursor: 'pointer'
                }}
                title="Cerrar aviso"
            >
                <X size={16} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                <AlertTriangle size={18} className="text-amber-400" />
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#f59e0b' }}>
                    Fondos Insuficientes en Huchas
                </h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {alerts.map((al, idx) => (
                    <div key={idx} style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)', lineHeight: 1.4 }}>
                        La hucha <strong style={{ color: '#ffffff' }}>"{al.huchaName}"</strong> prevé un disponible de {formatMoney(al.availableHucha)}, insuficiente para soportar el gasto fijo <strong style={{ color: '#ffffff' }}>"{al.expenseName}"</strong> ({formatMoney(al.expenseAmount)}). Faltan <strong style={{ color: '#f87171' }}>{formatMoney(al.shortfall)}</strong> que se imputarán al disponible mensual del hogar.
                    </div>
                ))}
            </div>
        </div>
    );
};

export default InsufficientHuchaFundsAlert;
