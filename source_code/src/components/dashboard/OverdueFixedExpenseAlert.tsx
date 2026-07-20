import React from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { AlertCircle } from 'lucide-react';
import { isRecurringActiveInMonth, formatMoney } from '../../utils/financeCalculations';

const OverdueFixedExpenseAlert: React.FC = () => {
    const { recurringExpenses, expenses } = useFinance();

    const today = new Date();
    const todayDay = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();
    const period = `${todayYear}-${(todayMonth + 1).toString().padStart(2, '0')}`;
    const monthEnd = new Date(todayYear, todayMonth + 1, 0).getTime();

    // Find fixed expenses that are overdue
    const overdueExpenses = recurringExpenses.filter(re => {
        if (!re.active) return false;
        const start = re.updatedAt || 0;
        if (start > monthEnd) return false;
        
        // It's overdue if paymentDay is before today
        if (re.paymentDay >= todayDay) return false;

        const isPaid = expenses.some(e => e.recurringExpenseId === re.id && e.period === period);
        const isIgnored = re.ignoredPeriods?.includes(period);
        
        if (isPaid || isIgnored) return false;
        return isRecurringActiveInMonth(re.frequency, re.paymentMonth, todayMonth, todayYear, start);
    });

    if (overdueExpenses.length === 0) return null;

    const totalAmount = overdueExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.08) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
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
                background: 'rgba(239, 68, 68, 0.2)',
                borderRadius: '10px',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
                flexShrink: 0
            }}>
                <AlertCircle size={20} />
            </div>

            <div style={{ flex: 1, paddingRight: '24px' }}>
                <h4 style={{
                    margin: '0 0 4px 0',
                    color: '#fca5a5',
                    fontWeight: 700,
                    fontSize: '0.95rem'
                }}>
                    ¡Pagos fijos atrasados!
                </h4>
                <p style={{
                    margin: 0,
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '0.88rem',
                    lineHeight: '1.5'
                }}>
                    {overdueExpenses.length === 1 ? (
                        <>
                            El pago de <strong>{overdueExpenses[0].description}</strong> previsto para el día {overdueExpenses[0].paymentDay} está pendiente de confirmación por un importe de{' '}
                            <strong style={{ color: 'white' }}>{formatMoney(overdueExpenses[0].amount)}</strong>.
                        </>
                    ) : (
                        <>
                            Tienes <strong style={{ color: 'white' }}>{overdueExpenses.length} pagos fijos atrasados</strong> por un importe total de{' '}
                            <strong style={{ color: 'white' }}>{formatMoney(totalAmount)}</strong>: {overdueExpenses.map((e, index) => (
                                <span key={e.id}>
                                    {e.description} ({formatMoney(e.amount)}){index < overdueExpenses.length - 1 ? ', ' : '.'}
                                </span>
                            ))}
                        </>
                    )}
                </p>
            </div>
        </div>
    );
};

export default OverdueFixedExpenseAlert;
