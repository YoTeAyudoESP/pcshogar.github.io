import React, { useState, useEffect } from 'react';
import { X, Check, Calendar, CreditCard, DollarSign } from 'lucide-react';
import { useFinance } from '../../contexts/FinanceContext';
import type { FixedIncome } from '../../types/income';
import type { RecurringExpense, Account } from '../../types/finance';

interface ConfirmMovementModalProps {
    type: 'income' | 'expense';
    item: FixedIncome | RecurringExpense;
    onClose: () => void;
}

const ConfirmMovementModal: React.FC<ConfirmMovementModalProps> = ({ type, item, onClose }) => {
    const { accounts, confirmFixedMovement } = useFinance();
    const [amount, setAmount] = useState(item.amount);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [accountId, setAccountId] = useState('');

    useEffect(() => {
        // Find default account
        if (type === 'income') {
            const incomeItem = item as FixedIncome;
            setAccountId(incomeItem.linkedAccountId || accounts.find(a => a.isMain)?.id || accounts[0]?.id || '');
        } else {
            const expenseItem = item as RecurringExpense;
            setAccountId(expenseItem.sourceAccountId || accounts.find(a => a.isMain)?.id || accounts[0]?.id || '');
        }
    }, [item, accounts, type]);

    const handleConfirm = async () => {
        if (!accountId) {
            alert('Por favor, selecciona una cuenta.');
            return;
        }

        const period = date.substring(0, 7); // YYYY-MM
        const description = (item as any).description || (item as any).name;
        const categoryId = (item as any).categoryId;

        try {
            await confirmFixedMovement(
                type,
                item.id,
                amount,
                new Date(date).getTime(),
                accountId,
                period,
                description,
                categoryId
            );
            onClose();
        } catch (error) {
            console.error("Error confirming movement:", error);
            alert("Error al confirmar el movimiento.");
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container glass-panel" style={{ padding: '2rem', maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
                <button 
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255, 255, 255, 0.5)',
                        cursor: 'pointer'
                    }}
                >
                    <X size={24} />
                </button>

                <h2 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {type === 'income' ? 'Confirmar Ingreso' : 'Confirmar Gasto'}
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Amount Input */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.85rem', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <DollarSign size={14} /> Importe
                        </label>
                        <input 
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                padding: '1rem',
                                borderRadius: '0.75rem',
                                color: 'white',
                                fontSize: '1.1rem',
                                fontWeight: 600,
                                width: '100%'
                            }}
                        />
                    </div>

                    {/* Date Input */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.85rem', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Calendar size={14} /> Fecha
                        </label>
                        <input 
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                padding: '1rem',
                                borderRadius: '0.75rem',
                                color: 'white',
                                width: '100%'
                            }}
                        />
                    </div>

                    {/* Account Select */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.85rem', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <CreditCard size={14} /> Cuenta/Banco
                        </label>
                        <select 
                            value={accountId}
                            onChange={(e) => setAccountId(e.target.value)}
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                padding: '1rem',
                                borderRadius: '0.75rem',
                                color: 'white',
                                width: '100%'
                            }}
                        >
                            <option value="">Selecciona una cuenta</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.name} ({acc.balance.toFixed(2)} €)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button 
                            onClick={onClose}
                            style={{
                                flex: 1,
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                padding: '1rem',
                                borderRadius: '1rem',
                                color: 'white',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleConfirm}
                            style={{
                                flex: 2,
                                background: type === 'income' ? 'var(--color-success)' : 'var(--color-primary)',
                                border: 'none',
                                padding: '1rem',
                                borderRadius: '1rem',
                                color: 'white',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)'
                            }}
                        >
                            <Check size={20} /> Confirmar {type === 'income' ? 'Cobro' : 'Pago'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmMovementModal;
