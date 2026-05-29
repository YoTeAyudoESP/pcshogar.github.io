import React, { useState } from 'react';
import { useFinance } from '../../../contexts/FinanceContext';
import { useDateSelection } from '../../../contexts/DateSelectionContext';
import { PlusCircle, AlertTriangle } from 'lucide-react';
import type { SavingGoal } from '../../../types/finance';
import { formatMoney, calculateAvailableBalanceForMonth } from '../../../utils/financeCalculations';

interface PiggyBankAddMoneyFormProps {
    goal: SavingGoal;
    onClose: () => void;
}

const PiggyBankAddMoneyForm: React.FC<PiggyBankAddMoneyFormProps> = ({ goal, onClose }) => {
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
    const remaining = isNaN(parsedAmount) ? availableToSpend : availableToSpend - parsedAmount;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!amount) {
            setError('Introduce un importe');
            return;
        }

        const addAmount = parseFloat(amount);
        if (isNaN(addAmount) || addAmount <= 0) {
            setError('Importe no válido');
            return;
        }

        if (addAmount > availableToSpend) {
            setError(`El importe no puede ser superior al disponible actual del mes (${formatMoney(availableToSpend)})`);
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

            // Virtual adjustment (no accountId, isVirtual = true)
            await adjustSavings(goal.id, addAmount, undefined, true, targetDate, selectedMonth, selectedYear);
            onClose();
        } catch (err) {
            setError('Error al añadir dinero');
        }
    };

    const inputStyle = {
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '0.75rem',
        color: 'white',
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
                    <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', color: '#10b981' }}>
                        <PlusCircle size={24} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Ahorrar en Hucha</h3>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Añadir fondos a: {goal.name}</p>
                    </div>
                </div>

                {error && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                        {error}
                    </div>
                )}

                <div style={{ marginBottom: '1rem', fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Disponible del mes:</span>
                    <strong style={{ color: availableToSpend >= 0 ? '#10b981' : '#f43f5e' }}>{formatMoney(availableToSpend)}</strong>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Importe a Ahorrar (€)</label>
                    <input type="number" step="0.01" style={inputStyle} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
                </div>

                {!isNaN(parsedAmount) && parsedAmount > 0 && (
                    <div style={{ 
                        marginTop: '-0.5rem', 
                        marginBottom: '1rem', 
                        fontSize: '0.85rem', 
                        fontWeight: 600,
                        color: remaining >= 0 ? '#10b981' : '#f43f5e' 
                    }}>
                        {remaining >= 0 
                            ? `Disponible restante si aceptas: ${formatMoney(remaining)}` 
                            : '¡Atención! Superas el disponible actual del mes'
                        }
                    </div>
                )}

                <div style={{ 
                    background: 'rgba(245, 158, 11, 0.1)', 
                    padding: '1rem', 
                    borderRadius: '12px', 
                    marginTop: '1rem', 
                    fontSize: '0.85rem', 
                    color: '#fbbf24', 
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                    display: 'flex',
                    gap: '10px'
                }}>
                    <AlertTriangle size={24} style={{ flexShrink: 0 }} />
                    <div>
                        <strong>Aviso:</strong> Esta operación es puramente <strong>virtual</strong>. Reducirá el disponible mensual sin mover dinero real de tus cuentas.
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                    <button type="button" onClick={onClose} style={{
                        flex: 1, padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'white', cursor: 'pointer', fontWeight: 600
                    }}>Cancelar</button>
                    <button type="submit" style={{
                        flex: 1.5,
                        padding: '1rem',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #10b981, #34d399)',
                        color: 'white',
                        fontWeight: 700,
                        cursor: 'pointer'
                    }}>
                        Ahorrar Ahora
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PiggyBankAddMoneyForm;
