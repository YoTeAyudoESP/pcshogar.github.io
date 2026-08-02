import React, { useState, useEffect, useRef } from 'react';
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
    const { addSavingGoal, updateSavingGoal, accounts, fixedIncomes, savings } = useFinance();
    const formRef = useRef<HTMLFormElement>(null);
    const [name, setName] = useState('');
    const [target, setTarget] = useState('');
    const [current, setCurrent] = useState('');
    const [monthly, setMonthly] = useState('');
    const [sourceAccountId, setSourceAccountId] = useState('');
    const [incomeSources, setIncomeSources] = useState<Array<{ fixedIncomeId: string; monthlyAmount: number }>>([]);
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
            setAccountInBudget(editingGoal.accountInBudget ?? true);
            setColor(editingGoal.color || '#f59e0b');
            setCreatedAtDate(new Date(editingGoal.createdAt || editingGoal.updatedAt || Date.now()).toISOString().split('T')[0]);

            if (editingGoal.incomeSources && editingGoal.incomeSources.length > 0) {
                setIncomeSources(editingGoal.incomeSources);
            } else if (editingGoal.linkedFixedIncomeId && editingGoal.monthlySavingAmount) {
                setIncomeSources([{ fixedIncomeId: editingGoal.linkedFixedIncomeId, monthlyAmount: editingGoal.monthlySavingAmount }]);
            } else {
                setIncomeSources([]);
            }
        } else {
            setName('');
            setTarget('');
            setCurrent('');
            setMonthly('');
            setSourceAccountId('');
            setIncomeSources([]);
            setAccountInBudget(true);
            setColor('#f59e0b');
            setCreatedAtDate(new Date().toISOString().split('T')[0]);
        }
    }, [editingGoal]);

    // Recalculate total monthly saving from incomeSources if any
    useEffect(() => {
        if (incomeSources.length > 0) {
            const sum = incomeSources.reduce((acc, s) => acc + (s.monthlyAmount || 0), 0);
            setMonthly(sum > 0 ? sum.toString() : '');
        }
    }, [incomeSources]);

    useEffect(() => {
        if (formRef.current) {
            formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, []);

    useEffect(() => {
        const handleBack = (e: Event) => {
            e.preventDefault();
            const isDirty = name !== '' || target !== '' || current !== '' || monthly !== '' || sourceAccountId !== '' || incomeSources.length > 0;
            if (!editingGoal && isDirty) {
                if (window.confirm('Tienes cambios sin guardar. ¿Deseas descartarlos y volver?')) {
                    if (onClose) onClose();
                }
            } else if (editingGoal) {
                if (onCancelEdit) onCancelEdit();
                else if (onClose) onClose();
            } else {
                if (onClose) onClose();
            }
        };

        document.addEventListener('app-back-pressed', handleBack);
        return () => document.removeEventListener('app-back-pressed', handleBack);
    }, [name, target, current, monthly, sourceAccountId, incomeSources, color, accountInBudget, editingGoal, onCancelEdit, onClose]);

    const handleAddIncomeSource = () => {
        const activeIncs = fixedIncomes.filter(i => i.active);
        const unused = activeIncs.find(inc => !incomeSources.some(s => s.fixedIncomeId === inc.id));
        if (unused) {
            setIncomeSources([...incomeSources, { fixedIncomeId: unused.id, monthlyAmount: 0 }]);
        } else if (activeIncs.length > 0) {
            setIncomeSources([...incomeSources, { fixedIncomeId: activeIncs[0].id, monthlyAmount: 0 }]);
        }
    };

    const handleUpdateIncomeSource = (index: number, field: 'fixedIncomeId' | 'monthlyAmount', value: any) => {
        const updated = [...incomeSources];
        updated[index] = { ...updated[index], [field]: value };
        setIncomeSources(updated);
    };

    const handleRemoveIncomeSource = (index: number) => {
        setIncomeSources(incomeSources.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        // Validate each linked fixed income limit
        for (const src of incomeSources) {
            if (!src.fixedIncomeId || src.monthlyAmount <= 0) continue;
            const inc = fixedIncomes.find(i => i.id === src.fixedIncomeId);
            if (inc) {
                const otherGoalsSum = savings
                    .filter(s => s.id !== editingGoal?.id)
                    .reduce((sum, s) => {
                        if (s.incomeSources && s.incomeSources.length > 0) {
                            const match = s.incomeSources.find(m => m.fixedIncomeId === src.fixedIncomeId);
                            return sum + (match ? match.monthlyAmount : 0);
                        }
                        if (s.linkedFixedIncomeId === src.fixedIncomeId) {
                            return sum + (s.monthlySavingAmount || 0);
                        }
                        return sum;
                    }, 0);
                
                if (otherGoalsSum + src.monthlyAmount > inc.amount) {
                    alert(`La cantidad asignada de ${formatMoney(src.monthlyAmount)} al ingreso "${inc.name}" (${formatMoney(inc.amount)}) supera su importe total. Ya hay asignados ${formatMoney(otherGoalsSum)} en otras huchas.`);
                    return;
                }
            }
        }

        const validSources = incomeSources.filter(s => s.fixedIncomeId && s.monthlyAmount > 0);
        const totalMonthly = validSources.length > 0 
            ? validSources.reduce((acc, s) => acc + s.monthlyAmount, 0)
            : (monthly ? parseFloat(monthly) : 0);

        const primaryLinkedId = validSources.length > 0 ? validSources[0].fixedIncomeId : undefined;

        const goalData = {
            name,
            targetAmount: target ? parseFloat(target) : undefined,
            currentAmount: current ? parseFloat(current) : 0,
            monthlySavingAmount: totalMonthly,
            automaticSourceAccountId: sourceAccountId || undefined,
            linkedFixedIncomeId: primaryLinkedId,
            incomeSources: validSources.length > 0 ? validSources : undefined,
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
        <form ref={formRef} onSubmit={handleSubmit} className="glass-panel" style={{ padding: '2rem', borderRadius: '1.5rem', background: 'rgba(30,32,47,0.98)' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 700 }}>
                {editingGoal ? 'Editar Hucha' : 'Nueva Hucha'}
            </h3>

            <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                    Nombre del Objetivo <span style={{ color: '#ef4444' }}>*</span>
                </label>
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

            <div style={{ marginTop: '1.2rem', marginBottom: '1.2rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <label style={{ color: '#10b981', fontWeight: 700, fontSize: '0.95rem' }}>
                        📥 Fuentes de Ahorro desde Ingresos Fijos
                    </label>
                    <button
                        type="button"
                        onClick={handleAddIncomeSource}
                        style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            color: '#10b981',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        + Añadir Fuente de Ingreso
                    </button>
                </div>

                {incomeSources.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '0.5rem 0' }}>
                        Sin ingresos fijos vinculados (el ahorro se descontará del disponible general).
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {incomeSources.map((src, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <select
                                    style={{ ...inputStyle, marginBottom: 0, flex: 2 }}
                                    value={src.fixedIncomeId}
                                    onChange={e => handleUpdateIncomeSource(idx, 'fixedIncomeId', e.target.value)}
                                >
                                    <option value="">Seleccionar Ingreso Fijo...</option>
                                    {fixedIncomes.filter(inc => inc.active).map(inc => (
                                        <option key={inc.id} value={inc.id}>{inc.name} ({formatMoney(inc.amount)})</option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="Importe (€)"
                                    style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                                    value={src.monthlyAmount || ''}
                                    onChange={e => handleUpdateIncomeSource(idx, 'monthlyAmount', parseFloat(e.target.value) || 0)}
                                />
                                <button
                                    type="button"
                                    onClick={() => handleRemoveIncomeSource(idx)}
                                    style={{
                                        background: 'rgba(239, 68, 68, 0.15)',
                                        border: 'none',
                                        color: '#ef4444',
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: 700
                                    }}
                                    title="Quitar fuente"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '0.5rem' }}>
                <div style={{ flex: '1 1 180px', maxWidth: '300px' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', textAlign: 'center' }}>Cuenta bancaria origen (opcional):</label>
                    <select style={{ ...inputStyle, marginBottom: 0 }} value={sourceAccountId} onChange={e => setSourceAccountId(e.target.value)}>
                        <option value="">(Cuenta predeterminada del ingreso)</option>
                        {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
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
                <button type="submit" disabled={!name.trim()} style={{
                    flex: 1.5,
                    padding: '1rem',
                    borderRadius: '12px',
                    border: 'none',
                    background: name.trim() ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.1)',
                    color: name.trim() ? 'white' : 'rgba(255,255,255,0.3)',
                    fontWeight: 700,
                    fontSize: '1.05rem',
                    cursor: name.trim() ? 'pointer' : 'not-allowed',
                    boxShadow: name.trim() ? '0 4px 15px rgba(99, 102, 241, 0.4)' : 'none'
                }}>
                    {editingGoal ? 'Guardar Cambios' : 'Crear Hucha'}
                </button>
            </div>
        </form>
    );
};

export default PiggyBankForm;
