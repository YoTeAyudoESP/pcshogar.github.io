import React, { useState, useMemo } from 'react';
import { X, AlertCircle, CheckCircle2, Target, Wallet } from 'lucide-react';
import { useFinance } from '../../contexts/FinanceContext';
import { formatCurrency } from '../../utils/formatters';

interface PiggyBankRedistributionModalProps {
    sourceGoal: { id: string; name: string; currentAmount: number };
    onClose: () => void;
    onConfirm: (distributions: { goalId?: string; amount: number; toAvailable?: boolean }[]) => Promise<void>;
}

const PiggyBankRedistributionModal: React.FC<PiggyBankRedistributionModalProps> = ({ sourceGoal, onClose, onConfirm }) => {
    const { savings } = useFinance();
    const otherGoals = savings.filter(g => g.id !== sourceGoal.id);

    // State for distributions: goalId -> amount
    const [distributions, setDistributions] = useState<Record<string, string>>({});
    const [amountToAvailable, setAmountToAvailable] = useState<string>('');
    const [addToAvailable, setAddToAvailable] = useState(false);

    const totalDistributed = useMemo(() => {
        const fromGoals = Object.values(distributions).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
        const fromAvailable = addToAvailable ? (parseFloat(amountToAvailable) || 0) : 0;
        return Math.round((fromGoals + fromAvailable) * 100) / 100;
    }, [distributions, amountToAvailable, addToAvailable]);

    const remainingToDistribute = Math.round((sourceGoal.currentAmount - totalDistributed) * 100) / 100;
    const isOverLimit = totalDistributed > sourceGoal.currentAmount;
    const isFullyDistributed = Math.abs(remainingToDistribute) < 0.01;

    const handleConfirm = async () => {
        if (!isFullyDistributed) return;

        const results: { goalId?: string; amount: number; toAvailable?: boolean }[] = [];

        // Goals distributions
        Object.entries(distributions).forEach(([goalId, val]) => {
            const amount = parseFloat(val);
            if (amount > 0) {
                results.push({ goalId, amount });
            }
        });

        // Available distribution
        if (addToAvailable && parseFloat(amountToAvailable) > 0) {
            results.push({ amount: parseFloat(amountToAvailable), toAvailable: true });
        }

        await onConfirm(results);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1200,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
        }}>
            <div className="glass-panel" style={{
                width: window.innerWidth < 600 ? '98%' : '90%',
                maxWidth: '500px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                padding: window.innerWidth < 600 ? '1rem' : '1.5rem',
                gap: '1.25rem',
                boxSizing: 'border-box'
            }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)' }}>
                    <X size={24} />
                </button>

                <div>
                    <h2 style={{ margin: 0, color: 'var(--hue-danger)' }}>Eliminar Hucha</h2>
                    <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)' }}>
                        La hucha "<strong>{sourceGoal.name}</strong>" tiene saldo. Distribuye todo su contenido para poder eliminarla.
                    </p>
                </div>

                {/* Status Card */}
                <div className="glass-panel" style={{
                    padding: '1.25rem',
                    textAlign: 'center',
                    background: isOverLimit ? 'rgba(231, 76, 60, 0.1)' : (isFullyDistributed ? 'rgba(46, 213, 115, 0.1)' : 'rgba(255, 255, 255, 0.05)'),
                    border: isOverLimit ? '1px solid var(--hue-danger)' : (isFullyDistributed ? '1px solid var(--color-success)' : 'var(--card-border)')
                }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Saldo a Distribuir</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, margin: '0.25rem 0' }}>{formatCurrency(remainingToDistribute)}</div>
                    <div style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        {isOverLimit ? (
                            <><AlertCircle size={14} color="var(--hue-danger)" /> <span style={{ color: 'var(--hue-danger)' }}>Has excedido el saldo disponible</span></>
                        ) : isFullyDistributed ? (
                            <><CheckCircle2 size={14} color="var(--color-success)" /> <span style={{ color: 'var(--color-success)' }}>Todo asignado. ¡Listo!</span></>
                        ) : (
                            <span>Total inicial: {formatCurrency(sourceGoal.currentAmount)}</span>
                        )}
                    </div>
                </div>

                {/* Content - Scrollable */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.5rem' }}>

                    {/* Available Balance Option */}
                    <div className="glass-panel" style={{ padding: '1rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', marginBottom: '0.75rem' }}>
                            <input
                                type="checkbox"
                                checked={addToAvailable}
                                onChange={e => setAddToAvailable(e.target.checked)}
                                style={{ width: '1.2rem', height: '1.2rem' }}
                            />
                            <Wallet size={18} className="text-success" />
                            <span style={{ fontWeight: 600 }}>Pasar al Disponible (Mes Actual)</span>
                        </label>
                        {addToAvailable && (
                            <input
                                type="number"
                                step="0.01"
                                className="mobile-full-width"
                                style={{
                                    width: '100%',
                                    background: 'var(--bg-body)',
                                    border: 'var(--card-border)',
                                    borderRadius: 'var(--radius-sm)',
                                    padding: '0.75rem',
                                    color: 'white',
                                    fontSize: '1rem'
                                }}
                                placeholder="Introduce cantidad..."
                                value={amountToAvailable}
                                onChange={e => setAmountToAvailable(e.target.value)}
                            />
                        )}
                    </div>

                    {/* Other Goals */}
                    {otherGoals.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <h4 style={{ margin: '0.5rem 0', color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Otras Huchas</h4>
                            {otherGoals.map(goal => (
                                <div key={goal.id} className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Target size={16} color="var(--hue-warning)" /> {goal.name}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Saldo actual: {formatCurrency(goal.currentAmount)}</div>
                                    </div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        style={{
                                            width: '100px',
                                            background: 'var(--bg-body)',
                                            border: 'var(--card-border)',
                                            borderRadius: 'var(--radius-sm)',
                                            padding: '0.5rem',
                                            color: 'white',
                                            fontSize: '0.9rem',
                                            textAlign: 'right'
                                        }}
                                        value={distributions[goal.id] || ''}
                                        onChange={e => setDistributions({ ...distributions, [goal.id]: e.target.value })}
                                        placeholder="0.00"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={onClose} className="btn-icon mobile-full-width" style={{ flex: 1, padding: '0.75rem', height: 'auto' }}>
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="btn-primary mobile-full-width"
                        disabled={!isFullyDistributed}
                        style={{ flex: 2, padding: '0.75rem' }}
                    >
                        Aceptar y Eliminar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PiggyBankRedistributionModal;
