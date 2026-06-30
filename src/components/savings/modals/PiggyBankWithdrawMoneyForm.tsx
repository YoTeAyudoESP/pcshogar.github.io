import React, { useState } from 'react';
import { useFinance } from '../../../contexts/FinanceContext';
import { useDateSelection } from '../../../contexts/DateSelectionContext';
import { MinusCircle, Info } from 'lucide-react';
import type { SavingGoal } from '../../../types/finance';
import { formatMoney, calculateAvailableBalanceForMonth } from '../../../utils/financeCalculations';
import { getCurrencySymbol } from '../../../utils/financeCalculations';
import { useTranslation } from '../../../hooks/useTranslation';

interface PiggyBankWithdrawMoneyFormProps {
    goal: SavingGoal;
    onClose: () => void;
}

const PiggyBankWithdrawMoneyForm: React.FC<PiggyBankWithdrawMoneyFormProps> = ({ goal, onClose }) => {
    const { t } = useTranslation();
    const { 
        fixedIncomes, extraIncomes, expenses, allocations, 
        savings, recurringExpenses, overrides, cards, adjustSavings 
    } = useFinance();
    const { selectedMonth, selectedYear } = useDateSelection();
    
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');

    const { availableToSpend } = calculateAvailableBalanceForMonth(selectedYear, selectedMonth, {
        fixedIncomes, extraIncomes, expenses, allocations,
        savings, recurringExpenses, overrides, cards
    });

    const parsedAmount = parseFloat(amount);
    const updatedAvailable = isNaN(parsedAmount) ? availableToSpend : availableToSpend + parsedAmount;

    const isSubmitDisabled = isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > goal.currentAmount;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!amount) {
            setError('Introduce un importe');
            return;
        }

        const withdrawAmount = parseFloat(amount);
        if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
            setError('Importe no válido');
            return;
        }

        if (withdrawAmount > goal.currentAmount) {
            setError(`No puedes retirar más saldo del acumulado actual en esta hucha (${formatMoney(goal.currentAmount)})`);
            return;
        }

        try {
            // Calculate timestamp within selected month and year
            const now = new Date();
            let targetDay = now.getDate();
            const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
            if (targetDay > daysInMonth) {
                targetDay = daysInMonth;
            }
            const targetDate = new Date(selectedYear, selectedMonth, targetDay, now.getHours(), now.getMinutes(), now.getSeconds()).getTime();

            // Virtual adjustment (negative amount, no accountId, isVirtual = true)
            await adjustSavings(goal.id, -withdrawAmount, undefined, true, targetDate, selectedMonth, selectedYear);
            onClose();
        } catch (err) {
            setError('Error al retirar dinero de la hucha');
        }
    };

    const inputStyle = {
        background: 'var(--panel-bg-2)',
        border: '1px solid var(--panel-bg-3)',
        borderRadius: '12px',
        padding: '0.75rem',
        color: 'var(--text-main)',
        width: '100%',
        marginBottom: '1rem',
        fontSize: '1rem'
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', zIndex: 110,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem'
        }}>
            <form onSubmit={handleSubmit} className="glass-panel" style={{ 
                maxWidth: '450px', width: '100%', padding: '2rem', borderRadius: '1.5rem',
                background: 'rgba(30,32,47,0.98)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
                animation: 'scaleUp 0.3s ease'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                    <div style={{ padding: '10px', background: 'rgba(244, 63, 94, 0.1)', borderRadius: '12px', color: '#f43f5e' }}>
                        <MinusCircle size={24} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Retirar de Hucha</h3>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Retirar fondos de: {goal.name}</p>
                    </div>
                </div>

                {error && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                        {error}
                    </div>
                )}

                <div style={{ marginBottom: '0.75rem', fontSize: '0.95rem', color: 'rgba(var(--color-rgb-light),0.7)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Saldo acumulado en hucha:</span>
                    <strong style={{ color: '#ec4899' }}>{formatMoney(goal.currentAmount)}</strong>
                </div>

                <div style={{ marginBottom: '1.25rem', fontSize: '0.95rem', color: 'rgba(var(--color-rgb-light),0.7)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Disponible del mes actual:</span>
                    <strong style={{ color: availableToSpend >= 0 ? 'var(--color-success)' : '#f43f5e' }}>{formatMoney(availableToSpend)}</strong>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(var(--color-rgb-light),0.5)', fontSize: '0.85rem' }}>Importe a Retirar ({getCurrencySymbol()})</label>
                    <input type="number" step="0.01" style={inputStyle} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
                </div>

                {!isNaN(parsedAmount) && parsedAmount > 0 && (
                    <div style={{ 
                        marginTop: '-0.5rem', 
                        marginBottom: '1rem', 
                        fontSize: '0.85rem', 
                        fontWeight: 600,
                        color: parsedAmount <= goal.currentAmount ? 'var(--color-success)' : '#f43f5e' 
                    }}>
                        {parsedAmount <= goal.currentAmount
                            ? `Disponible incrementado si aceptas: ${formatMoney(updatedAvailable)}`
                            : `¡Atención! El importe supera el saldo acumulado en la hucha (${formatMoney(goal.currentAmount)})`
                        }
                    </div>
                )}

                <div style={{ 
                    background: 'rgba(99, 102, 241, 0.1)', 
                    padding: '1rem', 
                    borderRadius: '12px', 
                    marginTop: '1rem', 
                    fontSize: '0.85rem', 
                    color: '#818cf8', 
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    display: 'flex',
                    gap: '10px'
                }}>
                    <Info size={24} style={{ flexShrink: 0, color: '#818cf8' }} />
                    <div>
                        <strong>Aviso:</strong> Esta operación es puramente <strong>virtual</strong>. Devolverá el ahorro acumulado al disponible mensual para poder gastarlo.
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                    <button type="button" onClick={onClose} style={{
                        flex: 1, padding: '1rem', borderRadius: '12px', border: '1px solid var(--panel-bg-3)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600
                    }}>{t('Cancelar')}</button>
                    <button 
                        type="submit" 
                        disabled={isSubmitDisabled}
                        style={{
                            flex: 1.5,
                            padding: '1rem',
                            borderRadius: '12px',
                            border: 'none',
                            background: isSubmitDisabled ? 'var(--panel-bg-2)' : 'linear-gradient(135deg, #ec4899, #f43f5e)',
                            color: isSubmitDisabled ? 'rgba(var(--color-rgb-light), 0.2)' : 'var(--text-main)',
                            fontWeight: 700,
                            cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
                            opacity: isSubmitDisabled ? 0.5 : 1
                        }}
                    >
                        Retirar Ahora
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PiggyBankWithdrawMoneyForm;
