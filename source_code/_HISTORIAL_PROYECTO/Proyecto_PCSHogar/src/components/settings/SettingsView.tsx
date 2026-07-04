import React, { useState } from 'react';
import AccountList from '../accounts/AccountList';
import AccountForm from '../accounts/AccountForm';
import CardList from '../accounts/CardList';
import CardForm from '../accounts/CardForm';
import PiggyBankList from '../savings/PiggyBankList';
import PiggyBankForm from '../savings/PiggyBankForm';
import LoanList from '../loans/LoanList';
import LoanForm from '../loans/LoanForm';
import RecurringExpenseForm from '../expenses/RecurringExpenseForm';
import CategoryList from './CategoryList';
import { useFinance } from '../../contexts/FinanceContext';
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
    BookOpen,
    Coffee,
    Send
} from 'lucide-react';

const SettingsView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'accounts' | 'savings' | 'recurring' | 'loans' | 'balance' | 'categories' | 'app' | 'about'>('accounts');
    const { 
        updateAccount, addAccount, 
        updateCard, addCard, 
        addSavingGoal, addRecurringExpense,
        importData 
    } = useFinance();

    const [showAccountForm, setShowAccountForm] = useState(false);
    const [showCardForm, setShowCardForm] = useState(false);

    // Edit states
    const [editingAccount, setEditingAccount] = useState<Account | undefined>(undefined);
    const [editingCard, setEditingCard] = useState<CreditCard | undefined>(undefined);
    const [editingSaving, setEditingSaving] = useState<SavingGoal | undefined>(undefined);
    const [editingLoan, setEditingLoan] = useState<Loan | undefined>(undefined);

    const handleEditAccount = (acc: Account) => {
        setEditingAccount(acc);
        setShowAccountForm(true);
    };

    const handleEditCard = (card: CreditCard) => {
        setEditingCard(card);
        setShowCardForm(true);
    };

    const handleImportV5 = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = JSON.parse(e.target?.result as string);
                if (window.confirm('¿Estás seguro de que quieres importar estos datos? Se sobrescribirá la base de datos actual.')) {
                    await importData(content);
                    alert('Datos importados con éxito.');
                }
            } catch (err) {
                alert('Error al procesar el archivo JSON.');
                console.error(err);
            }
        };
        reader.readAsText(file);
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
        <div className="glass-panel" style={{ padding: 'var(--space-md)', minHeight: '80vh', border: 'none', background: 'transparent' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                <Settings size={28} style={{ color: 'var(--color-primary)' }} />
                <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.025em' }}>Ajustes</h1>
            </div>

            <div className="no-scrollbar" style={{ 
                display: 'flex', 
                gap: '0.75rem', 
                marginBottom: '2rem', 
                overflowX: 'auto', 
                padding: '0.5rem 0.25rem',
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
                            gap: '0.6rem',
                            padding: '0.8rem 1.25rem',
                            background: activeTab === tab.id ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: '100px',
                            color: activeTab === tab.id ? 'white' : 'rgba(255, 255, 255, 0.8)',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            boxShadow: activeTab === tab.id ? '0 4px 12px rgba(124, 58, 237, 0.3)' : 'none',
                        }}
                    >
                        <tab.icon size={18} strokeWidth={2} />
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
                        <div>
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', opacity: 0.9 }}>Mis Huchas</h3>
                            <PiggyBankList onEdit={setEditingSaving} />
                        </div>
                        <div>
                            <PiggyBankForm
                                editingGoal={editingSaving}
                                onCancelEdit={() => setEditingSaving(undefined)}
                                onClose={() => setEditingSaving(undefined)}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'loans' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
                        <div>
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', opacity: 0.9 }}>Mis Préstamos</h3>
                            <LoanList onEdit={setEditingLoan} />
                        </div>
                        <div>
                            <LoanForm
                                editingLoan={editingLoan}
                                onCancelEdit={() => setEditingLoan(undefined)}
                                onClose={() => setEditingLoan(undefined)}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'recurring' && (
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', opacity: 0.9 }}>Movimientos Fijos</h3>
                        <RecurringExpenseForm />
                    </div>
                )}

                {activeTab === 'balance' && (
                    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                        <RefreshCw size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                        <h3>Ajustes de Saldo</h3>
                        <p style={{ opacity: 0.6 }}>Próximamente: Historial de ajustes y correcciones manuales.</p>
                    </div>
                )}

                {activeTab === 'categories' && (
                    <CategoryList />
                )}

                {activeTab === 'app' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                            <Monitor size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                            <h3>Ajustes de Aplicación</h3>
                            <p style={{ opacity: 0.6 }}>Configura las opciones generales de tu experiencia.</p>
                        </div>

                        <div className="glass-panel" style={{ padding: '2rem' }}>
                            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <RefreshCw size={20} /> Mantenimiento y Datos
                            </h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                                <label style={{ 
                                    background: 'rgba(255, 255, 255, 0.05)', 
                                    border: '1px solid rgba(255, 255, 255, 0.1)', 
                                    padding: '1rem 1.5rem', 
                                    borderRadius: '0.75rem', 
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    transition: 'all 0.2s ease'
                                }}>
                                    Importar base de datos V5
                                    <input 
                                        type="file" 
                                        accept=".json" 
                                        onChange={handleImportV5} 
                                        style={{ display: 'none' }} 
                                    />
                                </label>
                            </div>
                            <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                                Nota: Esto sobrescribirá todos tus datos actuales con los del archivo seleccionado.
                            </p>
                        </div>
                    </div>
                )}

                {activeTab === 'about' && (
                    <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        gap: '1.5rem',
                        maxWidth: '600px',
                        margin: '0 auto',
                        paddingBottom: '2rem'
                    }}>
                        <Heart size={64} style={{ color: 'var(--color-primary)', filter: 'drop-shadow(0 0 10px rgba(124, 58, 237, 0.3))' }} />
                        
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, textAlign: 'center' }}>Acerca de PCS Hogar</h2>
                        
                        <p style={{ 
                            textAlign: 'center', 
                            lineHeight: '1.6', 
                            fontSize: '0.95rem', 
                            opacity: 0.9,
                            maxWidth: '90%'
                        }}>
                            Esta aplicación está desarrollada de forma independiente por <strong>Yo Te Ayudo (ESP)</strong> y su uso es íntegro y gratuito. 
                            Si te resulta útil, considera realizar una pequeña aportación o enviarnos tus sugerencias. 
                            ¡La app funcionará siempre exactamente igual aportes o no!
                        </p>

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
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                    padding: '0.8rem', background: '#D81B60', color: 'white',
                                    border: 'none', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer',
                                    fontSize: '0.9rem'
                                }}>
                                    <BookOpen size={18} /> Ver Manual de Uso
                                </button>
                                <button style={{
                                    flex: 1,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                    padding: '0.8rem', background: '#512DA8', color: 'white',
                                    border: 'none', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer',
                                    fontSize: '0.9rem'
                                }}>
                                    <Coffee size={18} /> Invitar a un café (PayPal)
                                </button>
                            </div>
                            <button style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                padding: '0.8rem', background: 'rgba(255,255,255,0.05)', color: 'white',
                                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}>
                                <Send size={18} /> Enviar Sugerencia
                            </button>
                        </div>

                        <div className="glass-panel" style={{ 
                            padding: '1.25rem', 
                            marginTop: '1rem',
                            background: 'rgba(0,0,0,0.2)',
                            borderRadius: '1rem',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <p style={{ fontSize: '0.8rem', textAlign: 'justify', margin: 0, lineHeight: '1.5', opacity: 0.8 }}>
                                <strong>Aviso legal y protección de datos:</strong> La aportación económica (donación) es 100% voluntaria, de carácter final y no reembolsable bajo ninguna circunstancia. Al realizarla aceptas expresamente que no constituye el pago por un servicio profesional, ni el desbloqueo de ventajas en la app, ni la compra de artículos. Esta aplicación no requiere pagos para funcionar. <strong>Yo Te Ayudo (ESP)</strong> no almacena, recopila ni procesa ningún dato personal, financiero ni tarjeta bancaria del usuario. El procesamiento íntegro y seguro de los pagos se deriva de forma exclusiva y externa a los servidores de PayPal, aplicando únicamente su propia Política de Privacidad Términos de Servicio.
                            </p>
                        </div>

                        <p style={{ marginTop: '2rem', fontSize: '0.85rem', opacity: 0.4 }}>Versión 0.8.3</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsView;
