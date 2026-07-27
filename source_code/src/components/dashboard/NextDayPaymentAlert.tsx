import React, { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { useAppSettings } from '../../contexts/AppSettingsContext';
import { AlertTriangle, X } from 'lucide-react';
import { isRecurringActiveInMonth, formatMoney } from '../../utils/financeCalculations';

const NextDayPaymentAlert: React.FC = () => {
    const { settings } = useAppSettings();
    const { recurringExpenses, expenses } = useFinance();
    const [dismissed, setDismissed] = useState(() => {
        try {
            return sessionStorage.getItem('pcshogar_alert_next_day_dismissed') === 'true';
        } catch (e) {
            return false;
        }
    });

    if (!settings.notifyNextDayPayments || dismissed) return null;

    // Calcular las fechas de hoy y mañana
    const today = new Date();
    const todayDay = today.getDate();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const tomorrowDay = tomorrow.getDate();
    const tomorrowMonth = tomorrow.getMonth();
    const tomorrowYear = tomorrow.getFullYear();
    const period = `${tomorrowYear}-${(tomorrowMonth + 1).toString().padStart(2, '0')}`;
    const monthEnd = new Date(tomorrowYear, tomorrowMonth + 1, 0).getTime();

    // Filtrar gastos fijos que vencen hoy/mañana o están pendientes y no están pagados
    const pendingNextDayExpenses = recurringExpenses.filter(re => {
        if (!re.active) return false;
        const start = re.updatedAt || 0;
        if (start > monthEnd) return false;
        // Include tomorrow, today, and past due (if not paid)
        if (re.paymentDay > tomorrowDay) return false;

        const isPaid = expenses.some(e => e.recurringExpenseId === re.id && e.period === period);
        const isIgnored = re.ignoredPeriods?.includes(period);
        
        if (isPaid || isIgnored) return false;
        return isRecurringActiveInMonth(re.frequency, re.paymentMonth, tomorrowMonth, tomorrowYear, start);
    });

    if (pendingNextDayExpenses.length === 0) return null;

    const totalAmount = pendingNextDayExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    const hasToday = pendingNextDayExpenses.some(e => e.paymentDay <= todayDay);
    const hasTomorrowOnly = pendingNextDayExpenses.every(e => e.paymentDay === tomorrowDay);
    const hasTodayOnly = pendingNextDayExpenses.every(e => e.paymentDay <= todayDay);

    const titleText = hasTomorrowOnly 
        ? "Pagos fijos previstos para mañana"
        : hasTodayOnly
            ? "Pagos fijos programados para HOY"
            : "Pagos fijos previstos para HOY y mañana";

    const getTimingLabel = (paymentDay: number) => {
        if (paymentDay === todayDay) return 'HOY';
        if (paymentDay === tomorrowDay) return 'Mañana';
        return 'Pendiente';
    };

    const handleDismiss = () => {
        setDismissed(true);
        try {
            sessionStorage.setItem('pcshogar_alert_next_day_dismissed', 'true');
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.08) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: '16px',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            position: 'relative',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            backdropFilter: 'blur(10px)',
            animation: 'fadeIn 0.3s ease',
            boxSizing: 'border-box',
            width: '100%'
        }}>
            <div style={{
                background: 'rgba(245, 158, 11, 0.2)',
                borderRadius: '10px',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f59e0b',
                flexShrink: 0
            }}>
                <AlertTriangle size={20} />
            </div>

            <div style={{ flex: 1, paddingRight: '24px' }}>
                <h4 style={{
                    margin: '0 0 4px 0',
                    color: '#fef08a',
                    fontWeight: 700,
                    fontSize: '0.95rem'
                }}>
                    {titleText}
                </h4>
                <p style={{
                    margin: 0,
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '0.88rem',
                    lineHeight: '1.5'
                }}>
                    {pendingNextDayExpenses.length === 1 ? (() => {
                        const timing = getTimingLabel(pendingNextDayExpenses[0].paymentDay);
                        const prefix = timing === 'HOY' ? 'HOY se prevé el cobro de ' : timing === 'Mañana' ? 'Mañana se prevé el cobro de ' : 'Se prevé el cobro de ';
                        return (
                            <>
                                {prefix}<strong>{pendingNextDayExpenses[0].description}</strong> por un importe de{' '}
                                <strong style={{ color: 'white' }}>{formatMoney(pendingNextDayExpenses[0].amount)}</strong>.
                            </>
                        );
                    })() : (
                        <>
                            Se prevé el cobro de <strong style={{ color: 'white' }}>{pendingNextDayExpenses.length} pagos fijos</strong> por un importe total de{' '}
                            <strong style={{ color: 'white' }}>{formatMoney(totalAmount)}</strong>: {pendingNextDayExpenses.map((e, index) => (
                                <span key={e.id}>
                                    {e.description} [{getTimingLabel(e.paymentDay)}] ({formatMoney(e.amount)}){index < pendingNextDayExpenses.length - 1 ? ', ' : '.'}
                                </span>
                            ))}
                        </>
                    )}
                </p>
            </div>

            <button 
                onClick={handleDismiss}
                style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.4)',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s, background-color 0.2s'
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                }}
            >
                <X size={16} />
            </button>
        </div>
    );
};

export default NextDayPaymentAlert;
