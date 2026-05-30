import React, { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { formatCurrency } from '../../utils/formatters';
import LoanForm from './LoanForm';
import LoanAmortizationModal from './LoanAmortizationModal';
import type { Loan } from '../../types/finance';
import { Trash2, Edit2, Landmark, DollarSign } from 'lucide-react';

const LoanList: React.FC = () => {
    const { loans, deleteLoan } = useFinance();
    const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
    const [amortizingLoan, setAmortizingLoan] = useState<Loan | null>(null);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {loans.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No tienes préstamos registrados.</p>
            ) : (
                loans.map(loan => {
                    const progress = ((loan.totalAmount - loan.remainingAmount) / loan.totalAmount) * 100;
                    const isCompleted = loan.status === 'completed' || loan.remainingAmount <= 0;

                    return (
                        <div key={loan.id} className="glass-panel" style={{ padding: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '12px',
                                        background: isCompleted ? 'var(--alert-success-bg)' : 'var(--btn-ghost-bg)',
                                        color: isCompleted ? 'var(--color-success)' : 'var(--color-primary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        border: isCompleted ? '1px solid var(--color-success)' : 'var(--card-border)'
                                    }}>
                                        <Landmark size={20} />
                                    </div>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{loan.name}</h4>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            Cuota: {formatCurrency(loan.monthlyInstallment)} / mes
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {!isCompleted && (
                                        <button onClick={() => setAmortizingLoan(loan)} className="btn-icon" style={{ color: 'var(--color-success)', background: 'var(--alert-success-bg)', borderRadius: '4px', padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <DollarSign size={16} /> <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Amortizar</span>
                                        </button>
                                    )}
                                    <button onClick={() => setEditingLoan(loan)} className="btn-icon" style={{ color: 'var(--color-primary)' }}>
                                        <Edit2 size={18} />
                                    </button>
                                    <button onClick={() => deleteLoan(loan.id)} className="btn-icon" style={{ color: 'var(--hue-danger)' }}>
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Progreso: {progress.toFixed(1)}%</span>
                                <span style={{ fontWeight: 600 }}>
                                    {formatCurrency(loan.remainingAmount)} / {formatCurrency(loan.totalAmount)}
                                </span>
                            </div>

                            <div style={{
                                width: '100%', height: '8px', background: 'var(--bg-surface-elevated)',
                                borderRadius: '4px', overflow: 'hidden', border: 'var(--card-border)'
                            }}>
                                <div style={{
                                    width: `${progress}%`, height: '100%',
                                    background: isCompleted ? 'var(--color-success)' : 'var(--color-primary)',
                                    transition: 'width 0.5s ease'
                                }} />
                            </div>

                            {isCompleted && (
                                <div style={{
                                    marginTop: '0.75rem', fontSize: '0.75rem', fontWeight: 700,
                                    color: 'var(--text-main)', textAlign: 'center', textTransform: 'uppercase',
                                    padding: '0.25rem', background: 'var(--alert-success-bg)', borderRadius: '4px',
                                    border: '1px solid var(--color-success)'
                                }}>
                                    Préstamo Finalizado
                                </div>
                            )}
                        </div>
                    );
                })
            )}

            {editingLoan && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', zIndex: 1100, padding: '2rem'
                }}>
                    <div style={{ maxWidth: '500px', width: '100%' }}>
                        <LoanForm editingLoan={editingLoan} onClose={() => setEditingLoan(null)} />
                    </div>
                </div>
            )}

            {amortizingLoan && (
                <LoanAmortizationModal
                    loan={amortizingLoan}
                    onClose={() => setAmortizingLoan(null)}
                />
            )}
        </div>
    );
};

export default LoanList;
