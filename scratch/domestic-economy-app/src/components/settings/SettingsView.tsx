import { useState, useEffect } from 'react';
import AccountList from '../accounts/AccountList';
import AccountForm from '../accounts/AccountForm';
import CardList from '../accounts/CardList';
import CardForm from '../accounts/CardForm';
import IncomeList from '../income/IncomeList';
import IncomeForm from '../income/IncomeForm';
import {
    Settings,
    Monitor,
    FolderOpen,
    RefreshCw,
    Clock,
    EyeOff,
    Trash2,
    ChevronDown,
    ChevronUp,
    Wallet,
    PiggyBank,
    CalendarRange,
    Landmark,
    Edit,
    PlusCircle,
    X,
    FileJson,
    Tag
} from 'lucide-react';
import { useFinance } from '../../contexts/FinanceContext';
import { useIncome } from '../../contexts/IncomeContext';
import PiggyBankList from '../savings/PiggyBankList';
import PiggyBankForm from '../savings/PiggyBankForm';
import LoanList from '../loans/LoanList';
import { formatCurrency } from '../../utils/formatters';
import LoanForm from '../loans/LoanForm';
import DebtEvolutionChart from '../analytics/DebtEvolutionChart';
import SavingsEvolutionChart from '../analytics/SavingsEvolutionChart';
import RecurringExpenseList from '../expenses/RecurringExpenseList';
import RecurringExpenseForm from '../expenses/RecurringExpenseForm';
import { isElectron, isCapacitor, platformBridge } from '../../services/electronBridge';
import { syncToExternalFolder, loadAndMergeFromFile, getSyncMode, subscribeToSyncStatus, type SyncStatus } from '../../services/syncService';
import { useLanguage } from '../../contexts/LanguageContext';
import { calculateMonthAvailability } from '../../utils/financeUtils';
import { useMonthClosing } from '../../contexts/MonthClosingContext';
import { useTheme, type Theme } from '../../contexts/ThemeContext';
import DropboxFilePicker from './DropboxFilePicker';
import SmbFilePicker from './SmbFilePicker';
import MonthRolloverModal from '../dashboard/MonthRolloverModal';
import CategoryManager from './CategoryManager';

const SettingsView = () => {
    const {
        refreshFinance,
        overrides,
        updateMonthOverride,
        deleteMonthOverride,
        expenses,
        allocations,
        recurringExpenses,
        savings
    } = useFinance() as any;
    const { fixedIncomes, extraIncomes, rolloverIncomes, refresh: refreshIncome, deleteIncome } = useIncome() as any;
    const { pendingMonths, allClosings, closeMonth, deleteClosing, refresh: refreshClosings } = useMonthClosing() as any;
    const { t, language } = useLanguage();
    const { theme, setTheme } = useTheme();

    const [activeTab, setActiveTab] = useState<'accounts' | 'savings' | 'app' | 'fixedMovements' | 'loans' | 'adjustments' | 'categories'>('app');
    const [editingAccount, setEditingAccount] = useState<any>();
    const [editingCard, setEditingCard] = useState<any>();
    const [editingSaving, setEditingSaving] = useState<any>();

    // Form visibility states
    const [showAccountForm, setShowAccountForm] = useState(false);
    const [showCardForm, setShowCardForm] = useState(false);
    const [showSavingForm, setShowSavingForm] = useState(false);
    const [showIncomeForm, setShowIncomeForm] = useState(false);
    const [showRecurringForm, setShowRecurringForm] = useState(false);
    const [showLoanForm, setShowLoanForm] = useState(false);

    const [syncMode, setSyncModeState] = useState(getSyncMode());
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const [overrideYear, setOverrideYear] = useState(new Date().getFullYear());
    const [overrideMonth, setOverrideMonth] = useState(new Date().getMonth());
    const [overrideAmount, setOverrideAmount] = useState('');
    const [smbShare, setSmbShare] = useState(localStorage.getItem('pcs_smb_share') || '');
    const [smbUser, setSmbUser] = useState(localStorage.getItem('pcs_smb_username') || '');
    const [smbPass, setSmbPass] = useState(localStorage.getItem('pcs_smb_password') || '');
    const [showIgnored, setShowIgnored] = useState(false);
    const [debugError, setDebugError] = useState<string | null>(null);
    const [showDropboxPicker, setShowDropboxPicker] = useState(false);
    const [showSmbPicker, setShowSmbPicker] = useState(false);
    const [isSelectingLocal, setIsSelectingLocal] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [rolloverTarget, setRolloverTarget] = useState<{ year: number, month: number, balance: number, nextMonthAvailable: number } | null>(null);

    // Auto-show forms when editing
    useEffect(() => { if (editingAccount) setShowAccountForm(true); }, [editingAccount]);
    useEffect(() => { if (editingCard) setShowCardForm(true); }, [editingCard]);
    useEffect(() => { if (editingSaving) setShowSavingForm(true); }, [editingSaving]);

    useEffect(() => {
        const unsubscribe = subscribeToSyncStatus(setSyncStatus);
        return unsubscribe;
    }, []);

    const showMessage = (text: string, type: 'success' | 'error' = 'success') => {
        setSyncMessage({ text, type });
        setTimeout(() => setSyncMessage(null), 5000);
    };

    const handleToggleSyncMode = async (mode: any) => {
        // Immediate UI update to make the section "sticky"
        setSyncModeState(mode);
        if (mode === 'dropbox') setIsConnecting(true);

        try {
            const { setSyncProvider } = await import('../../services/syncService');
            await setSyncProvider(mode);
            showMessage(`Modo ${mode} activado`);
        } catch (e: any) {
            showMessage(e.message, 'error');
            // Even if it fails, we keep the syncModeState in the user's intended mode
            // unless we want to roll back, but Pablo wants it to stay there.
        } finally {
            setIsConnecting(false);
        }
    };

    const handleTabClick = (mode: any) => {
        setSyncModeState(mode);
    };

    const handleSelectFolder = async () => {
        setIsSelectingLocal(true);
        try {
            const path = await platformBridge.selectDirectory();
            if (path) {
                const { setSyncProvider } = await import('../../services/syncService');
                await setSyncProvider('local', { path: path }); // Fixed: use 'path' instead of 'folder'
                showMessage(t('settings.app.folderSelected') || 'Carpeta seleccionada');
            }
        } catch (e: any) {
            let errorMsg = e.message;
            if (errorMsg.includes('Invalid Uri')) {
                errorMsg = 'Error de URI: La ruta seleccionada parece no ser válida para el sistema de archivos de Android. Por favor, intenta seleccionar una carpeta diferente.';
            }
            showMessage('Error al seleccionar carpeta: ' + errorMsg, 'error');
        } finally {
            setIsSelectingLocal(false);
        }
    };

    const handleSelectFile = async () => {
        setIsSelectingLocal(true);
        try {
            const path = await platformBridge.selectFile({
                filters: [{ name: 'JSON', extensions: ['application/json'] }]
            });
            if (path) {
                const { setSyncProvider } = await import('../../services/syncService');
                await setSyncProvider('local', { path: path }); // Using file path directly
                showMessage('Archivo de datos seleccionado');
            }
        } catch (e: any) {
            showMessage('Error al seleccionar archivo: ' + e.message, 'error');
        } finally {
            setIsSelectingLocal(false);
        }
    };

    const tabs = [
        { id: 'accounts', label: 'Cuentas y Tarjetas', icon: Wallet },
        { id: 'savings', label: t('settings.tabs.savings'), icon: PiggyBank },
        { id: 'fixedMovements', label: t('settings.tabs.fixedMovements'), icon: CalendarRange },
        { id: 'loans', label: t('settings.tabs.loans'), icon: Landmark },
        { id: 'adjustments', label: t('settings.tabs.adjustments'), icon: RefreshCw },
        { id: 'categories', label: 'Categorías', icon: Tag },
        { id: 'app', label: t('settings.tabs.app'), icon: Monitor },
    ] as const;

    const currentBase = calculateMonthAvailability(overrideYear, overrideMonth, {
        extraIncomes, fixedIncomes, expenses, allocations, recurringExpenses, savings, rolloverIncomes, overrides: []
    } as any);

    return (
        <div className="glass-panel" style={{
            padding: 'var(--space-sm)',
            minHeight: 'calc(100vh - 12rem)',
            marginBottom: '4rem',
            display: 'flex',
            flexDirection: 'column'
        }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: 'var(--card-border)' }}>
                <Settings size={24} style={{ color: 'var(--color-primary)' }} />
                <h2 style={{ margin: 0 }}>{t('settings.title')}</h2>
            </div>

            <div className="settings-content-wrapper" style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0
            }}>
                {!(showDropboxPicker || showSmbPicker || isSelectingLocal) && (
                    <>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.75rem 1.25rem',
                                        background: activeTab === tab.id ? 'var(--color-primary)' : 'var(--btn-ghost-bg)',
                                        border: 'none',
                                        borderRadius: 'var(--radius-lg)',
                                        color: activeTab === tab.id ? 'var(--btn-primary-text)' : 'var(--btn-ghost-text)',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <tab.icon size={18} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="settings-content">
                            {activeTab === 'adjustments' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px', margin: '0 auto' }}>
                                    {/* Manual Totals Adjustment */}
                                    <div className="glass-card" style={{ padding: '1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                            <CalendarRange size={24} className="text-primary" />
                                            <h3 style={{ margin: 0 }}>{t('settings.adjustments.title')}</h3>
                                        </div>

                                        <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '1.5rem' }}>
                                            {t('settings.adjustments.desc')}
                                        </p>

                                        <div style={{
                                            background: 'rgba(244, 67, 54, 0.1)',
                                            border: '1px solid var(--hue-danger)',
                                            padding: '1rem',
                                            borderRadius: 'var(--radius-md)',
                                            marginBottom: '1.5rem',
                                            display: 'flex',
                                            gap: '0.75rem',
                                            alignItems: 'center',
                                            color: 'var(--hue-danger)',
                                            fontSize: '0.9rem'
                                        }}>
                                            <Monitor size={20} />
                                            <b>{t('settings.adjustments.warning')}</b>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>{t('settings.adjustments.year')}</label>
                                                    <input
                                                        type="number"
                                                        className="form-input"
                                                        value={overrideYear}
                                                        onChange={(e) => setOverrideYear(parseInt(e.target.value))}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>{t('settings.adjustments.month')}</label>
                                                    <select
                                                        className="form-input"
                                                        value={overrideMonth}
                                                        onChange={(e) => setOverrideMonth(parseInt(e.target.value))}
                                                    >
                                                        {Array.from({ length: 12 }, (_, i) => (
                                                            <option key={i} value={i}>
                                                                {new Date(2000, i).toLocaleString(language === 'es' ? 'es-ES' : 'en-US', { month: 'long' })}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>{t('settings.adjustments.amount')}</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="form-input"
                                                    placeholder="0.00"
                                                    value={overrideAmount}
                                                    onChange={(e) => setOverrideAmount(e.target.value)}
                                                    style={{ fontSize: '1.5rem', fontWeight: 600, textAlign: 'center' }}
                                                />
                                            </div>

                                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                                <button
                                                    className="btn-primary"
                                                    style={{ flex: 1, justifyContent: 'center' }}
                                                    onClick={async () => {
                                                        if (overrideAmount === '' || isNaN(parseFloat(overrideAmount))) return;
                                                        const desiredTotal = parseFloat(overrideAmount);
                                                        const delta = desiredTotal - currentBase;
                                                        if (window.confirm(t('settings.adjustments.warning'))) {
                                                            await updateMonthOverride({
                                                                year: overrideYear,
                                                                month: overrideMonth,
                                                                amount: delta,
                                                                targetAmount: desiredTotal,
                                                                isManual: true,
                                                                updatedAt: Date.now()
                                                            });
                                                            showMessage(t('settings.adjustments.success'));
                                                        }
                                                    }}
                                                >
                                                    {t('settings.adjustments.save')}
                                                </button>
                                                {overrides.some((o: any) => o.year === overrideYear && o.month === overrideMonth) && (
                                                    <button
                                                        className="btn-secondary"
                                                        style={{ color: 'var(--hue-danger)', borderColor: 'var(--hue-danger)' }}
                                                        onClick={async () => {
                                                            await deleteMonthOverride(overrideYear, overrideMonth);
                                                            showMessage(t('settings.adjustments.deleted'));
                                                        }}
                                                    >
                                                        {t('settings.adjustments.delete')}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {overrides.length > 0 && (
                                            <div style={{ marginTop: '2.5rem', borderTop: 'var(--card-border)', paddingTop: '1.5rem' }}>
                                                <h4 style={{ marginBottom: '1rem', opacity: 0.7 }}>Ajustes Activos</h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    {overrides
                                                        .sort((a: any, b: any) => (b.year * 12 + b.month) - (a.year * 12 + a.month))
                                                        .map((o: any) => {
                                                            const baseForLine = calculateMonthAvailability(o.year, o.month, {
                                                                extraIncomes, fixedIncomes, expenses, allocations, recurringExpenses, savings, rolloverIncomes, overrides: []
                                                            } as any);
                                                            const totalForLine = (baseForLine + o.amount);
                                                            return (
                                                                <div key={`${o.year}-${o.month}`} style={{
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'center',
                                                                    padding: '0.75rem',
                                                                    background: 'var(--bg-surface-elevated)',
                                                                    borderRadius: 'var(--radius-md)',
                                                                    border: 'var(--card-border)'
                                                                }}>
                                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                        <span style={{ fontWeight: 500 }}>
                                                                            {new Date(o.year, o.month).toLocaleString(language === 'es' ? 'es-ES' : 'en-US', { month: 'long', year: 'numeric' })}
                                                                        </span>
                                                                        <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                                                                            {t('settings.adjustments.base')}: {baseForLine.toLocaleString(undefined, { style: 'currency', currency: 'EUR' })}
                                                                        </span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                                        <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                                                                            {totalForLine.toLocaleString(undefined, { style: 'currency', currency: 'EUR' })}
                                                                        </span>
                                                                        <button
                                                                            className="btn-icon"
                                                                            onClick={() => {
                                                                                setOverrideMonth(o.month);
                                                                                setOverrideYear(o.year);
                                                                                setOverrideAmount(totalForLine.toString());
                                                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                                                            }}
                                                                        >
                                                                            <Edit size={16} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Rollover/Deficit Management */}
                                    <div className="glass-card" style={{ padding: '1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                            <RefreshCw size={24} className="text-secondary" />
                                            <h3 style={{ margin: 0 }}>{t('settings.adjustments.rolloverTitle')}</h3>
                                        </div>
                                        <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '1.5rem' }}>
                                            {t('settings.adjustments.rolloverDesc')}
                                        </p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                            {pendingMonths.length > 0 && (
                                                <div style={{ background: 'var(--alert-info-bg)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-primary-light)' }}>
                                                    <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <Clock size={16} />
                                                        Meses Pendientes de Acción
                                                    </h4>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                        {pendingMonths.map((p: any) => (
                                                            <div key={`${p.year}-${p.month}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
                                                                <span style={{ fontSize: '0.85rem' }}>{p.name}</span>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: p.amount >= 0 ? 'var(--color-success)' : 'var(--hue-danger)', marginRight: '0.5rem' }}>
                                                                        {p.amount.toLocaleString(undefined, { style: 'currency', currency: 'EUR' })}
                                                                    </span>
                                                                    <button
                                                                        className="btn-text"
                                                                        onClick={() => {
                                                                            const nextMonth = p.month === 11 ? 0 : p.month + 1;
                                                                            const nextYear = p.month === 11 ? p.year + 1 : p.year;
                                                                            const nextMonthAvailable = calculateMonthAvailability(nextYear, nextMonth, {
                                                                                extraIncomes, fixedIncomes, expenses, allocations, recurringExpenses, savings, rolloverIncomes, overrides
                                                                            } as any);

                                                                            setRolloverTarget({
                                                                                year: p.year,
                                                                                month: p.month,
                                                                                balance: p.amount,
                                                                                nextMonthAvailable
                                                                            });
                                                                        }}
                                                                        style={{ fontSize: '0.8rem', color: 'var(--color-primary)', background: 'rgba(var(--color-primary-rgb), 0.1)', padding: '0.25rem 0.6rem', borderRadius: '4px' }}
                                                                    >
                                                                        Tomar Acción
                                                                    </button>
                                                                    <button
                                                                        className="btn-text"
                                                                        onClick={async () => {
                                                                            if (window.confirm(`¿Ignorar el mes de ${p.name}? No aparecerá más como pendiente.`)) {
                                                                                await closeMonth({
                                                                                    year: p.year,
                                                                                    month: p.month,
                                                                                    finalBalance: p.amount,
                                                                                    allocations: [{ action: 'dismiss', amount: 0 }]
                                                                                });
                                                                                await refreshClosings();
                                                                                showMessage('Mes ignorado correctamente');
                                                                            }
                                                                        }}
                                                                    >
                                                                        <EyeOff size={16} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div>
                                                <h4 style={{ margin: '0 0 1rem 0', opacity: 0.7, fontSize: '0.9rem' }}>Historial de Cierres y Remanentes</h4>
                                                {allClosings.filter((c: any) => c.rolloverAction !== 'dismiss').length === 0 ? (
                                                    <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>
                                                        {t('settings.adjustments.noRollovers')}
                                                    </div>
                                                ) : (
                                                    <div style={{ overflowX: 'auto' }}>
                                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                            <thead>
                                                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                                    <th style={{ padding: '0.75rem' }}>Mes Cerrado</th>
                                                                    <th style={{ padding: '0.75rem' }}>Acción Tomada</th>
                                                                    <th style={{ padding: '0.75rem' }}>Importe</th>
                                                                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Acciones</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {[...allClosings]
                                                                    .filter((c: any) => c.rolloverAction !== 'dismiss')
                                                                    .sort((a: any, b: any) => (b.year * 12 + b.month) - (a.year * 12 + a.month))
                                                                    .map((closing: any) => (
                                                                        <tr key={`${closing.year}-${closing.month}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
                                                                            <td style={{ padding: '0.75rem' }}>
                                                                                {new Date(closing.year, closing.month).toLocaleString(language === 'es' ? 'es-ES' : 'en-US', { month: 'short', year: 'numeric' })}
                                                                            </td>
                                                                            <td style={{ padding: '0.75rem', fontSize: '0.8rem', opacity: 0.8 }}>
                                                                                {closing.rolloverAction === 'save' ? 'Ahorrado' :
                                                                                    closing.rolloverAction === 'carry' ? 'Transferido' :
                                                                                        closing.rolloverAction === 'cover' ? 'Cubierto con Hucha' : 'Deducido'}
                                                                            </td>
                                                                            <td style={{ padding: '0.75rem', fontWeight: 600, color: closing.rolloverAmount >= 0 ? 'var(--color-success)' : 'var(--hue-danger)' }}>
                                                                                {closing.rolloverAmount.toLocaleString(undefined, { style: 'currency', currency: 'EUR' })}
                                                                            </td>
                                                                            <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                                                                <button
                                                                                    onClick={async () => {
                                                                                        if (window.confirm('¿Deseas revertir el cierre de este mes?')) {
                                                                                            await deleteClosing(closing.year, closing.month);
                                                                                            await refreshClosings();
                                                                                            showMessage('Cierre revertido correctamente');
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    <Trash2 size={18} />
                                                                                </button>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>

                                            <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
                                                <h4 style={{ margin: '0 0 1rem 0', opacity: 0.7, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <RefreshCw size={18} />
                                                    Remanentes Activos (Ingresos)
                                                </h4>
                                                <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '1rem' }}>
                                                    Lista de todos los movimientos de remanente registrados en el sistema. Los marcados como "Huérfanos" pueden ser eliminados manualmente si el cierre original ya no existe.
                                                </p>
                                                {rolloverIncomes.length === 0 ? (
                                                    <div style={{ textAlign: 'center', padding: '1rem', opacity: 0.5, fontSize: '0.85rem' }}>
                                                        No hay remanentes registrados.
                                                    </div>
                                                ) : (
                                                    <div style={{ overflowX: 'auto' }}>
                                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                            <thead>
                                                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                    <th style={{ padding: '0.5rem' }}>Origen</th>
                                                                    <th style={{ padding: '0.5rem' }}>Destino</th>
                                                                    <th style={{ padding: '0.5rem' }}>Importe</th>
                                                                    <th style={{ padding: '0.5rem' }}>Estado</th>
                                                                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Acción</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {rolloverIncomes
                                                                    .sort((a: any, b: any) => (b.budgetYear * 12 + b.budgetMonth) - (a.budgetYear * 12 + a.budgetMonth))
                                                                    .map((r: any) => {
                                                                        const isOrphan = !allClosings.some((c: any) => Number(c.year) === Number(r.originalYear) && Number(c.month) === Number(r.originalMonth));
                                                                        return (
                                                                            <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem' }}>
                                                                                <td style={{ padding: '0.5rem', opacity: 0.7 }}>{(r.originalMonth ?? 0) + 1}/{r.originalYear}</td>
                                                                                <td style={{ padding: '0.5rem' }}>{(r.budgetMonth ?? 0) + 1}/{r.budgetYear}</td>
                                                                                <td style={{ padding: '0.5rem', fontWeight: 600, color: Number(r.amount) >= 0 ? 'var(--color-success)' : 'var(--hue-danger)' }}>{formatCurrency(r.amount)}</td>
                                                                                <td style={{ padding: '0.5rem' }}>
                                                                                    {isOrphan ? (
                                                                                        <span style={{ color: 'var(--hue-danger)', fontWeight: 600, fontSize: '0.75rem', background: 'rgba(244, 67, 54, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>Huérfano</span>
                                                                                    ) : (
                                                                                        <span style={{ opacity: 0.4, fontSize: '0.75rem' }}>Vinculado</span>
                                                                                    )}
                                                                                </td>
                                                                                <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                                                                                    <button
                                                                                        onClick={async () => {
                                                                                            if (window.confirm('¿Deseas eliminar este registro de remanente?')) {
                                                                                                await deleteIncome(r.id);
                                                                                                showMessage('Remanente eliminado');
                                                                                            }
                                                                                        }}
                                                                                        style={{ color: 'var(--hue-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                                                                        title="Eliminar remanente"
                                                                                    >
                                                                                        <Trash2 size={16} />
                                                                                    </button>
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>


                                            {allClosings.some((c: any) => c.rolloverAction === 'dismiss') && (
                                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                                                    <button
                                                        onClick={() => setShowIgnored(!showIgnored)}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem', padding: 0 }}
                                                    >
                                                        {showIgnored ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                        Meses Ignorados ({allClosings.filter((c: any) => c.rolloverAction === 'dismiss').length})
                                                    </button>
                                                    {showIgnored && (
                                                        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                            {allClosings
                                                                .filter((c: any) => c.rolloverAction === 'dismiss')
                                                                .sort((a: any, b: any) => (b.year * 12 + b.month) - (a.year * 12 + a.month))
                                                                .map((closing: any) => (
                                                                    <div key={`ignored-${closing.year}-${closing.month}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.6 }}>
                                                                            <EyeOff size={14} />
                                                                            <span style={{ fontSize: '0.85rem' }}>
                                                                                {new Date(closing.year, closing.month).toLocaleString(language === 'es' ? 'es-ES' : 'en-US', { month: 'long', year: 'numeric' })}
                                                                            </span>
                                                                        </div>
                                                                        <button
                                                                            onClick={async () => {
                                                                                await deleteClosing(closing.year, closing.month);
                                                                                await refreshClosings();
                                                                                showMessage('Mes restaurado a pendiente');
                                                                            }}
                                                                            style={{ fontSize: '0.8rem', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                                                                        >
                                                                            Restaurar
                                                                        </button>
                                                                    </div>
                                                                ))
                                                            }
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'categories' && (
                                <CategoryManager />
                            )}

                            {activeTab === 'app' && (
                                <div className="responsive-settings-grid">
                                    {syncMessage && (
                                        <div style={{
                                            position: window.innerWidth < 800 ? 'fixed' : 'relative',
                                            bottom: window.innerWidth < 800 ? 'calc(var(--safe-area-bottom, 0px) + 5rem)' : 'auto',
                                            left: window.innerWidth < 800 ? '1rem' : 'auto',
                                            right: window.innerWidth < 800 ? '1rem' : 'auto',
                                            gridColumn: '1 / -1',
                                            padding: '1rem',
                                            borderRadius: 'var(--radius-md)',
                                            background: syncMessage.type === 'success' ? 'var(--alert-success-bg)' : 'var(--alert-error-bg)',
                                            border: `1px solid ${syncMessage.type === 'success' ? 'var(--color-success)' : 'var(--hue-danger)'}`,
                                            color: 'var(--text-main)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            marginBottom: window.innerWidth < 800 ? '0' : '1rem',
                                            zIndex: 1000,
                                            boxShadow: window.innerWidth < 800 ? '0 4px 12px rgba(0,0,0,0.5)' : 'none'
                                        }}>
                                            <RefreshCw size={18} className={isSyncing ? 'spin' : ''} />
                                            {syncMessage.text}
                                        </div>
                                    )}
                                    {/* Sync Provider Card */}
                                    <div className="glass-card">
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <RefreshCw size={20} className="text-secondary" />
                                                <h3 style={{ margin: 0 }}>Sincronización</h3>
                                            </div>
                                            <div style={{
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '1rem',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                background: syncStatus === 'success' ? 'rgba(76, 175, 80, 0.2)' : syncStatus === 'error' ? 'rgba(244, 67, 54, 0.2)' : 'rgba(33, 150, 243, 0.2)',
                                                color: syncStatus === 'success' ? '#4caf50' : syncStatus === 'error' ? '#f44336' : '#2196f3',
                                                border: `1px solid ${syncStatus === 'success' ? '#4caf50' : syncStatus === 'error' ? '#f44336' : '#2196f3'}`
                                            }}>
                                                {syncStatus === 'idle' ? (syncMode === 'dropbox' || syncMode === 'smb' ? 'SINCRONIZADO' : 'LISTO') :
                                                    syncStatus === 'syncing' ? 'SINCRONIZANDO' :
                                                        syncStatus === 'success' ? 'SINCRONIZADO' :
                                                            syncStatus === 'error' ? 'ERROR' : 'DESCONECTADO'}
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                            <button
                                                onClick={() => handleTabClick('local')}
                                                style={{
                                                    padding: '1rem',
                                                    borderRadius: 'var(--radius-md)',
                                                    border: `1px solid ${syncMode === 'local' ? 'var(--color-primary)' : 'var(--card-border)'}`,
                                                    background: syncMode === 'local' ? 'var(--btn-ghost-bg)' : 'transparent',
                                                    cursor: 'pointer',
                                                    color: 'var(--text-main)',
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem'
                                                }}
                                            >
                                                <FolderOpen size={24} />
                                                <span>Carpeta Local</span>
                                            </button>
                                            <button
                                                onClick={() => handleTabClick('smb')}
                                                style={{
                                                    padding: '1rem',
                                                    borderRadius: 'var(--radius-md)',
                                                    border: `1px solid ${syncMode === 'smb' ? 'var(--color-primary)' : 'var(--card-border)'}`,
                                                    background: syncMode === 'smb' ? 'var(--btn-ghost-bg)' : 'transparent',
                                                    cursor: 'pointer',
                                                    color: 'var(--text-main)',
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem'
                                                }}
                                            >
                                                <Monitor size={24} />
                                                <span>SMB / NAS</span>
                                            </button>
                                            <button
                                                onClick={() => handleTabClick('dropbox')}
                                                style={{
                                                    padding: '1rem',
                                                    borderRadius: 'var(--radius-md)',
                                                    border: `1px solid ${syncMode === 'dropbox' ? 'var(--color-primary)' : 'var(--card-border)'}`,
                                                    background: syncMode === 'dropbox' ? 'var(--btn-ghost-bg)' : 'transparent',
                                                    cursor: 'pointer',
                                                    color: 'var(--text-main)',
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem'
                                                }}
                                            >
                                                <span style={{ fontSize: '24px' }}>📦</span>
                                                <span>Dropbox</span>
                                            </button>
                                        </div>

                                        {syncMode === 'local' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                <p style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                                                    {isElectron() ? 'Datos locales.' : 'Sincronización local.'}
                                                </p>
                                                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', width: '100%', overflow: 'hidden', paddingRight: '2px' }}>
                                                    <div style={{
                                                        flex: 1,
                                                        minWidth: '40px',
                                                        maxWidth: '120px',
                                                        background: 'var(--bg-surface-elevated)',
                                                        padding: '0.4rem 0.6rem',
                                                        borderRadius: '4px',
                                                        fontSize: '0.7rem',
                                                        overflow: 'hidden',
                                                        border: 'var(--card-border)',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        opacity: 0.7
                                                    }} title={localStorage.getItem('pcs_data_folder') || 'No seleccionado'}>
                                                        {localStorage.getItem('pcs_data_folder') || 'No seleccionado'}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                                                        <button onClick={handleSelectFolder} className="btn-secondary" style={{ padding: '0.5rem', borderRadius: '4px', minWidth: '40px' }} title="Seleccionar Carpeta">
                                                            <FolderOpen size={16} />
                                                        </button>
                                                        {isCapacitor() && (
                                                            <button
                                                                onClick={handleSelectFile}
                                                                className="btn-secondary"
                                                                style={{ padding: '0.5rem', borderRadius: '4px', minWidth: '40px' }}
                                                                title="Seleccionar Archivo (Más compatible)"
                                                            >
                                                                <FileJson size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    className="btn-primary"
                                                    style={{ width: '100%' }}
                                                    onClick={async () => {
                                                        const activeMode = getSyncMode();
                                                        if (activeMode !== 'local') {
                                                            await handleToggleSyncMode('local');
                                                        }
                                                        setIsSyncing(true);
                                                        try {
                                                            await syncToExternalFolder();
                                                            await refreshFinance();
                                                            await refreshIncome();
                                                            showMessage('Sincronización local completada');
                                                        } catch (e: any) {
                                                            showMessage(e.message, 'error');
                                                        } finally {
                                                            setIsSyncing(false);
                                                        }
                                                    }}
                                                >
                                                    {isSyncing ? 'Sincronizando...' : 'Activar y Sincronizar Ahora'}
                                                </button>
                                            </div>
                                        )}

                                        {syncMode === 'smb' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                <p style={{ fontSize: '0.85rem', opacity: 0.8 }}>SMB Settings</p>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    <input
                                                        type="text"
                                                        placeholder="Server (smb://host/share)"
                                                        className="form-input"
                                                        style={{ width: '100%' }}
                                                        value={smbShare}
                                                        onChange={(e) => {
                                                            setSmbShare(e.target.value);
                                                            localStorage.setItem('pcs_smb_share', e.target.value);
                                                        }}
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Username"
                                                        className="form-input"
                                                        style={{ width: '100%' }}
                                                        value={smbUser}
                                                        onChange={(e) => {
                                                            setSmbUser(e.target.value);
                                                            localStorage.setItem('pcs_smb_username', e.target.value);
                                                        }}
                                                    />
                                                    <input
                                                        type="password"
                                                        placeholder="Password"
                                                        className="form-input"
                                                        style={{ width: '100%' }}
                                                        value={smbPass}
                                                        onChange={(e) => {
                                                            setSmbPass(e.target.value);
                                                            localStorage.setItem('pcs_smb_password', e.target.value);
                                                        }}
                                                    />
                                                    <button
                                                        className="btn-primary"
                                                        style={{ width: '100%' }}
                                                        onClick={() => setShowSmbPicker(true)}
                                                    >
                                                        Explorar NAS
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {syncMode === 'dropbox' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                <div style={{
                                                    background: 'rgba(255,255,255,0.05)',
                                                    padding: '0.75rem',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontSize: '0.8rem',
                                                    border: 'var(--card-border)',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {localStorage.getItem('pcs_dropbox_path') || 'Ningún archivo seleccionado'}
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                    <button
                                                        className="btn-primary"
                                                        style={{ width: '100%' }}
                                                        onClick={() => {
                                                            if (localStorage.getItem('dropbox_token')) {
                                                                setShowDropboxPicker(true);
                                                            } else {
                                                                handleToggleSyncMode('dropbox');
                                                            }
                                                        }}
                                                        disabled={isConnecting}
                                                    >
                                                        {isConnecting ? 'Conectando...' :
                                                            (localStorage.getItem('dropbox_token') ? 'Seleccionar Archivo en Dropbox' : 'Conectar Dropbox')}
                                                    </button>
                                                    <button
                                                        className="btn-secondary"
                                                        style={{ width: '100%' }}
                                                        onClick={async () => {
                                                            setIsSyncing(true);
                                                            try {
                                                                await syncToExternalFolder(true);
                                                                showMessage('Sincronización con Dropbox completada');
                                                            } catch (e: any) {
                                                                showMessage(e.message, 'error');
                                                            } finally {
                                                                setIsSyncing(false);
                                                            }
                                                        }}
                                                        disabled={!localStorage.getItem('dropbox_token')}
                                                    >
                                                        {isSyncing ? 'Sincronizando...' : 'Sincronizar Ya'}
                                                    </button>
                                                </div>
                                                {localStorage.getItem('dropbox_token') && (
                                                    <button
                                                        className="btn-secondary"
                                                        style={{
                                                            width: '100%',
                                                            color: '#f44336',
                                                            borderColor: 'rgba(244, 67, 54, 0.4)',
                                                            background: 'rgba(244, 67, 54, 0.05)',
                                                            fontSize: '0.85rem',
                                                            marginTop: '0.5rem'
                                                        }}
                                                        onClick={async () => {
                                                            if (window.confirm('¿Deseas desconectar tu cuenta de Dropbox?')) {
                                                                const { providers } = await import('../../services/syncService');
                                                                await (providers.dropbox as any).disconnect();
                                                                localStorage.removeItem('pcs_sync_mode');
                                                                setSyncModeState('local');
                                                                showMessage('Dropbox desconectado');
                                                            }
                                                        }}
                                                    >
                                                        Desconectar Cuenta
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                    </div>

                                    {/* Theme & Language */}
                                    <div className="glass-card">
                                        <h3 style={{ marginBottom: '1.5rem' }}>Personalización</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '1rem', opacity: 0.8 }}>Tema Visual</label>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                                                    {(['dark', 'light', 'ocean', 'emerald'] as Theme[]).map((tName) => (
                                                        <button
                                                            key={tName}
                                                            onClick={() => setTheme(tName)}
                                                            style={{
                                                                padding: '0.75rem',
                                                                borderRadius: 'var(--radius-md)',
                                                                border: `2px solid ${theme === tName ? 'var(--color-primary)' : 'transparent'}`,
                                                                background: 'var(--bg-surface-elevated)',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.75rem',
                                                                transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            <div style={{
                                                                width: '20px',
                                                                height: '20px',
                                                                borderRadius: '50%',
                                                                background: tName === 'dark' ? '#1a1a1a' :
                                                                    tName === 'light' ? '#ffffff' :
                                                                        tName === 'ocean' ? '#0077be' : '#10b981',
                                                                border: '1px solid rgba(255,255,255,0.1)'
                                                            }} />
                                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', textTransform: 'capitalize' }}>
                                                                {tName === 'dark' ? 'Oscuro' : tName === 'light' ? 'Claro' : tName === 'ocean' ? 'Océano' : 'Esmeralda'}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', opacity: 0.8 }}>Idioma</label>
                                                <select className="form-input" style={{ width: '100%' }} value={language}>
                                                    <option value="es">Español</option>
                                                    <option value="en">English</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Advanced / Maintenance */}
                                    <div className="glass-card">
                                        <h3 style={{ marginBottom: '1rem' }}>Mantenimiento</h3>
                                        <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '1rem' }}>
                                            Acciones avanzadas para gestionar tus datos manualmente.
                                        </p>
                                        <button
                                            className="btn-secondary"
                                            style={{ width: '100%', marginBottom: '0.75rem' }}
                                            onClick={async () => {
                                                try {
                                                    const result = await platformBridge.pickFile();
                                                    if (result && result.content) {
                                                        if (window.confirm('¿Estás seguro de que quieres cargar este archivo? Reemplazará los datos actuales si decides fusionarlos.')) {
                                                            await loadAndMergeFromFile(result.content);
                                                            await refreshFinance();
                                                            await refreshIncome();
                                                            showMessage('Datos importados correctamente');
                                                        }
                                                    }
                                                } catch (e: any) {
                                                    showMessage('Error al importar: ' + e.message, 'error');
                                                }
                                            }}
                                        >
                                            <FolderOpen size={16} style={{ marginRight: '0.5rem' }} />
                                            Importar JSON Manual
                                        </button>
                                        <button
                                            className="btn-text"
                                            style={{ width: '100%', color: 'var(--hue-danger)' }}
                                            onClick={async () => {
                                                if (window.confirm('¿BORRAR TODOS LOS DATOS LOCALES? Esta acción no se puede deshacer.')) {
                                                    localStorage.clear();
                                                    window.location.reload();
                                                }
                                            }}
                                        >
                                            <Trash2 size={16} style={{ marginRight: '0.5rem' }} />
                                            Resetear Aplicación
                                        </button>
                                    </div>

                                    {isCapacitor() && (
                                        <div className="glass-card" style={{ gridColumn: window.innerWidth < 800 ? '1' : 'span 2' }}>
                                            <h3 style={{ marginBottom: '1rem' }}>Ayuda Android</h3>
                                            <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                                                Te recomendamos FolderSync para sincronizar.
                                            </p>
                                        </div>
                                    )}

                                    <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
                                        <span style={{ opacity: 0.6, fontSize: '0.9rem' }}>
                                            Versión {__APP_VERSION__}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'accounts' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                                    <div className="responsive-grid-2">
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                                <h3 style={{ margin: 0 }}>Lista de Cuentas</h3>
                                                <button
                                                    onClick={() => setShowAccountForm(!showAccountForm)}
                                                    className="btn-primary"
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
                                                >
                                                    {showAccountForm ? <X size={18} /> : <PlusCircle size={18} />}
                                                    {showAccountForm ? 'Cerrar' : 'Añadir Cuenta'}
                                                </button>
                                            </div>
                                            <AccountList onEdit={setEditingAccount} />
                                        </div>
                                        <div>
                                            {showAccountForm && (
                                                <div className="glass-panel" style={{ animation: 'fadeIn 0.3s ease' }}>
                                                    <AccountForm
                                                        editingAccount={editingAccount}
                                                        onCancelEdit={() => { setEditingAccount(undefined); setShowAccountForm(false); }}
                                                        onClose={() => { setEditingAccount(undefined); setShowAccountForm(false); }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ borderTop: 'var(--card-border)', paddingTop: '3rem' }} className="responsive-grid-2">
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                                <h3 style={{ margin: 0 }}>Lista de Tarjetas</h3>
                                                <button
                                                    onClick={() => setShowCardForm(!showCardForm)}
                                                    className="btn-primary"
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
                                                >
                                                    {showCardForm ? <X size={18} /> : <PlusCircle size={18} />}
                                                    {showCardForm ? 'Cerrar' : 'Añadir Tarjeta'}
                                                </button>
                                            </div>
                                            <CardList onEdit={setEditingCard} />
                                        </div>
                                        <div>
                                            {showCardForm && (
                                                <div className="glass-panel" style={{ animation: 'fadeIn 0.3s ease' }}>
                                                    <CardForm
                                                        editingCard={editingCard}
                                                        onCancelEdit={() => { setEditingCard(undefined); setShowCardForm(false); }}
                                                        onClose={() => { setEditingCard(undefined); setShowCardForm(false); }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'savings' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                    <SavingsEvolutionChart />
                                    <div className="responsive-grid-2">
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                                <h3 style={{ margin: 0 }}>Mis Huchas</h3>
                                                <button
                                                    onClick={() => setShowSavingForm(!showSavingForm)}
                                                    className="btn-primary"
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
                                                >
                                                    {showSavingForm ? <X size={18} /> : <PlusCircle size={18} />}
                                                    {showSavingForm ? 'Cerrar' : 'Añadir Hucha'}
                                                </button>
                                            </div>
                                            <PiggyBankList onEdit={setEditingSaving} />
                                        </div>
                                        <div>
                                            {showSavingForm && (
                                                <div className="glass-panel" style={{ animation: 'fadeIn 0.3s ease' }}>
                                                    <PiggyBankForm
                                                        editingGoal={editingSaving}
                                                        onCancelEdit={() => { setEditingSaving(undefined); setShowSavingForm(false); }}
                                                        onClose={() => { setEditingSaving(undefined); setShowSavingForm(false); }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'fixedMovements' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                    <div className="responsive-grid-2">
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                                <h3 style={{ margin: 0 }}>Ingresos Fijos</h3>
                                                <button
                                                    onClick={() => setShowIncomeForm(!showIncomeForm)}
                                                    className="btn-primary"
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
                                                >
                                                    {showIncomeForm ? <X size={18} /> : <PlusCircle size={18} />}
                                                    {showIncomeForm ? 'Cerrar' : 'Añadir Ingreso'}
                                                </button>
                                            </div>
                                            <IncomeList showFixed={true} onlyFixed={true} />
                                        </div>
                                        <div>
                                            {showIncomeForm && (
                                                <div className="glass-panel" style={{ animation: 'fadeIn 0.3s ease' }}>
                                                    <IncomeForm initialType="fixed" restrictedType="fixed" onClose={() => setShowIncomeForm(false)} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="responsive-grid-2" style={{ borderTop: 'var(--card-border)', paddingTop: '2rem' }}>
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                                <h3 style={{ margin: 0 }}>Gastos Fijos</h3>
                                                <button
                                                    onClick={() => setShowRecurringForm(!showRecurringForm)}
                                                    className="btn-primary"
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
                                                >
                                                    {showRecurringForm ? <X size={18} /> : <PlusCircle size={18} />}
                                                    {showRecurringForm ? 'Cerrar' : 'Añadir Gasto Fijo'}
                                                </button>
                                            </div>
                                            <RecurringExpenseList />
                                        </div>
                                        <div>
                                            {showRecurringForm && (
                                                <div className="glass-panel" style={{ animation: 'fadeIn 0.3s ease' }}>
                                                    <RecurringExpenseForm onClose={() => setShowRecurringForm(false)} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'loans' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                    <DebtEvolutionChart />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-1rem' }}>
                                        <button
                                            onClick={() => setShowLoanForm(!showLoanForm)}
                                            className="btn-primary"
                                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
                                        >
                                            {showLoanForm ? <X size={18} /> : <PlusCircle size={18} />}
                                            {showLoanForm ? 'Cerrar' : 'Añadir Préstamo'}
                                        </button>
                                    </div>
                                    <LoanList />
                                    {showLoanForm && (
                                        <div className="glass-panel" style={{ animation: 'fadeIn 0.3s ease' }}>
                                            <LoanForm onClose={() => setShowLoanForm(false)} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {debugError && (
                                <div className="glass-panel" style={{ marginTop: '1rem', borderColor: '#f44336' }}>
                                    <h4 style={{ color: '#f44336' }}>Error de Depuración</h4>
                                    <textarea readOnly value={debugError} style={{ width: '100%', height: '100px' }} />
                                    <button onClick={() => setDebugError(null)}>Cerrar</button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {showDropboxPicker && (
                <DropboxFilePicker
                    onSelect={async (path) => {
                        const { setSyncProvider } = await import('../../services/syncService');
                        await setSyncProvider('dropbox', { path });
                        setShowDropboxPicker(false);
                        showMessage('Dropbox configurado');
                        await syncToExternalFolder(true);
                    }}
                    onClose={() => setShowDropboxPicker(false)}
                    currentPath={localStorage.getItem('pcs_dropbox_path') || ''}
                />
            )}

            {showSmbPicker && (
                <SmbFilePicker
                    config={{ share: smbShare, username: smbUser, password: smbPass }}
                    onSelect={async (path) => {
                        const { setSyncProvider } = await import('../../services/syncService');
                        await setSyncProvider('smb', { folder: path });
                        setShowSmbPicker(false);
                        showMessage('SMB configurado');
                        await syncToExternalFolder(true);
                    }}
                    onClose={() => setShowSmbPicker(false)}
                />
            )}
            {rolloverTarget && (
                <MonthRolloverModal
                    prevYear={rolloverTarget.year}
                    prevMonth={rolloverTarget.month}
                    finalBalance={rolloverTarget.balance}
                    nextMonthAvailable={rolloverTarget.nextMonthAvailable}
                    onClose={() => {
                        setRolloverTarget(null);
                        refreshClosings();
                    }}
                />
            )}
        </div>
    );
};

export default SettingsView;
