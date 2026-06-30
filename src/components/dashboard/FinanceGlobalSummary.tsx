import React, { useMemo } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { getCurrencySymbol } from '../../utils/financeCalculations';

const FinanceGlobalSummary: React.FC = () => {
    const { accounts, cards, savings } = useFinance();

    const bankBalance = useMemo(() => {
        const accs = accounts
            .filter(a => a.type === 'bank')
            .reduce((sum, a) => sum + (a.balance || 0), 0);
        const vCards = cards
            .filter(c => c.type === 'virtual')
            .reduce((sum, c) => sum + (c.currentBalance || 0), 0);
        return accs + vCards;
    }, [accounts, cards]);

    const cashBalance = useMemo(() => {
        return accounts
            .filter(a => a.type === 'cash')
            .reduce((sum, a) => sum + (a.balance || 0), 0);
    }, [accounts]);

    const piggyBankBalance = useMemo(() => {
        return savings
            .reduce((sum, s) => sum + (s.currentAmount || 0), 0);
    }, [savings]);

    const cardStyle: React.CSSProperties = {
        flex: 1,
        padding: '1.25rem 1rem',
        textAlign: 'center',
        background: 'rgba(25, 27, 34, 0.4)',
        border: '1px solid var(--panel-bg-2)',
        borderRadius: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        minWidth: '120px'
    };

    const labelStyle: React.CSSProperties = {
        fontSize: '0.85rem',
        fontWeight: 500,
        color: 'rgba(var(--color-rgb-light), 0.6)',
        letterSpacing: '0.02em'
    };

    const valueStyle: React.CSSProperties = {
        fontSize: '1.5rem',
        fontWeight: 800,
        fontFamily: 'Inter, system-ui, sans-serif'
    };

    return (
        <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: '12px',
            marginBottom: 'var(--space-md)'
        }}>
            {/* Banks Summary */}
            <div className="glass-panel" style={{ 
                ...cardStyle, 
                borderBottom: '2px solid #38bdf8' // Cyan-ish underline to match image look
            }}>
                <span style={labelStyle}>Saldo en Bancos</span>
                <span style={{ ...valueStyle, color: '#38bdf8' }}>
                    {bankBalance.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {getCurrencySymbol()}
                </span>
            </div>

            {/* Cash Summary */}
            <div className="glass-panel" style={{ 
                ...cardStyle, 
                borderBottom: '2px solid #60a5fa' // Blue-ish
            }}>
                <span style={labelStyle}>Efectivo</span>
                <span style={{ ...valueStyle, color: '#60a5fa' }}>
                    {cashBalance.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {getCurrencySymbol()}
                </span>
            </div>

            {/* Piggy Bank Summary */}
            <div className="glass-panel" style={{ 
                ...cardStyle
            }}>
                <span style={labelStyle}>Ahorro en Huchas</span>
                <span style={{ ...valueStyle, color: 'var(--text-main)' }}>
                    {piggyBankBalance.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {getCurrencySymbol()}
                </span>
            </div>
        </div>
    );
};

export default FinanceGlobalSummary;
