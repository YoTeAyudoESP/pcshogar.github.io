import React, { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { useMonthClosing, type GoalRedirection } from '../../contexts/MonthClosingContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatCurrency } from '../../utils/formatters';
import { Wallet, PiggyBank, CheckCircle2 } from 'lucide-react';
import { isGoalReached, getGoalSavingsImpact } from '../../utils/financeUtils';

interface MonthRolloverModalProps {
    prevYear: number;
    prevMonth: number;
    finalBalance: number;
    nextMonthAvailable: number;
    unmaterializedFixed?: number;
    unmaterializedPending?: number;
    onClose: () => void;
}

const MonthRolloverModal: React.FC<MonthRolloverModalProps> = ({ prevYear, prevMonth, finalBalance, nextMonthAvailable, unmaterializedFixed, unmaterializedPending, onClose }) => {
    const { t } = useLanguage();
    const { savings } = useFinance();
    const { closeMonth } = useMonthClosing();

    const [step, setStep] = useState<0 | 1 | 2>(0); // 0: Redirections (automated), 1: Distribution (manual), 2: Confirmation
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [redirections, setRedirections] = useState<GoalRedirection[]>([]);

    // Distribution state: goalId -> amount (string for input)
    const [goalAllocations, setGoalAllocations] = useState<Record<string, string>>({});
    const [availableAllocation, setAvailableAllocation] = useState<string>('');

    const completedGoals = React.useMemo(() => {
        return (savings || []).filter(isGoalReached);
    }, [savings]);

    // Initial step determination
    React.useEffect(() => {
        if (completedGoals.length === 0) {
            setStep(1);
        }
    }, [completedGoals]);

    const isSurplus = finalBalance > 0;
    const absTotal = Math.abs(finalBalance);

    const currentAllocated = React.useMemo(() => {
        const fromGoals = Object.values(goalAllocations).reduce((sum, val) => sum + (Math.abs(parseFloat(val)) || 0), 0);
        const fromAvailable = Math.abs(parseFloat(availableAllocation)) || 0;
        return Math.round((fromGoals + fromAvailable) * 100) / 100;
    }, [goalAllocations, availableAllocation]);

    const remainingToAllocate = Math.round((absTotal - currentAllocated) * 100) / 100;
    const isFullyAllocated = Math.abs(remainingToAllocate) < 0.01;
    const isOverAllocated = currentAllocated > absTotal + 0.01;

    const prevMonthName = new Date(prevYear, prevMonth).toLocaleString('es-ES', { month: 'long' });

    const handleConfirm = async () => {
        if (!isFullyAllocated || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const allocations: any[] = [];

            // Add Available allocation if any
            const availAmt = parseFloat(availableAllocation);
            if (availAmt > 0) {
                allocations.push({
                    action: isSurplus ? 'carry' : 'deduct',
                    amount: availAmt
                });
            }

            // Add Goal allocations
            Object.entries(goalAllocations).forEach(([goalId, val]) => {
                const amt = parseFloat(val);
                if (amt > 0) {
                    allocations.push({
                        action: isSurplus ? 'save' : 'cover',
                        amount: amt,
                        targetId: goalId
                    });
                }
            });

            // If nothing allocated but it was actually 0? (Shouldn't happen with button disabled)
            if (allocations.length === 0) {
                allocations.push({ action: 'dismiss', amount: 0 });
            }

            await closeMonth({
                year: prevYear,
                month: prevMonth,
                finalBalance: finalBalance,
                allocations: allocations,
                redirections: redirections
            });
            onClose();
        } catch (error) {
            console.error(error);
            setIsSubmitting(false);
        }
    };

    // Render Steps
    const renderRedirectionStep = () => (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <CheckCircle2 size={48} color="var(--color-success)" style={{ marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.5rem' }}>{t('rollover.goalsReached')}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                    {t('rollover.goalReachedDesc')}
                </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
                {completedGoals.map(goal => {
                    const { surplus } = getGoalSavingsImpact(goal);
                    const currentRedir = redirections.find(r => r.goalId === goal.id);

                    return (
                        <div key={goal.id} className="glass-panel" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)' }}>
                            <h4 style={{ color: 'var(--color-primary)', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                                {goal.name}
                            </h4>

                            {surplus > 0 && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                                        {t('rollover.redirectSurplus')} <strong>({formatCurrency(surplus)})</strong>
                                    </label>
                                    <select
                                        className="form-input"
                                        style={{ fontSize: '0.85rem' }}
                                        value={currentRedir?.surplusTargetGoalId || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setRedirections(prev => {
                                                const existing = prev.find(r => r.goalId === goal.id);
                                                if (existing) {
                                                    return prev.map(r => r.goalId === goal.id ? { ...r, surplusTargetGoalId: val } : r);
                                                }
                                                return [...prev, { goalId: goal.id, surplusTargetGoalId: val }];
                                            });
                                        }}
                                    >
                                        <option value="">{t('rollover.keepHere')}</option>
                                        <option value="stop">{t('rollover.stopSaving')}</option>
                                        {savings.filter(g => g.id !== goal.id).map(g => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                                    {t('rollover.redirectFuture')} <strong>({formatCurrency(goal.monthlySavingAmount || 0)}/mes)</strong>
                                </label>
                                <select
                                    className="form-input"
                                    style={{ fontSize: '0.85rem' }}
                                    value={currentRedir?.futureTargetGoalId || ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setRedirections(prev => {
                                            const existing = prev.find(r => r.goalId === goal.id);
                                            if (existing) {
                                                return prev.map(r => r.goalId === goal.id ? { ...r, futureTargetGoalId: val } : r);
                                            }
                                            return [...prev, { goalId: goal.id, futureTargetGoalId: val }];
                                        });
                                    }}
                                >
                                    <option value="">{t('rollover.keepHere')}</option>
                                    <option value="stop">{t('rollover.stopSaving')}</option>
                                    {savings.filter(g => g.id !== goal.id).map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                <button
                    className="btn-primary"
                    style={{ width: '100%', padding: '1rem' }}
                    onClick={() => setStep(1)}
                >
                    {t('common.continue')}
                </button>
            </div>
        </div>
    );

    const renderStep1 = () => (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>
                    {t('rollover.title').replace('{month}', prevMonthName)}
                </h3>
                <div style={{
                    fontSize: '2.25rem',
                    fontWeight: 800,
                    color: isSurplus ? 'var(--color-success)' : 'var(--hue-danger)',
                }}>
                    {formatCurrency(finalBalance)}
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {isSurplus ? 'Saldo sobrante a distribuir' : 'Déficit a cubrir'}
                </p>

                {((unmaterializedFixed || 0) > 0 || (unmaterializedPending || 0) > 0) && (
                    <div style={{
                        marginTop: '0.75rem',
                        padding: '0.5rem',
                        fontSize: '0.75rem',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'inline-block',
                        textAlign: 'left'
                    }}>
                        <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}><strong>Nota:</strong> Este saldo incluye ajustes automáticos por dinero en el mes {prevMonthName} que finalmente no se movió:</div>
                        {(unmaterializedPending || 0) > 0 && <div style={{ color: 'var(--color-success)' }}>• +{formatCurrency(unmaterializedPending!)} de gastos fijos no cobrados</div>}
                        {(unmaterializedFixed || 0) > 0 && <div style={{ color: 'var(--hue-danger)' }}>• -{formatCurrency(unmaterializedFixed!)} de ingresos fijos no recibidos</div>}
                    </div>
                )}
            </div>

            {/* Allocation Status Bar */}
            <div className="glass-panel" style={{
                padding: '1rem',
                marginBottom: '1.5rem',
                textAlign: 'center',
                background: isOverAllocated ? 'rgba(231, 76, 60, 0.1)' : (isFullyAllocated ? 'rgba(46, 213, 115, 0.1)' : 'rgba(255,255,255,0.05)'),
                border: isOverAllocated ? '1px solid var(--hue-danger)' : (isFullyAllocated ? '1px solid var(--color-success)' : 'var(--card-border)')
            }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Pendiente de asignar</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatCurrency(remainingToAllocate)}</div>
                {isOverAllocated && <div style={{ fontSize: '0.7rem', color: 'var(--hue-danger)', marginTop: '0.25rem' }}>Has asignado de más</div>}
            </div>

            {/* Destination List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Available balance option */}
                <div className="glass-panel" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Wallet size={16} color="var(--color-primary)" /> {isSurplus ? 'Disponible mes siguiente' : 'Descontar del disponible'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Actual proyectado: {formatCurrency(nextMonthAvailable)}</div>
                    </div>
                    <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        placeholder="0.00"
                        className="form-input"
                        style={{ width: '100px', margin: 0, textAlign: 'right', padding: '0.4rem' }}
                        value={availableAllocation}
                        onChange={e => setAvailableAllocation(e.target.value)}
                    />
                </div>

                <div style={{ margin: '0.5rem 0', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {isSurplus ? 'Ahorrar en huchas' : 'Cubrir desde huchas'}
                </div>

                {savings.map(goal => (
                    <div key={goal.id} className="glass-panel" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <PiggyBank size={16} color="var(--hue-warning)" /> {goal.name}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Saldo actual: {formatCurrency(goal.currentAmount)}</div>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="number"
                                inputMode="decimal"
                                step="0.01"
                                placeholder="0.00"
                                className="form-input"
                                style={{
                                    width: '100px',
                                    margin: 0,
                                    textAlign: 'right',
                                    padding: '0.4rem',
                                    border: (!isSurplus && parseFloat(goalAllocations[goal.id]) > goal.currentAmount) ? '1px solid var(--hue-danger)' : ''
                                }}
                                value={goalAllocations[goal.id] || ''}
                                onChange={e => setGoalAllocations(prev => ({ ...prev, [goal.id]: e.target.value }))}
                            />
                            {!isSurplus && parseFloat(goalAllocations[goal.id]) > goal.currentAmount && (
                                <div style={{ position: 'absolute', bottom: '-15px', right: 0, color: 'var(--hue-danger)', fontSize: '0.6rem', whiteSpace: 'nowrap' }}>Excede saldo</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                <button
                    className="btn-text"
                    style={{ flex: 1, minWidth: '120px', padding: '0.75rem' }}
                    onClick={onClose}
                >
                    {t('rollover.decideLater')}
                </button>
                <button
                    className="btn-primary"
                    style={{ flex: 2, minWidth: '160px', padding: '0.75rem' }}
                    disabled={!isFullyAllocated || isSubmitting || (!isSurplus && Object.entries(goalAllocations).some(([id, val]) => parseFloat(val) > (savings.find(g => g.id === id)?.currentAmount || 0)))}
                    onClick={handleConfirm}
                >
                    {isSubmitting ? t('rollover.processing') : 'Confirmar Cierre'}
                </button>
            </div>
        </div>
    );

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000,
            padding: window.innerWidth < 600 ? '10px' : '20px'
        }}>
            <div className="glass-panel" style={{
                width: '100%',
                maxWidth: '600px',
                height: 'auto',
                maxHeight: 'calc(100vh - 40px)',
                padding: window.innerWidth < 600 ? '1.25rem' : '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideUp 0.3s ease-out',
                boxSizing: 'border-box',
                overflow: 'hidden' // Main panel shouldn't scroll, inner content should
            }}>
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0,
                    overflow: 'hidden'
                }}>
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        paddingRight: '4px',
                        marginBottom: '1rem',
                        // Ensure smooth scrolling on mobile
                        WebkitOverflowScrolling: 'touch'
                    }}>
                        {step === 0 && renderRedirectionStep()}
                        {step === 1 && renderStep1()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MonthRolloverModal;
