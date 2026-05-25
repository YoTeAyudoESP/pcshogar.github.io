import React, { useState, useEffect } from 'react';
import { X, Check, Calendar, CreditCard, DollarSign } from 'lucide-react';
import { useFinance } from '../../contexts/FinanceContext';
import { useToast } from '../../contexts/ToastContext';
import type { FixedIncome } from '../../types/income';
import type { RecurringExpense, Account } from '../../types/finance';
import { formatMoney } from '../../utils/financeCalculations';

interface ConfirmMovementModalProps {
    type: 'income' | 'expense';
    item: any;
    onClose: () => void;
}

const ConfirmMovementModal: React.FC<ConfirmMovementModalProps> = ({ type, item, onClose }) => {
    const { accounts, confirmFixedMovement, discardFixedMovement, savings, confirmExtraIncome } = useFinance();
    const { showToast } = useToast();
    const [amount, setAmount] = useState(item.amount);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [budgetPeriod, setBudgetPeriod] = useState(new Date().toISOString().substring(0, 7));
    const [accountId, setAccountId] = useState('');
    const [methodType, setMethodType] = useState<'account' | 'card'>('account');
    const [allocationTarget, setAllocationTarget] = useState<'budget' | 'exclude' | 'hucha'>('budget');
    const [selectedSavingGoalId, setSelectedSavingGoalId] = useState('');
    const isExtraIncomePending = type === 'income' && item.type === 'extra';

    useEffect(() => {
        // Find default account
        if (type === 'income') {
            const incomeItem = item as FixedIncome;
            setAccountId(incomeItem.linkedAccountId || accounts.find(a => a.isMain)?.id || accounts[0]?.id || '');
            setMethodType('account');
        } else {
            const expenseItem = item as RecurringExpense;
            const pm = expenseItem.paymentMethod;
            if (pm?.type === 'card') {
                setAccountId(pm.cardId);
                setMethodType('card');
            } else {
                setAccountId((pm as any)?.accountId || accounts.find(a => a.isMain)?.id || accounts[0]?.id || '');
                setMethodType('account');
            }
        }
    }, [item, accounts, type]);

    const handleConfirm = async () => {
        if (!accountId) {
            showToast('Por favor, selecciona una cuenta.', 'error');
            return;
        }

        const period = budgetPeriod;
        const description = (item as any).description || (item as any).name;
        const categoryId = (item as any).categoryId;

        try {
            if (isExtraIncomePending) {
                if (allocationTarget === 'hucha' && !selectedSavingGoalId) {
                    showToast('Por favor, selecciona una hucha.', 'error');
                    return;
                }
                const excludeFromBudget = allocationTarget !== 'budget';
                await confirmExtraIncome(
                    item.id,
                    amount,
                    new Date(date).getTime(),
                    accountId,
                    period,
                    excludeFromBudget,
                    allocationTarget === 'hucha' ? selectedSavingGoalId : undefined
                );
                showToast("Ingreso confirmado con éxito.", "success");
            } else {
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
                showToast("Movimiento confirmado con éxito.", "success");
            }
            onClose();
        } catch (error) {
            console.error("Error confirming movement:", error);
            showToast("Error al confirmar el movimiento.", 'error');
        }
    };

    const handleDiscard = async () => {
        const period = budgetPeriod;
        try {
            await discardFixedMovement(type, item.id, period);
            showToast("Movimiento descartado para este mes.", "success");
            onClose();
        } catch (error) {
            console.error("Error discarding movement:", error);
            showToast("Error al descartar el movimiento.", "error");
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
                            value={`${methodType}:${accountId}`}
                            onChange={(e) => {
                                const [mType, mId] = e.target.value.split(':');
                                setMethodType(mType as any);
                                setAccountId(mId);
                            }}
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                padding: '1rem',
                                borderRadius: '0.75rem',
                                color: 'white',
                                width: '100%'
                            }}
                        >
                            <option value="">Selecciona una cuenta o tarjeta</option>
                            <optgroup label="Cuentas Bancarias">
                                {accounts.map(acc => (
                                    <option key={acc.id} value={`account:${acc.id}`}>
                                        {acc.name} ({formatMoney(acc.balance)})
                                    </option>
                                ))}
                            </optgroup>
                            {type === 'expense' && (
                                <optgroup label="Tarjetas de Crédito">
                                    {useFinance().cards.map(card => (
                                        <option key={card.id} value={`card:${card.id}`}>
                                            {card.name}
                                        </option>
                                    ))}
                                </optgroup>
                            )}
                        </select>
                    </div>

                    {/* Allocation Selection for Pending Extra Income */}
                    {isExtraIncomePending && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.85rem', opacity: 0.6 }}>Asignación de Presupuesto</label>
                            <select 
                                value={allocationTarget}
                                onChange={(e) => setAllocationTarget(e.target.value as any)}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    padding: '1rem',
                                    borderRadius: '0.75rem',
                                    color: 'white',
                                    width: '100%'
                                }}
                            >
                                <option value="budget">Sumar al disponible del mes seleccionado</option>
                                <option value="exclude">No sumar al disponible (Excluir del presupuesto)</option>
                                {savings.length > 0 && <option value="hucha">Añadir a una hucha</option>}
                            </select>

                            {allocationTarget === 'hucha' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    <label style={{ fontSize: '0.85rem', opacity: 0.6 }}>Seleccionar Hucha</label>
                                    <select 
                                        value={selectedSavingGoalId}
                                        onChange={(e) => setSelectedSavingGoalId(e.target.value)}
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            padding: '1rem',
                                            borderRadius: '0.75rem',
                                            color: 'white',
                                            width: '100%'
                                        }}
                                    >
                                        <option value="">Selecciona una hucha...</option>
                                        {savings.map(goal => (
                                            <option key={goal.id} value={goal.id}>
                                                {goal.name} (Meta: {formatMoney(goal.targetAmount)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Period Select */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.85rem', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Calendar size={14} /> Mes de Presupuesto
                        </label>
                        <input 
                            type="month"
                            value={budgetPeriod}
                            onChange={(e) => setBudgetPeriod(e.target.value)}
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                padding: '1rem',
                                borderRadius: '0.75rem',
                                color: 'white',
                                width: '100%'
                            }}
                        />
                        <p style={{ fontSize: '0.7rem', opacity: 0.4, margin: 0 }}>
                            Indica a qué mes corresponde este movimiento en tu contabilidad.
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                        <div style={{ display: 'flex', gap: '1rem' }}>
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
                        {!isExtraIncomePending && (
                            <button 
                                type="button"
                                onClick={handleDiscard}
                                style={{
                                    width: '100%',
                                    background: 'rgba(244, 63, 94, 0.12)',
                                    border: '1px solid rgba(244, 63, 94, 0.2)',
                                    padding: '1rem',
                                    borderRadius: '1rem',
                                    color: '#fb7185',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={e => e.currentTarget.style.background = 'rgba(244, 63, 94, 0.22)'}
                                onMouseOut={e => e.currentTarget.style.background = 'rgba(244, 63, 94, 0.12)'}
                            >
                                Descartar este mes
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmMovementModal;
