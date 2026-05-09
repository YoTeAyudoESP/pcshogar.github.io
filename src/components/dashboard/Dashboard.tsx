import React, { useState, useEffect } from 'react';
import IncomeForm from '../income/IncomeForm';
import IncomeList from '../income/IncomeList';
import ExpenseForm from '../expenses/ExpenseForm';
import ExpenseList from '../expenses/ExpenseList';
import FinanceSummary from './FinanceSummary';
import PendingActionsWidget from './PendingActionsWidget';
import FinanceGlobalSummary from './FinanceGlobalSummary';
import CreditCardSettlement from './CreditCardSettlement';
import SettingsView from '../settings/SettingsView';
import ExpenseCategoryChart from '../analytics/ExpenseCategoryChart';
import YearlyFinancialChart from '../analytics/YearlyFinancialChart';
import DateSelector from '../common/DateSelector';
import { LayoutDashboard, Settings as SettingsIcon, X, Calendar, Clock, TrendingUp, HelpCircle, PlusCircle, MinusCircle, PiggyBank, ArrowLeftRight, AlertCircle } from 'lucide-react';

import { useFinance } from '../../contexts/FinanceContext';
const version = "0.7.1";
import RemnantDecisionModal from '../settings/RemnantDecisionModal';
import { useDateSelection } from '../../contexts/DateSelectionContext';
import EditTransactionModal from './EditTransactionModal';
import type { Expense } from '../../types/finance';
import type { Income } from '../../types/income';

const Dashboard: React.FC = () => {
    const { pendingClosing, setPendingClosing, closings } = useFinance();

    const [currentView, setCurrentView] = useState<'dashboard' | 'settings'>('dashboard');
    const [settingsTab, setSettingsTab] = useState<'accounts' | 'savings' | 'recurring' | 'loans' | 'balance' | 'categories' | 'app' | 'about'>('accounts');
    const [isIncomeFormOpen, setIsIncomeFormOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isHuchaModalOpen, setIsHuchaModalOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    
    // Edit state
    const [editingTx, setEditingTx] = useState<Expense | Income | null>(null);
    const [editingType, setEditingType] = useState<'expense' | 'income'>('expense');

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const actionButtonStyle: React.CSSProperties = {
        flex: 1,
        minWidth: isMobile ? 'calc(50% - 5px)' : '140px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        padding: '1.2rem 1rem',
        borderRadius: '16px',
        border: 'none',
        color: 'white',
        fontWeight: 700,
        fontSize: '1rem',
        cursor: 'pointer',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '0.5rem 12px' : '1rem', paddingBottom: '5rem', overflowX: 'hidden' }}>
            {/* Header Title with Version */}
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                marginBottom: '1.5rem',
                justifyContent: isMobile ? 'center' : 'flex-start'
            }}>
                <h1 style={{
                    fontSize: isMobile ? '1.5rem' : '2.1rem',
                    fontWeight: 800,
                    color: 'white',
                    letterSpacing: '-0.02em',
                    margin: 0
                }}>
                    Economía Doméstica
                </h1>
                <span style={{ 
                    fontSize: '0.85rem', 
                    color: 'rgba(255, 255, 255, 0.4)', 
                    fontWeight: 600,
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    marginTop: '4px'
                }}>
                    v{version}
                </span>
            </div>

            {/* View Switcher Navigation */}
            <div style={{ 
                display: 'flex', 
                gap: '8px', 
                marginBottom: isMobile ? '1.5rem' : '2rem',
                justifyContent: isMobile ? 'center' : 'flex-start'
            }}>
                <button
                    onClick={() => setCurrentView('dashboard')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '10px 16px',
                        background: currentView === 'dashboard' ? 'rgba(255,255,255,0.1)' : 'transparent',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        color: currentView === 'dashboard' ? 'white' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 600
                    }}
                >
                    <LayoutDashboard size={18} />
                    Dashboard
                </button>
                <button
                    onClick={() => setCurrentView('settings')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '10px 16px',
                        background: currentView === 'settings' ? 'rgba(255,255,255,0.1)' : 'transparent',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        color: currentView === 'settings' ? 'white' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 600
                    }}
                >
                    <SettingsIcon size={18} />
                    Gestión y Ajustes
                </button>
            </div>

            {/* Pending Closing Discreet Banner */}
            {closings.find(c => c.status === 'pending') && !pendingClosing && (
                <div 
                    onClick={() => setPendingClosing(closings.find(c => c.status === 'pending')!)}
                    style={{
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.75rem 1rem',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        color: '#f59e0b',
                        fontWeight: 600,
                        fontSize: '0.9rem'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertCircle size={18} />
                        Tienes un cierre de mes pendiente de decisión
                    </div>
                    <span style={{ textDecoration: 'underline', fontSize: '0.8rem' }}>Decidir ahora</span>
                </div>
            )}

            {/* Content Area */}
            {currentView === 'dashboard' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <DateSelector />

                    {/* Action Palette */}
                    <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: isMobile ? '10px' : '1rem',
                        marginBottom: '1rem' 
                    }}>
                        <button 
                            onClick={() => setIsExpenseModalOpen(true)}
                            style={{ ...actionButtonStyle, background: 'linear-gradient(135deg, #f43f5e 0%, #ef4444 100%)' }}
                        >
                            <MinusCircle size={20} />
                            {isMobile ? 'Gasto' : 'Nuevo Gasto'}
                        </button>
                        <button 
                            onClick={() => setIsIncomeFormOpen(!isIncomeFormOpen)}
                            style={{ ...actionButtonStyle, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                        >
                            <PlusCircle size={20} />
                            {isMobile ? 'Ingreso' : 'Nuevo Ingreso'}
                        </button>
                        <button 
                            onClick={() => { setSettingsTab('savings'); setCurrentView('settings'); }}
                            style={{ ...actionButtonStyle, background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)' }}
                        >
                            <PiggyBank size={20} />
                            {isMobile ? 'Huchas' : 'Ahorrar'}
                        </button>
                        <button 
                            onClick={() => { setSettingsTab('accounts'); setCurrentView('settings'); }}
                            style={{ ...actionButtonStyle, background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)' }}
                        >
                            <ArrowLeftRight size={20} />
                            {isMobile ? 'Traspaso' : 'Transferencia'}
                        </button>
                    </div>

                    <FinanceSummary />
                    <PendingActionsWidget />
                    <FinanceGlobalSummary />
                    <CreditCardSettlement />

                    {/* Income Modal Rendering handled at root */}

                    {/* Charts Section */}
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(400px, 1fr))', 
                        gap: '1.5rem' 
                    }}>
                        <YearlyFinancialChart />
                        <ExpenseCategoryChart />
                    </div>

                    {/* Recent Transactions area */}
                    <div style={{ 
                        marginTop: '2rem',
                        display: 'grid', 
                        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
                        gap: '2.5rem' 
                    }}>
                        <div>
                            <h2 style={{ fontSize: '1.7rem', fontWeight: 800, marginBottom: '1.5rem', color: '#ffffff' }}>Ingresos Cobrados</h2>
                            <IncomeList onEdit={(income) => { setEditingTx(income); setEditingType('income'); }} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.7rem', fontWeight: 800, marginBottom: '1.5rem', color: '#ffffff' }}>Últimos Gastos</h2>
                            <ExpenseList onEdit={(expense) => { setEditingTx(expense); setEditingType('expense'); }} />
                        </div>
                    </div>
                </div>
            ) : (
                <SettingsView initialTab={settingsTab} />
            )}

            {/* Modals */}
            {pendingClosing && (
                <RemnantDecisionModal 
                    closing={pendingClosing} 
                    onClose={() => setPendingClosing(null)} 
                />
            )}
            
            {editingTx && editingType === 'expense' && (
                <EditTransactionModal 
                    transaction={editingTx}
                    type="expense"
                    onClose={() => setEditingTx(null)}
                />
            )}
            
            {editingTx && editingType === 'income' && (
                <IncomeForm 
                    initialData={editingTx as Income}
                    onClose={() => setEditingTx(null)}
                />
            )}

            {isExpenseModalOpen && (
                <ExpenseForm onClose={() => setIsExpenseModalOpen(false)} />
            )}

            {isIncomeFormOpen && (
                <IncomeForm onClose={() => setIsIncomeFormOpen(false)} />
            )}
        </div>
    );
};

export default Dashboard;
