import React, { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { useDateSelection } from '../../contexts/DateSelectionContext';
import { CheckCircle, Clock, ArrowUpRight, ArrowDownLeft, ChevronRight, Edit2, Trash2 } from 'lucide-react';
import { isRecurringActiveInMonth, formatMoney, isItemInMonthAndYear } from '../../utils/financeCalculations';
import ConfirmMovementModal from '../settings/ConfirmMovementModal';
import DeletePendingItemModal from './DeletePendingItemModal';

interface PendingActionsWidgetProps {
    onEdit?: (item: any, type: 'income' | 'expense', isFromPendingWidget?: boolean) => void;
}

const PendingActionsWidget: React.FC<PendingActionsWidgetProps> = ({ onEdit }) => {
    const { 
        recurringExpenses, fixedIncomes, expenses, incomes, 
        accounts 
    } = useFinance();
    const { selectedMonth, selectedYear } = useDateSelection();
    
    const [confirmModal, setConfirmModal] = useState<{
        show: boolean;
        type: 'income' | 'expense' | 'refund';
        item: any;
    }>({ show: false, type: 'expense', item: null });

    const [deleteModal, setDeleteModal] = useState<{ show: boolean, item: any }>({ show: false, item: null });

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
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <Clock size={18} className="text-indigo-400" />
                    Pendientes de Confirmar
                </h3>
                <span style={{ 
                    fontSize: '0.8rem', 
                    color: 'rgba(255,255,255,0.4)',
                    background: 'rgba(255,255,255,0.05)',
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
                            border: '1px solid rgba(255,255,255,0.05)',
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
                                background: 'rgba(16, 185, 129, 0.1)',
                                borderRadius: '50%',
                                filter: 'blur(20px)'
                            }} />
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                            <div style={{
                                background: (item.actionType === 'income' || item.actionType === 'refund') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                                color: (item.actionType === 'income' || item.actionType === 'refund') ? '#10b981' : '#f43f5e',
                                padding: '6px',
                                borderRadius: '10px'
                            }}>
                                {(item.actionType === 'income' || item.actionType === 'refund') ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                                    Día {item.actionType === 'refund' || item.isPunctualPending ? (isRollover(item) ? '1' : new Date(item.date).getDate()) : (item.paymentDay || (item.receivedDate ? new Date(item.receivedDate).getDate() : new Date(item.date || item.createdAt).getDate()))}
                                </div>
                            </div>
                        </div>

                        <div style={{ 
                            fontSize: '0.95rem', 
                            fontWeight: 700, 
                            color: 'white', 
                            marginBottom: '4px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {item.description || item.name}
                        </div>
                        
                        <div style={{ 
                            fontSize: '1.2rem', 
                            fontWeight: 800, 
                            color: (item.actionType === 'income' || item.actionType === 'refund') ? '#10b981' : 'white',
                        }}>
                            {item.actionType === 'refund' ? `+${formatMoney(Math.abs(item.amount))}` : formatMoney(item.amount)}
                        </div>

                        <div style={{ 
                            marginTop: '1rem', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            color: '#6366f1',
                            fontSize: '0.8rem',
                            fontWeight: 700
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                Confirmar <ChevronRight size={14} />
                            </div>

                            {(item.isExtraPending || item.isPunctualPending) && onEdit && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit(item, item.actionType === 'income' ? 'income' : 'expense', true);
                                        }}
                                        style={{
                                            background: 'rgba(255,255,255,0.1)',
                                            border: 'none',
                                            color: 'white',
                                            cursor: 'pointer',
                                            padding: '6px',
                                            borderRadius: '6px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                        className="hover-scale"
                                        title="Editar"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDeleteModal({ show: true, item });
                                        }}
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            border: 'none',
                                            color: '#ef4444',
                                            cursor: 'pointer',
                                            padding: '6px',
                                            borderRadius: '6px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                        className="hover-scale"
                                        title="Eliminar"
                                    >
                                        <Trash2 size={14} />
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

            {/* Delete Modal */}
            {deleteModal.show && deleteModal.item && (
                <DeletePendingItemModal
                    item={deleteModal.item}
                    onClose={() => setDeleteModal({ show: false, item: null })}
                />
            )}
        </div>
    );
};

export default PendingActionsWidget;
