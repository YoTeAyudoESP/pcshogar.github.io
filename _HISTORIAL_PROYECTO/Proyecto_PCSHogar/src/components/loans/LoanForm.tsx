import React, { useState, useEffect } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import type { Loan } from '../../types/finance';

interface LoanFormProps {
    editingLoan?: Loan;
    onCancelEdit?: () => void;
    onClose?: () => void;
}

const LoanForm: React.FC<LoanFormProps> = ({ editingLoan, onCancelEdit, onClose }) => {
    const { addLoan, updateLoan, categories } = useFinance();
    const expenseCategories = categories.filter(c => c.type === 'expense');
    const [name, setName] = useState('');
    const [totalAmount, setTotalAmount] = useState('');
    const [currentDebt, setCurrentDebt] = useState('');
    const [monthlyPayment, setMonthlyPayment] = useState('');
    const [categoryId, setCategoryId] = useState(expenseCategories.find(c => c.id === 'cat_loans')?.id || expenseCategories[0]?.id || '');

    useEffect(() => {
        if (editingLoan) {
            setName(editingLoan.name);
            setTotalAmount(editingLoan.totalAmount.toString());
            setCurrentDebt(editingLoan.currentDebt.toString());
            setMonthlyPayment(editingLoan.monthlyPayment.toString());
            setCategoryId(editingLoan.categoryId || (expenseCategories.find(c => c.id === 'cat_loans')?.id || expenseCategories[0]?.id || ''));
        } else {
            setName('');
            setTotalAmount('');
            setCurrentDebt('');
            setMonthlyPayment('');
            setCategoryId(expenseCategories.find(c => c.id === 'cat_loans')?.id || expenseCategories[0]?.id || '');
        }
    }, [editingLoan, expenseCategories]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        const total = parseFloat(totalAmount) || 0;
        const current = parseFloat(currentDebt) || 0;
        const monthly = parseFloat(monthlyPayment) || 0;

        if (editingLoan) {
            await updateLoan({
                ...editingLoan,
                name,
                totalAmount: total,
                currentDebt: current,
                monthlyPayment: monthly,
                isPaid: current <= 0
            });
            if (onCancelEdit) onCancelEdit();
        } else {
            await addLoan({
                name,
                totalAmount: total,
                currentDebt: current,
                remainingAmount: current,
                monthlyPayment: monthly,
                monthlyInstallment: monthly,
                currency: 'EUR',
                categoryId,
                isPaid: current <= 0,
                status: current <= 0 ? 'paid' : 'active',
                startDate: Date.now()
            });
        }

        setName('');
        setTotalAmount('');
        setCurrentDebt('');
        setMonthlyPayment('');
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
                {editingLoan ? 'Editar Préstamo' : 'Nuevo Préstamo'}
            </h3>

            <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Nombre del Préstamo</label>
                <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Hipoteca, Coche..." required />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Importe Total (€)</label>
                    <input type="number" step="0.01" style={inputStyle} value={totalAmount} onChange={e => setTotalAmount(e.target.value)} placeholder="15000" />
                </div>
                <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Deuda Actual (€)</label>
                    <input type="number" step="0.01" style={inputStyle} value={currentDebt} onChange={e => setCurrentDebt(e.target.value)} placeholder="12000" />
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Cuota Mensual (€)</label>
                    <input type="number" step="0.01" style={inputStyle} value={monthlyPayment} onChange={e => setMonthlyPayment(e.target.value)} placeholder="250" />
                </div>
                <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Categoría</label>
                    <select style={inputStyle} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                        {expenseCategories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                {editingLoan && (
                    <button type="button" onClick={onCancelEdit} style={{
                        flex: 1, padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'white', cursor: 'pointer'
                    }}>Cancelar</button>
                )}
                <button type="submit" style={{
                    flex: editingLoan ? 2 : 'none',
                    width: editingLoan ? 'auto' : '100%',
                    padding: '1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: 'linear-gradient(135deg, #f39c12, #e67e22)',
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer'
                }}>
                    {editingLoan ? 'Guardar Cambios' : 'Registrar Préstamo'}
                </button>
            </div>
        </form>
    );
};

export default LoanForm;
