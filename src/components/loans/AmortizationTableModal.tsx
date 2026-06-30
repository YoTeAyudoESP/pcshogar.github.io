import React from 'react';
import { X, Table2 } from 'lucide-react';
import type { Loan } from '../../types/finance';
import { formatMoney } from '../../utils/financeCalculations';
import { LoanCalculations } from '../../utils/loanCalculations';

interface AmortizationTableModalProps {
    loan: Loan;
    onClose: () => void;
}

const AmortizationTableModal: React.FC<AmortizationTableModalProps> = ({ loan, onClose }) => {
    // Generar el cuadro de amortización usando nuestra función matemática
    const schedule = LoanCalculations.generateAmortizationSchedule(loan);

    // Color del préstamo o default
    const color = loan.color || '#f59e0b';

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '1rem', backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                background: '#121212', borderRadius: '1.5rem', width: '100%', maxWidth: '800px',
                padding: '2rem', boxShadow: '0 20px 50px rgba(0,0,0,0.4)', border: '1px solid var(--panel-border)',
                position: 'relative', maxHeight: '90vh', display: 'flex', flexDirection: 'column'
            }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'var(--panel-bg-2)', border: '1px solid var(--panel-border)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(var(--color-rgb-light), 0.5)', cursor: 'pointer' }}>
                    <X size={18} />
                </button>

                <h2 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', color: color }}>
                    <Table2 size={24} />
                    Cuadro de Amortización: {loan.name}
                </h2>

                <div style={{ overflowY: 'auto', flex: 1, borderRadius: '1rem', border: '1px solid var(--panel-border)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.9rem' }}>
                        <thead style={{ position: 'sticky', top: 0, background: 'var(--panel-bg-2)', zIndex: 1 }}>
                            <tr>
                                <th style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--panel-border)' }}>Mes</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--panel-border)' }}>Cuota</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--panel-border)' }}>Intereses</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--panel-border)' }}>Capital</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--panel-border)' }}>Pendiente</th>
                            </tr>
                        </thead>
                        <tbody>
                            {schedule.map((row) => (
                                <tr key={row.month} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>{row.month}</td>
                                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{formatMoney(row.installment)}</td>
                                    <td style={{ padding: '0.75rem 1rem', color: '#e74c3c' }}>{formatMoney(row.interestPayment)}</td>
                                    <td style={{ padding: '0.75rem 1rem', color: '#2ecc71' }}>{formatMoney(row.principalPayment)}</td>
                                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-main)' }}>{formatMoney(row.remainingPrincipal)}</td>
                                </tr>
                            ))}
                            {schedule.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No hay datos de amortización disponibles.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AmortizationTableModal;
