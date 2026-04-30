import React, { useMemo, useState, useEffect } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { useDateSelection } from '../../contexts/DateSelectionContext';
import { Info, Trash2 } from 'lucide-react';
import FinanceBreakdownModal from './FinanceBreakdownModal';

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

    // Helper to check if a date is in the selected month/year
    const isItemInSelectedMonth = (item: any) => {
        // 1. Check for budget month/year (highest priority)
        if (item.budgetMonth !== undefined && item.budgetYear !== undefined) {
            return item.budgetMonth === selectedMonth && item.budgetYear === selectedYear;
        }

        // 2. Check for period string "YYYY-MM"
        if (item.period && typeof item.period === 'string') {
            const [y, m] = item.period.split('-').map(Number);
            return y === selectedYear && (m - 1) === selectedMonth;
        }

        // 3. Fallback to physical date
        const timestamp = item.receivedDate || item.date;
        if (!timestamp) return false;
        
        const d = new Date(timestamp);
        return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    };

    // Calculate Monthly Income
    const totalMonthIncome = useMemo(() => {
        let total = 0;
        [...fixedIncomes, ...extraIncomes].forEach(inc => {
            // Skip rollover entries from regular income sum (they are handled separately)
            if (inc.type === 'rollover') return;

            if (inc.type === 'extra') {
                if (isItemInSelectedMonth(inc)) {
                    total += inc.amount;
                }
            } else {
                // Fixed income logic remains based on effective range
                const start = inc.effectiveDate ? new Date(inc.effectiveDate) : new Date(0);
                const end = inc.expirationDate ? new Date(inc.expirationDate) : new Date(9999, 11, 31);
                const monthStart = new Date(selectedYear, selectedMonth, 1);
                const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);

                const period = `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}`;
                const isIgnored = inc.ignoredPeriods?.includes(period);

                if (start <= monthEnd && end >= monthStart && !isIgnored) {
                    total += inc.amount;
                }
            }
        });
        return total;
    }, [fixedIncomes, extraIncomes, selectedMonth, selectedYear]);

    // Calculate Monthly Expenses (SPLIT)
    const { totalMonthExpenses, totalAccountExpenses, totalCardExpenses } = useMemo(() => {
        let accountSum = 0;
        let cardSum = 0;

        expenses.filter(exp => isItemInSelectedMonth(exp)).forEach(exp => {
            // Skip expenses financed by a hucha (savings goal) as they don't affect monthly budget
            if (exp.linkedSavingGoalId) return;

            const method = exp.paymentMethod;
            
            if (method.type === 'account' || method.type === 'cash') {
                accountSum += exp.amount;
            } else if (method.type === 'card') {
                const card = cards.find(c => c.id === method.cardId);
                if (card && card.type === 'debit') {
                    accountSum += exp.amount; // Debit card goes to account total
                } else {
                    cardSum += exp.amount; // Credit card goes to card total
                }
            }
        });

        return {
            totalMonthExpenses: accountSum + cardSum,
            totalAccountExpenses: accountSum,
            totalCardExpenses: cardSum
        };
    }, [expenses, cards, selectedMonth, selectedYear]);

    const totalMonthAllocations = useMemo(() => {
        return allocations
            .filter(alloc => isItemInSelectedMonth(alloc) && (alloc.type === 'manual' || alloc.type === 'automatic'))
            .reduce((sum, alloc) => sum + alloc.amount, 0);
    }, [allocations, selectedMonth, selectedYear]);

    const remanente = useMemo(() => {
        return extraIncomes
            .filter(inc => inc.type === 'rollover' && isItemInSelectedMonth(inc))
            .reduce((sum, inc) => sum + inc.amount, 0);
    }, [extraIncomes, selectedMonth, selectedYear]);

    const activeOverride = useMemo(() => {
        const id = `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}`;
        return overrides.find(o => o.id === id);
    }, [overrides, selectedMonth, selectedYear]);

    const pendingFixedExpenses = useMemo(() => {
        const period = `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}`;
        return recurringExpenses
            .filter(re => {
                if (!re.active) return false;
                const isPaid = expenses.some(e => e.recurringExpenseId === re.id && isItemInSelectedMonth(e));
                const isIgnored = re.ignoredPeriods?.includes(period);
                return !isPaid && !isIgnored;
            })
            .reduce((sum, re) => sum + re.amount, 0);
    }, [recurringExpenses, expenses, selectedMonth, selectedYear]);

    const pendingSavings = useMemo(() => {
        const projectedTotal = savings
            .filter(s => (s.monthlySavingAmount || 0) > 0)
            .reduce((sum, s) => sum + (s.monthlySavingAmount || 0), 0);
        
        const alreadyAllocated = allocations
            .filter(a => isItemInSelectedMonth(a) && (a.type === 'manual' || a.type === 'automatic'))
            .reduce((sum, a) => sum + a.amount, 0);
        
        return Math.max(0, projectedTotal - alreadyAllocated);
    }, [savings, allocations, selectedMonth, selectedYear]);

    const availableToSpend = useMemo(() => {
        if (activeOverride) {
            // Override logic remains focused on absolute account status at override time
            const overrideTime = activeOverride.updatedAt;
            
            const incomeAfter = [...fixedIncomes, ...extraIncomes].filter(inc => {
                if (inc.type === 'rollover') return false;
                const rawDate = inc.effectiveDate || (inc as any).date || (inc as any).updatedAt || 0;
                const d = Number(new Date(rawDate));
                return isItemInSelectedMonth(inc) && d > overrideTime;
            }).reduce((sum, inc) => sum + inc.amount, 0);

            const expensesAfter = expenses.filter(exp => {
                const rawDate = exp.date || exp.updatedAt || 0;
                const d = Number(new Date(rawDate));
                return isItemInSelectedMonth(exp) && d > overrideTime;
            }).reduce((sum, exp) => sum + exp.amount, 0);

            const allocationsAfter = allocations.filter(alloc => {
                const rawDate = alloc.date || alloc.updatedAt || 0;
                const d = Number(new Date(rawDate));
                return isItemInSelectedMonth(alloc) && d > overrideTime && (alloc.type === 'manual' || alloc.type === 'automatic');
            }).reduce((sum, alloc) => sum + alloc.amount, 0);

            return activeOverride.amount + incomeAfter - expensesAfter - allocationsAfter - pendingFixedExpenses - pendingSavings;
        }

        return totalMonthIncome - totalMonthExpenses - totalMonthAllocations + remanente - pendingFixedExpenses - pendingSavings;
    }, [
        activeOverride, totalMonthIncome, totalMonthExpenses, totalMonthAllocations, remanente,
        pendingFixedExpenses, pendingSavings,
        fixedIncomes, extraIncomes, expenses, allocations, selectedMonth, selectedYear
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
                    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
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
                    <div style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem' }}>
                        {totalMonthIncome.toFixed(2).replace('.', ',')}€
                    </div>
                </div>
                <div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.85rem', marginBottom: '4px' }}>
                        Gastos Cuentas
                    </div>
                    <div style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem' }}>
                        {totalAccountExpenses.toFixed(2).replace('.', ',')}€
                    </div>
                </div>
                <div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.85rem', marginBottom: '4px' }}>
                        Gastos Tarjetas
                    </div>
                    <div style={{ color: '#fbbf24', fontWeight: 700, fontSize: '1.1rem' }}>
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
