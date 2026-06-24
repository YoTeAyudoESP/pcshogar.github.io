import React from 'react';
import { AlertCircle, ArrowRight, PiggyBank, AlertTriangle } from 'lucide-react';
import { useFinance } from '../../contexts/FinanceContext';
import { useDateSelection } from '../../contexts/DateSelectionContext';
import { calculateAvailableBalanceForMonth, getPiggyBankShortfalls, calculateFinancialMismatch, getPiggyBankFreeCapacity } from '../../utils/financeCalculations';
import { formatMoney } from '../../utils/financeCalculations';

interface PiggyBankAlertsProps {
    onNavigateToSavings: () => void;
}

const PiggyBankAlerts: React.FC<PiggyBankAlertsProps> = ({ onNavigateToSavings }) => {
    const { savings, accounts, recurringExpenses, expenses, updateRecurringExpense, fixedIncomes, extraIncomes, allocations, overrides, cards } = useFinance();
    const { selectedMonth, selectedYear } = useDateSelection();

    // 1. Calculate available balance and pending fixed expenses
    const { availableToSpend, pendingFixedExpenses, pendingSecureIncomes } = calculateAvailableBalanceForMonth(selectedYear, selectedMonth, {
        fixedIncomes,
        extraIncomes,
        expenses,
        allocations,
        savings,
        recurringExpenses,
        overrides,
        cards
    });

    // 2. Global Mismatch Alert
    const { mismatch } = calculateFinancialMismatch(
        accounts,
        cards,
        savings,
        availableToSpend,
        pendingFixedExpenses,
        pendingSecureIncomes
    );

    // 3. Shortfalls Alerts
    const shortfalls = getPiggyBankShortfalls(recurringExpenses, savings, expenses, selectedMonth, selectedYear);
    
    const period = `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}`;
    const unacknowledgedShortfalls = shortfalls.filter(s => {
        const unacknowledged = s.recurringIds.some(id => {
            const re = recurringExpenses.find(r => r.id === id);
            return !re?.acknowledgedShortfalls?.includes(period);
        });
        return unacknowledged;
    });

    if (mismatch <= 0 && unacknowledgedShortfalls.length === 0) {
        return null;
    }

    const handleAcknowledge = async (shortfall: any) => {
        for (const id of shortfall.recurringIds) {
            const re = recurringExpenses.find(r => r.id === id);
            if (re) {
                const currentAck = re.acknowledgedShortfalls || [];
                if (!currentAck.includes(period)) {
                    await updateRecurringExpense({
                        ...re,
                        acknowledgedShortfalls: [...currentAck, period]
                    });
                }
            }
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            {mismatch > 0 && (
                <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '12px',
                    padding: '1rem',
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'center'
                }}>
                    <div style={{ background: 'rgba(239, 68, 68, 0.2)', padding: '0.5rem', borderRadius: '50%' }}>
                        <AlertTriangle size={24} color="#ef4444" />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 0.25rem 0', color: '#fca5a5', fontSize: '1rem' }}>Descuadre Financiero Detectado</h4>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
                            ¡Atención! Has comprometido o ahorrado virtualmente más dinero del que posees físicamente en tus cuentas. 
                            Tienes un agujero de <strong>{formatMoney(mismatch)}</strong>. Revisa tus huchas o tu disponible general.
                        </p>
                    </div>
                </div>
            )}

            {unacknowledgedShortfalls.map(s => {
                const otherHuchasCapacity = savings
                    .filter(h => h.id !== s.huchaId)
                    .reduce((sum, h) => sum + getPiggyBankFreeCapacity(h.id, savings, recurringExpenses, expenses, selectedMonth, selectedYear), 0);
                
                const hasCapacity = otherHuchasCapacity >= s.shortfall; // Or just > 0, to partially cover? We'll check if > 0

                return (
                    <div key={s.huchaId} style={{
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: '12px',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                    }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div style={{ background: 'rgba(245, 158, 11, 0.2)', padding: '0.5rem', borderRadius: '50%' }}>
                                <PiggyBank size={24} color="#f59e0b" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h4 style={{ margin: '0 0 0.25rem 0', color: '#fcd34d', fontSize: '1rem' }}>Fondos Insuficientes en Hucha</h4>
                                <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
                                    La hucha <strong>{s.huchaName}</strong> no tiene fondos para cubrir sus recibos este mes. 
                                    Faltan <strong>{formatMoney(s.shortfall)}</strong>.
                                    {!hasCapacity && " (No tienes saldo libre en otras huchas para cubrirlo)."}
                                </p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                            {hasCapacity ? (
                                <>
                                    <button 
                                        onClick={() => handleAcknowledge(s)}
                                        style={{
                                            background: 'transparent',
                                            color: '#fcd34d',
                                            border: '1px solid rgba(245, 158, 11, 0.3)',
                                            padding: '0.4rem 0.8rem',
                                            borderRadius: '6px',
                                            fontSize: '0.85rem',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Asumir del Disponible
                                    </button>
                                    <button 
                                        onClick={onNavigateToSavings}
                                        style={{
                                            background: '#f59e0b',
                                            color: 'white',
                                            border: 'none',
                                            padding: '0.4rem 0.8rem',
                                            borderRadius: '6px',
                                            fontSize: '0.85rem',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Traspasar de otra hucha
                                    </button>
                                </>
                            ) : (
                                <button 
                                    onClick={() => handleAcknowledge(s)}
                                    style={{
                                        background: '#f43f5e',
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.4rem 0.8rem',
                                        borderRadius: '6px',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Debes asumirlo del Disponible
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default PiggyBankAlerts;
