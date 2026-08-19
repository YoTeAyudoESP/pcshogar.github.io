import React from 'react';
import { X, Info, ChevronRight, TrendingUp, TrendingDown, Target, Wallet } from 'lucide-react';
import { useFinance } from '../../contexts/FinanceContext';
import { useDateSelection } from '../../contexts/DateSelectionContext';
import { isRecurringActiveInMonth, calculateAvailableBalanceForMonth, calculateCardCycleDates, getEffectiveSettlementDate } from '../../utils/financeCalculations';
import ModalPortal from '../common/ModalPortal';

interface FinanceBreakdownModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const FinanceBreakdownModal: React.FC<FinanceBreakdownModalProps> = ({ isOpen, onClose }) => {
    const { 
        expenses, allocations, savings, cards,
        fixedIncomes, extraIncomes, recurringExpenses, overrides
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
        .filter(inc => inc.type === 'extra' && inc.fixedIncomeId && isItemInSelectedMonth(inc) && inc.status !== 'pending' && !inc.excludeFromBudget)
        .reduce((sum, inc) => sum + inc.amount, 0);

    const fijosProyectados = fixedIncomes
        .filter(inc => {
            if (!inc.active) return false;
            // Si ya está en ignoredPeriods para este mes, es que ya se recibió (o se ignoró)
            if (inc.ignoredPeriods?.includes(currentPeriod)) return false;
            
            const isConfirmed = extraIncomes.some(ei => ei.fixedIncomeId === inc.id && isItemInSelectedMonth(ei));
            if (isConfirmed) return false;

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
        .filter(inc => inc.type === 'extra' && !inc.fixedIncomeId && isItemInSelectedMonth(inc) && inc.status !== 'pending' && !inc.excludeFromBudget)
        .reduce((sum, inc) => sum + inc.amount, 0);

    const remanente = extraIncomes
        .filter(inc => inc.type === 'rollover' && isItemInSelectedMonth(inc))
        .reduce((sum, inc) => sum + inc.amount, 0);

    const financiadoHuchas = expenses
        .filter(e => isItemInSelectedMonth(e))
        .reduce((sum, e) => {
            let funded = 0;
            if (e.savingGoalFunding && e.savingGoalFunding.length > 0) {
                funded = e.savingGoalFunding.reduce((s, f) => s + f.amount, 0);
            } else if (e.linkedSavingGoalId) {
                funded = e.amount;
            }
            return sum + funded;
        }, 0);

    const ingresosTotales = fijosRecibidos + fijosProyectados + extrasRecibidos + remanente;

    // 2. Gastos del Mes
    const pagados = expenses
        .filter(e => isItemInSelectedMonth(e) && !e.excludeFromBudget && !(e.amount < 0 && e.status === 'pending'))
        .reduce((sum, e) => {
            let funded = 0;
            if (e.savingGoalFunding && e.savingGoalFunding.length > 0) {
                funded = e.savingGoalFunding.reduce((s, f) => s + f.amount, 0);
            } else if (e.linkedSavingGoalId) {
                funded = e.amount;
            }
            return sum + (e.amount - funded);
        }, 0);

    const pendientesFijos = recurringExpenses
        .filter(re => {
            if (!re.active) return false;
            
            const start = re.createdAt || re.updatedAt || 0;
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
        .reduce((sum, re) => {
            let netAmount = re.amount;
            if (re.financingSavingGoalId) {
                const goal = savings.find(s => s.id === re.financingSavingGoalId);
                const huchaBalance = goal ? (goal.currentAmount || 0) : 0;
                const covered = Math.min(re.amount, Math.max(0, huchaBalance));
                netAmount = Math.max(0, re.amount - covered);
            }
            return sum + netAmount;
        }, 0);

    const gastosDelMes = pagados + pendientesFijos;

    // 3. Ahorros y Huchas
    // Calculate pending savings per hucha
    let ahorroMensualPendiente = 0;
    let ahorroMensualProyectadoTotal = 0;

    savings
        .filter(s => (s.monthlySavingAmount || 0) > 0)
        .forEach(s => {
            const start = s.createdAt || 0;
            const monthStart = new Date(selectedYear, selectedMonth, 1).getTime();
            const monthEnd = new Date(selectedYear, selectedMonth + 1, 0).getTime();
            if (start <= monthEnd) {
                // Check if linked income is active or confirmed
                let isLinkedIncomeActive = true;
                if (s.linkedFixedIncomeId) {
                    const linkedIncome = fixedIncomes.find(inc => inc.id === s.linkedFixedIncomeId);
                    if (linkedIncome && linkedIncome.active) {
                        const incStart = linkedIncome.effectiveDate || linkedIncome.createdAt || 0;
                        const incEnd = linkedIncome.expirationDate || new Date(9999, 11, 31).getTime();
                        const isIgnored = linkedIncome.ignoredPeriods?.includes(currentPeriod);
                        let isTemplateActive = false;
                        if (incStart <= monthEnd && incEnd >= monthStart && !isIgnored) {
                            isTemplateActive = isRecurringActiveInMonth(linkedIncome.frequency, linkedIncome.paymentMonth, selectedMonth, selectedYear, incStart);
                        }
                        const isConfirmed = extraIncomes.some(ei => ei.fixedIncomeId === s.linkedFixedIncomeId && ei.budgetMonth === selectedMonth && ei.budgetYear === selectedYear);
                        isLinkedIncomeActive = isTemplateActive || isConfirmed;
                    } else {
                        isLinkedIncomeActive = false;
                    }
                }

                if (isLinkedIncomeActive) {
                    ahorroMensualProyectadoTotal += (s.monthlySavingAmount || 0);
                    const allocationsForThisHucha = allocations
                        .filter(a => a.goalId === s.id && isItemInSelectedMonth(a) && (a.type === 'manual' || a.type === 'automatic'))
                        .reduce((sum, a) => sum + a.amount, 0);
                    ahorroMensualPendiente += Math.max(0, (s.monthlySavingAmount || 0) - allocationsForThisHucha);
                }
            }
        });

    const aportacionesRealizadas = allocations
        .filter(a => isItemInSelectedMonth(a) && (a.type === 'manual' || a.type === 'automatic'))
        .reduce((sum, a) => sum + a.amount, 0);

    const ahorrosYHuchas = aportacionesRealizadas + ahorroMensualPendiente;

    // Use exact formula from central utility to prevent mismatches
    const { availableToSpend: totalDisponible } = calculateAvailableBalanceForMonth(selectedYear, selectedMonth, {
        fixedIncomes, extraIncomes, expenses, allocations, savings, recurringExpenses, overrides, cards
    });

    const formatCurrency = (val: number, includeSign: boolean = true) => {
        try {
            const saved = localStorage.getItem('pcshogar_settings');
            if (saved && JSON.parse(saved).privacyMode) {
                return '•••• €';
            }
        } catch (e) {}

        const isNegative = val < 0;
        const [integerPart, decimalPart] = Math.abs(val).toFixed(2).split('.');
        const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        const formattedVal = `${formattedInteger},${decimalPart}€`;
        if (!includeSign) return formattedVal;
        return (val >= 0 ? '+' : '-') + ' ' + formattedVal;
    };

    return (
        <ModalPortal><div className="modal-overlay" onClick={onClose}>
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
                    
                    {/* Information Banner */}
                    <div style={{
                        background: 'rgba(54, 162, 235, 0.08)',
                        border: '1px solid rgba(54, 162, 235, 0.2)',
                        borderRadius: '12px',
                        padding: '0.85rem 1rem',
                        fontSize: '0.82rem',
                        color: 'rgba(255, 255, 255, 0.85)',
                        lineHeight: 1.45
                    }}>
                        <div style={{ fontWeight: 700, color: '#36a2eb', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            💡 Cálculo Interno de Presupuesto
                        </div>
                        <div style={{ marginBottom: '6px' }}>
                            Este desglose muestra la fórmula interna que utiliza la app para calcular tu disponible libre del mes. Combina tus movimientos confirmados con las estimaciones e ingresos/gastos fijos previstos para este período.
                        </div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.65)', fontStyle: 'italic' }}>
                            Por este motivo, es posible que veas desgloses o importes que a simple vista no te parezcan lógicos, pero puedes tener total tranquilidad: son cálculos matemáticos minuciosos y 100% precisos diseñados para ofrecerte tu disponible real.
                        </div>
                    </div>
                    
                    {/* 1. Ingresos Totales Block */}
                    <div style={{ 
                        background: 'rgba(16, 185, 129, 0.05)', 
                        border: '1px solid rgba(16, 185, 129, 0.1)', 
                        borderRadius: '16px',
                        padding: '1.25rem'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'center' }}>
                            <span style={{ color: '#10b981', fontWeight: 600 }}>Ingresos Totales</span>
                            <span style={{ color: '#10b981', fontWeight: 700, fontSize: '1.1rem', whiteSpace: 'nowrap' }}>{formatCurrency(ingresosTotales, false)}</span>
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
                            <span style={{ color: '#f43f5e', fontWeight: 700, fontSize: '1.1rem', whiteSpace: 'nowrap' }}>-{formatCurrency(gastosDelMes, false)}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Pagados</span>
                                <span style={{ whiteSpace: 'nowrap', marginLeft: '8px' }}>-{formatCurrency(pagados, false)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Pendientes Fijos</span>
                                <span style={{ whiteSpace: 'nowrap', marginLeft: '8px' }}>-{formatCurrency(pendientesFijos, false)}</span>
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
                            <span style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem', whiteSpace: 'nowrap' }}>-{formatCurrency(ahorrosYHuchas, false)}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Aportaciones Realizadas</span>
                                <span style={{ whiteSpace: 'nowrap', marginLeft: '8px' }}>-{formatCurrency(aportacionesRealizadas, false)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Ahorro Proyectado</span>
                                <span style={{ whiteSpace: 'nowrap', marginLeft: '8px' }}>-{formatCurrency(ahorroMensualPendiente, false)}</span>
                            </div>
                        </div>
                    </div>

                    {/* 4. Tarjetas de Crédito (Deuda Pendiente) Block */}
                    {(() => {
                        const pendingCardDebt = (cards || [])
                            .filter(c => c.type === 'credit')
                            .reduce((sum, c) => {
                                const cycleDates = calculateCardCycleDates(c);
                                
                                const activeExpenses = (expenses || []).filter(exp => {
                                    if (!exp?.paymentMethod) return false;
                                    const isCard = exp.paymentMethod.type === 'card' && exp.paymentMethod.cardId === c.id;
                                    if (!isCard || exp.isSettled) return false;
                                    if (exp.status === 'pending') return false;
                                    const expDate = getEffectiveSettlementDate(exp);
                                    return expDate >= cycleDates.active.start && expDate <= cycleDates.active.cutoff;
                                });
                                const activeTotal = activeExpenses.reduce((s, exp) => s + exp.amount, 0);

                                const pendingExpenses = (expenses || []).filter(exp => {
                                    if (!exp?.paymentMethod) return false;
                                    const isCard = exp.paymentMethod.type === 'card' && exp.paymentMethod.cardId === c.id;
                                    if (!isCard || exp.isSettled) return false;
                                    if (exp.status === 'pending') return false;
                                    const expDate = getEffectiveSettlementDate(exp);
                                    return expDate >= cycleDates.pending.start && expDate <= cycleDates.pending.cutoff;
                                });
                                const pendingTotal = pendingExpenses.reduce((s, exp) => s + exp.amount, 0);

                                return sum + activeTotal + pendingTotal;
                            }, 0);
                            
                        if (pendingCardDebt > 0.009) {
                            return (
                                <div style={{ 
                                    background: 'rgba(255, 255, 255, 0.03)', 
                                    border: '1px solid rgba(255, 255, 255, 0.05)', 
                                    borderRadius: '16px',
                                    padding: '1.25rem',
                                    marginTop: '0.5rem'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: 'white', fontWeight: 600 }}>Deuda Pendiente (Tarjetas)</span>
                                        <span style={{ color: '#f43f5e', fontWeight: 700, fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
                                            {formatCurrency(pendingCardDebt, false)}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem' }}>
                                        Esta deuda es informativa y no resta directamente del saldo disponible hasta su cargo.
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    })()}

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
                        {formatCurrency(totalDisponible, false)}
                    </span>
                </div>
            </div>
        </div></ModalPortal>
    );
};

export default FinanceBreakdownModal;
