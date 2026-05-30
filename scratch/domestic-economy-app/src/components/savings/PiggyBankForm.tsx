import React, { useState, useEffect } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { useIncome } from '../../contexts/IncomeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import type { SavingGoal } from '../../types/finance';

interface PiggyBankFormProps {
    editingGoal?: SavingGoal;
    onCancelEdit?: () => void;
    onClose?: () => void;
}

const PiggyBankForm: React.FC<PiggyBankFormProps> = ({ editingGoal, onCancelEdit, onClose }) => {
    const { addSavingGoal, updateSavingGoal, allocateSavings } = useFinance();
    const { fixedIncomes } = useIncome();
    const { t } = useLanguage();

    const [name, setName] = useState('');
    const [target, setTarget] = useState('');
    const [current, setCurrent] = useState('');
    const [monthlyAmount, setMonthlyAmount] = useState('');
    const [affectBudget, setAffectBudget] = useState(true);
    const [linkedIncomeId, setLinkedIncomeId] = useState('');

    const formRef = React.useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (editingGoal && formRef.current && window.innerWidth < 800) {
            formRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [editingGoal]);

    useEffect(() => {
        if (editingGoal) {
            setName(editingGoal.name);
            setTarget(editingGoal.targetAmount?.toString() || '');
            setCurrent(editingGoal.currentAmount.toString());
            setMonthlyAmount(editingGoal.monthlySavingAmount?.toString() || '');
            setLinkedIncomeId(editingGoal.linkedFixedIncomeId || '');
        } else {
            setName('');
            setTarget('');
            setCurrent('');
            setMonthlyAmount('');
            setLinkedIncomeId('');
        }
    }, [editingGoal]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        const targetAmount = target ? parseFloat(target) : 0;
        const currentAmount = current ? parseFloat(current) : 0;
        const monthlySavingAmount = monthlyAmount ? parseFloat(monthlyAmount) : 0;

        const activeDiff = editingGoal ? currentAmount - editingGoal.currentAmount : 0;

        if (editingGoal) {
            if (activeDiff !== 0 && affectBudget) {
                await allocateSavings(editingGoal.id, activeDiff);
            }

            await updateSavingGoal({
                ...editingGoal,
                name,
                targetAmount,
                currentAmount,
                monthlySavingAmount,
                linkedFixedIncomeId: linkedIncomeId || undefined,
                isVirtual: true
            } as SavingGoal);

            if (onCancelEdit) onCancelEdit();
        } else {
            await addSavingGoal(name, targetAmount, currentAmount, monthlySavingAmount, true, affectBudget, linkedIncomeId || undefined);
        }

        setName('');
        setTarget('');
        setCurrent('');
        setMonthlyAmount('');
        setLinkedIncomeId('');

        if (onClose) onClose();
    };

    const inputStyle = {
        background: 'var(--bg-surface-elevated)',
        border: 'var(--card-border)',
        borderRadius: 'var(--radius-sm)',
        padding: '0.75rem',
        color: 'var(--text-main)',
        width: '100%',
        marginBottom: '1rem',
        fontSize: '1rem'
    };

    return (
        <form ref={formRef} onSubmit={handleSubmit} className="glass-panel" style={{ padding: 'var(--space-md)' }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                        {t('savings.monthlyAmount')} (€)
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        style={inputStyle}
                        value={monthlyAmount}
                        onChange={e => setMonthlyAmount(e.target.value)}
                        placeholder="0"
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                        Ahorro automático desde:
                    </label>
                    <select
                        style={inputStyle}
                        value={linkedIncomeId}
                        onChange={e => setLinkedIncomeId(e.target.value)}
                    >
                        <option value="">(Ninguno - Manual)</option>
                        {fixedIncomes.map(inc => (
                            <option key={inc.id} value={inc.id}>{inc.name}</option>
                        ))}
                    </select>
                </div>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '-0.75rem', marginBottom: '1rem' }}>
                {t('savings.monthlyAmountDesc')}
            </p>

            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <input
                    type="checkbox"
                    id="affectBudget"
                    checked={affectBudget}
                    onChange={e => setAffectBudget(e.target.checked)}
                    style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
                />
                <label htmlFor="affectBudget" style={{ cursor: 'pointer', fontSize: '0.9rem' }}>
                    <div style={{ fontWeight: 600 }}>{t('savings.affectBudget')}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('savings.affectBudgetDesc')}</div>
                </label>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
                {editingGoal && (
                    <button type="button" onClick={onCancelEdit} className="btn-secondary" style={{
                        flex: 1, padding: '1rem', borderRadius: 'var(--radius-sm)', color: 'var(--btn-secondary-text)', cursor: 'pointer'
                    }}>Cancelar</button>
                )}
                <button type="submit" className="btn-primary" style={{
                    flex: editingGoal ? 2 : 'none',
                    width: editingGoal ? 'auto' : '100%',
                    padding: '1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
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
