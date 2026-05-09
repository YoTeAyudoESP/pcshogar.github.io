import React from 'react';
import { X, Info, ChevronRight, TrendingUp, TrendingDown, Target, Wallet } from 'lucide-react';
import { useFinance } from '../../contexts/FinanceContext';
import { useDateSelection } from '../../contexts/DateSelectionContext';
import { isRecurringActiveInMonth } from '../../utils/financeCalculations';

interface FinanceBreakdownModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const FinanceBreakdownModal: React.FC<FinanceBreakdownModalProps> = ({ isOpen, onClose }) => {
    const { 
        expenses, allocations, savings, 
        fixedIncomes, extraIncomes, recurringExpenses
    } = useFinance();
    const { selectedMonth, selectedYear } = useDateSelection();

    if (!isOpen) return null;

    const currentPeriod = `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}`;

    // Helper (same as FinanceSummary)
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

    // 1. Ingresos Totales
    const fijosRecibidos = extraIncomes
        .filter(inc => inc.type === 'extra' && inc.period === currentPeriod)
        .reduce((sum, inc) => sum + inc.amount, 0);

    const fijosProyectados = fixedIncomes
        .filter(inc => {
            if (!inc.active) return false;
            // Si ya está en ignoredPeriods para este mes, es que ya se recibió (o se ignoró)
            if (inc.ignoredPeriods?.includes(currentPeriod)) return false;
            
            const start = inc.effectiveDate || inc.createdAt || 0;
            const end = inc.expirationDate || new Date(9999, 11, 31).getTime();
            const monthStart = new Date(selectedYear, selectedMonth, 1).getTime();
            const monthEnd = new Date(selectedYear, selectedMonth + 1, 0).getTime();
            
            if (start <= monthEnd && end >= monthStart) {
                return isRecurringActiveInMonth(inc.frequency, inc.paymentMonth, selectedMonth, selectedYear, start);
            }
            return false;
        })
        .reduce((sum, inc) => sum + inc.amount, 0);

    const extrasRecibidos = extraIncomes
        .filter(inc => inc.type === 'extra' && !inc.period && isItemInSelectedMonth(inc))
        .reduce((sum, inc) => sum + inc.amount, 0);

    const remanente = extraIncomes
        .filter(inc => inc.type === 'rollover' && isItemInSelectedMonth(inc))
        .reduce((sum, inc) => sum + inc.amount, 0);

    const financiadoHuchas = expenses
        .filter(e => isItemInSelectedMonth(e) && e.linkedSavingGoalId)
        .reduce((sum, e) => sum + e.amount, 0);

    const ingresosTotales = fijosRecibidos + fijosProyectados + extrasRecibidos + remanente + financiadoHuchas;

    // 2. Gastos del Mes
    const pagados = expenses
        .filter(e => isItemInSelectedMonth(e) && !e.linkedSavingGoalId)
        .reduce((sum, e) => sum + e.amount, 0);

    const pendientesFijos = recurringExpenses
        .filter(re => {
            if (!re.active) return false;
            
            const start = re.updatedAt || 0;
            const monthEnd = new Date(selectedYear, selectedMonth + 1, 0).getTime();
            if (start > monthEnd) return false;

            // Si ya hay un gasto este mes vinculado a este recurrente
            const isPaid = expenses.some(e => e.recurringExpenseId === re.id && isItemInSelectedMonth(e));
            const isIgnored = re.ignoredPeriods?.includes(currentPeriod);

            if (!isPaid && !isIgnored) {
                return isRecurringActiveInMonth(re.frequency, re.paymentMonth, selectedMonth, selectedYear, start);
            }
            return false;
        })
        .reduce((sum, re) => sum + re.amount, 0);

    const gastosDelMes = pagados + pendientesFijos;

    // 3. Ahorros y Huchas
    const aportacionesRealizadas = allocations
        .filter(a => isItemInSelectedMonth(a) && (a.type === 'manual' || a.type === 'automatic'))
        .reduce((sum, a) => sum + a.amount, 0);

    // Ahorro proyectado pendiente: suma de lo que queda por ahorrar en las huchas con meta mensual
    const ahorroMensualProyectadoTotal = savings
        .filter(s => (s.monthlySavingAmount || 0) > 0)
        .reduce((sum, s) => sum + (s.monthlySavingAmount || 0), 0);
    
    // Lo que falta por ahorrar este mes
    const ahorroMensualPendiente = Math.max(0, ahorroMensualProyectadoTotal - aportacionesRealizadas);

    const ahorrosYHuchas = aportacionesRealizadas + ahorroMensualPendiente;

    const totalDisponible = ingresosTotales - gastosDelMes - ahorrosYHuchas;

    const formatCurrency = (val: number) => {
        return (val >= 0 ? '+' : '-') + ' ' + Math.abs(val).toFixed(2).replace('.', ',') + '€';
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container glass-panel" style={{ padding: '1.5rem', background: '#12141c', maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Info size={20} color="var(--primary)" />
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Desglose del Disponible</h2>
                    </div>
                    <button 
                        onClick={onClose} 
                        style={{ 
                            background: 'rgba(255, 255, 255, 0.2) !important', 
                            border: '1px solid rgba(255, 255, 255, 0.2) !important', 
                            color: '#ffffff !important', 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            transition: 'all 0.2s'
                        }}
                        aria-label="Cerrar"
                    >
                        <X size={20} color="white" />
                    </button>
                </div>

                {/* Content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
                    {/* 1. Ingresos Totales Block */}
                    <div style={{ 
                        background: 'rgba(16, 185, 129, 0.05)', 
                        border: '1px solid rgba(16, 185, 129, 0.1)', 
                        borderRadius: '16px',
                        padding: '1.25rem'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'center' }}>
                            <span style={{ color: '#10b981', fontWeight: 600 }}>Ingresos Totales</span>
                            <span style={{ color: '#10b981', fontWeight: 700, fontSize: '1.1rem', whiteSpace: 'nowrap' }}>{ingresosTotales.toFixed(2).replace('.', ',')}€</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Fijos Recibidos</span>
                                <span style={{ whiteSpace: 'nowrap', marginLeft: '8px' }}>{formatCurrency(fijosRecibidos)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Fijos Proyectados</span>
                                <span style={{ whiteSpace: 'nowrap', marginLeft: '8px' }}>{formatCurrency(fijosProyectados)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Extras Recibidos</span>
                                <span style={{ whiteSpace: 'nowrap', marginLeft: '8px' }}>{formatCurrency(extrasRecibidos)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6366f1' }}>
                                <span>Financiado de Huchas</span>
                                <span style={{ whiteSpace: 'nowrap', marginLeft: '8px' }}>{formatCurrency(financiadoHuchas)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Remanente mes anterior</span>
                                <span style={{ color: remanente >= 0 ? 'inherit' : '#f43f5e', whiteSpace: 'nowrap', marginLeft: '8px' }}>{formatCurrency(remanente)}</span>
                            </div>
                        </div>
                    </div>

                    {/* 2. Gastos del Mes Block */}
                    <div style={{ 
                        background: 'rgba(244, 63, 94, 0.05)', 
                        border: '1px solid rgba(244, 63, 94, 0.1)', 
                        borderRadius: '16px',
                        padding: '1.25rem'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'center' }}>
                            <span style={{ color: '#f43f5e', fontWeight: 600 }}>Gastos del Mes</span>
                            <span style={{ color: '#f43f5e', fontWeight: 700, fontSize: '1.1rem', whiteSpace: 'nowrap' }}>-{gastosDelMes.toFixed(2).replace('.', ',')}€</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Pagados</span>
                                <span style={{ whiteSpace: 'nowrap', marginLeft: '8px' }}>-{pagados.toFixed(2).replace('.', ',')}€</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Pendientes Fijos</span>
                                <span style={{ whiteSpace: 'nowrap', marginLeft: '8px' }}>-{pendientesFijos.toFixed(2).replace('.', ',')}€</span>
                            </div>
                        </div>
                    </div>

                    {/* 3. Ahorros y Huchas Block */}
                    <div style={{ 
                        background: 'rgba(255, 255, 255, 0.03)', 
                        border: '1px solid rgba(255, 255, 255, 0.05)', 
                        borderRadius: '16px',
                        padding: '1.25rem'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'center' }}>
                            <span style={{ color: 'white', fontWeight: 600 }}>Ahorros y Huchas</span>
                            <span style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem', whiteSpace: 'nowrap' }}>-{ahorrosYHuchas.toFixed(2).replace('.', ',')}€</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Aportaciones Realizadas</span>
                                <span style={{ whiteSpace: 'nowrap', marginLeft: '8px' }}>-{aportacionesRealizadas.toFixed(2).replace('.', ',')}€</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Ahorro Proyectado</span>
                                <span style={{ whiteSpace: 'nowrap', marginLeft: '8px' }}>-{ahorroMensualPendiente.toFixed(2).replace('.', ',')}€</span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer Total */}
                <div style={{ 
                    marginTop: '2rem', 
                    paddingTop: '1.5rem', 
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>Total Disponible</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 900, color: totalDisponible >= 0 ? '#10b981' : '#f43f5e', whiteSpace: 'nowrap' }}>
                        {totalDisponible.toFixed(2).replace('.', ',')}€
                    </span>
                </div>
            </div>
        </div>
    );
};

export default FinanceBreakdownModal;
