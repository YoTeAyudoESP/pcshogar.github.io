import React, { useState, useMemo } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { useIncome } from '../../contexts/IncomeContext';
import { useDateSelection } from '../../contexts/DateSelectionContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { X } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface PiggyBankAllocationModalProps {
    goalId?: string;
    goalName?: string;
    isVirtual: boolean;
    initialAction?: 'save' | 'withdraw';
    onClose: () => void;
}

const PiggyBankAllocationModal: React.FC<PiggyBankAllocationModalProps> = ({ goalId: initialGoalId, goalName: initialGoalName, isVirtual, initialAction = 'save', onClose }) => {
    const { allocateSavings, savings, allocations, expenses } = useFinance();
    const { extraIncomes } = useIncome();
    const { selectedMonth, selectedYear } = useDateSelection();
    const { t } = useLanguage();

    const [amount, setAmount] = useState('');
    const [selectedGoalId, setSelectedGoalId] = useState(initialGoalId || '');
    const [mode, setMode] = useState<'save' | 'withdraw'>(initialAction);
    const [error, setError] = useState<string | null>(null);

    // Calculate Available to Spend (copied logic from FinanceSummary for consistency)
    const availableBalance = useMemo(() => {
        const isSelectedMonth = (timestamp: number) => {
            const d = new Date(timestamp);
            return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
        };

        const totalMonthIncome = extraIncomes
            .filter(inc => {
                if (inc.status !== 'received') return false;
                const m = inc.budgetMonth !== undefined ? inc.budgetMonth : new Date(inc.receivedDate).getMonth();
                const y = inc.budgetYear !== undefined ? inc.budgetYear : new Date(inc.receivedDate).getFullYear();
                return m === selectedMonth && y === selectedYear;
            })
            .reduce((sum, inc) => sum + inc.amount, 0);

        const totalMonthExpenses = expenses
            .filter(exp => isSelectedMonth(exp.date) && exp.status === 'paid')
            .reduce((sum, exp) => sum + exp.amount, 0);

        const totalMonthAllocations = allocations
            .filter(alloc => isSelectedMonth(alloc.date))
            .reduce((sum, alloc) => sum + alloc.amount, 0);

        return totalMonthIncome - totalMonthExpenses - totalMonthAllocations;
    }, [extraIncomes, expenses, allocations, selectedMonth, selectedYear]);

    const selectedSavingGoal = savings.find(s => s.id === selectedGoalId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const value = parseFloat(amount);

        if (mode === 'save') {
            if (value > availableBalance) {
                setError(`No puedes ahorrar más del disponible (${formatCurrency(availableBalance)})`);
                return;
            }
            await allocateSavings(selectedGoalId, value);
        } else {
            // Withdraw
            if (selectedSavingGoal && value > (selectedSavingGoal.currentAmount || 0)) {
                setError(`No puedes retirar más de lo que hay en la hucha (${formatCurrency(selectedSavingGoal.currentAmount)})`);
                return;
            }
            await allocateSavings(selectedGoalId, -value);
        }

        onClose();
    };

    const inputStyle = {
        background: 'var(--bg-surface-elevated)',
        border: 'var(--card-border)',
        borderRadius: 'var(--radius-sm)',
        padding: '0.75rem',
        color: 'var(--text-main)',
        width: '100%',
        marginBottom: '1rem',
        fontSize: '1rem'
    };

    const currentGoalName = initialGoalName || selectedSavingGoal?.name || '';

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
        }}>
            <div className="glass-panel" style={{
                width: '90%',
                maxWidth: '400px',
                padding: 'var(--space-md)',
                position: 'relative',
                animation: 'slideUp 0.3s ease-out'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer'
                    }}
                >
                    <X size={24} />
                </button>

                <h3 style={{ marginBottom: '1.5rem', paddingRight: '2rem' }}>
                    {mode === 'save'
                        ? (initialGoalId ? `${t('Añadir a')} ${currentGoalName}` : 'Ahorrar en Hucha')
                        : 'Usar Ahorros (Liquidez)'}
                    {isVirtual && <span style={{ fontSize: '0.8rem', color: 'var(--hue-warning)', marginLeft: '0.5rem' }}>(Virtual)</span>}
                </h3>

                {/* Mode Selector */}
                {!initialGoalId && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <button
                            onClick={() => setMode('save')}
                            style={{
                                flex: 1,
                                padding: '0.5rem',
                                borderRadius: 'var(--radius-sm)',
                                border: mode === 'save' ? '1px solid var(--color-success)' : '1px solid var(--card-border)',
                                background: mode === 'save' ? 'rgba(46, 213, 115, 0.1)' : 'none',
                                color: mode === 'save' ? 'var(--color-success)' : 'var(--text-muted)',
                                cursor: 'pointer',
                                fontWeight: mode === 'save' ? 600 : 400
                            }}
                        >
                            {t('Ahorrar')}
                        </button>
                        <button
                            onClick={() => setMode('withdraw')}
                            style={{
                                flex: 1,
                                padding: '0.5rem',
                                borderRadius: 'var(--radius-sm)',
                                border: mode === 'withdraw' ? '1px solid var(--hue-danger)' : '1px solid var(--card-border)',
                                background: mode === 'withdraw' ? 'rgba(231, 76, 60, 0.1)' : 'none',
                                color: mode === 'withdraw' ? 'var(--hue-danger)' : 'var(--text-muted)',
                                cursor: 'pointer',
                                fontWeight: mode === 'withdraw' ? 600 : 400
                            }}
                        >
                            Retirar / Usar
                        </button>
                    </div>
                )}

                <div style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    {mode === 'save' ? (
                        <>Disponible este mes: <span style={{ color: availableBalance >= 0 ? 'var(--color-success)' : 'var(--hue-danger)', fontWeight: 600 }}>{formatCurrency(availableBalance)}</span></>
                    ) : (
                        selectedSavingGoal ? (
                            <>Saldo en {selectedSavingGoal.name}: <span style={{ color: 'var(--hue-warning)', fontWeight: 600 }}>{formatCurrency(selectedSavingGoal.currentAmount)}</span></>
                        ) : 'Selecciona una hucha'
                    )}
                </div>

                <form onSubmit={handleSubmit}>
                    {!initialGoalId && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                                Seleccionar Hucha
                            </label>
                            <select
                                style={inputStyle}
                                value={selectedGoalId}
                                onChange={e => setSelectedGoalId(e.target.value)}
                                required
                            >
                                <option value="">Seleccionar...</option>
                                {savings.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} ({formatCurrency(s.currentAmount)})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                            {t('Cantidad')}
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            style={inputStyle}
                            value={amount}
                            onChange={e => {
                                setAmount(e.target.value);
                                if (error) setError(null);
                            }}
                            placeholder="0.00"
                            required
                        />
                    </div>

                    {isVirtual && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', textAlign: 'center', fontStyle: 'italic' }}>
                            {mode === 'save'
                                ? '* El dinero se reduce del "Disponible" del mes y se suma a la hucha.'
                                : '* El dinero se suma al "Disponible" del mes y se resta de la hucha.'}
                        </p>
                    )}

                    {error && (
                        <div style={{ color: 'var(--text-main)', fontSize: '0.85rem', marginBottom: '1rem', padding: '0.75rem', background: 'var(--alert-error-bg)', border: '1px solid var(--hue-danger)', borderRadius: 'var(--radius-sm)' }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn-primary"
                        style={{
                            width: '100%',
                            marginTop: '1rem',
                            background: mode === 'withdraw' ? 'var(--hue-danger)' : 'var(--color-primary)'
                        }}
                        disabled={!!error || !amount || parseFloat(amount) <= 0}
                    >
                        {mode === 'withdraw' ? 'Confirmar Retirada' : t('Confirmar')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PiggyBankAllocationModal;
