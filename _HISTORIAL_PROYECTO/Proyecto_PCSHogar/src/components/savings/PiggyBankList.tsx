
import React from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { PiggyBank as IconPiggy, Target } from 'lucide-react';
import type { SavingGoal } from '../../types/finance';

interface PiggyBankListProps {
    onEdit?: (goal: SavingGoal) => void;
}

const PiggyBankList: React.FC<PiggyBankListProps> = ({ onEdit }) => {
    const { savings } = useFinance(); // Need to expose savings in context

    return (
        <div className="glass-panel" style={{ padding: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--hue-warning)' }}>Mis Huchas</h3>
            {(!savings || savings.length === 0) ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No tienes huchas.</p>
            ) : (
                <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                    {savings.map((goal: any) => (
                        <div key={goal.id} style={{
                            background: 'rgba(255,255,255,0.03)',
                            padding: '1rem',
                            borderRadius: 'var(--radius-sm)',
                            borderTop: '4px solid var(--hue-warning)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{goal.name}</div>
                                    {goal.targetAmount && (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                                            <Target size={14} /> Meta: {goal.targetAmount}€
                                        </div>
                                    )}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                                        {goal.currentAmount.toFixed(2)}€
                                    </div>
                                    {onEdit && (
                                        <button
                                            onClick={() => onEdit(goal)}
                                            style={{
                                                fontSize: '0.8rem',
                                                background: 'transparent',
                                                border: '1px solid rgba(255,255,255,0.2)',
                                                color: 'var(--text-muted)',
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '4px',
                                                marginTop: '0.5rem',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Editar
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PiggyBankList;

