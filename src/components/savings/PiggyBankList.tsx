import React, { useState, useEffect } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { Target, History, Settings, Trash2, PlusCircle } from 'lucide-react';
import type { SavingGoal } from '../../types/finance';
import { formatMoney } from '../../utils/financeCalculations';

interface PiggyBankListProps {
    onEdit: (goal: SavingGoal) => void;
    onAddMoney: (goal: SavingGoal) => void;
    onShowHistory: (goal: SavingGoal) => void;
}

const PiggyBankList: React.FC<PiggyBankListProps> = ({ onEdit, onAddMoney, onShowHistory }) => {
    const { savings, accounts, deleteSavingGoal, adjustSavings } = useFinance();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleDelete = async (goal: SavingGoal) => {
        if (goal.currentAmount > 0) {
            const action = window.confirm(
                `La hucha "${goal.name}" tiene ${formatMoney(goal.currentAmount)}. \n\n` +
                `¿Quieres repartir este dinero entre otras huchas? (Cancelar para mover al disponible del mes)`
            );

            if (action) {
                alert("Por favor, usa la opción de Traspasar para repartir el dinero antes de eliminar.");
                return;
            } else {
                if (window.confirm("¿Seguro que quieres eliminar la hucha y devolver el dinero al disponible mensual?")) {
                    await adjustSavings(goal.id, -goal.currentAmount, undefined, true);
                    await deleteSavingGoal(goal.id);
                }
                return;
            }
        }

        if (window.confirm(`¿Estás seguro de que quieres eliminar la hucha "${goal.name}"?`)) {
            await deleteSavingGoal(goal.id);
        }
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
                                    title="Añadir dinero"
                                    style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                >
                                    <PlusCircle size={isMobile ? 20 : 22} />
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
                                    onClick={() => handleDelete(goal)}
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
        </div>
    );
};

export default PiggyBankList;
