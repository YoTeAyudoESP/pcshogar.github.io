import React, { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { useDateSelection } from '../../contexts/DateSelectionContext';
import { CheckCircle, Clock, ArrowUpRight, ArrowDownLeft, ChevronRight, Edit2, Trash2, Pencil } from 'lucide-react';
import { isRecurringActiveInMonth, formatMoney, isItemInMonthAndYear } from '../../utils/financeCalculations';
import ConfirmMovementModal from '../settings/ConfirmMovementModal';

interface PendingActionsWidgetProps {
    onEdit?: (item: any, type: 'income' | 'expense') => void;
}

const PendingActionsWidget: React.FC<PendingActionsWidgetProps> = ({ onEdit }) => {
    const { 
        recurringExpenses, fixedIncomes, expenses, incomes, 
        accounts, deleteIncome, deleteExpense
    } = useFinance();
    const { selectedMonth, selectedYear } = useDateSelection();
    
    const [confirmModal, setConfirmModal] = useState<{
        show: boolean;
        type: 'income' | 'expense' | 'refund';
        item: any;
    }>({ show: false, type: 'expense', item: null });

    const [deleteModal, setDeleteModal] = useState<{
        show: boolean;
        type: 'income' | 'expense' | 'refund';
        item: any;
    }>({ show: false, type: 'expense', item: null });

    const period = `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}`;
    const monthStart = new Date(selectedYear, selectedMonth, 1).getTime();
    const monthEnd = new Date(selectedYear, selectedMonth + 1, 0).getTime();

    // Calculate pending expenses
    const pendingExpenses = recurringExpenses.filter(re => {
        if (!re.active) return false;
        const start = re.updatedAt || 0;
        if (start > monthEnd) return false;

        const isPaid = expenses.some(e => e.recurringExpenseId === re.id && e.period === period);
        const isIgnored = re.ignoredPeriods?.includes(period);
        
        if (isPaid || isIgnored) return false;
        return isRecurringActiveInMonth(re.frequency, re.paymentMonth, selectedMonth, selectedYear, start);
    });

    // Calculate pending incomes
    const pendingIncomes = fixedIncomes.filter(inc => {
        if (!inc.active) return false;
        const start = inc.effectiveDate || inc.createdAt || 0;
        const end = inc.expirationDate || new Date(9999, 11, 31).getTime();
        const isIgnored = inc.ignoredPeriods?.includes(period);

        if (start > monthEnd || end < monthStart || isIgnored) return false;
        if (inc.status === 'received') return false; // Already received (though fixedIncomes usually stay 'pending' and create extra incomes)
        let expectedPeriod = period;
        if (inc.accountForNextMonth || (inc as any).countForNextMonth) {
            let nextM = selectedMonth + 1;
            let nextY = selectedYear;
            if (nextM > 11) {
                nextM = 0;
                nextY++;
            }
            expectedPeriod = `${nextY}-${(nextM + 1).toString().padStart(2, '0')}`;
        }

        const isConfirmed = incomes.some(ei => {
            if (ei.fixedIncomeId !== inc.id) return false;
            
            if (ei.period === expectedPeriod) return true;
            if (ei.budgetMonth !== undefined && ei.budgetYear !== undefined) {
                const expectedMonth = parseInt(expectedPeriod.split('-')[1]) - 1;
                const expectedYear = parseInt(expectedPeriod.split('-')[0]);
                if (ei.budgetMonth === expectedMonth && ei.budgetYear === expectedYear) return true;
            }
            
            return false;
        });
        
        if (isConfirmed) return false;

        return isRecurringActiveInMonth(inc.frequency, inc.paymentMonth, selectedMonth, selectedYear, start);
    });

    // Calculate pending extra incomes
    const pendingExtraIncomes = incomes.filter(inc => 
        inc.type === 'extra' && 
        inc.status === 'pending' && 
        isItemInMonthAndYear(inc, selectedMonth, selectedYear)
    );

    // Calculate pending refunds (negative expenses with status pending)
    const today = new Date();
    const currentRealMonth = today.getMonth();
    const currentRealYear = today.getFullYear();
    const isViewedMonthCurrentRealMonth = selectedMonth === currentRealMonth && selectedYear === currentRealYear;

    const pendingRefunds = expenses.filter(exp => {
        if (!(exp.amount < 0 && exp.status === 'pending')) return false;

        const d = new Date(exp.date);
        const expMonth = d.getMonth();
        const expYear = d.getFullYear();

        if (expMonth === selectedMonth && expYear === selectedYear) return true;

        const isPast = (expYear < selectedYear) || (expYear === selectedYear && expMonth < selectedMonth);
        if (isPast && isViewedMonthCurrentRealMonth) return true;

        return false;
    });

    const pendingPunctualExpenses = expenses.filter(exp => {
        if (!(exp.amount > 0 && exp.status === 'pending')) return false;

        const d = new Date(exp.date);
        const expMonth = d.getMonth();
        const expYear = d.getFullYear();

        if (expMonth === selectedMonth && expYear === selectedYear) return true;

        const isPast = (expYear < selectedYear) || (expYear === selectedYear && expMonth < selectedMonth);
        if (isPast && isViewedMonthCurrentRealMonth) return true;

        return false;
    });

    const isRollover = (item: any) => {
        if (item.actionType !== 'refund' && item.actionType !== 'punctual_expense') return false;
        const d = new Date(item.date);
        return d.getMonth() !== selectedMonth || d.getFullYear() !== selectedYear;
    };

    const allPending = [
        ...pendingIncomes.map(inc => ({ ...inc, actionType: 'income' as const })),
        ...pendingExtraIncomes.map(inc => ({ ...inc, actionType: 'income' as const, isExtraPending: true })),
        ...pendingExpenses.map(exp => ({ ...exp, actionType: 'expense' as const })),
        ...pendingRefunds.map(ref => ({ ...ref, actionType: 'refund' as const })),
        ...pendingPunctualExpenses.map(exp => ({ ...exp, actionType: 'expense' as const, isPunctualPending: true }))
    ].sort((a: any, b: any) => {
        const getDay = (item: any) => {
            if (item.actionType === 'refund') {
                if (isRollover(item)) {
                    return 1; // Rollover to day 1
                }
                return new Date(item.date).getDate();
            }
            return item.paymentDay || (item.receivedDate ? new Date(item.receivedDate).getDate() : new Date(item.date || item.createdAt).getDate());
        };
        return getDay(a) - getDay(b);
    });

    if (allPending.length === 0) return null;

    const handleConfirm = (item: any) => {
        setConfirmModal({
            show: true,
            type: item.actionType,
            item
        });
    };

    return (
        <div style={{ marginBottom: '2rem' }}>
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                marginBottom: '1rem',
                padding: '0 4px'
            }}>
                <h3 style={{ 
                    fontSize: '1.1rem', 
                    fontWeight: 700, 
                    color: 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <Clock size={18} className="text-indigo-400" />
                    Pendientes de Confirmar
                </h3>
                <span style={{ 
                    fontSize: '0.8rem', 
                    color: 'rgba(var(--color-rgb-light),0.4)',
                    background: 'var(--panel-bg-2)',
                    padding: '2px 8px',
                    borderRadius: '12px'
                }}>
                    {allPending.length} {allPending.length === 1 ? 'movimiento' : 'movimientos'}
                </span>
            </div>

            <div style={{ 
                display: 'flex', 
                gap: '12px', 
                paddingBottom: '10px'
            }} className="horizontal-scroll">
                {allPending.map((item: any) => (
                    <div 
                        key={item.id}
                        onClick={() => handleConfirm(item)}
                        style={{
                            minWidth: '220px',
                            background: 'rgba(30, 32, 41, 0.6)',
                            border: '1px solid var(--panel-bg-2)',
                            borderRadius: '16px',
                            padding: '1.2rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                        className="hover-scale"
                    >
                        {/* Glow effect for incomes and refunds */}
                        {(item.actionType === 'income' || item.actionType === 'refund') && (
                            <div style={{
                                position: 'absolute',
                                top: -20,
                                right: -20,
                                width: 60,
                                height: 60,
                                background: 'rgba(var(--color-success-rgb), 0.1)',
                                borderRadius: '50%',
                                filter: 'blur(20px)'
                            }} />
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                            <div style={{
                                background: (item.actionType === 'income' || item.actionType === 'refund') ? 'rgba(var(--color-success-rgb), 0.15)' : 'rgba(244, 63, 94, 0.15)',
                                color: (item.actionType === 'income' || item.actionType === 'refund') ? 'var(--color-success)' : '#f43f5e',
                                padding: '6px',
                                borderRadius: '10px'
                            }}>
                                {(item.actionType === 'income' || item.actionType === 'refund') ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(var(--color-rgb-light),0.4)', fontWeight: 600 }}>
                                    Día {item.actionType === 'refund' || item.isPunctualPending ? (isRollover(item) ? '1' : new Date(item.date).getDate()) : (item.paymentDay || (item.receivedDate ? new Date(item.receivedDate).getDate() : new Date(item.date || item.createdAt).getDate()))}
                                </div>
                                {(item.isExtraPending || item.isPunctualPending) && onEdit && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit(item, item.actionType === 'income' ? 'income' : 'expense');
                                        }}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'rgba(var(--color-rgb-light),0.4)',
                                            cursor: 'pointer',
                                            padding: '4px'
                                        }}
                                        className="hover:text-white transition-colors"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div style={{ 
                            fontSize: '0.95rem', 
                            fontWeight: 700, 
                            color: 'var(--text-main)', 
                            marginBottom: '4px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {item.description || item.name}
                        </div>
                        {item.targetPeriod && item.targetPeriod !== period && (
                            <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginBottom: '4px' }}>
                                Atrasado ({item.targetPeriod})
                            </div>
                        )}
                        
                        <div style={{ 
                            fontSize: '1.2rem', 
                            fontWeight: 800, 
                            color: (item.actionType === 'income' || item.actionType === 'refund') ? 'var(--color-success)' : 'var(--text-main)',
                        }}>
                            {item.actionType === 'refund' ? `+${formatMoney(Math.abs(item.amount))}` : formatMoney(item.amount)}
                        </div>

                        <div style={{ 
                            marginTop: '1rem', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            gap: '4px',
                        }}>
                            <div style={{
                                color: '#6366f1',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center'
                            }}>
                                Confirmar <ChevronRight size={14} />
                            </div>
                            
                            {(item.isExtraPending || item.actionType === 'refund') && (
                                <div style={{ display: 'flex', gap: '0.4rem' }} onClick={(e) => e.stopPropagation()}>
                                    <button 
                                        onClick={() => handleConfirm(item)}
                                        style={{ 
                                            width: '28px', 
                                            height: '28px', 
                                            borderRadius: '50%', 
                                            background: 'transparent', 
                                            border: '1px solid rgba(129, 140, 248, 0.2)', 
                                            color: '#818cf8', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center',
                                            cursor: 'pointer'
                                        }}
                                        title="Editar y Confirmar"
                                    >
                                        <Pencil size={12} />
                                    </button>
                                    <button 
                                        onClick={() => setDeleteModal({ show: true, type: item.actionType, item })}
                                        style={{ 
                                            width: '28px', 
                                            height: '28px', 
                                            borderRadius: '50%', 
                                            background: 'transparent', 
                                            border: '1px solid rgba(244, 63, 94, 0.2)', 
                                            color: '#f43f5e', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center',
                                            cursor: 'pointer'
                                        }}
                                        title="Eliminar"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Confirmation Modal */}
            {confirmModal.show && confirmModal.item && (
                <ConfirmMovementModal 
                    type={confirmModal.type}
                    item={confirmModal.item}
                    onClose={() => setConfirmModal({ show: false, type: 'expense', item: null })}
                />
            )}

            {/* Custom Delete Confirmation Modal for Pending Items */}
            {deleteModal.show && deleteModal.item && (
                <div className="modal-overlay" onClick={() => setDeleteModal({ show: false, type: 'income', item: null })}>
                    <div 
                        className="modal-container glass-panel" 
                        style={{ padding: '2rem', maxWidth: '400px', width: '90%', textAlign: 'center', background: '#12141c' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{
                            width: '50px',
                            height: '50px',
                            borderRadius: '50%',
                            background: 'rgba(244, 63, 94, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#f43f5e',
                            margin: '0 auto 1.5rem auto'
                        }}>
                            <Trash2 size={24} />
                        </div>

                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', margin: '0 0 0.75rem 0' }}>
                            {deleteModal.type === 'income' ? '┬┐Eliminar Ingreso Pendiente?' : '┬┐Eliminar Devoluci├│n Pendiente?'}
                        </h3>
                        
                        <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.4', margin: '0 0 1.5rem 0' }}>
                            ┬┐Seguro que deseas eliminar definitivamente el movimiento <strong>"{deleteModal.item.description || deleteModal.item.name}"</strong> por importe de <strong>{formatMoney(Math.abs(deleteModal.item.amount))}</strong>?
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <button
                                onClick={async () => {
                                    if (deleteModal.type === 'income') {
                                        await deleteIncome(deleteModal.item.id);
                                    } else {
                                        await deleteExpense(deleteModal.item.id);
                                    }
                                    setDeleteModal({ show: false, type: 'income', item: null });
                                }}
                                style={{
                                    width: '100%',
                                    background: '#f43f5e',
                                    border: 'none',
                                    padding: '1rem',
                                    borderRadius: '1rem',
                                    color: 'white',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 15px rgba(244, 63, 94, 0.3)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={e => e.currentTarget.style.background = '#e11d48'}
                                onMouseOut={e => e.currentTarget.style.background = '#f43f5e'}
                            >
                                S├¡, eliminar
                            </button>
                            
                            <button
                                onClick={() => setDeleteModal({ show: false, type: 'income', item: null })}
                                style={{
                                    width: '100%',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    padding: '1rem',
                                    borderRadius: '1rem',
                                    color: 'white',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                                onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PendingActionsWidget;
