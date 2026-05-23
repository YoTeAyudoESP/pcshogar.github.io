import React, { useMemo, useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { useDateSelection } from '../../contexts/DateSelectionContext';
import type { Expense } from '../../types/finance';
import { Pencil, Trash2, Minus, ChevronDown, ChevronRight } from 'lucide-react';
import { formatMoney } from '../../utils/financeCalculations';

interface ExpenseListProps {
    onEdit?: (expense: Expense) => void;
}

const ExpenseList: React.FC<ExpenseListProps> = ({ onEdit }) => {
    const { expenses, accounts, cards, categories, deleteExpense } = useFinance();
    const { selectedMonth, selectedYear } = useDateSelection();
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

    const isItemInSelectedMonth = (item: any) => {
        if (item.period && typeof item.period === 'string') {
            const [y, m] = item.period.split('-').map(Number);
            return y === selectedYear && (m - 1) === selectedMonth;
        }
        const timestamp = item.date;
        if (!timestamp) return false;
        const d = new Date(timestamp);
        return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    };

    const currentMonthExpenses = useMemo(() => {
        return expenses
            .filter(isItemInSelectedMonth)
            .sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return dateB - dateA;
            });
    }, [expenses, selectedMonth, selectedYear]);

    const groupedExpenses = useMemo(() => {
        const groups: Record<string, { items: typeof expenses, total: number }> = {};
        
        currentMonthExpenses.forEach(exp => {
            let name = 'Otro';
            const method = exp.paymentMethod;
            if (method.type === 'account') {
                name = accounts.find(a => a.id === method.accountId)?.name || 'Cuenta';
            } else if (method.type === 'card') {
                name = cards.find(c => c.id === method.cardId)?.name || 'Tarjeta';
            } else if (method.type === 'cash') {
                name = 'Efectivo';
            }
            
            if (!groups[name]) groups[name] = { items: [], total: 0 };
            groups[name].items.push(exp);
            groups[name].total += exp.amount;
        });
        
        return groups;
    }, [currentMonthExpenses, accounts, cards]);

    const groupNames = Object.keys(groupedExpenses).sort();

    if (currentMonthExpenses.length === 0) {
        return (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No hay gastos registrados para este mes.
            </div>
        );
    }

    const toggleGroup = (name: string) => {
        const isCollapsed = collapsedGroups[name] !== false;
        setCollapsedGroups(prev => ({
            ...prev,
            [name]: !isCollapsed
        }));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {groupNames.map(name => {
                const isCollapsed = collapsedGroups[name] !== false;
                return (
                    <div key={name}>
                        {/* Group Header */}
                        <div 
                            onClick={() => toggleGroup(name)}
                            style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                padding: '0.5rem',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                marginBottom: '1rem',
                                cursor: 'pointer',
                                userSelect: 'none',
                                borderRadius: '8px',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {isCollapsed ? <ChevronRight size={18} color="rgba(255,255,255,0.6)" /> : <ChevronDown size={18} color="rgba(255,255,255,0.6)" />}
                                <h4 style={{ 
                                    fontSize: '0.9rem', 
                                    fontWeight: 800, 
                                    color: 'rgba(255,255,255,0.6)', 
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    margin: 0
                                }}>
                                    {name}
                                </h4>
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'white' }}>
                                Total: {formatMoney(groupedExpenses[name].total)}
                            </div>
                        </div>

                        {/* Expenses in this group */}
                        {!isCollapsed && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {groupedExpenses[name].items.map(expense => (
                                    <div 
                                        key={expense.id} 
                                        className="glass-panel"
                                        style={{ 
                                            padding: '0.65rem 0.5rem', 
                                            display: 'flex', 
                                            alignItems: 'center',
                                            borderRadius: '1rem',
                                            background: 'rgba(255,255,255,0.02)',
                                            border: '1px solid rgba(255,255,255,0.03)',
                                            gap: '0.65rem',
                                            width: '100%',
                                            boxSizing: 'border-box'
                                        }}
                                    >
                                        {/* Left Section: Icon (50% smaller) */}
                                        <div style={{ 
                                            width: '28px', 
                                            height: '28px', 
                                            borderRadius: '8px', 
                                            background: 'rgba(244, 63, 94, 0.1)', 
                                            display: 'flex', 
                                            flexShrink: 0,
                                            alignItems: 'center', 
                                            justifyContent: 'center',
                                            color: '#f43f5e',
                                            border: '1px solid rgba(244, 63, 94, 0.15)'
                                        }}>
                                            <Minus size={10} strokeWidth={4} />
                                        </div>
                                        
                                        {/* Middle Section: Info (Vertical Stack) */}
                                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                            <div style={{ 
                                                fontWeight: 800, 
                                                fontSize: '0.85rem', 
                                                color: 'white', 
                                                lineHeight: '1.2'
                                            }}>
                                                {expense.description}
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                                                {categories.find(c => c.id === expense.categoryId)?.name || 'Sin Categoría'}
                                            </div>
                                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)' }}>
                                                {new Date(expense.date).toLocaleDateString()}
                                            </div>
                                        </div>

                                        {/* Right Section: Amount & Actions */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'white', whiteSpace: 'nowrap' }}>
                                                -{formatMoney(expense.amount)}
                                            </div>
                                            
                                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                <button 
                                                    onClick={() => onEdit?.(expense)}
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
                                                >
                                                    <Pencil size={12} />
                                                </button>
                                                <button 
                                                    onClick={() => { if(window.confirm('¿Seguro que quieres eliminar este gasto?')) deleteExpense(expense.id); }}
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
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default ExpenseList;
