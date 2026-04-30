import React, { useState, useEffect } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import type { SavingGoal } from '../../types/finance';

interface PiggyBankFormProps {
    editingGoal?: SavingGoal;
    onCancelEdit?: () => void;
    onClose?: () => void;
}

const PiggyBankForm: React.FC<PiggyBankFormProps> = ({ editingGoal, onCancelEdit, onClose }) => {
    const { addSavingGoal, updateSavingGoal } = useFinance();
    const [name, setName] = useState('');
    const [target, setTarget] = useState('');
    const [current, setCurrent] = useState(''); // New state for initial/current amount

    useEffect(() => {
        if (editingGoal) {
            setName(editingGoal.name);
            setTarget(editingGoal.targetAmount?.toString() || '');
            setCurrent(editingGoal.currentAmount.toString());
        } else {
            setName('');
            setTarget('');
            setCurrent('');
        }
    }, [editingGoal]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        const targetAmount = target ? parseFloat(target) : 0;
        const currentAmount = current ? parseFloat(current) : 0;

        if (editingGoal) {
            await updateSavingGoal({
                ...editingGoal,
                name,
                targetAmount,
                currentAmount
            });
            if (onCancelEdit) onCancelEdit();
        } else {
            // We need to modify addSavingGoal to accept currentAmount or handle it here
            // Assuming addSavingGoal signature needs update or we manually create
            await addSavingGoal({
                name,
                targetAmount,
                currentAmount,
                currency: 'EUR'
            });
        }

        setName('');
        setTarget('');
        setCurrent('');
        if (onClose) onClose();
    };

    const inputStyle = {
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 'var(--radius-sm)',
        padding: '0.75rem',
        color: 'var(--text-main)',
        width: '100%',
        marginBottom: '1rem',
        fontSize: '1rem'
    };

    return (
        <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: 'var(--space-md)' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-main)' }}>
                {editingGoal ? 'Editar Hucha' : 'Nueva Hucha'}
            </h3>

            <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Nombre del Objetivo</label>
                <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Viaje a Japón" required />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Meta (€, opcional)</label>
                    <input type="number" step="0.01" style={inputStyle} value={target} onChange={e => setTarget(e.target.value)} placeholder="2000" />
                </div>
                <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Saldo Actual (€)</label>
                    <input type="number" step="0.01" style={inputStyle} value={current} onChange={e => setCurrent(e.target.value)} placeholder="0" />
                </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
                {editingGoal && (
                    <button type="button" onClick={onCancelEdit} style={{
                        flex: 1, padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'white', cursor: 'pointer'
                    }}>Cancelar</button>
                )}
                <button type="submit" style={{
                    flex: editingGoal ? 2 : 'none',
                    width: editingGoal ? 'auto' : '100%',
                    padding: '1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                    color: 'white',
                    fontWeight: 600,
                    margin: '0 auto',
                    cursor: 'pointer'
                }}>
                    {editingGoal ? 'Guardar Cambios' : 'Crear Hucha'}
                </button>
            </div>
        </form>
    );
};

export default PiggyBankForm;
