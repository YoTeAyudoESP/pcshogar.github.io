import React, { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { Trash2, Edit2, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import type { Loan } from '../../types/finance';
import AmortizeLoanModal from './AmortizeLoanModal';
import LoanScheduleModal from './LoanScheduleModal';
import { formatMoney, calculateLoanAmortization } from '../../utils/financeCalculations';

interface LoanListProps {
    onEdit: (loan: Loan) => void;
}

const LoanList: React.FC<LoanListProps> = ({ onEdit }) => {
    const { loans, deleteLoan } = useFinance();
    const [amortizingLoan, setAmortizingLoan] = useState<Loan | null>(null);
    const [scheduleLoan, setScheduleLoan] = useState<Loan | null>(null);

    const handleDelete = async (loan: Loan) => {
        if ((loan.currentDebt ?? 0) > 0) {
            alert(`No se puede eliminar el préstamo "${loan.name}" porque aún tiene una deuda de ${formatMoney(loan.currentDebt)}. Por favor, amortízalo completamente primero.`);
            return;
        }

        if (window.confirm(`¿Estás seguro de que deseas eliminar el préstamo "${loan.name}"?`)) {
            try {
                await deleteLoan(loan.id);
            } catch (error: any) {
                alert(error.message);
            }
        }
    };

    if (loans.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)' }}>
                <TrendingDown size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                <p>No hay préstamos registrados</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {loans.map(loan => {
                const totalAmount = loan.totalAmount ?? 0;
                const currentDebt = loan.currentDebt ?? loan.remainingAmount ?? 0;
                const monthlyPayment = loan.monthlyPayment ?? loan.monthlyInstallment ?? 0;
                const hasRates = (loan.tin !== undefined && loan.tin > 0) || (loan.tae !== undefined && loan.tae > 0);
                const calc = hasRates ? calculateLoanAmortization(loan) : null;

                const paid = totalAmount - currentDebt;
                const progress = totalAmount > 0 ? (paid / totalAmount) * 100 : 0;

                return (
                    <div key={loan.id} className="glass-panel" style={{ padding: '1.25rem', borderLeft: `4px solid ${loan.color || '#e67e22'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>{loan.name || 'Sin nombre'}</h4>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <span>Cuota: <strong>{formatMoney(monthlyPayment)}/mes</strong></span>
                                    {loan.tin !== undefined && <span>TIN: <strong>{loan.tin}%</strong></span>}
                                    {loan.tae !== undefined && <span>TAE: <strong>{loan.tae}%</strong></span>}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                {calc && (
                                    <button 
                                        onClick={() => setScheduleLoan(loan)} 
                                        title="Ver cuadro de amortización cuota a cuota"
                                        style={{ 
                                            background: 'rgba(59, 130, 246, 0.1)', 
                                            border: '1px solid rgba(59, 130, 246, 0.25)', 
                                            color: '#60a5fa', 
                                            cursor: 'pointer', 
                                            padding: '0.4rem 0.65rem',
                                            borderRadius: '0.5rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.3rem',
                                            fontSize: '0.8rem',
                                            fontWeight: 600
                                        }}
                                    >
                                        <Calendar size={14} /> Cuadro Amortización
                                    </button>
                                )}
                                <button 
                                    onClick={() => setAmortizingLoan(loan)} 
                                    title="Amortizar / Pago extraordinario"
                                    style={{ 
                                        background: 'rgba(245, 158, 11, 0.1)', 
                                        border: '1px solid rgba(245, 158, 11, 0.2)', 
                                        color: '#f59e0b', 
                                        cursor: 'pointer', 
                                        padding: '0.4rem 0.65rem',
                                        borderRadius: '0.5rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        fontSize: '0.8rem',
                                        fontWeight: 600
                                    }}
                                >
                                    <DollarSign size={14} /> Amortizar
                                </button>
                                <button onClick={() => onEdit(loan)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}>
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDelete(loan)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', padding: '0.25rem' }}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        {calc ? (() => {
                            const globalPct = calc.totalCost > 0 ? Math.min(100, Math.max(0, (calc.paidTotal / calc.totalCost) * 100)) : 0;
                            const capitalPct = calc.principal > 0 ? Math.min(100, Math.max(0, (calc.paidCapital / calc.principal) * 100)) : 0;
                            const interestPct = calc.totalInterest > 0 ? Math.min(100, Math.max(0, (calc.paidInterest / calc.totalInterest) * 100)) : 0;

                            return (
                                /* 3 PROGRESS BARS WHEN TIN/TAE IS CONFIGURED */
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.85rem', background: 'rgba(255,255,255,0.02)', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    {/* BAR 1: GLOBAL COST PROGRESS */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '3px' }}>
                                            <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>📊 Progreso Global (Coste Total)</span>
                                            <span>{formatMoney(calc.paidTotal)} / <strong>{formatMoney(calc.totalCost)}</strong> <span style={{ color: '#f59e0b', fontWeight: 700, marginLeft: '4px' }}>({globalPct.toFixed(1)}%)</span></span>
                                        </div>
                                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${globalPct}%`, background: 'linear-gradient(90deg, #f59e0b, #e67e22)', transition: 'width 0.3s ease' }} />
                                        </div>
                                    </div>

                                    {/* BAR 2: PRINCIPAL CAPITAL PROGRESS */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '3px' }}>
                                            <span style={{ fontWeight: 600, color: '#60a5fa' }}>🏦 Capital Principal (Deuda Neta)</span>
                                            <span>Amortizado: {formatMoney(calc.paidCapital)} <span style={{ color: '#60a5fa', fontWeight: 700, marginLeft: '2px' }}>({capitalPct.toFixed(1)}%)</span> | Pendiente: <strong style={{ color: '#60a5fa' }}>{formatMoney(calc.remainingCapital)}</strong></span>
                                        </div>
                                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${capitalPct}%`, background: 'linear-gradient(90deg, #3b82f6, #1d4ed8)', transition: 'width 0.3s ease' }} />
                                        </div>
                                    </div>

                                    {/* BAR 3: INTERESTS PROGRESS */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '3px' }}>
                                            <span style={{ fontWeight: 600, color: '#f87171' }}>📈 Intereses</span>
                                            <span>Pagados: {formatMoney(calc.paidInterest)} <span style={{ color: '#f87171', fontWeight: 700, marginLeft: '2px' }}>({interestPct.toFixed(1)}%)</span> | Por Pagar: <strong style={{ color: '#f87171' }}>{formatMoney(calc.remainingInterest)}</strong></span>
                                        </div>
                                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${interestPct}%`, background: 'linear-gradient(90deg, #ef4444, #dc2626)', transition: 'width 0.3s ease' }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })() : (
                            /* FALLBACK 1 PROGRESS BAR WHEN NO TIN/TAE */
                            <>
                                <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span>Pagado: {formatMoney(paid)}</span>
                                    <span style={{ fontWeight: 600 }}>Deuda: {formatMoney(currentDebt)}</span>
                                </div>

                                <div style={{ 
                                    height: '8px', 
                                    background: 'rgba(255,255,255,0.1)', 
                                    borderRadius: '4px', 
                                    overflow: 'hidden',
                                    marginBottom: '0.25rem'
                                }}>
                                    <div style={{ 
                                        height: '100%', 
                                        width: `${Math.min(100, Math.max(0, progress))}%`, 
                                        background: loan.color ? `linear-gradient(90deg, ${loan.color}, ${loan.color})` : 'linear-gradient(90deg, #f39c12, #e67e22)',
                                        transition: 'width 0.3s ease'
                                    }} />
                                </div>
                                <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {progress.toFixed(1)}% completado
                                </div>
                            </>
                        )}
                    </div>
                );
            })}

            {amortizingLoan && (
                <AmortizeLoanModal 
                    loan={amortizingLoan} 
                    onClose={() => setAmortizingLoan(null)} 
                />
            )}

            {scheduleLoan && (
                <LoanScheduleModal
                    loan={scheduleLoan}
                    onClose={() => setScheduleLoan(null)}
                />
            )}
        </div>
    );
};

export default LoanList;
