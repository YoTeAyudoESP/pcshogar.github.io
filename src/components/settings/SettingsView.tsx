import { useTranslation } from '../../hooks/useTranslation';
import React, { useState, useEffect, useRef } from 'react';
import AccountList from '../accounts/AccountList';
import AccountForm from '../accounts/AccountForm';
import CardList from '../accounts/CardList';
import CardForm from '../accounts/CardForm';
import PiggyBankList from '../savings/PiggyBankList';
import PiggyBankForm from '../savings/PiggyBankForm';
import LoanList from '../loans/LoanList';
import LoanForm from '../loans/LoanForm';
import LoanChart from '../loans/LoanChart';
import FixedMovementsView from './FixedMovementsView';
import BalanceAdjustmentView from './BalanceAdjustmentView';
import CategoryManagementView from './CategoryManagementView';
import AppSettingsView from './AppSettingsView';
import UserManagementView from './UserManagementView';
import { useFinance } from '../../contexts/FinanceContext';
import { useToast } from '../../contexts/ToastContext';
import { useAppSettings } from '../../contexts/AppSettingsContext';
import versionInfo from '../../../public/version.json';
const version = versionInfo.version;
// Browser plugin removed: manual opens in-app via window.location.href
import type { Account, CreditCard, RecurringExpense, SavingGoal, Loan } from '../../types/finance';
import { 
    Wallet, 
    PiggyBank, 
    CalendarClock, 
    Landmark, 
    RefreshCw, 
    Tag, 
    Monitor, 
    Heart, 
    Settings,
    FileJson,
    Check,
    X,
    Plus,
    BookOpen,
    Coffee,
    MessageSquare,
    Users
} from 'lucide-react';
import SavingsView from '../savings/SavingsView';

interface SettingsViewProps {
    initialTab?: 'accounts' | 'savings' | 'recurring' | 'loans' | 'balance' | 'categories' | 'app' | 'about' | 'users';
}

const SettingsView: React.FC<SettingsViewProps> = ({ initialTab = 'accounts' }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<any>(initialTab);
    const { showToast } = useToast();
    const { activeProfile } = useAppSettings();
    const isPrincipal = activeProfile?.id === 'prof_default';
    
    const handleOpenManual = () => {
        // In Electron: open the bundled manual in the system default browser via IPC.
        // In web/Android: navigate in-app to the bundled manual.html.
        const isElectron = !!(window as any).require;
        if (isElectron) {
            try {
                const { ipcRenderer } = (window as any).require('electron');
                ipcRenderer.invoke('open-manual');
            } catch {
                window.open('manual.html', '_blank');
            }
        } else {
            window.location.href = '/manual.html';
        }
    };

    const handlePayPal = () => {
        const paypalUrl = 'https://www.paypal.me/pherba/5';
        window.open(paypalUrl, '_system');
    };

    const handleSuggestion = () => {
        const subject = encodeURIComponent('Sugerencia app PCSHogar');
        const mailtoUrl = `mailto:yoayudo2020@gmail.com?subject=${subject}`;
        window.open(mailtoUrl, '_system');
    };
    const { 
        updateAccount, addAccount, 
        updateCard, addCard, 
        addSavingGoal, addRecurringExpense,
        importData 
    } = useFinance();

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    const [showAccountForm, setShowAccountForm] = useState(false);
    const [showCashForm, setShowCashForm] = useState(false);
    const [showCardForm, setShowCardForm] = useState(false);

    // Edit states
    const [editingAccount, setEditingAccount] = useState<Account | undefined>(undefined);
    const [editingCard, setEditingCard] = useState<CreditCard | undefined>(undefined);
    const [editingSaving, setEditingSaving] = useState<SavingGoal | undefined>(undefined);
    const [editingLoan, setEditingLoan] = useState<Loan | undefined>(undefined);
    const [isAddingLoan, setIsAddingLoan] = useState(false);

    useEffect(() => {
        const handleBack = (e: Event) => {
            if (e.defaultPrevented) return;

            if (showAccountForm) {
                e.preventDefault();
                setShowAccountForm(false);
                setEditingAccount(undefined);
            } else if (showCashForm) {
                e.preventDefault();
                setShowCashForm(false);
                setEditingAccount(undefined);
            } else if (showCardForm) {
                e.preventDefault();
                setShowCardForm(false);
                setEditingCard(undefined);
            } else if (isAddingLoan || editingLoan) {
                e.preventDefault();
                setIsAddingLoan(false);
                setEditingLoan(undefined);
            }
        };

        document.addEventListener('app-back-pressed', handleBack);
        return () => document.removeEventListener('app-back-pressed', handleBack);
    }, [showAccountForm, showCashForm, showCardForm, isAddingLoan, editingLoan]);
    const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleEditAccount = (acc: Account) => {
        setEditingAccount(acc);
        if (acc.type === 'cash') {
            setShowCashForm(true);
        } else {
            setShowAccountForm(true);
        }
    };

    const handleEditCard = (card: CreditCard) => {
        setEditingCard(card);
        setShowCardForm(true);
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Check if it's a JSON file
            const fileName = file.name.toLowerCase();
            if (fileName.endsWith('.json') || file.type === 'application/json') {
                setSelectedImportFile(file);
            } else {
                showToast('Por favor, selecciona un archivo .json válido.', 'error');
            }
        }
        // Small timeout to allow state to settle before clearing input value
        setTimeout(() => {
            if (event.target) event.target.value = '';
        }, 100);
    };

    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    const confirmImport = async () => {
        if (!selectedImportFile) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = JSON.parse(e.target?.result as string);
                await importData(content);
                showToast('Datos importados con éxito.', 'success');
                setSelectedImportFile(null);
            } catch (err) {
                showToast('Error al procesar el archivo JSON.', 'error');
                console.error(err);
            }
        };
        reader.readAsText(selectedImportFile);
    };

    const cancelImport = () => {
        setSelectedImportFile(null);
    };

    const tabs = [
        { id: 'accounts', label: t('Cuentas y Tarjetas'), icon: Wallet },
        { id: 'savings', label: t('Huchas'), icon: PiggyBank },
        { id: 'recurring', label: t('Movimientos Fijos'), icon: CalendarClock },
        { id: 'loans', label: 'Préstamos', icon: Landmark },
        { id: 'categories', label: t('Categorías'), icon: Tag },
        { id: 'balance', label: t('Ajustes Saldo'), icon: RefreshCw },
        { id: 'app', label: t('Aplicación'), icon: Monitor },
        ...(isPrincipal ? [{ id: 'users', label: t('Gestión de Usuarios'), icon: Users }] : []),
        { id: 'about', label: t('Acerca de'), icon: Heart },
    ] as const;

    return (
        <div className="glass-panel" style={{ padding: 'var(--space-sm) 0', minHeight: '80vh', border: 'none', background: 'transparent' }}>
            <div className="horizontal-scroll" style={{ 
                display: 'flex', 
                gap: '0.5rem', 
                marginBottom: '1.5rem', 
                padding: '0.25rem',
                scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling: 'touch'
            }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.6rem 1rem',
                            background: activeTab === tab.id ? '#6366f1' : 'var(--panel-bg-2)',
                            border: '1px solid var(--panel-bg-3)',
                            borderRadius: '100px',
                            color: 'var(--text-main)',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            boxShadow: activeTab === tab.id ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none',
                        }}
                    >
                        <tab.icon size={14} strokeWidth={2.5} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="settings-content">
                {activeTab === 'accounts' && (
                    <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '2.5rem' 
                    }}>
                        {/* Accounts Section */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1.25rem', margin: 0, opacity: 0.9 }}>Cuentas Bancarias</h3>
                                {!showAccountForm && (
                                    <button 
                                        onClick={() => { setEditingAccount(undefined); setShowAccountForm(true); }}
                                        style={{ 
                                            background: 'var(--color-primary)', 
                                            color: 'var(--text-main)', 
                                            border: 'none', 
                                            padding: '0.6rem 1.2rem', 
                                            borderRadius: '0.75rem',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >+ Nueva Cuenta</button>
                                )}
                            </div>
                            
                            {showAccountForm ? (
                                <AccountForm
                                    editingAccount={editingAccount}
                                    onCancelEdit={() => setShowAccountForm(false)}
                                    onClose={() => setShowAccountForm(false)}
                                    defaultType="bank"
                                    hideTypeSelector={true}
                                />
                            ) : (
                                <AccountList onEdit={handleEditAccount} filterType="bank" />
                            )}
                        </div>

                        {/* Cash Wallets Section */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1.25rem', margin: 0, opacity: 0.9 }}>Carteras de Efectivo</h3>
                                {!showCashForm && (
                                    <button 
                                        onClick={() => { setEditingAccount(undefined); setShowCashForm(true); }}
                                        style={{ 
                                            background: 'var(--color-success)', 
                                            color: 'var(--text-main)', 
                                            border: 'none', 
                                            padding: '0.6rem 1.2rem', 
                                            borderRadius: '0.75rem',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >+ Nueva Cartera</button>
                                )}
                            </div>
                            
                            {showCashForm ? (
                                <AccountForm
                                    editingAccount={editingAccount}
                                    onCancelEdit={() => setShowCashForm(false)}
                                    onClose={() => setShowCashForm(false)}
                                    defaultType="cash"
                                    hideTypeSelector={true}
                                />
                            ) : (
                                <AccountList onEdit={handleEditAccount} filterType="cash" />
                            )}
                        </div>

                        {/* Cards Section */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1.25rem', margin: 0, opacity: 0.9 }}>Tarjetas Bancarias</h3>
                                {!showCardForm && (
                                    <button 
                                        onClick={() => { setEditingCard(undefined); setShowCardForm(true); }}
                                        style={{ 
                                            background: '#EC4899', 
                                            color: 'var(--text-main)', 
                                            border: 'none', 
                                            padding: '0.6rem 1.2rem', 
                                            borderRadius: '0.75rem',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >+ Nueva Tarjeta</button>
                                )}
                            </div>

                            {showCardForm ? (
                                <CardForm
                                    editingCard={editingCard}
                                    onCancelEdit={() => setShowCardForm(false)}
                                    onClose={() => setShowCardForm(false)}
                                />
                            ) : (
                                <CardList onEdit={handleEditCard} />
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'savings' && (
                    <SavingsView />
                )}

                {activeTab === 'loans' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <LoanChart />
                        
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                            <button 
                                onClick={() => { setEditingLoan(undefined); setIsAddingLoan(true); }}
                                style={{
                                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                    color: 'var(--text-main)',
                                    border: 'none',
                                    padding: '0.8rem 2rem',
                                    borderRadius: '2rem',
                                    fontWeight: 700,
                                    fontSize: '1rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)'
                                }}
                            >
                                <Plus size={20} /> Nuevo Préstamo
                            </button>
                        </div>

                        <LoanList onEdit={(loan) => setEditingLoan(loan)} />
                        
                        {(isAddingLoan || editingLoan) && (
                            <LoanForm 
                                editingLoan={editingLoan} 
                                onCancelEdit={() => { setEditingLoan(undefined); setIsAddingLoan(false); }}
                                onClose={() => { setEditingLoan(undefined); setIsAddingLoan(false); }}
                            />
                        )}
                    </div>
                )}

                {activeTab === 'recurring' && (
                    <FixedMovementsView onNavigateToSettings={(tab) => setActiveTab(tab)} />
                )}

                {activeTab === 'balance' && (
                    <BalanceAdjustmentView />
                )}

                {activeTab === 'categories' && (
                    <CategoryManagementView />
                )}

                {activeTab === 'app' && (
                    <AppSettingsView />
                )}

                {activeTab === 'users' && isPrincipal && (
                    <UserManagementView />
                )}

                {activeTab === 'about' && (
                    <div style={{ 
                        padding: '1.5rem', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        gap: '1.25rem',
                        textAlign: 'center' 
                    }}>
                        <Heart size={48} style={{ color: '#4c4af5', opacity: 0.9 }} />
                        
                        <div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>Acerca de PCS Hogar</h2>
                            <p style={{ 
                                fontSize: '0.9rem', 
                                lineHeight: '1.6', 
                                opacity: 0.9, 
                                maxWidth: '500px',
                                margin: '0 auto'
                            }}>
                                Esta aplicación está desarrollada de forma independiente por <strong>Yo Te Ayudo (ESP)</strong> y su uso es íntegro y gratuito, sin ningún fin lucrativo. Si deseas ayudar económicamente a sostener el proyecto, las aportaciones voluntarias (puntuales o mensuales) serán destinadas de manera exclusiva al mantenimiento de los servidores que hacen posible el funcionamiento de la app. ¡PCS Hogar siempre funcionará exactamente igual y sin limitaciones para todos!
                            </p>
                        </div>

                        <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '0.75rem', 
                            width: '100%', 
                            maxWidth: '400px' 
                        }}>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button 
                                    onClick={handleOpenManual}
                                    style={{ 
                                        flex: 1,
                                        background: '#D946EF',
                                        color: 'var(--text-main)',
                                        border: 'none',
                                        padding: '0.75rem',
                                        borderRadius: '4px',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    <BookOpen size={18} /> Ver Manual de Uso
                                </button>
                                <button 
                                    onClick={handlePayPal}
                                    style={{ 
                                        flex: 1,
                                        background: '#4c4af5',
                                        color: 'var(--text-main)',
                                        border: 'none',
                                        padding: '0.75rem',
                                        borderRadius: '4px',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    <Coffee size={18} /> Invitar a un café (PayPal)
                                </button>
                            </div>
                            <button 
                                onClick={handleSuggestion}
                                style={{ 
                                    background: 'var(--panel-bg-2)',
                                    color: 'var(--text-main)',
                                    border: '1px solid var(--panel-bg-3)',
                                    padding: '0.75rem',
                                    borderRadius: '4px',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem'
                                }}
                            >
                                <MessageSquare size={18} /> Enviar Sugerencia
                            </button>
                        </div>

                        <div style={{ 
                            background: 'rgba(0,0,0,0.2)', 
                            padding: '1.25rem', 
                            borderRadius: '1rem', 
                            fontSize: '0.8rem', 
                            lineHeight: '1.5',
                            textAlign: 'left',
                            opacity: 0.7,
                            border: '1px solid var(--panel-bg-2)',
                            maxWidth: '500px'
                        }}>
                            <strong>Aviso legal y protección de datos:</strong> La aportación económica es 100% voluntaria, de carácter final y no reembolsable bajo ninguna circunstancia. Al realizarla aceptas expresamente que no constituye el pago por un servicio profesional, ni el despliegue de ventajas en la app, ni la compra de artículos. Esta aplicación no requiere pagos para funcionar. <strong>Yo Te Ayudo (ESP)</strong> no almacena, recopila ni procesa ningún dato personal, financiero ni tarjeta bancaria del usuario. El procesamiento íntegro y seguro de los pagos se deriva de forma exclusiva y externa a los servidores de PayPal, aplicando únicamente su propia Política de Privacidad y Términos de Servicio.
                        </div>

                        <p style={{ fontSize: '0.85rem', opacity: 0.4, marginTop: '0.5rem' }}>
                            Versión {version}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsView;

