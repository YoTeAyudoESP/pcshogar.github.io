import React, { useState, useEffect } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { 
    X, 
    PiggyBank, 
    Calendar, 
    AlertCircle, 
    ArrowRightCircle
} from 'lucide-react';
import type { MonthClosing } from '../../types/finance';

interface RemnantDecisionModalProps {
    closing: MonthClosing;
    onClose: () => void;
}

const RemnantDecisionModal: React.FC<RemnantDecisionModalProps> = ({ closing, onClose }) => {
    const { savings, closeMonthWithDecision } = useFinance();
    const [distributions, setDistributions] = useState<Record<string, number>>({});
    const [error, setError] = useState<string | null>(null);

    const totalToDistribute = Math.abs(closing.finalBalance);
    const isDeficit = closing.finalBalance < 0;
    
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
            setError(`Aún quedan ${remainingAmount.toFixed(2)}€ por asignar.`);
            return;
        }

        try {
            // Build the array
            const distArray: { type: 'next_month' | 'saving_goal', targetId?: string, amount: number }[] = [];
            
            Object.entries(distributions).forEach(([key, amount]) => {
                if (amount > 0) {
                    if (key === 'next_month') {
                        // If it's a deficit, the rollover income for next month should be negative
                        // Wait, rollover is an income. If deficit, we "descontar", so negative rollover.
                        // Actually, rollover amount is just added as income. So deficit -> -amount.
                        distArray.push({ type: 'next_month', amount: isDeficit ? -amount : amount });
                    } else if (key.startsWith('saving_')) {
                        const targetId = key.replace('saving_', '');
                        // If it's a deficit, we take FROM saving goal (-amount). If surplus, we ADD to saving goal (+amount).
                        distArray.push({ type: 'saving_goal', targetId, amount: isDeficit ? -amount : amount });
                    }
                }
            });

            await closeMonthWithDecision(closing, distArray);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Error al procesar el cierre.');
        }
    };

    const monthName = new Date(closing.year, closing.month).toLocaleString('es-ES', { month: 'long' });
    const nextMonthName = new Date(closing.year, closing.month + 1).toLocaleString('es-ES', { month: 'long' });

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000, padding: '1rem'
        }}>
            <div className="glass-panel" style={{
                width: '100%', maxWidth: '500px', padding: '2rem',
                position: 'relative', maxHeight: '90vh', overflowY: 'auto'
            }}>
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
                    <div style={{ fontSize: '2.8rem', fontWeight: 800, color: isDeficit ? '#ef4444' : '#10b881', margin: '0.5rem 0' }}>
                        {isDeficit ? '-' : ''}{totalToDistribute.toFixed(2)} €
                    </div>
                    <div style={{ 
                        marginTop: '1rem', padding: '0.5rem', borderRadius: '8px',
                        background: Math.abs(remainingAmount) <= 0.01 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: Math.abs(remainingAmount) <= 0.01 ? '#10b881' : '#f59e0b',
                        fontWeight: 700, fontSize: '1rem'
                    }}>
                        PENDIENTE DE ASIGNAR: {remainingAmount.toFixed(2)} €
                    </div>
                </div>

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
