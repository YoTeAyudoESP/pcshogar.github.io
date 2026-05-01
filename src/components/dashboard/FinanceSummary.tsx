import React, { useMemo, useState, useEffect } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { useDateSelection } from '../../contexts/DateSelectionContext';
import { Info, Trash2 } from 'lucide-react';
import FinanceBreakdownModal from './FinanceBreakdownModal';
import { calculateAvailableBalanceForMonth } from '../../utils/financeCalculations';

const FinanceSummary: React.FC = () => {
    const { 
        expenses, allocations, overrides, cards, 
        fixedIncomes, extraIncomes, recurringExpenses, savings
    } = useFinance();
    const { selectedMonth, selectedYear } = useDateSelection();
    
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const {
        availableToSpend,
        totalMonthIncome,
        totalAccountExpenses,
        totalCardExpenses,
        remanente
    } = useMemo(() => {
        return calculateAvailableBalanceForMonth(selectedYear, selectedMonth, {
            fixedIncomes,
            extraIncomes,
            expenses,
            allocations,
            savings,
            recurringExpenses,
            overrides,
            cards
        });
    }, [
        selectedYear, selectedMonth,
        fixedIncomes, extraIncomes, expenses, allocations, savings,
        recurringExpenses, overrides, cards
    ]);

    const monthName = new Date(selectedYear, selectedMonth).toLocaleString('es-ES', { month: 'long' });

    return (
        <section className="glass-panel" style={{
            padding: '2rem 1.5rem',
            marginBottom: 'var(--space-md)',
            background: 'rgba(25, 27, 34, 0.4)',
            textAlign: 'center',
            position: 'relative'
        }}>
            {/* Title */}
            <h2 style={{ 
                fontSize: '1.4rem', 
                fontWeight: 700, 
                color: 'rgba(255, 255, 255, 0.7)', 
                marginBottom: '1rem',
                textTransform: 'capitalize'
            }}>
                Disponible En {monthName}
            </h2>

            {/* Balance and Info Icon Row */}
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '1.5rem',
                position: 'relative'
            }}>
                <div style={{ 
                    fontSize: isMobile ? '3.5rem' : '4.5rem', 
                    fontWeight: 900, 
                    color: availableToSpend >= 0 ? '#10b981' : '#f43f5e',
                    lineHeight: '1.1',
                    textShadow: availableToSpend >= 0 
                        ? '0 0 20px rgba(16, 185, 129, 0.4), 0 0 40px rgba(16, 185, 129, 0.2)' 
                        : '0 0 20px rgba(244, 63, 94, 0.4), 0 0 40px rgba(244, 63, 94, 0.2)',
                    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    whiteSpace: 'nowrap'
                }}>
                    {Math.abs(availableToSpend).toFixed(2).replace('.', ',')}€{availableToSpend >= 0 ? '' : '-'}
                </div>
                
                {/* Info Icon (Circular i) */}
                <button 
                    onClick={() => setIsBreakdownOpen(true)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255, 255, 255, 0.3)',
                        cursor: 'pointer',
                        padding: '8px',
                        position: 'absolute',
                        right: '0',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    <Info size={24} />
                </button>
            </div>

            {/* Remanente Row */}
            {remanente !== 0 && (
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px',
                    marginTop: '1.5rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '1rem'
                }}>
                    <span>Remanente mes anterior:</span>
                    <span style={{ color: remanente >= 0 ? '#2ed573' : '#ff4757', fontWeight: 600 }}>
                        {remanente.toFixed(2).replace('.', ',')}€
                    </span>
                </div>
            )}

            {/* Monthly Stats Row */}
            <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap',
                justifyContent: 'center', 
                gap: isMobile ? '1.5rem' : '3rem', 
                marginTop: '1.5rem' 
            }}>
                <div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.85rem', marginBottom: '4px' }}>
                        Ingresos (Mes)
                    </div>
                    <div style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
                        {totalMonthIncome.toFixed(2).replace('.', ',')}€
                    </div>
                </div>
                <div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.85rem', marginBottom: '4px' }}>
                        Gastos Cuentas
                    </div>
                    <div style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
                        {totalAccountExpenses.toFixed(2).replace('.', ',')}€
                    </div>
                </div>
                <div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.85rem', marginBottom: '4px' }}>
                        Gastos Tarjetas
                    </div>
                    <div style={{ color: '#fbbf24', fontWeight: 700, fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
                        {totalCardExpenses.toFixed(2).replace('.', ',')}€
                    </div>
                </div>
            </div>

            <FinanceBreakdownModal 
                isOpen={isBreakdownOpen} 
                onClose={() => setIsBreakdownOpen(false)} 
            />
        </section>
    );
};

export default FinanceSummary;
