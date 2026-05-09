import React, { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import type { RecurringExpense } from '../../types/finance';
import type { FixedIncome } from '../../types/income';
import { 
    CalendarClock, 
    Plus, 
    Edit2, 
    Trash2, 
    CheckCircle2, 
    ChevronRight,
    TrendingDown,
    TrendingUp,
    AlertCircle
} from 'lucide-react';
import FixedIncomeForm from './FixedIncomeForm';
import RecurringExpenseForm from '../expenses/RecurringExpenseForm';
import ConfirmMovementModal from './ConfirmMovementModal';
import { useDateSelection } from '../../contexts/DateSelectionContext';
import { isRecurringActiveInMonth } from '../../utils/financeCalculations';

interface FixedMovementsViewProps {
    onBack?: () => void;
}

const FixedMovementsView: React.FC<FixedMovementsViewProps> = ({ onBack }) => {
    const { 
        recurringExpenses, 
        incomes, 
        deleteRecurringExpense, 
        deleteIncome 
    } = useFinance();

    const [activeTab, setActiveTab] = useState<'income' | 'expense'>('expense');
    const [showIncomeForm, setShowIncomeForm] = useState(false);
    const [showExpenseForm, setShowExpenseForm] = useState(false);
    const [editingIncome, setEditingIncome] = useState<FixedIncome | undefined>(undefined);
    const [editingExpense, setEditingExpense] = useState<RecurringExpense | undefined>(undefined);
    
    const [confirmModal, setConfirmModal] = useState<{
        show: boolean;
        type: 'income' | 'expense';
        item: FixedIncome | RecurringExpense | null;
    }>({ show: false, type: 'expense', item: null });

    const { selectedMonth, selectedYear } = useDateSelection();
    const currentMonthPeriod = `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}`;

    const filteredFixedIncomes = incomes
        .filter((i): i is FixedIncome => i.type === 'fixed')
        .filter(inc => {
            const start = inc.effectiveDate || inc.createdAt || 0;
            return isRecurringActiveInMonth(inc.frequency, inc.paymentMonth, selectedMonth, selectedYear, start);
        });

    const filteredRecurringExpenses = recurringExpenses.filter(re => {
        const start = re.updatedAt || 0;
        return isRecurringActiveInMonth(re.frequency, re.paymentMonth, selectedMonth, selectedYear, start);
    });

    const isProcessed = (item: FixedIncome | RecurringExpense) => {
        return item.ignoredPeriods?.includes(currentMonthPeriod) || false;
    };

    const handleDelete = (type: 'income' | 'expense', id: string) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este movimiento fijo?')) {
            if (type === 'income') {
                deleteIncome(id);
            } else {
                deleteRecurringExpense(id);
            }
        }
    };

    const handleEdit = (type: 'income' | 'expense', item: FixedIncome | RecurringExpense) => {
        if (type === 'income') {
            setEditingIncome(item as FixedIncome);
            setShowIncomeForm(true);
        } else {
            setEditingExpense(item as RecurringExpense);
            setShowExpenseForm(true);
        }
    };

    const handleConfirm = (type: 'income' | 'expense', item: FixedIncome | RecurringExpense) => {
        setConfirmModal({ show: true, type, item });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, opacity: 0.9 }}>Gestión de Movimientos Fijos</h3>
                <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', padding: '0.25rem', borderRadius: '100px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <button 
                        onClick={() => setActiveTab('expense')}
                        style={{
                            padding: '0.4rem 1rem',
                            borderRadius: '100px',
                            border: 'none',
                            background: activeTab === 'expense' ? 'var(--color-primary)' : 'transparent',
                            color: 'white',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                        }}
                    >
                        <TrendingDown size={14} /> Gastos
                    </button>
                    <button 
                        onClick={() => setActiveTab('income')}
                        style={{
                            padding: '0.4rem 1rem',
                            borderRadius: '100px',
                            border: 'none',
                            background: activeTab === 'income' ? 'var(--color-success)' : 'transparent',
                            color: 'white',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                        }}
                    >
                        <TrendingUp size={14} /> Ingresos
                    </button>
                </div>
            </div>

            {/* Form Section */}
            {showIncomeForm && (
                <FixedIncomeForm 
                    editingIncome={editingIncome} 
                    onClose={() => {
                        setShowIncomeForm(false);
                        setEditingIncome(undefined);
                    }} 
                />
            )}

            {showExpenseForm && (
                <RecurringExpenseForm 
                    editingExpense={editingExpense}
                    onClose={() => {
                        setShowExpenseForm(false);
                        setEditingExpense(undefined);
                    }} 
                />
            )}

            {!showIncomeForm && !showExpenseForm && (
                <button 
                    onClick={() => activeTab === 'income' ? setShowIncomeForm(true) : setShowExpenseForm(true)}
                    style={{
                        padding: '1rem',
                        borderRadius: '1rem',
                        border: '1px dashed rgba(255, 255, 255, 0.2)',
                        background: 'rgba(255, 255, 255, 0.02)',
                        color: 'white',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                >
                    <Plus size={20} /> Añadir {activeTab === 'income' ? 'Ingreso Fijo' : 'Gasto Fijo'}
                </button>
            )}

            {/* List Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {(activeTab === 'expense' ? filteredRecurringExpenses : filteredFixedIncomes).map(item => {
                    const processed = isProcessed(item);
                    return (
                        <div 
                            key={item.id}
                            className="glass-panel"
                            style={{
                                padding: '1.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '1rem',
                                opacity: processed ? 0.6 : 1,
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            {processed && (
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '4px',
                                    height: '100%',
                                    backgroundColor: 'var(--color-success)'
                                }} />
                            )}
                            
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <h4 style={{ margin: 0, fontWeight: 600 }}>{(item as any).description || (item as any).name}</h4>
                                    {processed && (
                                        <span style={{ 
                                            fontSize: '0.7rem', 
                                            background: 'rgba(16, 185, 129, 0.1)', 
                                            color: '#10b981', 
                                            padding: '0.1rem 0.4rem', 
                                            borderRadius: '4px',
                                            fontWeight: 700,
                                            textTransform: 'uppercase'
                                        }}>Confirmado</span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', opacity: 0.6, fontSize: '0.85rem' }}>
                                    <span>{item.amount.toFixed(2)} €</span>
                                    <span>Día { (item as any).paymentDay || (item as any).dayOfMonth }</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button 
                                    onClick={() => handleConfirm(activeTab, item)}
                                    title={processed ? "Confirmar de nuevo" : "Confirmar cobro/pago"}
                                    style={{
                                        padding: '0.6rem',
                                        borderRadius: '0.75rem',
                                        border: 'none',
                                        background: processed 
                                            ? 'rgba(255, 255, 255, 0.05)' 
                                            : (activeTab === 'income' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)'),
                                        color: processed
                                            ? 'rgba(255, 255, 255, 0.4)'
                                            : (activeTab === 'income' ? '#10b981' : '#818cf8'),
                                        cursor: 'pointer'
                                    }}
                                >
                                    {processed ? <Plus size={18} /> : <CheckCircle2 size={18} />}
                                </button>
                                <button 
                                    onClick={() => handleEdit(activeTab, item)}
                                    title="Editar"
                                    style={{
                                        padding: '0.6rem',
                                        borderRadius: '0.75rem',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        color: 'white',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button 
                                    onClick={() => handleDelete(activeTab, item.id)}
                                    title="Eliminar"
                                    style={{
                                        padding: '0.6rem',
                                        borderRadius: '0.75rem',
                                        border: '1px solid rgba(244, 63, 94, 0.2)',
                                        background: 'rgba(244, 63, 94, 0.05)',
                                        color: '#fb7185',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    );
                })}

                {(activeTab === 'expense' ? filteredRecurringExpenses : filteredFixedIncomes).length === 0 && (
                    <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
                        <CalendarClock size={48} style={{ margin: '0 auto 1rem auto' }} />
                        <p>No hay {activeTab === 'income' ? 'ingresos fijos' : 'gastos fijos'} para este periodo.</p>
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            {confirmModal.show && confirmModal.item && (
                <ConfirmMovementModal 
                    type={confirmModal.type}
                    item={confirmModal.item}
                    onClose={() => setConfirmModal({ show: false, type: 'expense', item: null })}
                />
            )}
        </div>
    );
};

export default FixedMovementsView;
