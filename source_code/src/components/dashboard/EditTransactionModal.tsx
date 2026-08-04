import React, { useState, useEffect } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import type { Expense, Category, PaymentMethod, CreditCard } from '../../types/finance';
import type { Income } from '../../types/income';
import { X, Calendar, Info, AlertTriangle } from 'lucide-react';
import { predictSettlementDate, formatMoney, getCardAvailableCredit } from '../../utils/financeCalculations';
import FinanceCardModal from './FinanceCardModal';
import ModalPortal from '../common/ModalPortal';

interface EditTransactionModalProps {
    transaction: Expense | Income;
    type: 'expense' | 'income';
    lockStatusToPending?: boolean;
    onClose: () => void;
}

const EditTransactionModal: React.FC<EditTransactionModalProps> = ({ transaction, type, lockStatusToPending, onClose }) => {
    const { updateIncome, updateExpense, accounts, cards, categories, savings, loans = [], expenses = [] } = useFinance();
    
    const isRefund = type === 'expense' && (transaction as Expense).amount < 0;

    // Common fields
    const [description, setDescription] = useState(type === 'expense' ? (transaction as Expense).description : (transaction as Income).name);
    const [amount, setAmount] = useState(() => {
        const val = transaction.amount;
        return isRefund ? Math.abs(val).toString() : val.toString();
    });
    const [categoryId, setCategoryId] = useState(transaction.categoryId || '');
    const [date, setDate] = useState(() => {
        const tx = transaction as any;
        const val = tx.date || tx.effectiveDate || tx.receivedDate || tx.createdAt || Date.now();
        return new Date(val).toISOString().split('T')[0];
    });
    
    // Expense specific fields
    const [paymentMethodType, setPaymentMethodType] = useState<'account' | 'card' | 'cash'>(
        type === 'expense' ? (transaction as Expense).paymentMethod.type : 'account'
    );
    const [selectedMethodId, setSelectedMethodId] = useState(() => {
        if (type !== 'expense') return '';
        const method = (transaction as Expense).paymentMethod;
        if (method.type === 'card') return method.cardId;
        if (method.type === 'account') return method.accountId;
        return '';
    });
    const [settlementAdjustment, setSettlementAdjustment] = useState<number>(
        type === 'expense' ? ((transaction as Expense).paymentMethod as any).settlementAdjustment || 0 : 0
    );
    const [status, setStatus] = useState<'paid' | 'pending'>(
        lockStatusToPending ? 'pending' : (type === 'expense' ? (transaction as Expense).status : 'paid')
    );
    const [showFinanceModal, setShowFinanceModal] = useState(false);
    const [isFinancedByHucha, setIsFinancedByHucha] = useState(() => {
        if (type !== 'expense') return false;
        const exp = transaction as Expense;
        return !!((exp.savingGoalFunding && exp.savingGoalFunding.length > 0) || exp.linkedSavingGoalId);
    });
    const [isHuchaConfigOpen, setIsHuchaConfigOpen] = useState(false);

    const [selectedHuchas, setSelectedHuchas] = useState<Record<string, boolean>>(() => {
        if (type !== 'expense') return {};
        const exp = transaction as Expense;
        const initial: Record<string, boolean> = {};
        if (exp.savingGoalFunding && exp.savingGoalFunding.length > 0) {
            exp.savingGoalFunding.forEach(f => {
                initial[f.goalId] = true;
            });
        } else if (exp.linkedSavingGoalId) {
            initial[exp.linkedSavingGoalId] = true;
        }
        return initial;
    });

    const [savingGoalFunding, setSavingGoalFunding] = useState<Record<string, string>>(() => {
        if (type !== 'expense') return {};
        const exp = transaction as Expense;
        const initial: Record<string, string> = {};
        if (exp.savingGoalFunding && exp.savingGoalFunding.length > 0) {
            exp.savingGoalFunding.forEach(f => {
                initial[f.goalId] = f.amount.toString();
            });
        } else if (exp.linkedSavingGoalId) {
            initial[exp.linkedSavingGoalId] = exp.amount.toString();
        }
        return initial;
    });

    const getOldFundingForHucha = (huchaId: string): number => {
        if (type !== 'expense') return 0;
        const exp = transaction as Expense;
        if (exp.savingGoalFunding && exp.savingGoalFunding.length > 0) {
            const found = exp.savingGoalFunding.find(f => f.goalId === huchaId);
            return found ? found.amount : 0;
        } else if (exp.linkedSavingGoalId === huchaId) {
            return exp.amount;
        }
        return 0;
    };

    const getHuchaLimit = (h: any) => {
        const oldFunding = getOldFundingForHucha(h.id);
        return Math.max(0, h.currentAmount + oldFunding);
    };

    const expenseTotal = parseFloat(amount) || 0;

    const totalAllocated = Object.entries(savingGoalFunding)
        .filter(([id]) => selectedHuchas[id])
        .reduce((sum, [_, val]) => sum + (parseFloat(val) || 0), 0);

    const hasBalanceError = savings.some(h => 
        selectedHuchas[h.id] && (parseFloat(savingGoalFunding[h.id]) || 0) > getHuchaLimit(h)
    );

    const hasNegativeError = Object.entries(savingGoalFunding)
        .some(([id, val]) => selectedHuchas[id] && (parseFloat(val) || 0) < 0);

    const isFundingInvalid = type === 'expense' && isFinancedByHucha && (
        totalAllocated > expenseTotal ||
        totalAllocated <= 0 ||
        hasBalanceError ||
        hasNegativeError
    );

    const handleAutofill = (goalId: string, availableAmount: number) => {
        const otherAllocated = Object.entries(savingGoalFunding)
            .filter(([id]) => id !== goalId && selectedHuchas[id])
            .reduce((sum, [_, val]) => sum + (parseFloat(val) || 0), 0);
        
        const remaining = Math.max(0, expenseTotal - otherAllocated);
        const toAlloc = Math.min(availableAmount, remaining);
        
        setSelectedHuchas(prev => ({ ...prev, [goalId]: true }));
        setSavingGoalFunding(prev => ({ ...prev, [goalId]: toAlloc.toFixed(2) }));
    };

    const expenseCategories = categories
        .filter(c => c.type === 'expense')
        .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    const incomeCategories = categories
        .filter(c => c.type === 'income')
        .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isFundingInvalid) return;
        try {
            if (type === 'expense') {
                let paymentMethod: PaymentMethod = { type: 'cash' };
                if (paymentMethodType === 'account') {
                    paymentMethod = { type: 'account', accountId: selectedMethodId, settlementAdjustment: 0 };
                } else if (paymentMethodType === 'card') {
                    paymentMethod = { type: 'card', cardId: selectedMethodId, settlementAdjustment };
                } else if (paymentMethodType === 'cash') {
                    if (!selectedMethodId) return;
                    paymentMethod = { type: 'cash', accountId: selectedMethodId };
                }

                // Check if settlement-related fields changed to un-settle if needed
                const oldExpense = transaction as Expense;
                let isSettled = oldExpense.isSettled;
                
                const oldAdj = (oldExpense.paymentMethod as any).settlementAdjustment || 0;
                const oldCardId = oldExpense.paymentMethod.type === 'card' ? oldExpense.paymentMethod.cardId : '';
                
                const parsedAmount = parseFloat(amount);
                if (isNaN(parsedAmount) || parsedAmount <= 0) {
                    alert('El importe debe ser superior a 0,00 €');
                    return;
                }
                const finalAmount = isRefund ? -Math.abs(parsedAmount) : parsedAmount;

                let finalDescription = description.trim();
                if (isRefund && !finalDescription.toLowerCase().startsWith('devolución')) {
                    finalDescription = `Devolución: ${finalDescription}`;
                }

                if (isSettled && (
                    settlementAdjustment !== oldAdj || 
                    paymentMethodType !== oldExpense.paymentMethod.type ||
                    (paymentMethodType === 'card' && selectedMethodId !== oldCardId) ||
                    new Date(date).getTime() !== oldExpense.date ||
                    finalAmount !== oldExpense.amount
                )) {
                    isSettled = false;
                }

                const fundingList = isFinancedByHucha
                    ? Object.entries(savingGoalFunding)
                        .filter(([id, val]) => selectedHuchas[id] && parseFloat(val) > 0)
                        .map(([id, val]) => ({ goalId: id, amount: parseFloat(val) }))
                    : undefined;

                const updated = {
                    ...transaction as Expense,
                    description: finalDescription,
                    amount: finalAmount,
                    date: new Date(date).getTime(),
                    categoryId,
                    paymentMethod,
                    status,
                    isSettled,
                    savingGoalFunding: fundingList,
                    linkedSavingGoalId: undefined, // Clear old single goal field
                    updatedAt: Date.now()
                };
                await updateExpense(updated);
            } else {
                const updated = {
                    ...transaction as Income,
                    name: description,
                    amount: parseFloat(amount),
                    date: new Date(date).getTime(),
                    categoryId,
                    updatedAt: Date.now()
                };
                await updateIncome(updated);
            }
            onClose();
        } catch (err) {
            console.error(err);
            alert('Error al actualizar');
        }
    };

    const inputStyle: React.CSSProperties = {
        background: 'rgba(30, 32, 41, 0.8)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '0.8rem',
        color: 'white',
        width: '100%',
        fontSize: '1rem',
        outline: 'none',
        marginTop: '0.5rem'
    };

    const labelStyle: React.CSSProperties = {
        color: 'rgba(255,255,255,0.6)',
        fontSize: '0.9rem',
        fontWeight: 500
    };

    return (
        <>
        <ModalPortal><div className="modal-overlay" onClick={onClose}>
            <div className="modal-container glass-panel" style={{ 
                padding: '2rem', 
                maxWidth: '500px', 
                width: '95%'
            }} onClick={e => e.stopPropagation()}>
                <button 
                    onClick={onClose}
                    style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '8px', borderRadius: '50%' }}
                >
                    <X size={20} />
                </button>

                 <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '2rem', color: 'white' }}>
                    Editar {isRefund ? 'Devolución' : type === 'expense' ? 'Gasto' : 'Ingreso'}
                </h2>

                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 2 }}>
                            <label style={labelStyle}>Concepto</label>
                            <input style={inputStyle} value={description} onChange={e => setDescription(e.target.value)} required />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Importe (€)</label>
                            <input type="number" step="0.01" style={inputStyle} value={amount} onChange={e => setAmount(e.target.value)} required />
                        </div>
                    </div>

                    <div>
                        <label style={labelStyle}>Fecha</label>
                        <div style={{ position: 'relative' }}>
                            <input 
                                type="date" 
                                style={{ ...inputStyle, paddingRight: '2.5rem' }} 
                                value={date} 
                                onChange={e => setDate(e.target.value)} 
                                required 
                            />
                            <Calendar 
                                size={18} 
                                style={{ position: 'absolute', right: '1rem', top: '1.6rem', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} 
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Categoría</label>
                            <select style={inputStyle} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                                {(type === 'expense' ? expenseCategories : incomeCategories).map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        {type === 'expense' && (
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Método Pago</label>
                                <select style={inputStyle} value={paymentMethodType} onChange={e => {
                                    setPaymentMethodType(e.target.value as any);
                                    setSelectedMethodId('');
                                }}>
                                    <option value="account">Banco</option>
                                    <option value="card">Tarjeta</option>
                                    <option value="cash">Efectivo</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {type === 'expense' && (
                        <>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                {!lockStatusToPending && (
                                    <div style={{ flex: 1 }}>
                                        <label style={labelStyle}>Estado</label>
                                        <select style={inputStyle} value={status} onChange={e => setStatus(e.target.value as any)}>
                                            <option value="paid">
                                                {isRefund 
                                                    ? `Recibida (${paymentMethodType === 'account' ? 'Banco' : paymentMethodType === 'card' ? 'Tarjeta' : 'Efectivo'})`
                                                    : `Pagado (${paymentMethodType === 'account' ? 'Banco' : paymentMethodType === 'card' ? 'Tarjeta' : 'Efectivo'})`
                                                }
                                            </option>
                                            <option value="pending">{isRefund ? 'Pendiente de recibir' : 'Pendiente'}</option>
                                        </select>
                                    </div>
                                )}
                                {paymentMethodType === 'card' && selectedMethodId && cards.find(c => c.id === selectedMethodId)?.type !== 'virtual' && (
                                    <div style={{ flex: 1 }}>
                                        <label style={labelStyle}>Ajuste de Liquidación</label>
                                        <select 
                                            style={inputStyle} 
                                            value={settlementAdjustment} 
                                            onChange={e => setSettlementAdjustment(parseInt(e.target.value))}
                                        >
                                            <option value={-1}>Forzar Mes Anterior</option>
                                            <option value={0}>Mes Actual (Auto)</option>
                                            <option value={1}>Forzar Mes Siguiente</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            {paymentMethodType === 'card' && selectedMethodId && cards.find(c => c.id === selectedMethodId)?.type !== 'virtual' && (
                                <div style={{ 
                                    background: 'rgba(251, 191, 36, 0.05)', 
                                    border: '1px solid rgba(251, 191, 36, 0.15)',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    marginTop: '-0.5rem'
                                }}>
                                    <Info size={16} style={{ color: '#fbbf24' }} />
                                    <span style={{ fontSize: '0.85rem', color: '#fbbf24', fontWeight: 600 }}>
                                        Se liquidará aprox. el: {
                                            predictSettlementDate(
                                                cards.find(c => c.id === selectedMethodId) as CreditCard,
                                                new Date(date).getTime(),
                                                settlementAdjustment
                                            ).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
                                        }
                                    </span>
                                </div>
                            )}

                            <div>
                                <label style={labelStyle}>
                                    {paymentMethodType === 'account' ? 'Seleccionar Cuenta' : paymentMethodType === 'card' ? 'Seleccionar Tarjeta' : 'Seleccionar Cartera Efectivo'}
                                </label>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    {paymentMethodType === 'cash' && accounts.filter(a => a.type === 'cash').length === 0 ? (
                                        <p style={{ color: '#ef4444', fontSize: '0.9rem', margin: 0, padding: '0.8rem 0' }}>
                                            No tienes carteras de efectivo. Crea una en Ajustes.
                                        </p>
                                    ) : (
                                        <select style={{ ...inputStyle, flex: 1, marginTop: 0 }} value={selectedMethodId} onChange={e => setSelectedMethodId(e.target.value)} required>
                                            <option value="">Seleccione...</option>
                                            {paymentMethodType === 'account'
                                                ? accounts.filter(a => a.type === 'bank').map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({formatMoney(acc.balance)})</option>)
                                                : paymentMethodType === 'card'
                                                    ? cards.map(c => <option key={c.id} value={c.id}>{c.name} {c.type === 'virtual' ? `(${formatMoney(c.currentBalance)})` : ''}</option>)
                                                    : accounts.filter(a => a.type === 'cash').map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({formatMoney(acc.balance)})</option>)
                                            }
                                        </select>
                                    )}
                                </div>
                            </div>

                            {(() => {
                                if (type !== 'expense' || isRefund || paymentMethodType !== 'card' || !selectedMethodId) return null;
                                const card = cards.find(c => c.id === selectedMethodId);
                                if (!card || card.type === 'debit') return null;
                                const avail = getCardAvailableCredit(card, expenses, loans);
                                const parsedAmt = parseFloat(amount) || 0;
                                if (parsedAmt > avail) {
                                    const excess = parsedAmt - avail;
                                    return (
                                        <div style={{
                                            background: 'rgba(239, 68, 68, 0.12)',
                                            border: '1px solid rgba(239, 68, 68, 0.35)',
                                            borderRadius: '10px',
                                            padding: '0.85rem 1rem',
                                            marginBottom: '1rem',
                                            color: '#f87171',
                                            fontSize: '0.85rem',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '0.6rem'
                                        }}>
                                            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                                            <div>
                                                <strong>⚠️ Atención: Exceso de Crédito Disponible</strong>
                                                <div style={{ marginTop: '2px', opacity: 0.9 }}>
                                                    Este gasto de <strong>{formatMoney(parsedAmt)}</strong> supera el disponible actual de la tarjeta ({formatMoney(avail)}). Superarás el límite en <strong>{formatMoney(excess)}</strong>.
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            })()}

                            {showFinanceModal && selectedMethodId && amount && (
                                <FinanceCardModal
                                    isOpen={showFinanceModal}
                                    onClose={() => setShowFinanceModal(false)}
                                    cardId={selectedMethodId}
                                    amount={Number(amount)}
                                    expenseId={transaction.id}
                                    onSuccess={() => {
                                        setShowFinanceModal(false);
                                        onClose(); // Close the modal
                                    }}
                                />
                            )}

                             {/* Hucha Financing */}
                             <div style={{ 
                                 background: 'rgba(99, 102, 241, 0.05)', 
                                 padding: '1.25rem', 
                                 borderRadius: '12px',
                                 border: '1px solid rgba(99, 102, 241, 0.1)',
                                 marginTop: '0.5rem'
                             }}>
                                 <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', color: 'white', fontSize: '1rem', fontWeight: 600 }}>
                                     <input 
                                         type="checkbox" 
                                         style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#4f46e5' }}
                                         checked={isFinancedByHucha}
                                         onChange={e => {
                                             const checked = e.target.checked;
                                             setIsFinancedByHucha(checked);
                                             if (checked) {
                                                 setIsHuchaConfigOpen(true);
                                             } else {
                                                 setSelectedHuchas({});
                                                 setSavingGoalFunding({});
                                             }
                                         }}
                                     />
                                     ¿Financiar con huchas?
                                 </label>
                                 <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: '6px', marginLeft: '30px' }}>
                                     Si se marca, el dinero se descontará del saldo de la/s hucha/s seleccionada/s y no afectará al disponible del mes.
                                 </p>
                                 
                                 {isFinancedByHucha && (
                                     <div style={{ marginTop: '1rem', marginLeft: '30px' }}>
                                         <div style={{
                                             background: 'rgba(99, 102, 241, 0.08)',
                                             border: '1px solid rgba(99, 102, 241, 0.2)',
                                             padding: '1rem',
                                             borderRadius: '10px',
                                             display: 'flex',
                                             flexDirection: 'column',
                                             gap: '0.75rem'
                                         }}>
                                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                 <span style={{ fontSize: '0.9rem', color: '#818cf8', fontWeight: 600 }}>
                                                     Financiación Configurada
                                                 </span>
                                                 <button
                                                     type="button"
                                                     onClick={() => setIsHuchaConfigOpen(true)}
                                                     style={{
                                                         background: '#4f46e5',
                                                         color: 'white',
                                                         border: 'none',
                                                         borderRadius: '6px',
                                                         padding: '6px 12px',
                                                         fontSize: '0.8rem',
                                                         fontWeight: 600,
                                                         cursor: 'pointer'
                                                     }}
                                                 >
                                                     Ajustar importes
                                                 </button>
                                             </div>
                                             
                                             <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                 {Object.entries(savingGoalFunding)
                                                     .filter(([id, val]) => selectedHuchas[id] && parseFloat(val) > 0)
                                                     .map(([id, val]) => {
                                                         const h = savings.find(s => s.id === id);
                                                         return (
                                                             <div key={id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                                                 <span style={{ color: 'rgba(255,255,255,0.7)' }}>{h ? h.name : 'Hucha'}</span>
                                                                 <span style={{ color: 'white', fontWeight: 600 }}>{formatMoney(parseFloat(val))}</span>
                                                             </div>
                                                         );
                                                     })}
                                                 {totalAllocated === 0 && (
                                                     <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                                                         Ninguna hucha financia este gasto todavía. Pulsa en 'Ajustar importes'.
                                                     </span>
                                                 )}
                                             </div>

                                             <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                                 <span style={{ color: 'rgba(255,255,255,0.5)' }}>Total financiado:</span>
                                                 <span style={{ color: '#818cf8', fontWeight: 700 }}>{formatMoney(totalAllocated)} / {formatMoney(expenseTotal)}</span>
                                             </div>

                                             {isFundingInvalid && (
                                                 <div style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600, marginTop: '4px' }}>
                                                     {totalAllocated > expenseTotal ? (
                                                         <span>La cantidad financiada supera el total del gasto.</span>
                                                     ) : hasBalanceError ? (
                                                         <span>Una o más asignaciones superan el saldo disponible de la hucha.</span>
                                                     ) : hasNegativeError ? (
                                                         <span>Las cantidades asignadas no pueden ser negativas.</span>
                                                     ) : totalAllocated <= 0 ? (
                                                         <span>El total financiado debe ser mayor que 0.</span>
                                                     ) : null}
                                                 </div>
                                             )}
                                         </div>
                                     </div>
                                 )}
                             </div>
                        </>
                    )}

                    {paymentMethodType === 'card' && selectedMethodId && cards.find(c => c.id === selectedMethodId)?.type !== 'virtual' && (
                        <button
                            type="button"
                            onClick={() => setShowFinanceModal(true)}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                borderRadius: '16px',
                                border: '1px solid rgba(16, 185, 129, 0.5)',
                                background: 'rgba(16, 185, 129, 0.1)',
                                color: '#10b981',
                                fontWeight: 700,
                                fontSize: '1.1rem',
                                cursor: 'pointer',
                                marginTop: '1.5rem',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)'}
                            onMouseOut={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
                        >
                            Financiar Gasto
                        </button>
                    )}

                    <button type="submit" disabled={isFundingInvalid} style={{
                        width: '100%',
                        padding: '1.1rem',
                        borderRadius: '16px',
                        border: 'none',
                        background: isFundingInvalid 
                            ? '#3e3f4b' 
                            : (isRefund 
                                ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' 
                                : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'),
                        color: isFundingInvalid ? 'rgba(255,255,255,0.3)' : 'white',
                        fontWeight: 700,
                        fontSize: '1.1rem',
                        cursor: isFundingInvalid ? 'not-allowed' : 'pointer',
                        marginTop: '1rem',
                        boxShadow: isFundingInvalid 
                            ? 'none' 
                            : (isRefund 
                                ? '0 4px 15px rgba(14, 165, 233, 0.3)' 
                                : '0 4px 15px rgba(99, 102, 241, 0.3)'),
                        transition: 'transform 0.1s'
                    }}>
                        Guardar Cambios
                    </button>
                </form>
            </div>
        </div></ModalPortal>

        {/* Fullscreen config overlay modal for Huchas */}
        {isHuchaConfigOpen && (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(10, 11, 18, 0.95)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                zIndex: 2100,
                display: 'flex',
                flexDirection: 'column',
                padding: '1.5rem',
                paddingTop: 'calc(1.5rem + env(safe-area-inset-top, 24px))',
                paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 16px))',
                color: 'white',
                boxSizing: 'border-box'
            }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Financiación con Huchas</h3>
                        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                            Total Gasto: <strong style={{ color: 'white' }}>{formatMoney(expenseTotal)}</strong>
                        </div>
                    </div>
                    <button 
                        type="button" 
                        onClick={() => setIsHuchaConfigOpen(false)}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: 'none',
                            color: 'white',
                            padding: '8px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable list of saving goals */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '1rem' }}>
                    {savings.length === 0 ? (
                        <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: '2rem' }}>No tienes huchas creadas.</p>
                    ) : (
                        savings.map(h => {
                            const isChecked = !!selectedHuchas[h.id];
                            const available = getHuchaLimit(h);
                            return (
                                <div 
                                    key={h.id} 
                                    style={{
                                        background: isChecked ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255,255,255,0.03)',
                                        border: isChecked ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '14px',
                                        padding: '1rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '1rem',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', margin: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={isChecked}
                                                onChange={e => {
                                                    setSelectedHuchas(prev => ({ ...prev, [h.id]: e.target.checked }));
                                                    if (!e.target.checked) {
                                                        setSavingGoalFunding(prev => ({ ...prev, [h.id]: '' }));
                                                    }
                                                }}
                                                style={{ width: '22px', height: '22px', accentColor: '#6366f1', cursor: 'pointer' }}
                                            />
                                            <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'white' }}>{h.name}</span>
                                        </div>
                                        <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                                            Disponible: <span style={{ color: '#10b981' }}>{formatMoney(available)}</span>
                                        </span>
                                    </label>

                                    {isChecked && (
                                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                            <div style={{ position: 'relative', flex: 1 }}>
                                                <input 
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={savingGoalFunding[h.id] || ''}
                                                    onChange={e => setSavingGoalFunding(prev => ({ ...prev, [h.id]: e.target.value }))}
                                                    style={{
                                                        background: '#12141c',
                                                        border: '1px solid rgba(255,255,255,0.15)',
                                                        borderRadius: '8px',
                                                        padding: '12px 16px',
                                                        color: 'white',
                                                        width: '100%',
                                                        fontSize: '1.1rem',
                                                        outline: 'none',
                                                        boxSizing: 'border-box'
                                                    }}
                                                />
                                                <span style={{ position: 'absolute', right: '16px', top: '12px', color: 'rgba(255,255,255,0.4)', fontSize: '1.1rem' }}>€</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleAutofill(h.id, available)}
                                                style={{
                                                    background: '#6366f1',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    padding: '12px 20px',
                                                    color: 'white',
                                                    fontSize: '1rem',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    boxShadow: '0 4px 10px rgba(99,102,241,0.2)',
                                                    height: '48px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                Máx
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div style={{ 
                    borderTop: '1px solid rgba(255,255,255,0.1)', 
                    paddingTop: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    background: 'transparent'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)' }}>Total Asignado:</span>
                        <span style={{ 
                            fontSize: '1.25rem', 
                            fontWeight: 800, 
                            color: totalAllocated > expenseTotal || hasBalanceError || hasNegativeError ? '#ef4444' : '#818cf8' 
                        }}>
                            {formatMoney(totalAllocated)} / {formatMoney(expenseTotal)}
                        </span>
                    </div>

                    {(totalAllocated > expenseTotal || hasBalanceError || hasNegativeError) && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            color: '#f87171',
                            fontSize: '0.85rem',
                            fontWeight: 600
                        }}>
                            {totalAllocated > expenseTotal ? (
                                'La cantidad financiada no puede superar el total del gasto.'
                            ) : hasBalanceError ? (
                                'Una o más asignaciones superan el saldo disponible de la hucha.'
                            ) : hasNegativeError ? (
                                'Las cantidades no pueden ser negativas.'
                            ) : null}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => setIsHuchaConfigOpen(false)}
                        style={{
                            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '1rem',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '1.1rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
                            textAlign: 'center'
                        }}
                    >
                        Confirmar financiación
                    </button>
                </div>
            </div>
        )}
    </>
);
};

export default EditTransactionModal;
