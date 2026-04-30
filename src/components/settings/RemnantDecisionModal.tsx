import React, { useState, useEffect } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { 
    X, 
    PiggyBank, 
    Calendar, 
    Check, 
    AlertCircle, 
    Plus,
    ArrowRightCircle,
    EyeOff
} from 'lucide-react';
import type { MonthClosing, SavingGoal } from '../../types/finance';
import PiggyBankForm from '../savings/PiggyBankForm';

interface RemnantDecisionModalProps {
    closing: MonthClosing;
    onClose: () => void;
}

const RemnantDecisionModal: React.FC<RemnantDecisionModalProps> = ({ closing, onClose }) => {
    const { savings, closeMonthWithDecision, updateMonthClosing } = useFinance();
    const [distributions, setDistributions] = useState<{ type: 'next_month' | 'saving_goal', targetId?: string, amount: number }[]>([]);
    const [showNewGoalForm, setShowNewGoalForm] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const totalToDistribute = closing.finalBalance;
    const isDeficit = totalToDistribute < 0;
    
    const distributedAmount = distributions.reduce((sum, d) => sum + d.amount, 0);
    const remainingAmount = totalToDistribute - distributedAmount;

    useEffect(() => {
        // Initialize with next month option
        setDistributions([{ type: 'next_month', amount: 0 }]);
    }, []);

    const handleUpdateAmount = (index: number, val: string) => {
        const amount = parseFloat(val) || 0;
        const newDist = [...distributions];
        newDist[index].amount = amount;
        setDistributions(newDist);
    };

    const handleUpdateTarget = (index: number, targetId: string) => {
        const newDist = [...distributions];
        newDist[index].targetId = targetId;
        setDistributions(newDist);
    };

    const addDistribution = () => {
        setDistributions([...distributions, { type: 'saving_goal', targetId: '', amount: 0 }]);
    };

    const removeDistribution = (index: number) => {
        setDistributions(distributions.filter((_, i) => i !== index));
    };

    const handleConfirm = async () => {
        if (Math.abs(remainingAmount) > 0.01) {
            if (window.confirm(`Aún quedan ${remainingAmount.toFixed(2)}€ por repartir. ¿Deseas continuar y decidir el resto más tarde?`)) {
                await closeMonthWithDecision({ ...closing, remainingToDistribute: remainingAmount }, distributions.filter(d => d.amount !== 0));
                onClose();
            }
            return;
        }

        try {
            await closeMonthWithDecision(closing, distributions.filter(d => d.amount !== 0));
            onClose();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleIgnore = async () => {
        if (window.confirm('¿Estás seguro de que deseas ignorar este remanente? No afectará a tus cálculos futuros a menos que lo restaures.')) {
            await updateMonthClosing({ ...closing, status: 'ignored' });
            onClose();
        }
    };

    const monthName = new Date(closing.year, closing.month).toLocaleString('es-ES', { month: 'long' });

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
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '1rem'
        }}>
            <div className="glass-panel" style={{
                width: '100%',
                maxWidth: '500px',
                padding: '2rem',
                position: 'relative',
                maxHeight: '90vh',
                overflowY: 'auto'
            }}>
                <button 
                    onClick={onClose}
                    style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                    <X size={24} />
                </button>

                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ 
                        width: '64px', 
                        height: '64px', 
                        borderRadius: '50%', 
                        background: isDeficit ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem'
                    }}>
                        {isDeficit ? <TrendingDown size={32} color="#ef4444" /> : <TrendingUp size={32} color="#10b881" />}
                    </div>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                        ¡Mes de {monthName} Cerrado!
                    </h2>
                    <p style={{ opacity: 0.7 }}>
                        Has terminado el mes con un {isDeficit ? 'déficit' : 'remanente'} de:
                    </p>
                    <div style={{ 
                        fontSize: '2.5rem', 
                        fontWeight: 800, 
                        color: isDeficit ? '#ef4444' : '#10b881',
                        margin: '0.5rem 0'
                    }}>
                        {totalToDistribute.toFixed(2)} €
                    </div>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.9rem' }}>
                        <span style={{ opacity: 0.6 }}>Repartido: {distributedAmount.toFixed(2)}€</span>
                        <span style={{ fontWeight: 700, color: Math.abs(remainingAmount) > 0.01 ? '#f59e0b' : '#10b881' }}>
                            Restante: {remainingAmount.toFixed(2)}€
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {distributions.map((dist, index) => (
                            <div key={index} style={{ 
                                display: 'flex', 
                                gap: '0.75rem', 
                                alignItems: 'center',
                                background: 'rgba(255,255,255,0.03)',
                                padding: '0.75rem',
                                borderRadius: '0.75rem'
                            }}>
                                <div style={{ flex: 1 }}>
                                    {dist.type === 'next_month' ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.8 }}>
                                            <Calendar size={18} />
                                            <span style={{ fontSize: '0.9rem' }}>Siguiente Mes</span>
                                        </div>
                                    ) : (
                                        <select 
                                            value={dist.targetId} 
                                            onChange={e => handleUpdateTarget(index, e.target.value)}
                                            className="form-input"
                                            style={{ width: '100%', padding: '0.4rem' }}
                                        >
                                            <option value="">Seleccionar Hucha...</option>
                                            {savings.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                                <div style={{ width: '120px', position: 'relative' }}>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        value={dist.amount}
                                        onChange={e => handleUpdateAmount(index, e.target.value)}
                                        className="form-input"
                                        style={{ width: '100%', padding: '0.4rem', textAlign: 'right', paddingRight: '1.5rem' }}
                                    />
                                    <span style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: '0.8rem' }}>€</span>
                                </div>
                                {dist.type !== 'next_month' && (
                                    <button onClick={() => removeDistribution(index)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                        <X size={18} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {!isDeficit && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                            <button 
                                onClick={addDistribution}
                                style={{ 
                                    flex: 1,
                                    background: 'rgba(255,255,255,0.05)', 
                                    border: '1px dashed rgba(255,255,255,0.2)', 
                                    padding: '0.6rem', 
                                    borderRadius: '0.75rem',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <PiggyBank size={16} /> Añadir Hucha
                            </button>
                            <button 
                                onClick={() => setShowNewGoalForm(true)}
                                style={{ 
                                    background: 'rgba(99, 102, 241, 0.1)', 
                                    border: '1px solid rgba(99, 102, 241, 0.2)', 
                                    padding: '0.6rem 1rem', 
                                    borderRadius: '0.75rem',
                                    fontSize: '0.85rem',
                                    color: '#818cf8',
                                    cursor: 'pointer'
                                }}
                            >
                                <Plus size={16} /> Nueva
                            </button>
                        </div>
                    )}
                </div>

                {error && (
                    <div style={{ color: '#ef4444', fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button 
                        onClick={handleConfirm}
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '1rem', borderRadius: '0.75rem', fontWeight: 700 }}
                    >
                        Confirmar Reparto
                    </button>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                            onClick={handleIgnore}
                            style={{ 
                                flex: 1,
                                background: 'rgba(255,255,255,0.05)', 
                                border: '1px solid rgba(255,255,255,0.1)', 
                                padding: '0.75rem', 
                                borderRadius: '0.75rem',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <EyeOff size={16} /> Ignorar
                        </button>
                        <button 
                            onClick={onClose}
                            style={{ 
                                flex: 1,
                                background: 'none', 
                                border: '1px solid rgba(255,255,255,0.1)', 
                                padding: '0.75rem', 
                                borderRadius: '0.75rem',
                                fontSize: '0.85rem',
                                cursor: 'pointer'
                            }}
                        >
                            Decidir más tarde
                        </button>
                    </div>
                </div>
            </div>

            {showNewGoalForm && (
                <div style={{ zIndex: 2100 }}>
                    <PiggyBankForm onClose={() => setShowNewGoalForm(false)} />
                </div>
            )}
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
