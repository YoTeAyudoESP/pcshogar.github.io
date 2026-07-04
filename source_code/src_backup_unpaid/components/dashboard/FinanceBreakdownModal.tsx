import React from 'react';
import { X, Info, ChevronRight, TrendingUp, TrendingDown, Target, Wallet } from 'lucide-react';
import { useFinance } from '../../contexts/FinanceContext';
import { useDateSelection } from '../../contexts/DateSelectionContext';

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
            const start = inc.effectiveDate ? new Date(inc.effectiveDate) : new Date(0);
            const end = inc.expirationDate ? new Date(inc.expirationDate) : new Date(9999, 11, 31);
            const monthStart = new Date(selectedYear, selectedMonth, 1);
            const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);
            return start <= monthEnd && end >= monthStart;
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
            // Si ya hay un gasto este mes vinculado a este recurrente
            const isPaid = expenses.some(e => e.recurringExpenseId === re.id && isItemInSelectedMonth(e));
            return !isPaid;
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
        const fixed = val.toFixed(2).replace('.', ',');
        return `${val >= 0 ? '+' : '-'} ${Math.abs(val).toFixed(2).replace('.', ',')} €`;
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#000000 !important',
            opacity: '1 !important',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
        }}>
            <div className="glass-panel" style={{
                width: '100%',
                maxWidth: '450px',
                padding: '1.5rem',
                position: 'relative',
                animation: 'modalSlideUp 0.3s ease-out',
                background: '#12141c',
                backdropFilter: 'none'
            }}>
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
                            <span style={{ color: '#10b981', fontWeight: 700, fontSize: '1.1rem' }}>{ingresosTotales.toFixed(2).replace('.', ',')} €</span>
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
                            <span style={{ color: '#f43f5e', fontWeight: 700, fontSize: '1.1rem' }}>-{gastosDelMes.toFixed(2).replace('.', ',')} €</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Pagados</span>
                                <span style={{ whiteSpace: 'nowrap', marginLeft: '8px' }}>- {pagados.toFixed(2).replace('.', ',')} €</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Pendientes Fijos</span>
                                <span style={{ whiteSpace: 'nowrap', marginLeft: '8px' }}>- {pendientesFijos.toFixed(2).replace('.', ',')} €</span>
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
                            <span style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem' }}>-{ahorrosYHuchas.toFixed(2).replace('.', ',')} €</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Aportaciones Realizadas</span>
                                <span style={{ whiteSpace: 'nowrap', marginLeft: '8px' }}>- {aportacionesRealizadas.toFixed(2).replace('.', ',')} €</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Ahorro Proyectado</span>
                                <span style={{ whiteSpace: 'nowrap', marginLeft: '8px' }}>- {ahorroMensualPendiente.toFixed(2).replace('.', ',')} €</span>
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
                    <span style={{ 
                        fontSize: '1.5rem', 
                        fontWeight: 900, 
                        color: totalDisponible >= 0 ? '#10b981' : '#f43f5e' 
                    }}>
                        {totalDisponible.toFixed(2).replace('.', ',')} €
                    </span>
                </div>
            </div>
        </div>
    );
};

export default FinanceBreakdownModal;
