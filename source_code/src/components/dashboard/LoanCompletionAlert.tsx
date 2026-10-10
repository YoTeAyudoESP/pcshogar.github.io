import React, { useState, useEffect } from 'react';
import { Award, X } from 'lucide-react';
import { useFinance } from '../../contexts/FinanceContext';

const LoanCompletionAlert: React.FC = () => {
    const { loans } = useFinance();
    const [dismissedIds, setDismissedIds] = useState<string[]>([]);

    useEffect(() => {
        // Load dismissed alert IDs from localStorage
        const dismissed: string[] = [];
        loans.forEach(loan => {
            if (localStorage.getItem(`dismissed_loan_completed_${loan.id}`) === 'true') {
                dismissed.push(loan.id);
            }
        });
        setDismissedIds(dismissed);
    }, [loans]);

    const completedLoans = loans.filter(loan => {
        const isPaid = loan.status === 'completed' || loan.status === 'paid' || (loan.currentDebt ?? loan.remainingAmount ?? 0) <= 0;
        return isPaid && !dismissedIds.includes(loan.id);
    });

    if (completedLoans.length === 0) return null;

    const handleDismiss = (loanId: string) => {
        localStorage.setItem(`dismissed_loan_completed_${loanId}`, 'true');
        setDismissedIds(prev => [...prev, loanId]);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
            {completedLoans.map(loan => (
                <div 
                    key={loan.id}
                    className="glass-panel"
                    style={{
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(5, 150, 105, 0.12))',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        borderRadius: '1rem',
                        padding: '1rem 1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        animation: 'slideUp 0.3s ease-out',
                        boxShadow: '0 4px 20px rgba(16, 185, 129, 0.15)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={{
                            background: 'rgba(16, 185, 129, 0.2)',
                            borderRadius: '50%',
                            padding: '0.6rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            color: '#10b981'
                        }}>
                            <Award size={24} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, color: '#10b981', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                🎉 ¡Enhorabuena! Préstamo Completado
                            </div>
                            <div style={{ fontSize: '0.88rem', color: 'rgba(255, 255, 255, 0.85)', marginTop: '2px', lineHeight: 1.4 }}>
                                Has finalizado por completo el pago del préstamo <strong>{loan.name}</strong>. Puedes consultar todo su historial de amortizaciones en la pestaña de préstamos finalizados.
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => handleDismiss(loan.id)}
                        style={{
                            background: 'rgba(16, 185, 129, 0.2)',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            color: '#10b981',
                            padding: '0.5rem 1rem',
                            borderRadius: '0.75rem',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                        }}
                    >
                        Entendido <X size={16} />
                    </button>
                </div>
            ))}
        </div>
    );
};

export default LoanCompletionAlert;
