import React from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { useIncome } from '../../contexts/IncomeContext';
import { Target, Trash2, PlusCircle, Settings, History } from 'lucide-react';
import type { SavingGoal } from '../../types/finance';
import { formatCurrency } from '../../utils/formatters';
import PiggyBankAllocationModal from './PiggyBankAllocationModal';
import PiggyBankHistory from './PiggyBankHistory';
import PiggyBankRedistributionModal from './PiggyBankRedistributionModal';

interface PiggyBankListProps {
    onEdit?: (goal: SavingGoal) => void;
    title?: string;
    showAddButton?: boolean;
}

const PiggyBankList: React.FC<PiggyBankListProps> = ({ onEdit, title = "Mis Huchas" }) => {
    const { savings, deleteSaving, allocateSavings } = useFinance();
    const { fixedIncomes } = useIncome();

    const [allocatingGoal, setAllocatingGoal] = React.useState<SavingGoal | null>(null);
    const [historyGoal, setHistoryGoal] = React.useState<SavingGoal | null>(null);
    const [redistributingGoal, setRedistributingGoal] = React.useState<SavingGoal | null>(null);

    const handleDelete = async (goal: SavingGoal) => {
        if (goal.currentAmount <= 0.01) {
            if (window.confirm(`¿Estás seguro de que quieres eliminar la hucha "${goal.name}"?`)) {
                await deleteSaving(goal.id);
            }
            return;
        }

        // Handle redistribution
        if (savings.length === 1) {
            if (window.confirm(`Esta es tu última hucha con saldo (${formatCurrency(goal.currentAmount)}). Si la eliminas, su importe se sumará al disponible del mes en curso. ¿Deseas continuar?`)) {
                // If single goal, send entire amount to available
                // Technically we just delete it and let the user know, 
                // but for consistency we create an allocation to "available" (which is implicit when no goalId is provided or goal is deleted)
                // In this app, currentAmount being deleted means it's no longer "reserved", so it naturally goes back to Available 
                // as long as the code that calculates Available only subtracts from existing huchas.
                await deleteSaving(goal.id);
            }
        } else {
            setRedistributingGoal(goal);
        }
    };

    const handleConfirmRedistribution = async (distributions: { goalId?: string; amount: number; toAvailable?: boolean }[]) => {
        if (!redistributingGoal) return;

        for (const dist of distributions) {
            if (dist.goalId) {
                // Transfer to another goal
                // We do a negative allocation on the source and positive on target
                await allocateSavings(redistributingGoal.id, -dist.amount);
                await allocateSavings(dist.goalId, dist.amount);
            } else if (dist.toAvailable) {
                // Just remove from hucha (it returns to available automatically in calculations)
                await allocateSavings(redistributingGoal.id, -dist.amount);
            }
        }

        await deleteSaving(redistributingGoal.id);
        setRedistributingGoal(null);
    };

    return (
        <div className="glass-panel" style={{ padding: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--hue-warning)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Target size={20} />
                {title}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {(!savings || savings.length === 0) ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No tienes huchas.</p>
                ) : (
                    savings.map((goal: SavingGoal) => (
                        <div key={goal.id} className="glass-panel" style={{ padding: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{goal.name}</h4>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <Target size={14} /> Meta: {goal.targetAmount ? formatCurrency(goal.targetAmount) : 'N/A'}
                                        </span>
                                        {goal.linkedFixedIncomeId && (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-primary)' }}>
                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                                                Auto: {fixedIncomes.find(i => i.id === goal.linkedFixedIncomeId)?.name || 'Vinculado'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-secondary)' }}>
                                        {formatCurrency(goal.currentAmount)}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                                        <button
                                            onClick={() => setAllocatingGoal(goal)}
                                            className="btn-icon"
                                            style={{ color: 'var(--color-success)', marginRight: '0.25rem' }}
                                            title="Añadir dinero"
                                        >
                                            <PlusCircle size={18} />
                                        </button>
                                        <button
                                            onClick={() => setHistoryGoal(goal)}
                                            className="btn-icon"
                                            style={{ color: 'var(--color-secondary)', marginRight: '0.25rem' }}
                                            title="Ver historial"
                                        >
                                            <History size={18} />
                                        </button>
                                        {onEdit && (
                                            <button
                                                onClick={() => onEdit(goal)}
                                                className="btn-icon"
                                                style={{ color: 'var(--color-primary)' }}
                                                title="Editar"
                                            >
                                                <Settings size={18} />
                                            </button>
                                        )}
                                        <button onClick={() => handleDelete(goal)} className="btn-icon" style={{ color: 'var(--hue-danger)' }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {allocatingGoal && (
                <PiggyBankAllocationModal
                    goalId={allocatingGoal.id}
                    goalName={allocatingGoal.name}
                    isVirtual={!!allocatingGoal.isVirtual}
                    onClose={() => setAllocatingGoal(null)}
                />
            )}

            {historyGoal && (
                <PiggyBankHistory
                    goalId={historyGoal.id}
                    goalName={historyGoal.name}
                    onClose={() => setHistoryGoal(null)}
                />
            )}

            {redistributingGoal && (
                <PiggyBankRedistributionModal
                    sourceGoal={{ id: redistributingGoal.id, name: redistributingGoal.name, currentAmount: redistributingGoal.currentAmount }}
                    onClose={() => setRedistributingGoal(null)}
                    onConfirm={handleConfirmRedistribution}
                />
            )}
        </div>
    );
};

export default PiggyBankList;
