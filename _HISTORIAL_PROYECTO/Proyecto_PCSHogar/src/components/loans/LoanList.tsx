import React from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { Trash2, Edit2, TrendingDown } from 'lucide-react';
import type { Loan } from '../../types/finance';

interface LoanListProps {
    onEdit: (loan: Loan) => void;
}

const LoanList: React.FC<LoanListProps> = ({ onEdit }) => {
    const { loans, deleteLoan } = useFinance();

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
                const paid = loan.totalAmount - loan.currentDebt;
                const progress = loan.totalAmount > 0 ? (paid / loan.totalAmount) * 100 : 0;

                return (
                    <div key={loan.id} className="glass-panel" style={{ padding: '1rem', borderLeft: '4px solid #e67e22' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{loan.name}</h4>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    Cuota: {loan.monthlyPayment}€/mes
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={() => onEdit(loan)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}>
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => deleteLoan(loan.id)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', padding: '0.25rem' }}>
                                    < Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                            <span>Pagado: {paid.toFixed(2)}€</span>
                            <span style={{ fontWeight: 600 }}>Deuda: {loan.currentDebt.toFixed(2)}€</span>
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
                                background: 'linear-gradient(90deg, #f39c12, #e67e22)',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {progress.toFixed(1)}% completado
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default LoanList;
