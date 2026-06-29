
import React, { useState, useEffect } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import type { Expense, Category } from '../../types/finance';
import type { Income, ExtraIncome } from '../../types/income';
import { X } from 'lucide-react';

interface EditTransactionModalProps {
    transaction: Expense | Income;
    type: 'expense' | 'income';
    onClose: () => void;
}

const EditTransactionModal: React.FC<EditTransactionModalProps> = ({ transaction, type, onClose }) => {
    const { updateIncome, updateExpense, accounts, cards, categories } = useFinance();
    
    const [description, setDescription] = useState(type === 'expense' ? (transaction as Expense).description : (transaction as Income).name);
    const [amount, setAmount] = useState(transaction.amount.toString());
    const [categoryId, setCategoryId] = useState(transaction.categoryId || '');
    
    const expenseCategories = categories.filter(c => c.type === 'expense');
    const incomeCategories = categories.filter(c => c.type === 'income');

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (type === 'expense') {
                const updated = {
                    ...transaction as Expense,
                    description,
                    amount: parseFloat(amount),
                    categoryId,
                    updatedAt: Date.now()
                };
                await updateExpense(updated);
            } else {
                const updated = {
                    ...transaction as Income,
                    name: description,
                    amount: parseFloat(amount),
                    categoryId,
                    updatedAt: Date.now()
                };
                await updateIncome(updated);
            }
            onClose();
        } catch (err) {
            alert('Error al actualizar');
        }
    };

    const inputStyle = {
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '0.75rem',
        color: 'white',
        width: '100%',
        marginBottom: '1rem',
        fontSize: '1rem'
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
        }}>
            <div className="glass-panel" style={{ 
                width: '100%', 
                maxWidth: '500px', 
                padding: '2rem',
                position: 'relative',
                animation: 'slideUp 0.3s ease-out'
            }}>
                <button 
                    onClick={onClose}
                    style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                >
                    <X size={24} />
                </button>

                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '2rem', color: 'white' }}>
                    Editar {type === 'expense' ? 'Gasto' : 'Ingreso'}
                </h2>

                <form onSubmit={handleSave}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Concepto</label>
                    <input style={inputStyle} value={description} onChange={e => setDescription(e.target.value)} required />

                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Importe (€)</label>
                    <input type="number" step="0.01" style={inputStyle} value={amount} onChange={e => setAmount(e.target.value)} required />

                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Categoría</label>
                    <select style={inputStyle} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                        {(type === 'expense' ? expenseCategories : incomeCategories).map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>

                    <button type="submit" style={{
                        width: '100%',
                        padding: '1rem',
                        borderRadius: '16px',
                        border: 'none',
                        background: type === 'expense' ? 'var(--hue-danger)' : '#2ed573',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '1rem',
                        cursor: 'pointer',
                        marginTop: '1rem',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                    }}>
                        Guardar Cambios
                    </button>
                </form>
            </div>
        </div>
    );
};

export default EditTransactionModal;
