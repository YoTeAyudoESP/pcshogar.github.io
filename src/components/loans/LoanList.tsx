import React, { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { Trash2, Edit2, TrendingDown, DollarSign } from 'lucide-react';
import type { Loan } from '../../types/finance';
import AmortizeLoanModal from './AmortizeLoanModal';
import { formatMoney } from '../../utils/financeCalculations';

interface LoanListProps {
    onEdit: (loan: Loan) => void;
}

const LoanList: React.FC<LoanListProps> = ({ onEdit }) => {
    const { loans, deleteLoan } = useFinance();
    const [amortizingLoan, setAmortizingLoan] = useState<Loan | null>(null);

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
            <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--panel-bg-1)', borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)' }}>
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
                const paid = totalAmount - currentDebt;
                const progress = totalAmount > 0 ? (paid / totalAmount) * 100 : 0;

                return (
                    <div key={loan.id} className="glass-panel" style={{ padding: '1rem', borderLeft: `4px solid ${loan.color || '#e67e22'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{loan.name || 'Sin nombre'}</h4>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    Cuota: {formatMoney(monthlyPayment)}/mes
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button 
                                    onClick={() => setAmortizingLoan(loan)} 
                                    title="Amortizar / Pago extraordinario"
                                    style={{ 
                                        background: 'rgba(245, 158, 11, 0.1)', 
                                        border: '1px solid rgba(245, 158, 11, 0.2)', 
                                        color: '#f59e0b', 
                                        cursor: 'pointer', 
                                        padding: '0.4rem',
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
                                    < Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                            <span>Pagado: {formatMoney(paid)}</span>
                            <span style={{ fontWeight: 600 }}>Deuda: {formatMoney(currentDebt)}</span>
                        </div>

                        <div style={{ 
                            height: '8px', 
                            background: 'var(--panel-bg-3)', 
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
                    </div>
                );
            })}

            {amortizingLoan && (
                <AmortizeLoanModal 
                    loan={amortizingLoan} 
                    onClose={() => setAmortizingLoan(null)} 
                />
            )}
        </div>
    );
};

export default LoanList;
