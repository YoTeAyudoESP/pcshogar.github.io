import React, { useState, useEffect, useMemo } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { 
    X, 
    PiggyBank, 
    Calendar, 
    AlertCircle, 
    ArrowRightCircle
} from 'lucide-react';
import type { MonthClosing } from '../../types/finance';
import { isItemInMonthAndYear, isRecurringActiveInMonth } from '../../utils/financeCalculations';

interface RemnantDecisionModalProps {
    closing: MonthClosing;
    onClose: () => void;
}

const RemnantDecisionModal: React.FC<RemnantDecisionModalProps> = ({ closing, onClose }) => {
    const { 
        savings, closeMonthWithDecision, 
        recurringExpenses, fixedIncomes, expenses, incomes,
        updateRecurringExpense, updateIncome, addExpense, addExtraIncome
    } = useFinance();
    const [distributions, setDistributions] = useState<Record<string, number>>({});
    const [error, setError] = useState<string | null>(null);
    const [customBalance, setCustomBalance] = useState<number | null>(null);
    const [isEditingBalance, setIsEditingBalance] = useState(false);

    const [expenseDecisions, setExpenseDecisions] = useState<Record<string, string>>({});
    const [incomeDecisions, setIncomeDecisions] = useState<Record<string, string>>({});

    const period = `${closing.year}-${(closing.month + 1).toString().padStart(2, '0')}`;
    const nextMonthObj = new Date(closing.year, closing.month + 1, 1);
    const nextPeriod = `${nextMonthObj.getFullYear()}-${(nextMonthObj.getMonth() + 1).toString().padStart(2, '0')}`;

    const pendingExpenses = useMemo(() => {
        return recurringExpenses.filter(re => {
            if (!re.active) return false;
            const isIgnored = re.ignoredPeriods?.includes(period);
            if (isIgnored) return false;
            const isPaid = expenses.some(e => e.recurringExpenseId === re.id && isItemInMonthAndYear(e, closing.month, closing.year));
            if (isPaid) return false;
            
            const start = re.updatedAt || 0;
            return isRecurringActiveInMonth(re.frequency, re.paymentMonth, closing.month, closing.year, start);
        });
    }, [recurringExpenses, expenses, closing, period]);

    const pendingIncomes = useMemo(() => {
        return fixedIncomes.filter(inc => {
            const isIgnored = inc.ignoredPeriods?.includes(period);
            if (isIgnored) return false;
            const start = inc.effectiveDate || inc.createdAt || 0;
            const end = inc.expirationDate || new Date(9999, 11, 31).getTime();
            const monthStart = new Date(closing.year, closing.month, 1).getTime();
            const monthEnd = new Date(closing.year, closing.month + 1, 0).getTime();
            
            if (start <= monthEnd && end >= monthStart) {
                return isRecurringActiveInMonth(inc.frequency, inc.paymentMonth, closing.month, closing.year, start);
            }
            return false;
        });
    }, [fixedIncomes, closing, period]);

    let derivedFinalBalance = closing.finalBalance;
    pendingExpenses.forEach(pe => {
        const dec = expenseDecisions[pe.id] || 'none';
        if (dec !== 'none') {
            derivedFinalBalance += pe.amount;
        }
    });
    pendingIncomes.forEach(pi => {
        const dec = incomeDecisions[pi.id] || 'none';
        if (dec !== 'none') {
            derivedFinalBalance -= pi.amount;
        }
    });

    const formatCurrency = (val: number) => {
        const isNegative = val < 0;
        const [integerPart, decimalPart] = Math.abs(val).toFixed(2).split('.');
        const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return `${isNegative ? '-' : ''}${formattedInteger},${decimalPart}€`;
    };

    const activeBalance = customBalance !== null ? customBalance : derivedFinalBalance;
    const totalToDistribute = Math.abs(activeBalance);
    const isDeficit = activeBalance < 0;
    
    const distributedAmount = Object.values(distributions).reduce((sum, amount) => sum + amount, 0);
    const remainingAmount = totalToDistribute - distributedAmount;

    useEffect(() => {
        // Initialize state with 'next_month' and all savings goals to 0
        const initialDists: Record<string, number> = { next_month: 0 };
        savings.forEach(s => {
            initialDists[`saving_${s.id}`] = 0;
        });
        setDistributions(initialDists);
    }, [savings]);

    const handleUpdateAmount = (key: string, val: string) => {
        let amount = parseFloat(val);
        if (isNaN(amount) || amount < 0) amount = 0;
        setDistributions(prev => ({ ...prev, [key]: amount }));
    };

    const handleConfirm = async () => {
        if (Math.abs(remainingAmount) > 0.01) {
            setError(`Aún quedan ${formatCurrency(remainingAmount)} por asignar.`);
            return;
        }

        try {
            for (const pe of pendingExpenses) {
                const dec = expenseDecisions[pe.id] || 'none';
                if (dec !== 'none') {
                    await updateRecurringExpense({
                        ...pe,
                        ignoredPeriods: [...(pe.ignoredPeriods || []), period]
                    });
                    if (dec === 'postpone') {
                        await addExpense({
                            description: `(Aplazado) ${pe.description}`,
                            amount: pe.amount,
                            currency: pe.currency,
                            date: Date.now(),
                            categoryId: pe.categoryId || 'cat_other',
                            paymentMethod: pe.paymentMethod || { type: 'cash' },
                            isFixed: false,
                            status: 'pending',
                            period: nextPeriod
                        });
                    }
                }
            }

            for (const pi of pendingIncomes) {
                const dec = incomeDecisions[pi.id] || 'none';
                if (dec !== 'none') {
                    await updateIncome({
                        ...pi,
                        ignoredPeriods: [...(pi.ignoredPeriods || []), period]
                    });
                    if (dec === 'postpone') {
                        await addExtraIncome({
                            name: `(Aplazado) ${pi.name}`,
                            amount: pi.amount,
                            currency: pi.currency,
                            receivedDate: Date.now(),
                            effectiveDate: Date.now(),
                            budgetMonth: nextMonthObj.getMonth(),
                            budgetYear: nextMonthObj.getFullYear(),
                            status: 'received',
                            categoryId: pi.categoryId
                        });
                    }
                }
            }

            // Build the array
            const distArray: { type: 'next_month' | 'saving_goal', targetId?: string, amount: number }[] = [];
            
            Object.entries(distributions).forEach(([key, amount]) => {
                if (amount > 0) {
                    if (key === 'next_month') {
                        distArray.push({ type: 'next_month', amount: isDeficit ? -amount : amount });
                    } else if (key.startsWith('saving_')) {
                        const targetId = key.replace('saving_', '');
                        distArray.push({ type: 'saving_goal', targetId, amount: isDeficit ? -amount : amount });
                    }
                }
            });

            await closeMonthWithDecision({ ...closing, finalBalance: activeBalance }, distArray);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Error al procesar el cierre.');
        }
    };

    const monthName = new Date(closing.year, closing.month).toLocaleString('es-ES', { month: 'long' });
    const nextMonthName = new Date(closing.year, closing.month + 1).toLocaleString('es-ES', { month: 'long' });

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container glass-panel" style={{ padding: '2rem' }} onClick={e => e.stopPropagation()}>
                <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={24} />
                </button>

                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ 
                        width: '64px', height: '64px', borderRadius: '50%', 
                        background: isDeficit ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1rem'
                    }}>
                        {isDeficit ? <TrendingDown size={32} color="#ef4444" /> : <TrendingUp size={32} color="#10b881" />}
                    </div>
                    <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem', textTransform: 'capitalize' }}>
                        Cierre de {monthName}
                    </h2>
                    <p style={{ opacity: 0.7 }}>
                        Has terminado el mes con un {isDeficit ? 'déficit' : 'remanente'} de:
                    </p>
                    {!isEditingBalance ? (
                        <>
                            <div style={{ fontSize: '2.8rem', fontWeight: 800, color: isDeficit ? '#ef4444' : '#10b881', margin: '0.5rem 0', whiteSpace: 'nowrap' }}>
                                {isDeficit ? '-' : ''}{formatCurrency(totalToDistribute)}
                            </div>
                            <button 
                                type="button"
                                onClick={() => {
                                    setCustomBalance(activeBalance);
                                    setIsEditingBalance(true);
                                }}
                                style={{ 
                                    background: 'none', border: 'none', color: '#818cf8', 
                                    fontSize: '0.9rem', cursor: 'pointer', display: 'inline-flex', 
                                    alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem',
                                    textDecoration: 'underline'
                                }}
                            >
                                ✏️ Modificar manualmente
                            </button>
                        </>
                    ) : (
                        <div style={{ margin: '1rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    value={customBalance ?? ''}
                                    onChange={e => setCustomBalance(parseFloat(e.target.value) || 0)}
                                    className="form-input"
                                    style={{ 
                                        width: '180px', 
                                        padding: '0.5rem 0.75rem', 
                                        fontSize: '1.4rem', 
                                        fontWeight: 700, 
                                        textAlign: 'center',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        borderRadius: '8px',
                                        background: 'rgba(0,0,0,0.2)',
                                        color: (customBalance ?? 0) < 0 ? '#ef4444' : '#10b881'
                                    }}
                                />
                                <span style={{ fontSize: '1.4rem', fontWeight: 700 }}>€</span>
                                <button 
                                    type="button"
                                    onClick={() => setIsEditingBalance(false)}
                                    className="btn btn-primary"
                                    style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', borderRadius: '8px' }}
                                >
                                    Aceptar
                                </button>
                            </div>
                            <div style={{ 
                                fontSize: '0.85rem', 
                                background: 'rgba(245, 158, 11, 0.1)', 
                                border: '1px solid rgba(245, 158, 11, 0.2)',
                                color: '#f59e0b',
                                padding: '0.75rem', 
                                borderRadius: '8px', 
                                maxWidth: '360px',
                                textAlign: 'left',
                                lineHeight: '1.4'
                            }}>
                                <strong>Aviso de corrección manual:</strong> Esta modificación cambiará el importe a repartir para el próximo mes (disponible y/o huchas), pero no afectará a los saldos reales de tus cuentas bancarias.
                            </div>
                        </div>
                    )}
                    <div style={{ 
                        marginTop: '1rem', padding: '0.5rem', borderRadius: '8px',
                        background: Math.abs(remainingAmount) <= 0.01 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: Math.abs(remainingAmount) <= 0.01 ? '#10b881' : '#f59e0b',
                        fontWeight: 700, fontSize: '1rem', whiteSpace: 'nowrap'
                    }}>
                        PENDIENTE DE ASIGNAR: {formatCurrency(remainingAmount)}
                    </div>
                </div>

                {/* Pending Movements Section */}
                {(pendingExpenses.length > 0 || pendingIncomes.length > 0) && (
                    <div style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertCircle size={18} color="#f59e0b" /> Movimientos Fijos Pendientes
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {pendingExpenses.map(pe => (
                                <div key={pe.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                                        <span>Gasto: {pe.description}</span>
                                        <span style={{ color: '#ef4444', fontWeight: 600, whiteSpace: 'nowrap' }}>-{formatCurrency(pe.amount)}</span>
                                    </div>
                                    <select 
                                        className="form-input" 
                                        style={{ fontSize: '0.9rem', padding: '0.5rem' }}
                                        value={expenseDecisions[pe.id] || 'none'}
                                        onChange={e => setExpenseDecisions(prev => ({ ...prev, [pe.id]: e.target.value }))}
                                    >
                                        <option value="none">No hacer nada de momento</option>
                                        <option value="ignore">Ignorar (Recuperar {formatCurrency(pe.amount)} al remanente)</option>
                                        <option value="postpone">Aplazar al mes actual</option>
                                    </select>
                                </div>
                            ))}
                            {pendingIncomes.map(pi => (
                                <div key={pi.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                                        <span>Ingreso: {pi.name}</span>
                                        <span style={{ color: '#10b881', fontWeight: 600, whiteSpace: 'nowrap' }}>+{formatCurrency(pi.amount)}</span>
                                    </div>
                                    <select 
                                        className="form-input" 
                                        style={{ fontSize: '0.9rem', padding: '0.5rem' }}
                                        value={incomeDecisions[pi.id] || 'none'}
                                        onChange={e => setIncomeDecisions(prev => ({ ...prev, [pi.id]: e.target.value }))}
                                    >
                                        <option value="none">No hacer nada de momento</option>
                                        <option value="ignore">Ignorar (Restar {formatCurrency(pi.amount)} del remanente)</option>
                                        <option value="postpone">Aplazar al mes actual</option>
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                    {/* Next Month Row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Calendar size={20} color="#818cf8" />
                            <span style={{ fontSize: '0.95rem' }}>
                                {isDeficit ? `Descontar del disponible de ${nextMonthName}` : `Añadir al disponible de ${nextMonthName}`}
                            </span>
                        </div>
                        <div style={{ width: '100px', position: 'relative' }}>
                            <input 
                                type="number" step="0.01" min="0"
                                value={distributions['next_month'] || ''}
                                onChange={e => handleUpdateAmount('next_month', e.target.value)}
                                className="form-input"
                                style={{ width: '100%', padding: '0.5rem', textAlign: 'right', paddingRight: '1.5rem', fontSize: '1rem' }}
                                placeholder="0.00"
                            />
                            <span style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>€</span>
                        </div>
                    </div>

                    {/* Savings Goals Rows */}
                    {savings.map(s => (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <PiggyBank size={20} color={s.color || '#10b881'} />
                                <span style={{ fontSize: '0.95rem' }}>
                                    {isDeficit ? `Soportar desde ${s.name}` : `Añadir a ${s.name}`}
                                </span>
                            </div>
                            <div style={{ width: '100px', position: 'relative' }}>
                                <input 
                                    type="number" step="0.01" min="0"
                                    value={distributions[`saving_${s.id}`] || ''}
                                    onChange={e => handleUpdateAmount(`saving_${s.id}`, e.target.value)}
                                    className="form-input"
                                    style={{ width: '100%', padding: '0.5rem', textAlign: 'right', paddingRight: '1.5rem', fontSize: '1rem' }}
                                    placeholder="0.00"
                                />
                                <span style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>€</span>
                            </div>
                        </div>
                    ))}
                </div>

                {error && (
                    <div style={{ color: '#ef4444', fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button 
                        onClick={handleConfirm}
                        className="btn btn-primary"
                        disabled={Math.abs(remainingAmount) > 0.01}
                        style={{ 
                            width: '100%', padding: '1rem', borderRadius: '0.75rem', fontWeight: 700,
                            opacity: Math.abs(remainingAmount) > 0.01 ? 0.5 : 1,
                            cursor: Math.abs(remainingAmount) > 0.01 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Confirmar Cierre
                    </button>
                    <button 
                        onClick={onClose}
                        style={{ 
                            width: '100%', background: 'none', border: '1px solid rgba(255,255,255,0.1)', 
                            padding: '1rem', borderRadius: '0.75rem', fontSize: '0.9rem', cursor: 'pointer', color: 'var(--text-muted)'
                        }}
                    >
                        Decidir más adelante
                    </button>
                </div>
            </div>
        </div>
    );
};

const TrendingUp = ({ size, color }: { size: number, color: string }) => (
    <ArrowRightCircle size={size} color={color} style={{ transform: 'rotate(-45deg)' }} />
);

const TrendingDown = ({ size, color }: { size: number, color: string }) => (
    <ArrowRightCircle size={size} color={color} style={{ transform: 'rotate(45deg)' }} />
);

export default RemnantDecisionModal;
