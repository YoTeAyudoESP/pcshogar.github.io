import React, { useMemo } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { useIncome } from '../../contexts/IncomeContext';
import { useDateSelection } from '../../contexts/DateSelectionContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatCurrency } from '../../utils/formatters';
import { getSettlementCycles, type SettlementCycle } from '../../utils/cardCalculations';
import { Info, AlertCircle, CreditCard as CardIcon, Trash2, X, AlertTriangle } from 'lucide-react';
import { useMonthClosing } from '../../contexts/MonthClosingContext';
import MonthRolloverModal from './MonthRolloverModal';
import { calculateMonthAvailability, calculateDetailedAvailability } from '../../utils/financeUtils';
import { incomeDB } from '../../services/db';
import PiggyBankAllocationModal from '../savings/PiggyBankAllocationModal';

const FinanceSummary: React.FC = () => {
    const { expenses, allocations, accounts, savings, cards, addExpense, recurringExpenses, overrides } = useFinance();
    const { extraIncomes, rolloverIncomes, deleteIncome } = useIncome();
    const { selectedMonth, selectedYear } = useDateSelection();
    const { t, language } = useLanguage();
    const { isMonthClosed, allClosings } = useMonthClosing();

    const [showRolloverModal, setShowRolloverModal] = React.useState(false);
    const [rolloverData, setRolloverData] = React.useState<{ year: number, month: number, balance: number, nextMonthAvailable: number, unmaterializedFixed?: number, unmaterializedPending?: number } | null>(null);
    const hasDismissedRollover = React.useRef(false);
    const [isSelectedMonthClosed, setIsSelectedMonthClosed] = React.useState(false);

    const [selectedClosingAction, setSelectedClosingAction] = React.useState<any>(null);
    const [showBreakdown, setShowBreakdown] = React.useState(false);
    const [showSavingsWithdrawal, setShowSavingsWithdrawal] = React.useState(false);

    const alertKey = `pcs_ignore_liquidity_${selectedYear}_${selectedMonth}`;
    const [isAlertIgnored, setIsAlertIgnored] = React.useState(localStorage.getItem(alertKey) === 'true');

    React.useEffect(() => {
        setIsAlertIgnored(localStorage.getItem(alertKey) === 'true');
    }, [selectedYear, selectedMonth]);

    React.useEffect(() => {
        const checkSelected = async () => {
            const closing = await incomeDB.getClosing(selectedYear, selectedMonth);
            setIsSelectedMonthClosed(!!closing);
            setSelectedClosingAction(closing?.rolloverAction);
        };
        checkSelected();
    }, [selectedYear, selectedMonth, isMonthClosed, rolloverIncomes, allClosings]);

    // Check for unclosed previous month on mount
    React.useEffect(() => {
        const checkPreviousMonth = async () => {
            const today = new Date();
            const prevDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const pYear = prevDate.getFullYear();
            const pMonth = prevDate.getMonth();

            const closed = await isMonthClosed(pYear, pMonth);
            if (!closed && !hasDismissedRollover.current) {
                // Check if there's ANY activity in that month to avoid "ghost" rollovers
                const pIncomes = extraIncomes.filter(inc => {
                    const m = inc.budgetMonth !== undefined ? inc.budgetMonth : new Date(inc.receivedDate).getMonth();
                    const y = inc.budgetYear !== undefined ? inc.budgetYear : new Date(inc.receivedDate).getFullYear();
                    return m === pMonth && y === pYear;
                });
                const pExpenses = expenses.filter(exp => {
                    const d = new Date(exp.date);
                    return d.getMonth() === pMonth && d.getFullYear() === pYear;
                });
                const pOverrides = overrides.filter(ov => ov.month === pMonth && ov.year === pYear);

                if (pIncomes.length === 0 && pExpenses.length === 0 && pOverrides.length === 0) {
                    // No activity, skip rollover prompt for this month
                    return;
                }

                // Calculate Balance for previous month
                const prevBreakdown = calculateDetailedAvailability(pYear, pMonth, {
                    extraIncomes,
                    expenses,
                    allocations,
                    recurringExpenses,
                    savings,
                    overrides,
                    rolloverIncomes, // MUST include rolloverIncomes to get cumulative balance
                    isClosed: false  // It's not closed yet, so we project savings
                });

                const balance = prevBreakdown.available;

                // Calculate Projected for current month (to help user decide)
                const currentMonthAvailable = calculateMonthAvailability(today.getFullYear(), today.getMonth(), {
                    extraIncomes,
                    expenses,
                    allocations,
                    recurringExpenses,
                    savings
                });

                // Only show if there is something to rollover (surplus or deficit)
                if (Math.abs(balance) > 0.01) {
                    setRolloverData({
                        year: pYear,
                        month: pMonth,
                        balance,
                        nextMonthAvailable: currentMonthAvailable,
                        unmaterializedFixed: prevBreakdown.income.unmaterializedFixed,
                        unmaterializedPending: prevBreakdown.expenses.unmaterializedPending
                    });
                    setShowRolloverModal(true);
                }
            }
        };

        // Small delay to ensure data is loaded? 
        // Better: depend on loading state if available, but for now just run
        if (extraIncomes.length > 0 || expenses.length > 0) {
            checkPreviousMonth();
        }
    }, [isMonthClosed, extraIncomes, expenses, allocations, savings]);



    // 4. Final Calculation using central logic
    const { fixedIncomes } = useIncome();
    const breakdown = useMemo(() => {
        return calculateDetailedAvailability(selectedYear, selectedMonth, {
            extraIncomes,
            fixedIncomes,
            expenses,
            allocations,
            recurringExpenses,
            overrides,
            savings,
            rolloverIncomes,
            isClosed: isSelectedMonthClosed,
            rolloverAction: selectedClosingAction
        });
    }, [extraIncomes, fixedIncomes, expenses, allocations, recurringExpenses, selectedMonth, selectedYear, overrides, savings, rolloverIncomes, isSelectedMonthClosed, selectedClosingAction]);

    // Use unified breakdown for numbers shown in the main cards
    const totalMonthIncome = breakdown.income.total;
    const totalMonthExpenses = breakdown.expenses.total;


    const isManualOverride = useMemo(() => {
        return overrides.some(o => o.year === selectedYear && o.month === selectedMonth && o.isManual);
    }, [overrides, selectedYear, selectedMonth]);

    const handlePaySettlement = async (card: any, cycle: SettlementCycle) => {
        if (!window.confirm(t('dashboard.settlementConfirmText').replace('{amount}', formatCurrency(cycle.total)))) return;

        await addExpense({
            description: `[LIQUIDACION] ${card.name} (${new Date(cycle.startDate).toLocaleDateString()} - ${new Date(cycle.endDate).toLocaleDateString()})`,
            amount: Math.round(cycle.total * 100) / 100,
            currency: 'EUR',
            date: Date.now(),
            categoryId: 'cat_loans',
            paymentMethod: { type: 'account', accountId: card.linkedAccountId },
            isFixed: false,
            status: 'paid'
        });
    }

    const handleDeleteRollovers = async () => {
        const msg = language === 'es'
            ? "¿Eliminar este remanente? Usa esto solo si el remanente es incorrecto o está duplicado."
            : "Delete this rollover? Use this only if the rollover is incorrect or duplicated.";

        if (!window.confirm(msg)) return;

        for (const id of breakdown.income.relevantRolloverIds) {
            await deleteIncome(id);
        }
    };

    // 5. General Summary Totals
    const bankBalance = accounts
        .filter(acc => acc.type === 'bank')
        .reduce((sum: number, acc: any) => sum + acc.balance, 0);

    const cashBalance = accounts
        .filter(acc => acc.type === 'cash')
        .reduce((sum: number, acc: any) => sum + acc.balance, 0);

    const piggyBanksTotal = (savings || [])
        .reduce((sum: number, goal: any) => sum + Number(goal.currentAmount || 0), 0);

    const locale = language === 'es' ? 'es-ES' : 'en-US';
    const monthName = new Date(selectedYear, selectedMonth).toLocaleString(locale, { month: 'long' });

    const availableToSpend = breakdown.available;
    const isNegativeBalance = availableToSpend < -0.01 && !isSelectedMonthClosed && !isAlertIgnored;

    const handleIgnoreAlert = (stopShowing: boolean) => {
        if (stopShowing) {
            localStorage.setItem(alertKey, 'true');
        }
        setIsAlertIgnored(true);
        setShowSavingsWithdrawal(false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {/* Liquidity Aid Alert */}
            {isNegativeBalance && (
                <div className="glass-panel" style={{
                    padding: '1.25rem',
                    background: 'linear-gradient(135deg, rgba(231, 76, 60, 0.1), rgba(231, 76, 60, 0.02))',
                    border: '1px solid rgba(231, 76, 60, 0.3)',
                    borderLeft: '4px solid var(--hue-danger)',
                    animation: 'slideDown 0.4s ease-out'
                }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        <div style={{
                            background: 'var(--hue-danger)',
                            color: 'white',
                            padding: '0.6rem',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <AlertTriangle size={24} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--hue-danger)', fontWeight: 700 }}>
                                {t('dashboard.negativeBalanceTitle')}
                            </h3>
                            <p style={{ margin: '0.4rem 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                                {t('dashboard.negativeBalanceDesc')}
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                <button
                                    onClick={() => setShowSavingsWithdrawal(true)}
                                    className="btn-primary"
                                    style={{
                                        background: 'var(--hue-danger)',
                                        padding: '0.5rem 1rem',
                                        fontSize: '0.85rem',
                                        border: 'none'
                                    }}
                                >
                                    {t('dashboard.negativeBalanceAction')}
                                </button>
                                <button
                                    onClick={() => handleIgnoreAlert(false)}
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid var(--card-border)',
                                        color: 'var(--text-main)',
                                        padding: '0.5rem 1rem',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: '0.85rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {t('dashboard.negativeBalanceIgnore')}
                                </button>
                                <button
                                    onClick={() => handleIgnoreAlert(true)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--text-muted)',
                                        padding: '0.5rem',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                        textDecoration: 'underline'
                                    }}
                                >
                                    {t('dashboard.negativeBalanceStop')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Monthly Availability (Main Card) */}
            <section className="glass-panel" style={{
                padding: '1.25rem',
                background: 'var(--bg-surface-elevated)',
                border: 'var(--card-border)'
            }}>
                <h2 style={{ textAlign: 'center', marginBottom: '1rem', fontSize: '1.4rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {t('dashboard.availableIn')} {monthName}
                </h2>
                <div style={{ textAlign: 'center', fontSize: '3rem', fontWeight: 800, color: availableToSpend >= 0 ? 'var(--color-success)' : 'var(--hue-danger)', position: 'relative' }}>
                    {formatCurrency(availableToSpend)}
                    {isManualOverride && (
                        <div style={{
                            position: 'absolute',
                            top: '-10px',
                            right: '10px',
                            fontSize: '0.7rem',
                            background: 'var(--hue-danger)',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 600,
                            textTransform: 'uppercase'
                        }}>
                            Manual
                        </div>
                    )}
                    <button
                        onClick={() => setShowBreakdown(true)}
                        style={{
                            position: 'absolute',
                            bottom: '0',
                            right: '0',
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '0.5rem',
                            opacity: 0.6
                        }}
                        title="Ver desglose"
                    >
                        <Info size={16} />
                    </button>
                </div>

                {breakdown.income.rollover !== 0 && (
                    <div style={{
                        marginTop: '0.5rem',
                        fontSize: '0.9rem',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                    }}>
                        <span>{t('dashboard.rollover')}:</span>
                        <span style={{ color: breakdown.income.rollover > 0 ? 'var(--color-success)' : 'var(--hue-danger)', fontWeight: 600 }}>
                            {formatCurrency(breakdown.income.rollover)}
                        </span>
                        {!isSelectedMonthClosed && (
                            <button
                                onClick={handleDeleteRollovers}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--hue-danger)',
                                    cursor: 'pointer',
                                    padding: '2px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    opacity: 0.5,
                                    transition: 'opacity 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
                                title={language === 'es' ? 'Eliminar remanente huérfano o incorrecto' : 'Delete orphaned or incorrect rollover'}
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <div>
                        <div>{t('dashboard.incomeMonth')}</div>
                        <div style={{ color: 'var(--color-success)', fontWeight: 600 }}>{formatCurrency(totalMonthIncome)}</div>
                    </div>
                    <div>
                        <div>{t('dashboard.expenseMonth')}</div>
                        <div style={{ color: 'var(--hue-danger)', fontWeight: 600 }}>{formatCurrency(totalMonthExpenses)}</div>
                    </div>
                </div>
            </section>

            {/* General Summary Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="glass-panel" style={{ padding: '0.75rem', textAlign: 'center', borderTop: accounts.find(a => a.type === 'bank' && a.isMain)?.color ? `3px solid ${accounts.find(a => a.type === 'bank' && a.isMain)?.color}` : 'var(--card-border)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '0.2rem' }}>{t('dashboard.bankBalance')}</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: accounts.find(a => a.type === 'bank' && a.isMain)?.color || 'var(--color-primary)' }}>{formatCurrency(bankBalance)}</div>
                </div>
                <div className="glass-panel" style={{ padding: '0.75rem', textAlign: 'center', borderTop: accounts.find(a => a.type === 'cash')?.color ? `3px solid ${accounts.find(a => a.type === 'cash')?.color}` : 'var(--card-border)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '0.2rem' }}>{t('dashboard.cashBalance')}</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: accounts.find(a => a.type === 'cash')?.color || 'var(--color-secondary)' }}>{formatCurrency(cashBalance)}</div>
                </div>
                <div className="glass-panel" style={{
                    padding: '0.75rem',
                    textAlign: 'center',
                    border: (piggyBanksTotal > (bankBalance + cashBalance)) ? '1px solid var(--hue-danger)' : 'var(--card-border)',
                    position: 'relative'
                }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '0.25rem' }}>{t('dashboard.piggyBanksBalance')}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--hue-warning)' }}>{formatCurrency(piggyBanksTotal)}</div>
                    {piggyBanksTotal > (bankBalance + cashBalance) && (
                        <div style={{
                            color: 'var(--hue-danger)',
                            fontSize: '0.65rem',
                            marginTop: '0.25rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.2rem'
                        }}>
                            <AlertCircle size={10} /> Inconsistencia de Liquidez
                        </div>
                    )}
                </div>
            </div>

            {/* Credit Card Settlements Section */}
            {cards.filter(c => c.type === 'credit').length > 0 && (
                <section className="glass-panel" style={{ padding: 'var(--space-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                        <CardIcon size={18} className="text-primary" />
                        <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-muted)' }}>
                            {t('dashboard.pendingSettlement')}
                        </h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {cards.filter(c => c.type === 'credit').map(card => {
                            const refDate = new Date(selectedYear, selectedMonth, Math.min(new Date().getDate(), 28)).getTime();
                            const cycles = getSettlementCycles(card, expenses, refDate);
                            const pendingCycle = cycles.find(c => c.type === 'previous' && !c.isPaid && c.total > 0);
                            const currentCycle = cycles.find(c => c.type === 'current');
                            const activeCycle = pendingCycle || currentCycle;

                            if (!activeCycle) return null;

                            return (
                                <div key={card.id} className="glass-panel" style={{
                                    padding: '1.5rem',
                                    background: 'var(--bg-surface-elevated)',
                                    borderRadius: 'var(--radius-lg)',
                                    border: 'var(--card-border)',
                                    borderLeft: `6px solid ${card.color || 'var(--color-primary)'}`,
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}>
                                    {/* Subtly tinted background accent */}
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        right: 0,
                                        width: '150px',
                                        height: '150px',
                                        background: `radial-gradient(circle at top right, ${card.color}15, transparent 70%)`,
                                        zIndex: 0
                                    }} />

                                    {/* Header Section */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}>
                                        <div>
                                            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
                                                Tarjeta de Crédito
                                            </div>
                                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: card.color }}>{card.name}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: pendingCycle ? 'var(--hue-danger)' : 'var(--text-main)' }}>
                                                {formatCurrency(activeCycle.total)}
                                            </div>
                                            {pendingCycle ? (
                                                <div style={{ color: 'var(--hue-danger)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                                                    {t('dashboard.pendingPayment')}
                                                </div>
                                            ) : (
                                                <div style={{ color: card.color || 'var(--color-primary-light)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', opacity: 0.9 }}>
                                                    {t('dashboard.currentCycle')}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Timeline Visualizer */}
                                    <div style={{
                                        position: 'relative',
                                        padding: '1rem 0 2rem 0',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        zIndex: 1
                                    }}>
                                        {/* Connecting Line */}
                                        <div style={{
                                            position: 'absolute',
                                            top: '2.4rem',
                                            left: '10%',
                                            right: '10%',
                                            height: '2px',
                                            background: 'rgba(255,255,255,0.05)',
                                            zIndex: 0
                                        }}>
                                            <div style={{
                                                width: pendingCycle ? '100%' : '50%',
                                                height: '100%',
                                                background: pendingCycle ? 'var(--hue-danger)' : card.color || 'var(--color-primary)',
                                                opacity: 0.3
                                            }} />
                                        </div>

                                        {/* Point 1: Inicio */}
                                        <div style={{ zIndex: 1, textAlign: 'center', width: '30%' }}>
                                            <div style={{
                                                width: '12px', height: '12px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', margin: '0 auto 0.75rem'
                                            }} />
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>INICIO</div>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                                                {new Date(activeCycle.startDate).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                                            </div>
                                        </div>

                                        {/* Point 2: Cierre */}
                                        <div style={{ zIndex: 1, textAlign: 'center', width: '30%' }}>
                                            <div style={{
                                                width: '12px', height: '12px', borderRadius: '50%',
                                                background: pendingCycle ? 'rgba(255,255,255,0.5)' : (card.color || 'var(--color-primary)'),
                                                margin: '0 auto 0.75rem',
                                                boxShadow: !pendingCycle ? `0 0 10px ${card.color || 'var(--color-primary)'}80` : 'none'
                                            }} />
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>CIERRE</div>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: !pendingCycle ? (card.color || 'var(--color-primary-light)') : 'inherit' }}>
                                                {new Date(activeCycle.endDate).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                                            </div>
                                        </div>

                                        {/* Point 3: Pago */}
                                        <div style={{ zIndex: 1, textAlign: 'center', width: '30%' }}>
                                            <div style={{
                                                width: '16px', height: '16px', borderRadius: '50%',
                                                border: '3px solid var(--bg-surface-elevated)',
                                                background: pendingCycle ? 'var(--hue-danger)' : 'rgba(255,255,255,0.1)',
                                                margin: '-2px auto 0.55rem',
                                                boxShadow: pendingCycle ? '0 0 15px var(--hue-danger)' : 'none'
                                            }} />
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{t('dashboard.paymentDate').toUpperCase()}</div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: pendingCycle ? 'var(--hue-danger)' : 'var(--text-accent)' }}>
                                                {new Date(activeCycle.paymentDate).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Banner */}
                                    {pendingCycle ? (
                                        <div style={{
                                            marginTop: '0.5rem',
                                            padding: '1rem',
                                            borderRadius: 'var(--radius-sm)',
                                            background: 'rgba(244, 67, 54, 0.1)',
                                            border: '1px solid rgba(244, 67, 54, 0.2)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            position: 'relative',
                                            zIndex: 1
                                        }}>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                                                La liquidación está lista para ser pagada.
                                            </div>
                                            <button
                                                onClick={() => handlePaySettlement(card, pendingCycle)}
                                                className="btn-primary"
                                                style={{
                                                    padding: '0.6rem 1.25rem',
                                                    fontSize: '0.85rem',
                                                    background: 'var(--hue-danger)',
                                                    borderColor: 'transparent',
                                                    boxShadow: '0 4px 12px rgba(244, 67, 54, 0.3)'
                                                }}
                                            >
                                                {t('dashboard.confirmPayment')}
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{
                                            marginTop: '0.5rem',
                                            padding: '0.75rem',
                                            borderRadius: 'var(--radius-sm)',
                                            background: 'rgba(255,255,255,0.03)',
                                            fontSize: '0.8rem',
                                            color: 'var(--text-muted)',
                                            textAlign: 'center',
                                            border: '1px dashed rgba(255,255,255,0.05)',
                                            position: 'relative',
                                            zIndex: 1
                                        }}>
                                            Periodo actual: {new Date(activeCycle.startDate).toLocaleDateString(locale)} - {new Date(activeCycle.endDate).toLocaleDateString(locale)}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {showRolloverModal && rolloverData && (
                <MonthRolloverModal
                    prevYear={rolloverData.year}
                    prevMonth={rolloverData.month}
                    finalBalance={rolloverData.balance}
                    nextMonthAvailable={rolloverData.nextMonthAvailable}
                    unmaterializedFixed={rolloverData.unmaterializedFixed}
                    unmaterializedPending={rolloverData.unmaterializedPending}
                    onClose={() => {
                        setShowRolloverModal(false);
                        hasDismissedRollover.current = true;
                    }}
                />
            )}

            {showBreakdown && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.85)',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 2000,
                    padding: '1rem'
                }}>
                    <div className="glass-panel" style={{
                        width: '95%',
                        maxWidth: '500px',
                        padding: '1.5rem',
                        position: 'relative',
                        animation: 'slideUp 0.3s ease-out',
                        background: 'var(--bg-surface-elevated)',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        <button
                            onClick={() => setShowBreakdown(false)}
                            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                            <X size={20} />
                        </button>

                        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Info size={20} className="text-primary" />
                            {t('dashboard.calculationBreakdown')}
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Income */}
                            <div style={{ padding: '1rem', background: 'rgba(46, 213, 115, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(46, 213, 115, 0.1)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-success)' }}>
                                    <span>Ingresos Totales</span>
                                    <span>{formatCurrency(breakdown.income.total)}</span>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingLeft: '0.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{t('dashboard.fixedReceived')}</span>
                                        <span>+ {formatCurrency(breakdown.income.confirmedFixed)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{t('dashboard.fixedProjected')}</span>
                                        <span>+ {formatCurrency(breakdown.income.projectedFixed)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{t('dashboard.extraReceived')}</span>
                                        <span>+ {formatCurrency(breakdown.income.extra)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{t('dashboard.rollover')}</span>
                                        <span>+ {formatCurrency(breakdown.income.rollover)}</span>
                                    </div>
                                    {breakdown.income.unmaterializedFixed > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--hue-danger)', fontWeight: 500, marginTop: '0.2rem' }}>
                                            <span>Ingresos Fijos No Materializados</span>
                                            <span>- {formatCurrency(breakdown.income.unmaterializedFixed)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Expenses */}
                            <div style={{ padding: '1rem', background: 'rgba(231, 76, 60, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(231, 76, 60, 0.1)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--hue-danger)' }}>
                                    <span>Gastos del Mes</span>
                                    <span>{formatCurrency(-breakdown.expenses.total)}</span>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingLeft: '0.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Pagados</span>
                                        <span>- {formatCurrency(breakdown.expenses.paid)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Pendientes Fijos</span>
                                        <span>- {formatCurrency(breakdown.expenses.pending)}</span>
                                    </div>
                                    {breakdown.expenses.unmaterializedPending > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-success)', fontWeight: 500, marginTop: '0.2rem' }}>
                                            <span>Gastos Fijos No Materializados</span>
                                            <span>+ {formatCurrency(breakdown.expenses.unmaterializedPending)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Savings */}
                            <div style={{ padding: '1rem', background: 'rgba(255, 175, 41, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 175, 41, 0.1)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--hue-warning)' }}>
                                    <span>Ahorros y Huchas</span>
                                    <span>{formatCurrency(-breakdown.savings.total)}</span>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingLeft: '0.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Aportaciones Realizadas</span>
                                        <span>- {formatCurrency(breakdown.savings.allocations)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Ahorro Mensual Proyectado</span>
                                        <span>- {formatCurrency(breakdown.savings.projected)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Adjustment */}
                            {breakdown.adjustment && (
                                <div style={{ padding: '1rem', background: 'rgba(52, 152, 219, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(52, 152, 219, 0.1)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--color-primary)' }}>
                                        <span>Ajuste Manual</span>
                                        <span>{breakdown.adjustment.targetAmount !== undefined ? 'Fijado' : formatCurrency(breakdown.adjustment.amount)}</span>
                                    </div>
                                    {breakdown.adjustment.targetAmount !== undefined && (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                            Has fijado el disponible final a {formatCurrency(breakdown.adjustment.targetAmount)}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Result */}
                            <div style={{ marginTop: '0.5rem', padding: '1rem', borderTop: '2px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Total Disponible</span>
                                <span style={{ fontWeight: 800, fontSize: '1.5rem', color: breakdown.available >= 0 ? 'var(--color-success)' : 'var(--hue-danger)' }}>
                                    {formatCurrency(breakdown.available)}
                                </span>
                            </div>
                        </div>

                        <button
                            className="btn-primary"
                            style={{ width: '100%', marginTop: '1.5rem' }}
                            onClick={() => setShowBreakdown(false)}
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}

            {showSavingsWithdrawal && (
                <PiggyBankAllocationModal
                    goalId="" // Selection mode
                    goalName=""
                    isVirtual={true}
                    initialAction="withdraw"
                    onClose={() => setShowSavingsWithdrawal(false)}
                />
            )}
        </div>
    );
};

export default FinanceSummary;
