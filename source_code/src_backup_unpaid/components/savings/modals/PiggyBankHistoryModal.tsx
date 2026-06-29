import React from 'react';
import { useFinance } from '../../../contexts/FinanceContext';
import { History, X, ArrowUpRight, ArrowDownLeft, RefreshCw } from 'lucide-react';
import type { SavingGoal, SavingAllocation } from '../../../types/finance';

interface PiggyBankHistoryModalProps {
    goal: SavingGoal;
    onClose: () => void;
}

const PiggyBankHistoryModal: React.FC<PiggyBankHistoryModalProps> = ({ goal, onClose }) => {
    const { allocations } = useFinance();

    const history = allocations
        .filter(a => a.goalId === goal.id)
        .sort((a, b) => b.date - a.date);

    const getIcon = (type: SavingAllocation['type'], amount: number) => {
        if (type === 'transfer_in') return <ArrowDownLeft size={16} color="#10b981" />;
        if (type === 'transfer_out') return <ArrowUpRight size={16} color="#ef4444" />;
        if (amount >= 0) return <ArrowDownLeft size={16} color="#10b981" />;
        return <ArrowUpRight size={16} color="#ef4444" />;
    };

    const getLabel = (allocation: SavingAllocation) => {
        if (allocation.description) return allocation.description;
        switch (allocation.type) {
            case 'automatic': return 'Ahorro Automático';
            case 'manual': return 'Aportación Manual';
            case 'transfer_in': return 'Traspaso (Entrada)';
            case 'transfer_out': return 'Traspaso (Salida)';
            case 'adjustment': return 'Ajuste de Saldo';
            default: return 'Movimiento';
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', zIndex: 110,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem'
        }}>
            <div className="glass-panel" style={{ 
                maxWidth: '600px', width: '100%', maxHeight: '80vh', 
                display: 'flex', flexDirection: 'column',
                borderRadius: '1.5rem', background: 'rgba(30,32,47,0.98)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
                animation: 'scaleUp 0.3s ease'
            }}>
                <div style={{ 
                    padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ padding: '8px', background: 'rgba(236,72,153,0.1)', borderRadius: '10px', color: '#ec4899' }}>
                            <History size={20} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Historial de {goal.name}</h3>
                    </div>
                    <button 
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '8px' }}
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                    {history.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            No hay movimientos registrados para esta hucha.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {history.map(item => (
                                <div 
                                    key={item.id}
                                    style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px',
                                        border: '1px solid rgba(255,255,255,0.03)'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ 
                                            width: '32px', height: '32px', borderRadius: '8px', 
                                            background: 'rgba(255,255,255,0.03)', 
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            {getIcon(item.type, item.amount)}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{getLabel(item)}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {new Date(item.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ 
                                        fontWeight: 700, 
                                        fontSize: '1rem',
                                        color: item.amount >= 0 ? '#10b981' : '#f43f5e'
                                    }}>
                                        {item.amount >= 0 ? '+' : ''}{item.amount.toFixed(2).replace('.', ',')} €
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.1)', borderBottomLeftRadius: '1.5rem', borderBottomRightRadius: '1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Saldo Total Acumulado</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>{goal.currentAmount.toFixed(2).replace('.', ',')} €</div>
                </div>
            </div>
        </div>
    );
};

export default PiggyBankHistoryModal;
