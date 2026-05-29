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
import { LayoutDashboard, Settings as SettingsIcon, X, Calendar, Clock, TrendingUp, HelpCircle, PlusCircle, MinusCircle, PiggyBank, ArrowLeftRight, AlertCircle, Mail, Heart, RotateCcw } from 'lucide-react';

import { useFinance } from '../../contexts/FinanceContext';
const version = "1.1.5";
import RemnantDecisionModal from '../settings/RemnantDecisionModal';
import { useDateSelection } from '../../contexts/DateSelectionContext';
import EditTransactionModal from './EditTransactionModal';
import BalanceTransferModal from './BalanceTransferModal';
import type { Expense } from '../../types/finance';
import type { Income } from '../../types/income';

const Dashboard: React.FC = () => {
    const { pendingClosing, setPendingClosing, closings, accounts, cards, loading } = useFinance();

    const [currentView, setCurrentView] = useState<'dashboard' | 'settings'>('dashboard');
    const [settingsTab, setSettingsTab] = useState<'accounts' | 'savings' | 'recurring' | 'loans' | 'balance' | 'categories' | 'app' | 'about'>('accounts');
    const [isIncomeFormOpen, setIsIncomeFormOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
    const [isHuchaModalOpen, setIsHuchaModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [show30DayReminder, setShow30DayReminder] = useState(false);
    const [showChangelog, setShowChangelog] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    
    // Edit state
    const [editingTx, setEditingTx] = useState<Expense | Income | null>(null);
    const [editingType, setEditingType] = useState<'expense' | 'income'>('expense');

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const handleBack = (e: Event) => {
            if (e.defaultPrevented) return;

            if (editingTx) {
                e.preventDefault();
                setEditingTx(null);
            } else if (isIncomeFormOpen) {
                e.preventDefault();
                setIsIncomeFormOpen(false);
            } else if (isExpenseModalOpen) {
                e.preventDefault();
                setIsExpenseModalOpen(false);
            } else if (isRefundModalOpen) {
                e.preventDefault();
                setIsRefundModalOpen(false);
            } else if (isHuchaModalOpen) {
                e.preventDefault();
                setIsHuchaModalOpen(false);
            } else if (isTransferModalOpen) {
                e.preventDefault();
                setIsTransferModalOpen(false);
            } else if (show30DayReminder) {
                e.preventDefault();
                setShow30DayReminder(false);
            } else if (showChangelog) {
                e.preventDefault();
                setShowChangelog(false);
            } else if (currentView === 'settings') {
                e.preventDefault();
                setCurrentView('dashboard');
            }
        };

        window.addEventListener('app-back-pressed', handleBack);
        return () => window.removeEventListener('app-back-pressed', handleBack);
    }, [editingTx, isIncomeFormOpen, isExpenseModalOpen, isRefundModalOpen, isHuchaModalOpen, isTransferModalOpen, show30DayReminder, showChangelog, currentView]);

    useEffect(() => {
        if (loading) return;

        // 1. Install date checking
        let installDateStr = localStorage.getItem('pcshogar_install_date');
        if (!installDateStr) {
            installDateStr = Date.now().toString();
            localStorage.setItem('pcshogar_install_date', installDateStr);
        }
        const installTime = parseInt(installDateStr);
        const days = Math.floor((Date.now() - installTime) / (1000 * 60 * 60 * 24));
        
        const reminderDismissed = localStorage.getItem('pcshogar_reminder_dismissed') === 'true';
        if (days >= 30 && !reminderDismissed) {
            setShow30DayReminder(true);
        }

        // 2. Changelog checking
        const lastVersion = localStorage.getItem('pcshogar_last_version');
        const currentVersion = "1.1.5";
        
        if (!lastVersion) {
            const isClean = accounts.length === 0 && cards.length === 0;
            if (isClean) {
                localStorage.setItem('pcshogar_last_version', currentVersion);
            } else {
                setShowChangelog(true);
            }
        } else if (lastVersion !== currentVersion) {
            setShowChangelog(true);
        }
    }, [loading, accounts.length, cards.length]);

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
                            onClick={() => setIsRefundModalOpen(true)}
                            style={{ ...actionButtonStyle, background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' }}
                        >
                            <RotateCcw size={20} />
                            {isMobile ? 'Devolución' : 'Nueva Devolución'}
                        </button>
                        <button 
                            onClick={() => { setSettingsTab('savings'); setCurrentView('settings'); }}
                            style={{ ...actionButtonStyle, background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)' }}
                        >
                            <PiggyBank size={20} />
                            {isMobile ? 'Huchas' : 'Ahorrar'}
                        </button>
                        <button 
                            onClick={() => setIsTransferModalOpen(true)}
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

            {isRefundModalOpen && (
                <ExpenseForm isRefund={true} onClose={() => setIsRefundModalOpen(false)} />
            )}

            {isIncomeFormOpen && (
                <IncomeForm onClose={() => setIsIncomeFormOpen(false)} />
            )}

            {isTransferModalOpen && (
                <BalanceTransferModal onClose={() => setIsTransferModalOpen(false)} />
            )}

            {show30DayReminder && (
                <div className="modal-overlay" onClick={() => {
                    localStorage.setItem('pcshogar_reminder_dismissed', 'true');
                    setShow30DayReminder(false);
                }}>
                    <div className="modal-container glass-panel" style={{ padding: '2.5rem 2rem', maxWidth: '440px', width: '95%', textAlign: 'center', position: 'relative' }} onClick={e => e.stopPropagation()}>
                        <div style={{
                            width: '70px',
                            height: '70px',
                            margin: '0 auto 1.5rem',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                            borderRadius: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 10px 20px rgba(29, 78, 216, 0.3)'
                        }}>
                            <HelpCircle size={36} color="white" />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem', color: 'white' }}>
                            ¿Cómo va tu experiencia?
                        </h2>
                        <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: 'rgba(255,255,255,0.7)', marginBottom: '2rem' }}>
                            ¡Llevas más de 30 días usando PCS Hogar! Si tienes alguna duda, sugerencia de mejora o has detectado algún problema, nos encantaría escucharte. Puedes contactarnos haciendo clic en el botón de sugerencias.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <button 
                                onClick={() => {
                                    const subject = encodeURIComponent('Sugerencia app PCSHogar');
                                    const mailtoUrl = `mailto:yoayudo2020@gmail.com?subject=${subject}`;
                                    window.open(mailtoUrl, '_system');
                                }}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '10px',
                                    background: '#1e2028',
                                    color: 'white',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    fontWeight: 600,
                                    fontSize: '0.95rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    boxSizing: 'border-box'
                                }}
                            >
                                <Mail size={18} /> Enviar sugerencia por email
                            </button>
                            <button 
                                onClick={() => {
                                    const paypalUrl =
                                        'https://www.paypal.com/donate/?business=pablopcs%40hotmail.com' +
                                        '&currency_code=EUR' +
                                        '&item_name=Invita%20a%20un%20caf%C3%A9%20-%20PCS%20Hogar';
                                    window.open(paypalUrl, '_system');
                                }}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '10px',
                                    background: 'linear-gradient(135deg, #ec4899 0%, #d946ef 100%)',
                                    color: 'white',
                                    border: 'none',
                                    fontWeight: 700,
                                    fontSize: '0.95rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    boxShadow: '0 4px 15px rgba(236, 72, 153, 0.3)',
                                    boxSizing: 'border-box'
                                }}
                            >
                                <Heart size={16} fill="white" color="white" /> Aportar para servidores (PayPal)
                            </button>
                        </div>
                        <button 
                            onClick={() => {
                                localStorage.setItem('pcshogar_reminder_dismissed', 'true');
                                setShow30DayReminder(false);
                            }}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'rgba(255, 255, 255, 0.4)',
                                textDecoration: 'underline',
                                fontSize: '0.85rem',
                                cursor: 'pointer'
                            }}
                        >
                            Cerrar y no volver a mostrar
                        </button>
                    </div>
                </div>
            )}

             {showChangelog && (
                <div className="modal-overlay" onClick={() => {
                    localStorage.setItem('pcshogar_last_version', '1.1.5');
                    setShowChangelog(false);
                }}>
                    <div className="modal-container glass-panel" style={{ padding: '2.5rem 2rem', maxWidth: '460px', width: '95%', textAlign: 'center', position: 'relative' }} onClick={e => e.stopPropagation()}>
                        <div style={{
                            width: '70px',
                            height: '70px',
                            margin: '0 auto 1.5rem',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            borderRadius: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 10px 20px rgba(16, 185, 129, 0.3)'
                        }}>
                            <TrendingUp size={36} color="white" />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'white' }}>
                            ¡Actualizado a la v1.1.5!
                        </h2>
                        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem' }}>
                            Resumen de las mejoras y novedades
                        </p>
                        
                        <div style={{ 
                            textAlign: 'left', 
                            background: 'rgba(0,0,0,0.2)', 
                            padding: '1.25rem', 
                            borderRadius: '12px', 
                            border: '1px solid rgba(255,255,255,0.05)',
                            fontSize: '0.88rem',
                            lineHeight: '1.5',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                            color: 'rgba(255,255,255,0.8)',
                            marginBottom: '2rem'
                        }}>
                            <div>
                                <strong style={{ color: '#38bdf8' }}>🔄 Ahorro Automático por Ingreso:</strong>
                                <div style={{ color: 'rgba(255,255,255,0.6)', marginLeft: '1.2rem', fontSize: '0.82rem' }}>
                                    Vincula tus huchas a tus plantillas de ingresos fijos (como la nómina) para ahorrar de forma automática al confirmar el cobro.
                                </div>
                            </div>
                            <div>
                                <strong style={{ color: '#10b981' }}>📊 Correcciones en Disponible:</strong>
                                <div style={{ color: 'rgba(255,255,255,0.6)', marginLeft: '1.2rem', fontSize: '0.82rem' }}>
                                    Solucionado el error de doble contabilización de huchas y las desviaciones de disponible causadas por devoluciones pendientes.
                                </div>
                            </div>
                            <div>
                                <strong style={{ color: '#fbbf24' }}>↩️ Devoluciones Profesionales:</strong>
                                <div style={{ color: 'rgba(255,255,255,0.6)', marginLeft: '1.2rem', fontSize: '0.82rem' }}>
                                    Botón dedicado de devolución desde el dashboard, con importes positivos en la lista de movimientos y rollover automático para devoluciones pendientes.
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={() => {
                                localStorage.setItem('pcshogar_last_version', '1.1.5');
                                setShowChangelog(false);
                            }}
                            style={{
                                width: '100%',
                                padding: '14px',
                                borderRadius: '12px',
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                fontWeight: 700,
                                fontSize: '1.05rem',
                                cursor: 'pointer',
                                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                                boxSizing: 'border-box'
                            }}
                        >
                            ¡Entendido, a disfrutar!
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;

