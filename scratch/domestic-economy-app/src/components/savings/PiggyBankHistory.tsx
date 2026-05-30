import React from 'react';
import { X, History, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { useFinance } from '../../contexts/FinanceContext';
import { formatCurrency } from '../../utils/formatters';

interface PiggyBankHistoryProps {
    goalId: string;
    goalName: string;
    onClose: () => void;
}

const PiggyBankHistory: React.FC<PiggyBankHistoryProps> = ({ goalId, goalName, onClose }) => {
    const { allocations } = useFinance();

    const history = allocations
        .filter(a => a.goalId === goalId)
        .sort((a, b) => b.date - a.date);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            justifyContent: 'flex-end', // Aligns to right for desktop
            alignItems: 'stretch',
            zIndex: 1100,
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)'
        }} onClick={onClose}>
            {/* Responsiveness Handling via CSS-in-JS or Class */}
            <div
                className="glass-panel history-panel"
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'var(--bg-surface-elevated)',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '1.5rem',
                    borderBottom: 'var(--card-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <History size={24} className="text-secondary" />
                        <div>
                            <h3 style={{ margin: 0 }}>Historial</h3>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{goalName}</div>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn-icon">
                        <X size={24} />
                    </button>
                </div>

                {/* List Container */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                }}>
                    {history.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '3rem 1rem',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '1rem'
                        }}>
                            <History size={48} opacity={0.2} />
                            <p>No hay movimientos registrados para esta hucha.</p>
                        </div>
                    ) : (
                        history.map(item => (
                            <div key={item.id} className="glass-panel" style={{
                                padding: '1rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderLeft: item.amount >= 0 ? '4px solid var(--color-success)' : '4px solid var(--hue-danger)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    {item.amount >= 0 ? (
                                        <ArrowDownCircle size={20} style={{ color: 'var(--color-success)' }} />
                                    ) : (
                                        <ArrowUpCircle size={20} style={{ color: 'var(--hue-danger)' }} />
                                    )}
                                    <div>
                                        <div style={{ fontWeight: 600 }}>
                                            {item.amount >= 0 ? 'Ingreso' : 'Extracción'}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {new Date(item.date).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                                <div style={{
                                    fontWeight: 700,
                                    fontSize: '1.1rem',
                                    color: item.amount >= 0 ? 'var(--color-success)' : 'var(--hue-danger)'
                                }}>
                                    {item.amount >= 0 ? '+' : ''}{formatCurrency(item.amount)}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer / Summary (Optional) */}
                <div style={{
                    padding: '1rem 1.5rem',
                    borderTop: 'var(--card-border)',
                    background: 'rgba(0,0,0,0.1)',
                    fontSize: '0.9rem',
                    color: 'var(--text-muted)',
                    textAlign: 'center'
                }}>
                    Mostrando {history.length} movimiento(s)
                </div>
            </div>

            <style>{`
                .history-panel {
                    width: 400px;
                    border-radius: 0;
                    height: 100%;
                }

                @media (max-width: 600px) {
                    .history-panel {
                        width: 100%;
                        height: 80%;
                        margin-top: auto;
                        border-radius: 24px 24px 0 0;
                    }
                }
            `}</style>
        </div>
    );
};

export default PiggyBankHistory;
