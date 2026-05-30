import React, { useState } from 'react';
import IncomeForm from '../income/IncomeForm';
import IncomeList from '../income/IncomeList';
import ExpenseForm from '../expenses/ExpenseForm';
import ExpenseList from '../expenses/ExpenseList';
import FinanceSummary from './FinanceSummary';
import SettingsView from '../settings/SettingsView';
import ExpenseCategoryChart from '../analytics/ExpenseCategoryChart';
import YearlyFinancialChart from '../analytics/YearlyFinancialChart';
import DateSelector from '../common/DateSelector';
import { LayoutDashboard, Settings as SettingsIcon, PlusCircle, MinusCircle, X, PiggyBank, ArrowRightLeft } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import PiggyBankAllocationModal from '../savings/PiggyBankAllocationModal';
import TransferForm from '../accounts/TransferForm';

const Dashboard: React.FC = () => {
    const { t } = useLanguage();
    const [currentView, setCurrentView] = useState<'dashboard' | 'settings'>('dashboard');
    const [showIncomeForm, setShowIncomeForm] = useState(false);
    const [showExpenseForm, setShowExpenseForm] = useState(false);
    const [showSavingsForm, setShowSavingsForm] = useState(false);
    const [showTransferForm, setShowTransferForm] = useState(false);
    const [incomeFormType, setIncomeFormType] = useState<'fixed' | 'extra'>('fixed');

    return (
        <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: 'var(--space-sm)',
            paddingBottom: 'calc(var(--safe-area-bottom, 0px) + 6rem)',
            minHeight: '100%'
        }}>


            {/* Header / Navigation */}
            <header className="responsive-flex-header" style={{
                marginBottom: '1rem',
                padding: 'var(--space-sm)',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: 'var(--card-border)',
                backdropFilter: 'blur(var(--glass-blur))'
            }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <h1 style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        background: 'linear-gradient(to right, var(--color-primary), var(--color-secondary))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        margin: 0
                    }}>
                        {t('dashboard.appTitle')}
                    </h1>
                    <span style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: 500 }}>v{__APP_VERSION__}</span>
                </div>

                <nav className="mobile-stack" style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={() => setCurrentView('dashboard')}
                        className="mobile-full-width"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1rem',
                            background: currentView === 'dashboard' ? 'var(--nav-btn-active-bg)' : 'transparent',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            color: currentView === 'dashboard' ? 'var(--nav-btn-active-text)' : 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 500
                        }}
                    >
                        <LayoutDashboard size={18} />
                        {t('menu.dashboard')}
                    </button>
                    <button
                        onClick={() => setCurrentView('settings')}
                        className="mobile-full-width"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1rem',
                            background: currentView === 'settings' ? 'var(--nav-btn-active-bg)' : 'transparent',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            color: currentView === 'settings' ? 'var(--nav-btn-active-text)' : 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 500
                        }}
                    >
                        <SettingsIcon size={18} />
                        {t('menu.settings')}
                    </button>
                </nav>
            </header>


            {/* Content Area */}
            {currentView === 'dashboard' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <DateSelector />

                    {/* Dashboard Toolbar - High Accessibility Actions */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                        gap: '0.75rem',
                        width: '100%',
                        padding: '0.75rem',
                        background: 'var(--bg-surface-elevated)',
                        borderRadius: 'var(--radius-md)',
                        border: 'var(--card-border)',
                        boxShadow: 'var(--card-shadow)'
                    }}>
                        <button
                            onClick={() => { setShowExpenseForm(true); setShowIncomeForm(false); setShowSavingsForm(false); setShowTransferForm(false); }}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                                padding: '1rem 0.5rem',
                                background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                                border: 'none', borderRadius: 'var(--radius-md)',
                                color: 'white', fontWeight: 700, cursor: 'pointer',
                                fontSize: '0.95rem',
                                gridColumn: 'span 2',
                                boxShadow: '0 4px 15px rgba(231, 76, 60, 0.3)',
                                transition: 'transform 0.2s'
                            }}
                        >
                            <MinusCircle size={20} />
                            {t('common.expense')}
                        </button>
                        <button
                            onClick={() => { setIncomeFormType('extra'); setShowIncomeForm(true); setShowExpenseForm(false); setShowSavingsForm(false); setShowTransferForm(false); }}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                padding: '0.8rem 0.5rem',
                                background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                                border: 'none', borderRadius: 'var(--radius-sm)',
                                color: 'white', fontWeight: 600, cursor: 'pointer',
                                fontSize: '0.85rem',
                                boxShadow: '0 2px 10px rgba(39, 174, 96, 0.2)'
                            }}
                        >
                            <PlusCircle size={18} />
                            Ingreso Extra
                        </button>
                        <button
                            onClick={() => { setShowSavingsForm(true); setShowIncomeForm(false); setShowExpenseForm(false); setShowTransferForm(false); }}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                padding: '0.8rem 0.5rem',
                                background: 'linear-gradient(135deg, #f39c12 0%, #f1c40f 100%)',
                                border: 'none', borderRadius: 'var(--radius-sm)',
                                color: 'white', fontWeight: 600, cursor: 'pointer',
                                fontSize: '0.85rem',
                                boxShadow: '0 2px 10px rgba(243, 156, 18, 0.2)'
                            }}
                        >
                            <PiggyBank size={18} />
                            Ahorrar
                        </button>
                        <button
                            onClick={() => { setShowTransferForm(true); setShowIncomeForm(false); setShowExpenseForm(false); setShowSavingsForm(false); }}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                padding: '0.8rem 0.5rem',
                                background: 'linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%)',
                                border: 'none', borderRadius: 'var(--radius-sm)',
                                color: 'white', fontWeight: 600, cursor: 'pointer',
                                fontSize: '0.85rem',
                                boxShadow: '0 2px 10px rgba(52, 152, 219, 0.2)'
                            }}
                        >
                            <ArrowRightLeft size={18} />
                            Traspaso
                        </button>
                    </div>

                    {showIncomeForm && (
                        <div className="glass-panel" style={{ padding: 'var(--space-md)', animation: 'fadeIn 0.3s ease', border: '2px solid var(--color-primary)' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                                <button onClick={() => setShowIncomeForm(false)} className="btn-icon">
                                    <X size={20} />
                                </button>
                            </div>
                            <IncomeForm initialType={incomeFormType} restrictedType="extra" onClose={() => setShowIncomeForm(false)} />
                        </div>
                    )}

                    {showExpenseForm && (
                        <div className="glass-panel" style={{ padding: 'var(--space-md)', animation: 'fadeIn 0.3s ease', border: '2px solid var(--hue-danger)' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                                <button onClick={() => setShowExpenseForm(false)} className="btn-icon">
                                    <X size={20} />
                                </button>
                            </div>
                            <ExpenseForm onClose={() => setShowExpenseForm(false)} />
                        </div>
                    )}

                    {showTransferForm && (
                        <div className="glass-panel" style={{ padding: 'var(--space-md)', animation: 'fadeIn 0.3s ease', border: '2px solid var(--color-secondary)' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                                <button onClick={() => setShowTransferForm(false)} className="btn-icon">
                                    <X size={20} />
                                </button>
                            </div>
                            <TransferForm onClose={() => setShowTransferForm(false)} />
                        </div>
                    )}

                    <FinanceSummary />

                    {/* Charts Section */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1.25rem' }}>
                        <YearlyFinancialChart />
                        <ExpenseCategoryChart />
                    </div>



                    {showSavingsForm && (
                        <PiggyBankAllocationModal
                            goalId="" // Empty string to trigger selection mode
                            goalName=""
                            isVirtual={true}
                            onClose={() => setShowSavingsForm(false)}
                        />
                    )}

                    {/* Recent Transactions area */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '1.25rem' }}>
                        <div>
                            <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>{t('dashboard.lastIncomes')}</h3>
                            <IncomeList showFixed={false} />
                        </div>
                        <div>
                            <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>{t('dashboard.lastExpenses')}</h3>
                            <ExpenseList />
                        </div>
                    </div>
                </div>
            ) : (
                <SettingsView />
            )}
        </div>
    );
};

export default Dashboard;
