import React, { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { Calendar, X, ArrowRight } from 'lucide-react';
import type { FixedIncome } from '../../types/income';

interface ExpiringRecurringAlertProps {
    onNavigateToSettings?: () => void;
}

export const ExpiringRecurringAlert: React.FC<ExpiringRecurringAlertProps> = ({ onNavigateToSettings }) => {
    const { recurringExpenses, incomes } = useFinance();
    const [dismissedMap, setDismissedMap] = useState<Record<string, number>>(() => {
        try {
            const saved = localStorage.getItem('pcs_dismissed_expiring_recurring');
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    const now = Date.now();
    const MONTH_NAMES = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // 1. Encuentra gastos fijos a punto de caducar (dentro de los próximos 35 días)
    const expiringExpenses = (recurringExpenses || []).filter(exp => {
        if (!exp.expirationDate) return false;
        if (dismissedMap[`exp_${exp.id}`] === exp.expirationDate) return false;
        const daysLeft = Math.ceil((exp.expirationDate - now) / (1000 * 60 * 60 * 24));
        return daysLeft <= 35 && daysLeft >= -5;
    });

    // 2. Encuentra ingresos fijos a punto de caducar (dentro de los próximos 35 días)
    const expiringIncomes = (incomes || []).filter(inc => {
        if (inc.type !== 'fixed') return false;
        const fixedInc = inc as FixedIncome;
        if (!fixedInc.expirationDate) return false;
        if (dismissedMap[`inc_${fixedInc.id}`] === fixedInc.expirationDate) return false;
        const daysLeft = Math.ceil((fixedInc.expirationDate - now) / (1000 * 60 * 60 * 24));
        return daysLeft <= 35 && daysLeft >= -5;
    }) as FixedIncome[];

    if (expiringExpenses.length === 0 && expiringIncomes.length === 0) return null;

    const handleDismiss = (key: string, expDate: number) => {
        setDismissedMap(prev => {
            const updated = { ...prev, [key]: expDate };
            try {
                localStorage.setItem('pcs_dismissed_expiring_recurring', JSON.stringify(updated));
            } catch (e) {
                console.warn('Could not save dismissed expiring recurring item:', e);
            }
            return updated;
        });
    };

    const targetExpense = expiringExpenses[0];
    const targetIncome = expiringIncomes[0];

    const isExpense = !!targetExpense;
    const expirationDate = isExpense ? targetExpense.expirationDate! : targetIncome.expirationDate!;
    const key = isExpense ? `exp_${targetExpense.id}` : `inc_${targetIncome.id}`;
    const expDateObj = new Date(expirationDate);
    const monthYearStr = `${MONTH_NAMES[expDateObj.getMonth()]} de ${expDateObj.getFullYear()}`;
    const amountVal = isExpense ? targetExpense.amount : targetIncome.amount;
    const amountStr = `${Number(amountVal || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
    const titleName = isExpense ? targetExpense.description : targetIncome.name;

    return (
        <div 
            className="glass-panel" 
            style={{ 
                padding: '1rem 1.25rem', 
                borderRadius: '16px', 
                marginBottom: '1.25rem', 
                background: isExpense ? 'rgba(59, 130, 246, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                border: isExpense ? '1px solid rgba(59, 130, 246, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)',
                borderLeft: isExpense ? '4px solid #3b82f6' : '4px solid #10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: '260px' }}>
                <div style={{ 
                    width: '38px', 
                    height: '38px', 
                    borderRadius: '10px', 
                    background: isExpense ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: isExpense ? '#60a5fa' : '#34d399',
                    flexShrink: 0
                }}>
                    <Calendar size={20} />
                </div>
                <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#f8fafc', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {isExpense ? '⏳ Última cuota programada de gasto fijo' : '⏳ Último cobro programado de ingreso fijo'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'rgba(248, 250, 252, 0.8)', lineHeight: 1.4 }}>
                        {isExpense ? (
                            <>Te recordamos que el gasto fijo <strong>{titleName}</strong> (<strong>{amountStr}</strong>) abonará su última cuota en <strong>{monthYearStr}</strong>. A partir de esa fecha finalizará automáticamente.</>
                        ) : (
                            <>Te recordamos que el ingreso fijo <strong>{titleName}</strong> (<strong>{amountStr}</strong>) registrará su último cobro en <strong>{monthYearStr}</strong>. A partir de esa fecha finalizará automáticamente.</>
                        )}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                {onNavigateToSettings && (
                    <button
                        onClick={onNavigateToSettings}
                        style={{
                            background: isExpense ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                            border: isExpense ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                            color: isExpense ? '#93c5fd' : '#6ee7b7',
                            padding: '0.4rem 0.75rem',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        Gestionar
                        <ArrowRight size={14} />
                    </button>
                )}
                <button
                    onClick={() => handleDismiss(key, expirationDate)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255, 255, 255, 0.4)',
                        cursor: 'pointer',
                        padding: '0.35rem',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    title="Descartar aviso"
                >
                    <X size={18} />
                </button>
            </div>
        </div>
    );
};

export default ExpiringRecurringAlert;
