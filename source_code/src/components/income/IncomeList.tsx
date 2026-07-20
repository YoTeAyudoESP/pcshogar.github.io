import React, { useMemo, useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { useDateSelection } from '../../contexts/DateSelectionContext';
import type { Income, ExtraIncome } from '../../types/income';
import { Pencil, Trash2, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { formatMoney } from '../../utils/financeCalculations';
import ModalPortal from '../common/ModalPortal';

interface IncomeListProps {
    onEdit?: (income: Income) => void;
}

const IncomeList: React.FC<IncomeListProps> = ({ onEdit }) => {
    const { extraIncomes, deleteIncome, accounts } = useFinance();
    const { selectedMonth, selectedYear } = useDateSelection();
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
    const [deleteModal, setDeleteModal] = useState<{
        show: boolean;
        income: any | null;
    }>({ show: false, income: null });

    const isItemInSelectedMonth = (item: any) => {
        if (item.budgetMonth !== undefined && item.budgetYear !== undefined) {
            return item.budgetMonth === selectedMonth && item.budgetYear === selectedYear;
        }
        if (item.period && typeof item.period === 'string') {
            const [y, m] = item.period.split('-').map(Number);
            return y === selectedYear && (m - 1) === selectedMonth;
        }
        const timestamp = item.receivedDate || item.date;
        if (!timestamp) return false;
        const d = new Date(timestamp);
        return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    };

    const currentMonthIncomes = useMemo(() => {
        return extraIncomes
            .filter(inc => inc.type !== 'rollover' && inc.status !== 'pending')
            .filter(isItemInSelectedMonth)
            .sort((a, b) => {
                const dateA = new Date(a.effectiveDate || a.createdAt).getTime();
                const dateB = new Date(b.effectiveDate || b.createdAt).getTime();
                return dateB - dateA;
            });
    }, [extraIncomes, selectedMonth, selectedYear]);

    const groupedIncomes = useMemo(() => {
        const groups: Record<string, { items: typeof extraIncomes, total: number }> = {};
        
        currentMonthIncomes.forEach(inc => {
            let name = 'Efectivo';
            if (inc.linkedAccountId) {
                name = accounts.find(a => a.id === inc.linkedAccountId)?.name || 'Cuenta';
            }
            
            if (!groups[name]) groups[name] = { items: [], total: 0 };
            groups[name].items.push(inc);
            groups[name].total += inc.amount;
        });
        
        return groups;
    }, [currentMonthIncomes, accounts]);

    const groupNames = Object.keys(groupedIncomes).sort();

    if (currentMonthIncomes.length === 0) {
        return (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No hay ingresos registrados para este mes.
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
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#2ed573' }}>
                                Total: {formatMoney(groupedIncomes[name].total)}
                            </div>
                        </div>

                        {/* Incomes in this group */}
                        {!isCollapsed && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {groupedIncomes[name].items.map(income => (
                                    <div 
                                        key={income.id} 
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
                                            background: 'rgba(46, 213, 115, 0.1)', 
                                            display: 'flex', 
                                            flexShrink: 0,
                                            alignItems: 'center', 
                                            justifyContent: 'center',
                                            color: '#2ed573',
                                            border: '1px solid rgba(46, 213, 115, 0.15)'
                                        }}>
                                            <Plus size={10} strokeWidth={4} />
                                        </div>
                                        
                                        {/* Middle Section: Info (Vertical Stack) */}
                                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                            <div style={{ 
                                                fontWeight: 800, 
                                                fontSize: '0.85rem', 
                                                color: 'white', 
                                                lineHeight: '1.2'
                                            }}>
                                                {income.name}
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                                                {income.type === 'extra' ? 'Ingreso Extra' : 'Presupuesto: ' + (income.name.toLowerCase().includes('abr') ? 'abr' : 'mes')}
                                            </div>
                                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)' }}>
                                                {new Date(income.effectiveDate || income.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>

                                        {/* Right Section: Amount & Badge */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: income.status === 'pending' ? '#fbbf24' : '#2ed573', whiteSpace: 'nowrap' }}>
                                                    +{formatMoney(income.amount)}
                                                </div>
                                                {income.status === 'pending' && (
                                                    <span style={{ fontSize: '0.65rem', background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', padding: '1px 6px', borderRadius: '8px', fontWeight: 700 }}>
                                                        Pendiente
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {/* Actions */}
                                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                <button 
                                                    onClick={() => onEdit?.(income)}
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
                                                    onClick={() => setDeleteModal({ show: true, income })}
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

            {/* Custom Delete Confirmation Modal */}
            {deleteModal.show && deleteModal.income && (
                <ModalPortal><div className="modal-overlay" onClick={() => setDeleteModal({ show: false, income: null })}>
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
                            ¿Eliminar Ingreso?
                        </h3>
                        
                        <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.4', margin: '0 0 1.5rem 0' }}>
                            {deleteModal.income.fixedIncomeId ? (
                                <div>
                                    Este ingreso de <strong>{formatMoney(deleteModal.income.amount)}</strong> proviene del ingreso fijo <strong>"{deleteModal.income.name}"</strong>.<br/><br/>
                                    ¿Cómo deseas proceder para este mes?
                                </div>
                            ) : (
                                <div>
                                    ¿Seguro que deseas eliminar el ingreso <strong>"{deleteModal.income.name}"</strong> por importe de <strong>{formatMoney(deleteModal.income.amount)}</strong>?
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {deleteModal.income.fixedIncomeId ? (
                                <>
                                    <button
                                        onClick={async () => {
                                            if (deleteModal.income) {
                                                await deleteIncome(deleteModal.income.id, true);
                                                setDeleteModal({ show: false, income: null });
                                            }
                                        }}
                                        style={{
                                            width: '100%',
                                            background: 'rgba(99, 102, 241, 0.15)',
                                            border: '1px solid rgba(99, 102, 241, 0.25)',
                                            padding: '1rem',
                                            borderRadius: '1rem',
                                            color: '#818cf8',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseOver={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.25)'}
                                        onMouseOut={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)'}
                                    >
                                        Volver a poner como PENDIENTE
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (deleteModal.income) {
                                                await deleteIncome(deleteModal.income.id, false);
                                                setDeleteModal({ show: false, income: null });
                                            }
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
                                        DESCARTAR por completo
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={async () => {
                                        if (deleteModal.income) {
                                            await deleteIncome(deleteModal.income.id);
                                            setDeleteModal({ show: false, income: null });
                                        }
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
                                    Eliminar ingreso
                                </button>
                            )}
                            
                            <button
                                onClick={() => setDeleteModal({ show: false, income: null })}
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
                </div></ModalPortal>
            )}
        </div>
    );
};

export default IncomeList;
