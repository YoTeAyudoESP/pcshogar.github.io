import React, { useState, useEffect } from 'react';
import { 
    Globe, 
    Coins, 
    Palette, 
    Database, 
    Cloud, 
    Server, 
    FolderOpen, 
    FileJson, 
    Download, 
    Upload, 
    AlertCircle,
    Check,
    X,
    HardDrive,
    Save,
    RefreshCw,
    Shield,
    Fingerprint,
    Bell,
    Monitor
} from 'lucide-react';
import { useAppSettings } from '../../contexts/AppSettingsContext';
import { useFinance } from '../../contexts/FinanceContext';
import { SyncService } from '../../services/syncService';
import { incomeDB } from '../../services/db';
import { DropboxService } from '../../services/dropboxService';
import { GoogleDriveService } from '../../services/googleDriveService';
import { SUPPORTED_CURRENCIES, SUPPORTED_LANGUAGES, APP_THEMES } from '../../types/finance';
import DropboxFolderPicker from './DropboxFolderPicker';
import GoogleDriveFolderPicker from './GoogleDriveFolderPicker';
import { useToast } from '../../contexts/ToastContext';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { UpdateService } from '../../services/updateService';
import versionInfo from '../../../public/version.json';

interface APKInstallerPlugin {
    downloadAndInstall(options: { url: string }): Promise<void>;
}

const APKInstaller = registerPlugin<APKInstallerPlugin>('APKInstaller');

const AppSettingsView: React.FC = () => {
    const { settings, updateSettings, updateSyncSettings, activeProfile, activeEconomy, setProfilePin, setProfileBiometric } = useAppSettings();
    const { importData, refreshFinance } = useFinance();
    const { showToast } = useToast();
    const [dropboxConnected, setDropboxConnected] = useState(() => DropboxService.isConnected());
    const [googleConnected, setGoogleConnected] = useState(() => GoogleDriveService.isConnected());

    // Re-read the real connection state whenever this view becomes visible.
    // This handles the case where the user chose "Continuar sin conexión" at
    // startup — the token is still stored but the session is not verified.
    useEffect(() => {
        const refresh = () => {
            setDropboxConnected(DropboxService.isConnected());
            setGoogleConnected(GoogleDriveService.isConnected());
        };
        refresh(); // run immediately on mount
        window.addEventListener('focus', refresh);
        return () => window.removeEventListener('focus', refresh);
    }, [settings.sync.dropboxToken, settings.sync.googledriveToken]);
    const [showImportWarning, setShowImportWarning] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [showFolderPicker, setShowFolderPicker] = useState(false);
    const [showGoogleDriveFolderPicker, setShowGoogleDriveFolderPicker] = useState(false);
    const [pinInput, setPinInput] = useState('');

    const [downloadUrlAndroid, setDownloadUrlAndroid] = useState(versionInfo.url);
    const [downloadUrlWindows, setDownloadUrlWindows] = useState(versionInfo.windowsUrl);
    const [checking, setChecking] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [progress, setProgress] = useState(0);

    const isElectron = typeof window !== 'undefined' && !!(window as any).require;
    const isApp = Capacitor.isNativePlatform() || isElectron;

    useEffect(() => {
        if (!isApp) {
            fetch('https://pcshogar.es/version.json')
                .then(res => res.json())
                .then(data => {
                    if (data.url) setDownloadUrlAndroid(data.url);
                    if (data.windowsUrl) setDownloadUrlWindows(data.windowsUrl);
                })
                .catch(err => console.log('Error fetching latest download URLs:', err));
        }
    }, [isApp]);

    const handleCheckUpdate = async () => {
        setChecking(true);
        try {
            const info = await UpdateService.checkUpdate();
            if (info.hasUpdate) {
                if (window.confirm(`Nueva versión disponible: v${info.latestVersion}.\n¿Deseas descargar e instalar la actualización automáticamente ahora?`)) {
                    const isElectron = typeof window !== 'undefined' && !!(window as any).require;
                    if (isElectron) {
                        const { ipcRenderer } = (window as any).require('electron');
                        setDownloading(true);
                        setProgress(0);

                        const progressListener = (_event: any, pct: number) => {
                            setProgress(pct);
                        };
                        ipcRenderer.on('download-progress', progressListener);

                        ipcRenderer.invoke('download-and-install-update', info.downloadUrl)
                            .catch((err: any) => {
                                console.error('Failed to install update:', err);
                                showToast('Error al descargar la actualización de forma automática. Intentando descarga manual...', 'error');
                                window.open(info.downloadUrl, '_system');
                                setDownloading(false);
                            })
                            .finally(() => {
                                ipcRenderer.removeListener('download-progress', progressListener);
                            });
                    } else if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
                        setDownloading(true);
                        setProgress(0);

                        let listener: any = null;
                        try {
                            listener = await (APKInstaller as any).addListener('downloadProgress', (data: { progress: number }) => {
                                setProgress(data.progress);
                            });

                            await APKInstaller.downloadAndInstall({ url: info.downloadUrl });
                        } catch (err: any) {
                            console.error('Failed to install update on Android:', err);
                            showToast('Error al descargar la actualización de forma automática. Intentando descarga manual...', 'error');
                            window.open(info.downloadUrl, '_system');
                        } finally {
                            if (listener) {
                                listener.remove();
                            }
                            setDownloading(false);
                        }
                    } else {
                        window.open(info.downloadUrl, '_system');
                    }
                }
            } else {
                showToast(`Estás utilizando la versión más reciente (v${info.currentVersion}).`, 'success');
            }
        } catch (error) {
            console.error(error);
            showToast('No se pudo comprobar la actualización. Verifica tu conexión.', 'error');
        } finally {
            setChecking(false);
        }
    };

    const handleSavePin = async () => {
        if (pinInput.length !== 4) {
            showToast('El PIN debe tener exactamente 4 dígitos', 'error');
            return;
        }
        await setProfilePin(pinInput);
        showToast('PIN configurado con éxito', 'success');
        setPinInput('');
    };

    const handleRemovePin = async () => {
        if (window.confirm('¿Estás seguro de que deseas desactivar el PIN de bloqueo? Cualquiera con acceso al dispositivo podrá abrir la app.')) {
            await setProfilePin(null);
            showToast('PIN desactivado con éxito', 'success');
            setPinInput('');
        }
    };

    const isBetaEnabled = () => {
        return window.location.origin.includes('localhost') || 
               window.location.origin.startsWith('file://') || 
               (window as any).require;
    };

    const handleExport = async () => {
        const data = await incomeDB.exportFullData();
        const dateStr = new Date().toISOString().split('T')[0];
        SyncService.exportToJSON(data, `pcshogar_backup_${dateStr}.json`);
        showToast('Copia de seguridad exportada', 'success');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImportFile(e.target.files[0]);
            setShowImportWarning(true);
        }
    };

    const confirmImport = async () => {
        if (!importFile) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                await importData(data);
                showToast('Importación completada con éxito', 'success');
            } catch (err) {
                showToast('Archivo no válido', 'error');
                console.error(err);
            } finally {
                setShowImportWarning(false);
                setImportFile(null);
            }
        };
        reader.readAsText(importFile);
    };

    const groupStyle: React.CSSProperties = {
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '1.25rem',
        padding: '1.5rem',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
    };

    const labelStyle: React.CSSProperties = {
        fontSize: '0.9rem',
        fontWeight: 600,
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.75rem'
    };

    const selectStyle: React.CSSProperties = {
        width: '100%',
        padding: '0.8rem',
        borderRadius: '0.75rem',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: 'white',
        fontSize: '1rem',
        cursor: 'pointer'
    };

    const zoneTitleStyle: React.CSSProperties = {
        fontSize: '1.1rem',
        fontWeight: 700,
        marginBottom: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem'
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Zone 1: General Settings */}
            <section style={groupStyle}>
                <h3 style={zoneTitleStyle}><Globe size={20} color="var(--color-primary)" /> Configuración General</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                    <div>
                        <label style={labelStyle}><Coins size={16} /> Moneda Principal</label>
                        <select 
                            style={selectStyle} 
                            value={settings.currency}
                            onChange={(e) => updateSettings({ currency: e.target.value })}
                        >
                            {SUPPORTED_CURRENCIES.map(c => (
                                <option key={c.code} value={c.code}>{c.name} ({c.symbol})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}><Globe size={16} /> Idioma</label>
                        <select 
                            style={selectStyle}
                            value={settings.language}
                            onChange={(e) => updateSettings({ language: e.target.value })}
                        >
                            {SUPPORTED_LANGUAGES.map(l => (
                                <option key={l.code} value={l.code}>{l.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label style={labelStyle}><Palette size={16} /> Tema Visual</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1rem' }}>
                        {APP_THEMES.map(t => (
                            <button
                                key={t.id}
                                onClick={() => updateSettings({ theme: t.id })}
                                style={{
                                    padding: '1rem',
                                    borderRadius: '0.75rem',
                                    border: '2px solid',
                                    borderColor: settings.theme === t.id ? 'var(--color-primary)' : 'transparent',
                                    background: settings.theme === t.id ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <div style={{ 
                                    width: '32px', 
                                    height: '32px', 
                                    borderRadius: '50%', 
                                    background: `linear-gradient(135deg, ${t.colors.primary}, ${t.colors.secondary})`
                                }} />
                                <span style={{ fontSize: '0.8rem', fontWeight: settings.theme === t.id ? 700 : 500 }}>{t.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {isBetaEnabled() && (
                <section style={groupStyle}>
                    <h3 style={zoneTitleStyle}><Shield size={20} color="var(--color-primary)" /> Seguridad y Privacidad (Beta)</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0 0 1rem 0', lineHeight: 1.4 }}>
                        Protege el acceso a tus datos financieros locales con un código PIN de 4 dígitos. Al activarlo, se solicitará al abrir la aplicación.
                    </p>
                    
                    {activeProfile?.pinHash ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '0.95rem', fontWeight: 600 }}>
                                <Check size={18} />
                                <span>Bloqueo por PIN activado</span>
                            </div>
                            <button
                                onClick={handleRemovePin}
                                style={{
                                    background: 'rgba(244, 63, 94, 0.1)',
                                    border: '1px solid rgba(244, 63, 94, 0.2)',
                                    color: '#f43f5e',
                                    padding: '10px 16px',
                                    borderRadius: '10px',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    width: 'fit-content',
                                    transition: 'background-color 0.2s'
                                }}
                            >
                                Desactivar PIN de Bloqueo
                            </button>

                            {/* Biometric Auth Toggle */}
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                padding: '1rem', 
                                background: 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                borderRadius: '12px',
                                marginTop: '0.5rem',
                                maxWidth: '360px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Fingerprint size={20} color="var(--color-primary)" />
                                    <div style={{ textAlign: 'left' }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Acceso Biométrico</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Entrar con huella o rostro en Android</div>
                                    </div>
                                </div>
                                <div style={{ 
                                    width: '40px', height: '24px', borderRadius: '12px', 
                                    background: activeProfile?.biometricEnabled ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
                                    cursor: 'pointer', position: 'relative', transition: '0.3s',
                                    flexShrink: 0
                                }} onClick={() => setProfileBiometric(!activeProfile?.biometricEnabled)}>
                                    <div style={{ 
                                        width: '18px', height: '18px', borderRadius: '50%', background: 'white',
                                        position: 'absolute', top: '3px', left: activeProfile?.biometricEnabled ? '19px' : '3px',
                                        transition: '0.3s'
                                    }} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <label style={labelStyle}>Configurar nuevo PIN (4 números)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <input
                                    type="password"
                                    maxLength={4}
                                    placeholder="PIN"
                                    value={pinInput}
                                    onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '10px',
                                        color: 'white',
                                        outline: 'none',
                                        width: '80px',
                                        letterSpacing: '0.15em',
                                        textIndent: '0.08em',
                                        textAlign: 'center',
                                        fontSize: '1.2rem',
                                        padding: '8px'
                                    }}
                                />
                                <button
                                    onClick={handleSavePin}
                                    style={{
                                        background: 'var(--color-primary)',
                                        border: 'none',
                                        color: '#ffffff',
                                        padding: '10px 16px',
                                        borderRadius: '10px',
                                        fontSize: '0.9rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        height: '42px',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    Activar Bloqueo
                                </button>
                            </div>
                        </div>
                    )}
                </section>
            )}

            <section style={groupStyle}>
                <h3 style={zoneTitleStyle}><Database size={20} color="#10b981" /> Bases de Datos y Seguridad</h3>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                    <button 
                        onClick={handleExport}
                        style={{
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                            color: '#10b981',
                            padding: '1rem 1.5rem',
                            borderRadius: '0.75rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            fontWeight: 600,
                            flex: 1,
                            minWidth: '200px'
                        }}
                    >
                        <Download size={20} /> Crear Copia de Seguridad (.json)
                    </button>

                    <label style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        padding: '1rem 1.5rem',
                        borderRadius: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        fontWeight: 600,
                        flex: 1,
                        minWidth: '200px'
                    }}>
                        <Upload size={20} /> Importar Datos desde JSON
                        <input type="file" accept=".json" onChange={handleFileChange} style={{ display: 'none' }} />
                    </label>
                </div>

                {showImportWarning && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        padding: '1.25rem',
                        borderRadius: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                    }}>
                        <div style={{ display: 'flex', gap: '0.75rem', color: '#ef4444' }}>
                            <AlertCircle size={24} />
                            <div>
                                <p style={{ margin: 0, fontWeight: 700 }}>¿Confirmar Importación?</p>
                                <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.8 }}>
                                    Esto eliminará todos los datos actuales de la app y los sustituirá por los del archivo. ¡Esta acción no se puede deshacer!
                                </p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={confirmImport} style={{ flex: 1, padding: '0.6rem', border: 'none', borderRadius: '0.5rem', background: '#ef4444', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Sí, Importar y Sobrescribir</button>
                            <button onClick={() => setShowImportWarning(false)} style={{ flex: 1, padding: '0.6rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', background: 'transparent', color: 'white', cursor: 'pointer' }}>Cancelar</button>
                        </div>
                    </div>
                )}
            </section>

            {/* Zone 3: Advanced Sync (Local/Dropbox/SMB) */}
            <section style={groupStyle}>
                <h3 style={zoneTitleStyle}><Save size={20} color="#6366f1" /> Conectividad y Sincronización Automática</h3>
                <p style={{ fontSize: '0.85rem', opacity: 0.6, marginTop: '-0.5rem' }}>
                    Configura una ruta para que la app guarde una copia JSON actualizada en tiempo real tras cada cambio.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Auto-Sync Toggle */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ 
                                width: '40px', height: '24px', borderRadius: '12px', 
                                background: settings.sync.enabled ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
                                cursor: 'pointer', position: 'relative', transition: '0.3s'
                            }} onClick={() => updateSyncSettings({ enabled: !settings.sync.enabled })}>
                                <div style={{ 
                                    width: '18px', height: '18px', borderRadius: '50%', background: 'white',
                                    position: 'absolute', top: '3px', left: settings.sync.enabled ? '19px' : '3px',
                                    transition: '0.3s'
                                }} />
                            </div>
                            <span style={{ fontWeight: 600 }}>Sincronización en Tiempo Real</span>
                        </div>
                        {settings.sync.enabled && settings.sync.lastSync && settings.sync.lastSync > 0 && (
                            <span style={{ fontSize: '0.75rem', opacity: 0.4 }}>Última sinc: {new Date(settings.sync.lastSync).toLocaleTimeString()}</span>
                        )}
                    </div>

                    {/* Sync Type Selector */}
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                        {[
                            { id: 'local', icon: HardDrive, label: 'Local' },
                            { id: 'smb', icon: Server, label: 'SMB (Red)' },
                            { id: 'dropbox', icon: Cloud, label: 'Dropbox' },
                            { id: 'googledrive', icon: Cloud, label: 'Google Drive' }
                        ].map(type => (
                            <button
                                key={type.id}
                                onClick={() => {
                                    const newType = type.id as any;
                                    const extra: any = {};
                                    if (newType === 'dropbox') {
                                        extra.googledriveToken = undefined;
                                        extra.googledriveUserEmail = undefined;
                                    } else if (newType === 'googledrive') {
                                        extra.dropboxToken = undefined;
                                        extra.dropboxUserEmail = undefined;
                                    }
                                    updateSyncSettings({ type: newType, ...extra });
                                }}
                                style={{
                                    flex: '1 1 100px', // Allow wrapping with a base width
                                    padding: '0.8rem 0.5rem',
                                    borderRadius: '0.75rem',
                                    border: '1px solid',
                                    borderColor: settings.sync.type === type.id ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
                                    background: settings.sync.type === type.id ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                    color: settings.sync.type === type.id ? 'white' : 'rgba(255,255,255,0.4)',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: '0.85rem'
                                }}
                            >
                                <type.icon size={16} color={type.id === 'googledrive' && settings.sync.type === type.id ? '#34A853' : type.id === 'dropbox' && settings.sync.type === type.id ? '#0061FF' : undefined} /> {type.label}
                            </button>
                        ))}
                    </div>

                    {/* Dynamic config fields */}
                    {settings.sync.type === 'local' && (
                        <div>
                            <label style={labelStyle}><FolderOpen size={16} /> Ruta local del archivo .json</label>
                            <input 
                                style={{ ...selectStyle, cursor: 'text' }}
                                value={settings.sync.localPath || ''}
                                onChange={(e) => updateSyncSettings({ localPath: e.target.value })}
                                placeholder="ej: C:\backups\pcshogar.json"
                            />
                            <p style={{ fontSize: '0.7rem', opacity: 0.4, marginTop: '0.5rem' }}>
                                Nota: Asegúrate de incluir el nombre del archivo al final de la ruta.
                            </p>
                        </div>
                    )}

                    {settings.sync.type === 'smb' && (
                        <div style={{ textAlign: 'center', padding: '1rem', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '0.75rem' }}>
                            <p style={{ opacity: 0.5, fontSize: '0.9rem' }}>Conexión SMB próximamente...</p>
                        </div>
                    )}

                    {settings.sync.type === 'dropbox' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ 
                                padding: '1.25rem', 
                                border: '1px solid rgba(255,255,255,0.1)', 
                                borderRadius: '1rem',
                                background: 'rgba(255,255,255,0.02)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <Cloud size={24} color="#0061FF" />
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>Estado de Dropbox</p>
                                                {dropboxConnected && (
                                                    <span style={{ 
                                                        background: 'rgba(16, 185, 129, 0.15)', 
                                                        color: '#10b981', 
                                                        fontSize: '0.65rem', 
                                                        padding: '2px 8px', 
                                                        borderRadius: '12px',
                                                        fontWeight: 800,
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.05em'
                                                    }}>
                                                        Conectado
                                                    </span>
                                                )}
                                            </div>
                                            <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.6 }}>
                                                {dropboxConnected ? `${settings.sync.dropboxUserEmail || 'Usuario vinculado'}` : 'No conectado'}
                                            </p>
                                        </div>
                                    </div>
                                    {!dropboxConnected && (
                                        <button 
                                            onClick={() => {
                                                const url = DropboxService.getAuthUrl();
                                                const isElectron = !!(window as any).require;
                                                if (isElectron) {
                                                    const { ipcRenderer } = (window as any).require('electron');
                                                    showToast('Abriendo ventana de autenticación...', 'info');
                                                    ipcRenderer.invoke('connect-dropbox', url)
                                                        .then((token: string) => {
                                                            DropboxService.init(token, settings.sync.dropboxPath);
                                                            DropboxService.getUserInfo().then(user => {
                                                                updateSyncSettings({
                                                                    dropboxToken: token,
                                                                    dropboxUserEmail: user.email,
                                                                    enabled: true,
                                                                    type: 'dropbox'
                                                                });
                                                                setDropboxConnected(true);
                                                                showToast(`Dropbox conectado con éxito: ${user.email}`, 'success');
                                                            }).catch(err => {
                                                                console.error("Error fetching dropbox user", err);
                                                                showToast("Error al conectar con Dropbox.", 'error');
                                                            });
                                                        })
                                                        .catch((err: any) => {
                                                            console.error("Dropbox auth failed", err);
                                                            showToast("Autenticación cancelada o fallida.", 'error');
                                                        });
                                                } else {
                                                    window.location.href = url;
                                                }
                                            }}
                                            style={{ background: '#0061FF', color: 'white', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 700 }}
                                        >
                                            Conectar Cuenta
                                        </button>
                                    )}
                                </div>

                                {dropboxConnected && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.25rem' }}>
                                        {/* Path configuration */}
                                        <div>
                                            <label style={labelStyle}><FolderOpen size={16} /> Carpeta en Dropbox</label>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                <div style={{ 
                                                    ...selectStyle, 
                                                    flex: '1 1 200px', 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: '0.5rem',
                                                    background: 'rgba(255,255,255,0.03)',
                                                    cursor: 'default',
                                                    minWidth: '200px'
                                                }}>
                                                    <FileJson size={16} color="rgba(255,255,255,0.3)" />
                                                    <span style={{ fontSize: '0.85rem', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {settings.sync.dropboxPath || '/pcshogar_data.json'}
                                                    </span>
                                                </div>
                                                <button 
                                                    onClick={() => setShowFolderPicker(true)}
                                                    style={{ 
                                                        background: 'rgba(255,255,255,0.05)', 
                                                        color: 'white', 
                                                        border: '1px solid rgba(255,255,255,0.1)', 
                                                        padding: '0.5rem 1rem', 
                                                        borderRadius: '0.75rem', 
                                                        cursor: 'pointer',
                                                        fontWeight: 600,
                                                        fontSize: '0.85rem',
                                                        whiteSpace: 'nowrap',
                                                        flex: '1 1 auto',
                                                        height: '44px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    Cambiar
                                                </button>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                                            <button 
                                                onClick={async () => {
                                                    try {
                                                        showToast('Sincronizando con la nube...', 'sync');
                                                        const timestamp = await DropboxService.sync();
                                                        updateSyncSettings({ lastSync: timestamp || Date.now() });
                                                        await refreshFinance();
                                                        showToast('Sincronización manual completada', 'success');
                                                    } catch (e) {
                                                        showToast('Error en la sincronización', 'error');
                                                    }
                                                }}
                                                style={{ 
                                                    flex: 2, 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center', 
                                                    gap: '0.6rem', 
                                                    background: 'var(--color-primary)', 
                                                    color: 'white', 
                                                    border: 'none', 
                                                    padding: '0.85rem', 
                                                    borderRadius: '0.75rem', 
                                                    cursor: 'pointer', 
                                                    fontWeight: 700,
                                                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                                                }}
                                            >
                                                <RefreshCw size={18} /> Sincronizar Ahora
                                            </button>
                                            <button 
                                                onClick={() => { 
                                                    DropboxService.disconnect();
                                                    setDropboxConnected(false);
                                                    updateSyncSettings({ dropboxToken: undefined, dropboxUserEmail: undefined });
                                                }}
                                                style={{ 
                                                    flex: 1, 
                                                    background: 'rgba(239, 68, 68, 0.05)', 
                                                    color: '#ef4444', 
                                                    border: '1px solid rgba(239, 68, 68, 0.2)', 
                                                    padding: '0.85rem', 
                                                    borderRadius: '0.75rem', 
                                                    fontSize: '0.85rem', 
                                                    cursor: 'pointer', 
                                                    fontWeight: 600,
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                Desconectar
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {showFolderPicker && (() => {
                                // Extract just the file name from the active economy's dropbox path
                                const currentDropboxPath = activeEconomy?.sync?.dropboxPath || settings.sync.dropboxPath || '/pcshogar_data.json';
                                const currentFileName = currentDropboxPath.split('/').pop() || 'pcshogar_data.json';
                                const currentFolder = currentDropboxPath.substring(0, currentDropboxPath.lastIndexOf('/')) || '/';
                                return (
                                    <DropboxFolderPicker 
                                        currentPath={currentFolder}
                                        fileName={currentFileName}
                                        onSelect={(path) => updateSyncSettings({ dropboxPath: path })}
                                        onClose={() => setShowFolderPicker(false)}
                                    />
                                );
                            })()}

                            {showGoogleDriveFolderPicker && (() => {
                                const currentPath = activeEconomy?.sync?.googledrivePath || settings.sync.googledrivePath || 'pcshogar_data.json';
                                const currentFileName = currentPath.split('/').pop() || 'pcshogar_data.json';
                                const currentFolder = currentPath.substring(0, currentPath.lastIndexOf('/')) || '';
                                return (
                                    <GoogleDriveFolderPicker 
                                        currentPath={currentFolder} 
                                        fileName={currentFileName}
                                        onSelect={(path) => updateSyncSettings({ googledrivePath: path })}
                                        onClose={() => setShowGoogleDriveFolderPicker(false)}
                                    />
                                );
                            })()}
                            
                            {!settings.sync.dropboxToken && (
                                <p style={{ fontSize: '0.75rem', opacity: 0.4, margin: 0, fontStyle: 'italic' }}>
                                    Al conectar Dropbox, la app podrá leer y escribir el archivo 'pcshogar_data.json' en tu cuenta para sincronizar con otros dispositivos.
                                </p>
                            )}
                        </div>
                    )}

                    {settings.sync.type === 'googledrive' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ 
                                padding: '1.25rem', 
                                border: '1px solid rgba(255,255,255,0.1)', 
                                borderRadius: '1rem',
                                background: 'rgba(255,255,255,0.02)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <Cloud size={24} color="#34A853" />
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>Estado de Google Drive</p>
                                                {settings.sync.googledriveToken && (
                                                    <span style={{ 
                                                        background: 'rgba(16, 185, 129, 0.15)', 
                                                        color: '#10b981', 
                                                        fontSize: '0.65rem', 
                                                        padding: '2px 8px', 
                                                        borderRadius: '12px',
                                                        fontWeight: 800,
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.05em'
                                                    }}>
                                                        Conectado
                                                    </span>
                                                )}
                                            </div>
                                            <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.6 }}>
                                                {settings.sync.googledriveToken ? `${settings.sync.googledriveUserEmail || 'Usuario vinculado'}` : 'No conectado'}
                                            </p>
                                        </div>
                                    </div>
                                    {!settings.sync.googledriveToken && (
                                        <button 
                                            onClick={() => {
                                                const url = GoogleDriveService.getAuthUrl('googledrive');
                                                const isElectron = !!(window as any).require;
                                                if (isElectron) {
                                                    const { ipcRenderer } = (window as any).require('electron');
                                                    showToast('Abriendo ventana de autenticación...', 'info');
                                                    ipcRenderer.invoke('connect-dropbox', url)
                                                        .then((token: string) => {
                                                            GoogleDriveService.init(token, settings.sync.googledrivePath || 'pcshogar_data.json');
                                                            GoogleDriveService.getUserInfo().then(user => {
                                                                updateSyncSettings({
                                                                    googledriveToken: token,
                                                                    googledriveUserEmail: user.email,
                                                                    enabled: true,
                                                                    type: 'googledrive',
                                                                    dropboxToken: undefined,
                                                                    dropboxUserEmail: undefined
                                                                });
                                                                showToast(`Google Drive conectado con éxito: ${user.email}`, 'success');
                                                            }).catch(err => {
                                                                console.error("Error fetching google user info", err);
                                                                showToast("Error al conectar con Google Drive.", 'error');
                                                            });
                                                        })
                                                        .catch((err: any) => {
                                                            console.error("Google Drive auth failed", err);
                                                            showToast("Autenticación cancelada o fallida.", 'error');
                                                        });
                                                } else {
                                                    window.location.href = url;
                                                }
                                            }}
                                            style={{ background: '#34A853', color: 'white', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 700 }}
                                        >
                                            Conectar Cuenta
                                        </button>
                                    )}
                                </div>

                                {settings.sync.googledriveToken && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.25rem' }}>
                                        <div>
                                            <label style={labelStyle}><FolderOpen size={16} /> Archivo en Google Drive</label>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                <div style={{ 
                                                    ...selectStyle, 
                                                    flex: '1 1 200px', 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: '0.5rem',
                                                    background: 'rgba(255,255,255,0.03)',
                                                    cursor: 'default',
                                                    minWidth: '200px'
                                                }}>
                                                    <FileJson size={16} color="rgba(255,255,255,0.3)" />
                                                    <span style={{ fontSize: '0.85rem', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {settings.sync.googledrivePath || 'pcshogar_data.json'}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => setShowGoogleDriveFolderPicker(true)}
                                                    style={{ 
                                                        background: 'rgba(255, 255, 255, 0.05)',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        color: 'white',
                                                        borderRadius: '0.75rem', 
                                                        fontSize: '0.85rem', 
                                                        cursor: 'pointer', 
                                                        fontWeight: 600,
                                                        flex: '0 0 auto', 
                                                        padding: '0.75rem 1rem' 
                                                    }}
                                                >
                                                    Cambiar
                                                </button>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                                            <button 
                                                onClick={async () => {
                                                    try {
                                                        showToast('Sincronizando con Google Drive...', 'sync');
                                                        const timestamp = await GoogleDriveService.sync();
                                                        updateSyncSettings({ lastSync: timestamp || Date.now() });
                                                        await refreshFinance();
                                                        showToast('Sincronización manual completada', 'success');
                                                    } catch (e) {
                                                        showToast('Error en la sincronización', 'error');
                                                    }
                                                }}
                                                style={{ 
                                                    flex: 2, 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center', 
                                                    gap: '0.6rem', 
                                                    background: 'var(--color-primary)', 
                                                    color: 'white', 
                                                    border: 'none', 
                                                    padding: '0.85rem', 
                                                    borderRadius: '0.75rem', 
                                                    cursor: 'pointer', 
                                                    fontWeight: 700,
                                                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                                                }}
                                            >
                                                <RefreshCw size={18} /> Sincronizar Ahora
                                            </button>
                                            <button 
                                                onClick={() => updateSyncSettings({ googledriveToken: undefined, googledriveUserEmail: undefined })}
                                                style={{ 
                                                    flex: 1, 
                                                    background: 'rgba(239, 68, 68, 0.05)', 
                                                    color: '#ef4444', 
                                                    border: '1px solid rgba(239, 68, 68, 0.2)', 
                                                    padding: '0.85rem', 
                                                    borderRadius: '0.75rem', 
                                                    fontSize: '0.85rem', 
                                                    cursor: 'pointer', 
                                                    fontWeight: 600,
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                Desconectar
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {!settings.sync.googledriveToken && (
                                <p style={{ fontSize: '0.75rem', opacity: 0.4, margin: 0, fontStyle: 'italic' }}>
                                    Al conectar Google Drive, la app podrá leer y escribir el archivo 'pcshogar_data.json' en tu cuenta de Google Drive para sincronizar con otros dispositivos.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </section>

            {/* Zone 5: Aplicación */}
            <section style={groupStyle}>
                <h3 style={zoneTitleStyle}><Monitor size={20} color="var(--color-primary)" /> Aplicación</h3>
                <style dangerouslySetInnerHTML={{__html: "@keyframes spin { 100% { transform: rotate(360deg); } }" }} />
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    
                    {/* Toggle: Aviso de pagos pendientes */}
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '1rem', 
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '12px',
                        maxWidth: '500px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Bell size={20} color="var(--color-primary)" />
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Aviso de pagos pendientes</div>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>Avisar de los gastos fijos previstos para mañana al abrir la aplicación</div>
                            </div>
                        </div>
                        <div style={{ 
                            width: '40px', height: '24px', borderRadius: '12px', 
                            background: settings.notifyNextDayPayments ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
                            cursor: 'pointer', position: 'relative', transition: '0.3s',
                            flexShrink: 0
                        }} onClick={() => updateSettings({ notifyNextDayPayments: !settings.notifyNextDayPayments })}>
                            <div style={{ 
                                width: '18px', height: '18px', borderRadius: '50%', background: 'white',
                                position: 'absolute', top: '3px', left: settings.notifyNextDayPayments ? '19px' : '3px',
                                transition: '0.3s'
                            }} />
                        </div>
                    </div>

                    {/* Comprobar actualizaciones */}
                    <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        padding: '1rem', 
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '12px',
                        maxWidth: '500px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <RefreshCw size={20} color="var(--color-primary)" />
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Actualizaciones de Software</div>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>Versión actual instalada: <strong>v{versionInfo.version}</strong></div>
                            </div>
                        </div>

                        {downloading ? (
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
                                    <span>Descargando actualización...</span>
                                    <span>{progress}%</span>
                                </div>
                                <div style={{
                                    width: '100%',
                                    height: '6px',
                                    background: 'rgba(255,255,255,0.1)',
                                    borderRadius: '3px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        width: `${progress}%`,
                                        height: '100%',
                                        background: 'linear-gradient(90deg, #10b981, #34d399)',
                                        transition: 'width 0.1s ease'
                                    }} />
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={handleCheckUpdate}
                                disabled={checking}
                                style={{
                                    marginTop: '0.5rem',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    color: 'white',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    fontWeight: 600,
                                    fontSize: '0.85rem',
                                    cursor: checking ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={e => { if (!checking) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                                onMouseLeave={e => { if (!checking) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                            >
                                <RefreshCw size={14} style={{ animation: checking ? 'spin 1.5s linear infinite' : 'none' }} />
                                {checking ? 'Comprobando...' : 'Comprobar actualizaciones'}
                            </button>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default AppSettingsView;
