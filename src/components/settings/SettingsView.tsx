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
import { useFinance } from '../../contexts/FinanceContext';
const version = "0.5.1";
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
    MessageSquare
} from 'lucide-react';
import SavingsView from '../savings/SavingsView';

interface SettingsViewProps {
    initialTab?: 'accounts' | 'savings' | 'recurring' | 'loans' | 'balance' | 'categories' | 'app' | 'about';
}

const SettingsView: React.FC<SettingsViewProps> = ({ initialTab = 'accounts' }) => {
    const [activeTab, setActiveTab] = useState(initialTab);
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
    const [showCardForm, setShowCardForm] = useState(false);

    // Edit states
    const [editingAccount, setEditingAccount] = useState<Account | undefined>(undefined);
    const [editingCard, setEditingCard] = useState<CreditCard | undefined>(undefined);
    const [editingSaving, setEditingSaving] = useState<SavingGoal | undefined>(undefined);
    const [editingLoan, setEditingLoan] = useState<Loan | undefined>(undefined);
    const [isAddingLoan, setIsAddingLoan] = useState(false);
    const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleEditAccount = (acc: Account) => {
        setEditingAccount(acc);
        setShowAccountForm(true);
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
                alert('Por favor, selecciona un archivo .json válido.');
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
                alert('Datos importados con éxito.');
                setSelectedImportFile(null);
            } catch (err) {
                alert('Error al procesar el archivo JSON.');
                console.error(err);
            }
        };
        reader.readAsText(selectedImportFile);
    };

    const cancelImport = () => {
        setSelectedImportFile(null);
    };

    const tabs = [
        { id: 'accounts', label: 'Cuentas y Tarjetas', icon: Wallet },
        { id: 'savings', label: 'Huchas', icon: PiggyBank },
        { id: 'recurring', label: 'Movimientos Fijos', icon: CalendarClock },
        { id: 'loans', label: 'Préstamos', icon: Landmark },
        { id: 'balance', label: 'Ajustes Saldo', icon: RefreshCw },
        { id: 'categories', label: 'Categorías', icon: Tag },
        { id: 'app', label: 'Aplicación', icon: Monitor },
        { id: 'about', label: 'Acerca de', icon: Heart },
    ] as const;

    return (
        <div className="glass-panel" style={{ padding: 'var(--space-sm) 0', minHeight: '80vh', border: 'none', background: 'transparent' }}>
            <div className="no-scrollbar" style={{ 
                display: 'flex', 
                gap: '0.5rem', 
                marginBottom: '1.5rem', 
                overflowX: 'auto', 
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
                            background: activeTab === tab.id ? '#6366f1' : 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '100px',
                            color: 'white',
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
                                            color: 'white', 
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
                                />
                            ) : (
                                <AccountList onEdit={handleEditAccount} />
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
                                            color: 'white', 
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
                                    color: 'white',
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
                    <FixedMovementsView />
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
                                Esta aplicación está desarrollada de forma independiente por <strong>Yo Te Ayudo (ESP)</strong> y su uso es íntegro y gratuito. 
                                Si te resulta útil, considera realizar una pequeña aportación o enviarnos tus sugerencias. 
                                ¡La app funcionará siempre exactamente igual aportes o no!
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
                                <button style={{ 
                                    flex: 1,
                                    background: '#D946EF', // Magenta/Pinkish
                                    color: 'white',
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
                                }}>
                                    <BookOpen size={18} /> Ver Manual de Uso
                                </button>
                                <button style={{ 
                                    flex: 1,
                                    background: '#4c4af5', // Indigo/Blueish
                                    color: 'white',
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
                                }}>
                                    <Coffee size={18} /> Invitar a un café (PayPal)
                                </button>
                            </div>
                            <button style={{ 
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: 'white',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                padding: '0.75rem',
                                borderRadius: '4px',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                cursor: 'pointer',
                                fontSize: '0.85rem'
                            }}>
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
                            border: '1px solid rgba(255,255,255,0.05)',
                            maxWidth: '500px'
                        }}>
                            <strong>Aviso legal y protección de datos:</strong> La aportación económica (donación) es 100% voluntaria, de carácter final y no reembolsable bajo ninguna circunstancia. Al realizarla aceptas expresamente que no constituye el pago por un servicio profesional, ni el despliegue de ventajas en la app, ni la compra de artículos. Esta aplicación no requiere pagos para funcionar. <strong>Yo Te Ayudo (ESP)</strong> no almacena, recopila ni procesa ningún dato personal, financiero ni tarjeta bancaria del usuario. El procesamiento íntegro y seguro de los pagos se deriva de forma exclusiva y externa a los servidores de PayPal, aplicando únicamente su propia Política de Privacidad Términos de Servicio.
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
