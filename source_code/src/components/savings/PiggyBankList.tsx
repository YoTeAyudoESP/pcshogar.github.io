import React, { useState, useEffect } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { useDateSelection } from '../../contexts/DateSelectionContext';
import { Target, History, Settings, Trash2, PlusCircle, MinusCircle, AlertTriangle, X, ArrowRightLeft, DollarSign } from 'lucide-react';
import type { SavingGoal } from '../../types/finance';
import { formatMoney } from '../../utils/financeCalculations';
import ModalPortal from '../common/ModalPortal';

interface PiggyBankListProps {
    onEdit: (goal: SavingGoal) => void;
    onAddMoney: (goal: SavingGoal) => void;
    onWithdrawMoney: (goal: SavingGoal) => void;
    onShowHistory: (goal: SavingGoal) => void;
}

const PiggyBankList: React.FC<PiggyBankListProps> = ({ onEdit, onAddMoney, onWithdrawMoney, onShowHistory }) => {
    const { savings, accounts, deleteSavingGoal, adjustSavings, fixedIncomes, expenses } = useFinance();
    const { selectedMonth, selectedYear } = useDateSelection();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
    const [deletingGoal, setDeletingGoal] = useState<SavingGoal | null>(null);
    const [transferTargetId, setTransferTargetId] = useState<string>('');

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleDeleteClick = (goal: SavingGoal) => {
        setDeletingGoal(goal);
        const otherGoals = savings.filter(g => g.id !== goal.id);
        if (otherGoals.length > 0) {
            setTransferTargetId(otherGoals[0].id);
        } else {
            setTransferTargetId('');
        }
    };

    const handleConfirmDeleteWithReturnToBudget = async () => {
        if (!deletingGoal) return;
        if (deletingGoal.currentAmount > 0) {
            await adjustSavings(deletingGoal.id, -deletingGoal.currentAmount, undefined, true, undefined, selectedMonth, selectedYear);
        }
        await deleteSavingGoal(deletingGoal.id);
        setDeletingGoal(null);
    };

    const handleConfirmDeleteWithTransfer = async () => {
        if (!deletingGoal || !transferTargetId) return;
        const targetGoal = savings.find(g => g.id === transferTargetId);
        if (!targetGoal) return;

        if (deletingGoal.currentAmount > 0) {
            await adjustSavings(deletingGoal.id, -deletingGoal.currentAmount, undefined, false, undefined, selectedMonth, selectedYear, 'transfer_out', `Traspaso por eliminación a ${targetGoal.name}`);
            await adjustSavings(targetGoal.id, deletingGoal.currentAmount, undefined, false, undefined, selectedMonth, selectedYear, 'transfer_in', `Traspaso de hucha eliminada ${deletingGoal.name}`);
        }
        await deleteSavingGoal(deletingGoal.id);
        setDeletingGoal(null);
    };

    if (!savings || savings.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                No tienes huchas creadas. Pulsa el botón para añadir tu primera hucha.
            </div>
        );
    }

    return (
        <div style={{ display: 'grid', gap: isMobile ? '0.5rem' : '1rem', gridTemplateColumns: '1fr' }}>
            {savings.map(goal => {
                const sourceAcc = accounts.find(a => a.id === goal.automaticSourceAccountId);
                const linkedIncome = fixedIncomes?.find(i => i.id === goal.linkedFixedIncomeId);

                const reservedAmount = (expenses || [])
                    .filter(exp => exp.status === 'pending' && !exp.excludeFromBudget)
                    .reduce((sum, exp) => {
                        let funded = 0;
                        if (exp.savingGoalFunding && exp.savingGoalFunding.length > 0) {
                            funded = exp.savingGoalFunding
                                .filter(f => f.goalId === goal.id)
                                .reduce((s, f) => s + f.amount, 0);
                        } else if (exp.linkedSavingGoalId === goal.id) {
                            funded = exp.amount;
                        }
                        return sum + funded;
                    }, 0);
                
                return (
                    <div 
                        key={goal.id} 
                        style={{
                            background: 'rgba(255,255,255,0.03)',
                            padding: isMobile ? '0.75rem' : '1.25rem',
                            borderRadius: '16px',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderLeft: `5px solid ${goal.color || 'var(--color-primary)'}`,
                            display: 'flex',
                            flexDirection: isMobile ? 'column' : 'row',
                            justifyContent: 'space-between',
                            alignItems: isMobile ? 'stretch' : 'center',
                            transition: 'all 0.2s ease',
                            gap: isMobile ? '0.75rem' : '1rem'
                        }}
                    >
                        {/* Upper Row on Mobile / Left on Desktop */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flex: 1, minWidth: 0, gap: '1rem' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ 
                                    fontSize: isMobile ? '1rem' : '1.2rem', 
                                    fontWeight: 700, 
                                    marginBottom: isMobile ? '2px' : '0.5rem',
                                    wordBreak: 'break-word'
                                }} title={goal.name}>
                                    {goal.name}
                                </div>
                                
                                {!isMobile && (
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
                                            <Target size={12} /> Meta: {goal.targetAmount ? formatMoney(goal.targetAmount) : 'N/A'}
                                        </div>
                                        {sourceAcc && (
                                            <div style={{ fontSize: '0.75rem', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#6366f1' }} />
                                                Auto: {sourceAcc.name}
                                            </div>
                                        )}
                                        {linkedIncome && (
                                            <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#10b981' }} />
                                                Vinc: {linkedIncome.name}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Amount (Always prominent) */}
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ 
                                    fontSize: isMobile ? '1.1rem' : '1.75rem', 
                                    fontWeight: 800, 
                                    color: '#ec4899',
                                    letterSpacing: '-0.02em',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {formatMoney(goal.currentAmount)}
                                </div>
                                {reservedAmount > 0 && (
                                    <div style={{ 
                                        fontSize: '0.75rem', 
                                        color: '#f59e0b', 
                                        fontWeight: 600, 
                                        marginTop: '2px',
                                        whiteSpace: 'nowrap' 
                                    }}>
                                        🔒 Reservado: {formatMoney(reservedAmount)} (Disp: {formatMoney(Math.max(0, goal.currentAmount - reservedAmount))})
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Lower Row on Mobile / Right on Desktop */}
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            borderTop: isMobile ? '1px solid rgba(255,255,255,0.05)' : 'none',
                            paddingTop: isMobile ? '0.75rem' : '0',
                            gap: '1rem'
                        }}>
                            {isMobile && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Target size={14} /> {goal.targetAmount ? formatMoney(goal.targetAmount) : 'N/A'}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: isMobile ? '8px' : '12px', color: 'rgba(255,255,255,0.6)', marginLeft: 'auto' }}>
                                <button 
                                    onClick={() => onAddMoney(goal)}
                                    title="Añadir dinero (Ahorrar)"
                                    style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                >
                                    <PlusCircle size={isMobile ? 20 : 22} />
                                </button>
                                <button 
                                    onClick={() => onWithdrawMoney(goal)}
                                    title="Retirar dinero"
                                    style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                >
                                    <MinusCircle size={isMobile ? 20 : 22} />
                                </button>
                                <button 
                                    onClick={() => onShowHistory(goal)}
                                    title="Historial"
                                    style={{ background: 'none', border: 'none', color: '#ec4899', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                >
                                    <History size={isMobile ? 20 : 22} />
                                </button>
                                <button 
                                    onClick={() => onEdit(goal)}
                                    title="Editar"
                                    style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                >
                                    <Settings size={isMobile ? 20 : 22} />
                                </button>
                                <button 
                                    onClick={() => handleDeleteClick(goal)}
                                    title="Eliminar"
                                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                >
                                    <Trash2 size={isMobile ? 20 : 22} />
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}

            {deletingGoal && (
                <ModalPortal><div className="modal-overlay" onClick={() => setDeletingGoal(null)}>
                    <div className="modal-container glass-panel" style={{ padding: '2rem', maxWidth: '480px', width: '95%', textAlign: 'center', position: 'relative', boxSizing: 'border-box' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setDeletingGoal(null)} style={{
                            position: 'absolute', top: '1.25rem', right: '1.25rem',
                            background: 'rgba(255,255,255,0.05)', border: 'none',
                            color: 'white', padding: '8px', borderRadius: '50%', cursor: 'pointer'
                        }}>
                            <X size={18} />
                        </button>

                        <div style={{
                            width: '60px', height: '60px', margin: '0 auto 1.25rem',
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 8px 16px rgba(239, 68, 68, 0.3)'
                        }}>
                            <Trash2 size={30} color="white" />
                        </div>

                        <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.75rem', color: 'white' }}>
                            Eliminar Hucha
                        </h3>

                        {deletingGoal.currentAmount > 0 ? (
                            <>
                                <p style={{ fontSize: '0.92rem', color: 'rgba(255,255,255,0.8)', lineHeight: '1.5', marginBottom: '1.5rem' }}>
                                    La hucha <strong>"{deletingGoal.name}"</strong> contiene <strong style={{ color: '#10b981' }}>{formatMoney(deletingGoal.currentAmount)}</strong>.<br />
                                    ¿Qué deseas hacer con el dinero antes de eliminarla?
                                </p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                    <button
                                        onClick={handleConfirmDeleteWithReturnToBudget}
                                        style={{
                                            padding: '0.9rem 1rem', borderRadius: '12px',
                                            background: '#1e2028', color: 'white',
                                            border: '1px solid rgba(255, 255, 255, 0.12)',
                                            fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                        }}
                                    >
                                        <DollarSign size={18} color="#10b981" /> Devolver al Disponible del Mes
                                    </button>

                                    {savings.filter(g => g.id !== deletingGoal.id).length > 0 && (
                                        <div style={{
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: '12px', padding: '0.85rem'
                                        }}>
                                            <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, display: 'block', marginBottom: '0.4rem', textAlign: 'left' }}>
                                                Traspasar dinero a otra hucha:
                                            </label>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <select
                                                    value={transferTargetId}
                                                    onChange={e => setTransferTargetId(e.target.value)}
                                                    style={{
                                                        flex: 1, padding: '0.6rem', borderRadius: '8px',
                                                        background: '#181920', color: 'white', border: '1px solid rgba(255,255,255,0.15)',
                                                        fontSize: '0.85rem'
                                                    }}
                                                >
                                                    {savings.filter(g => g.id !== deletingGoal.id).map(g => (
                                                        <option key={g.id} value={g.id}>{g.name} ({formatMoney(g.currentAmount)})</option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={handleConfirmDeleteWithTransfer}
                                                    disabled={!transferTargetId}
                                                    style={{
                                                        padding: '0.6rem 1rem', borderRadius: '8px',
                                                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                                        color: 'white', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                                                    }}
                                                >
                                                    Traspasar y Eliminar
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <p style={{ fontSize: '0.92rem', color: 'rgba(255,255,255,0.75)', lineHeight: '1.5', marginBottom: '1.75rem' }}>
                                ¿Estás seguro de que deseas eliminar la hucha <strong>"{deletingGoal.name}"</strong>? Esta acción no se puede deshacer.
                            </p>
                        )}

                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                            <button
                                onClick={() => setDeletingGoal(null)}
                                style={{
                                    flex: 1, padding: '0.8rem', borderRadius: '10px',
                                    background: 'rgba(255,255,255,0.06)', color: 'white',
                                    border: '1px solid rgba(255,255,255,0.1)', fontWeight: 600,
                                    fontSize: '0.9rem', cursor: 'pointer'
                                }}
                            >
                                Cancelar
                            </button>
                            {deletingGoal.currentAmount === 0 && (
                                <button
                                    onClick={handleConfirmDeleteWithReturnToBudget}
                                    style={{
                                        flex: 1, padding: '0.8rem', borderRadius: '10px',
                                        background: '#ef4444', color: 'white',
                                        border: 'none', fontWeight: 700,
                                        fontSize: '0.9rem', cursor: 'pointer'
                                    }}
                                >
                                    Eliminar
                                </button>
                            )}
                        </div>
                    </div>
                </div></ModalPortal>
            )}
        </div>
    );
};

export default PiggyBankList;
