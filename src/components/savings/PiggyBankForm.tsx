import React, { useState, useEffect } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import type { SavingGoal } from '../../types/finance';
import ColorPicker from '../common/ColorPicker';
import { formatMoney } from '../../utils/financeCalculations';

interface PiggyBankFormProps {
    editingGoal?: SavingGoal;
    onCancelEdit?: () => void;
    onClose?: () => void;
}

const PiggyBankForm: React.FC<PiggyBankFormProps> = ({ editingGoal, onCancelEdit, onClose }) => {
    const { addSavingGoal, updateSavingGoal, accounts, fixedIncomes } = useFinance();
    const [name, setName] = useState('');
    const [target, setTarget] = useState('');
    const [current, setCurrent] = useState('');
    const [monthly, setMonthly] = useState('');
    const [sourceAccountId, setSourceAccountId] = useState('');
    const [linkedFixedIncomeId, setLinkedFixedIncomeId] = useState('');
    const [accountInBudget, setAccountInBudget] = useState(true);
    const [color, setColor] = useState('#f59e0b');
    const [createdAtDate, setCreatedAtDate] = useState('');

    useEffect(() => {
        if (editingGoal) {
            setName(editingGoal.name);
            setTarget(editingGoal.targetAmount?.toString() || '');
            setCurrent(editingGoal.currentAmount.toString());
            setMonthly(editingGoal.monthlySavingAmount?.toString() || '');
            setSourceAccountId(editingGoal.automaticSourceAccountId || '');
            setLinkedFixedIncomeId(editingGoal.linkedFixedIncomeId || '');
            setAccountInBudget(editingGoal.accountInBudget ?? true);
            setColor(editingGoal.color || '#f59e0b');
            setCreatedAtDate(new Date(editingGoal.createdAt || editingGoal.updatedAt || Date.now()).toISOString().split('T')[0]);
        } else {
            setName('');
            setTarget('');
            setCurrent('');
            setMonthly('');
            setSourceAccountId('');
            setLinkedFixedIncomeId('');
            setAccountInBudget(true);
            setColor('#f59e0b');
            setCreatedAtDate(new Date().toISOString().split('T')[0]);
        }
    }, [editingGoal]);

    useEffect(() => {
        const handleBack = (e: Event) => {
            e.preventDefault();
            const isDirty = name !== '' || target !== '' || current !== '' || monthly !== '' || sourceAccountId !== '' || linkedFixedIncomeId !== '';
            if (!editingGoal && isDirty) {
                if (window.confirm('Tienes cambios sin guardar. ¿Deseas descartarlos y volver?')) {
                    if (onClose) onClose();
                }
            } else if (editingGoal) {
                const isModified = name !== editingGoal.name ||
                    target !== (editingGoal.targetAmount?.toString() || '') ||
                    current !== editingGoal.currentAmount.toString() ||
                    monthly !== (editingGoal.monthlySavingAmount?.toString() || '') ||
                    sourceAccountId !== (editingGoal.automaticSourceAccountId || '') ||
                    linkedFixedIncomeId !== (editingGoal.linkedFixedIncomeId || '') ||
                    color !== (editingGoal.color || '#f59e0b') ||
                    accountInBudget !== (editingGoal.accountInBudget ?? true);
                if (isModified) {
                    if (window.confirm('Tienes cambios sin guardar. ¿Deseas descartarlos y volver?')) {
                        if (onCancelEdit) onCancelEdit();
                        else if (onClose) onClose();
                    }
                } else {
                    if (onCancelEdit) onCancelEdit();
                    else if (onClose) onClose();
                }
            } else {
                if (onClose) onClose();
            }
        };

        window.addEventListener('app-back-pressed', handleBack);
        return () => window.removeEventListener('app-back-pressed', handleBack);
    }, [name, target, current, monthly, sourceAccountId, linkedFixedIncomeId, color, accountInBudget, editingGoal, onCancelEdit, onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        const goalData = {
            name,
            targetAmount: target ? parseFloat(target) : undefined,
            currentAmount: current ? parseFloat(current) : 0,
            monthlySavingAmount: monthly ? parseFloat(monthly) : 0,
            automaticSourceAccountId: sourceAccountId || undefined,
            linkedFixedIncomeId: linkedFixedIncomeId || undefined,
            accountInBudget,
            color,
            currency: 'EUR' as const,
            createdAt: createdAtDate ? new Date(createdAtDate).getTime() : Date.now(),
            updatedAt: Date.now()
        };

        if (editingGoal) {
            await updateSavingGoal({ ...editingGoal, ...goalData });
        } else {
            await addSavingGoal(goalData);
        }

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
        <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '2rem', borderRadius: '1.5rem', background: 'rgba(30,32,47,0.98)' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 700 }}>
                {editingGoal ? 'Editar Hucha' : 'Nueva Hucha'}
            </h3>

            <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Nombre del Objetivo</label>
                <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Viaje a Japón" required />
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                <div style={{ flex: '1 1 180px' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Fecha de Creación</label>
                    <input type="date" style={{ ...inputStyle, marginBottom: 0, colorScheme: 'dark' }} value={createdAtDate} onChange={e => setCreatedAtDate(e.target.value)} required />
                </div>
                <div style={{ flex: '1 1 180px' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Meta (€, opcional)</label>
                    <input type="number" step="0.01" style={{ ...inputStyle, marginBottom: 0 }} value={target} onChange={e => setTarget(e.target.value)} placeholder="2000" />
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem', marginTop: '1rem' }}>
                <div style={{ flex: '1 1 180px' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Saldo Actual (€)</label>
                    <input type="number" step="0.01" style={{ ...inputStyle, marginBottom: 0 }} value={current} onChange={e => setCurrent(e.target.value)} placeholder="0" />
                </div>
                <div style={{ flex: '1 1 180px' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Ahorro mensual (€)</label>
                    <input type="number" step="0.01" style={{ ...inputStyle, marginBottom: 0 }} value={monthly} onChange={e => setMonthly(e.target.value)} placeholder="0" />
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '0.5rem', marginTop: '1rem' }}>
                <div style={{ flex: '1 1 180px', maxWidth: '300px' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', textAlign: 'center' }}>Ahorro automático desde:</label>
                    <select style={{ ...inputStyle, marginBottom: 0 }} value={sourceAccountId} onChange={e => setSourceAccountId(e.target.value)}>
                        <option value="">(Ninguno - Manual)</option>
                        {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                    </select>
                </div>
                <div style={{ flex: '1 1 180px', maxWidth: '300px' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', textAlign: 'center' }}>Al cobrar ingreso fijo:</label>
                    <select style={{ ...inputStyle, marginBottom: 0 }} value={linkedFixedIncomeId} onChange={e => setLinkedFixedIncomeId(e.target.value)}>
                        <option value="">(Ninguno - Siempre activo)</option>
                        {fixedIncomes.filter(inc => inc.active).map(inc => (
                            <option key={inc.id} value={inc.id}>{inc.name} ({formatMoney(inc.amount)})</option>
                        ))}
                    </select>
                </div>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                Esta cantidad se restará automáticamente de tu disponible mensual.
            </p>

            <div style={{ 
                background: 'rgba(255,255,255,0.03)', 
                padding: '1rem', 
                borderRadius: '12px', 
                marginBottom: '1.5rem',
                border: '1px solid rgba(255,255,255,0.05)'
            }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                    <input 
                        type="checkbox" 
                        checked={accountInBudget} 
                        onChange={e => setAccountInBudget(e.target.checked)}
                        style={{ marginTop: '4px', width: '18px', height: '18px' }}
                    />
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Contabilizar en presupuesto</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Si se desactiva, el ajuste de saldo no afectará al dinero disponible para gastar (útil para correcciones).
                        </div>
                    </div>
                </label>
            </div>

            <ColorPicker 
                label="Color de la Hucha"
                selectedColor={color}
                onColorSelect={setColor}
            />

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={onCancelEdit || onClose} style={{
                    flex: 1, padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'white', cursor: 'pointer', fontWeight: 600
                }}>Cancelar</button>
                <button type="submit" style={{
                    flex: 1.5,
                    padding: '1rem',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '1.05rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'
                }}>
                    {editingGoal ? 'Guardar Cambios' : 'Crear Hucha'}
                </button>
            </div>
        </form>
    );
};

export default PiggyBankForm;
