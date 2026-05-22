import React, { useState } from 'react';
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
    RefreshCw
} from 'lucide-react';
import { useAppSettings } from '../../contexts/AppSettingsContext';
import { useFinance } from '../../contexts/FinanceContext';
import { SyncService } from '../../services/syncService';
import { incomeDB } from '../../services/db';
import { DropboxService } from '../../services/dropboxService';
import { SUPPORTED_CURRENCIES, SUPPORTED_LANGUAGES, APP_THEMES } from '../../types/finance';
import DropboxFolderPicker from './DropboxFolderPicker';

import { useToast } from '../../contexts/ToastContext';

const AppSettingsView: React.FC = () => {
    const { settings, updateSettings, updateSyncSettings } = useAppSettings();
    const { importData } = useFinance();
    const { showToast } = useToast();
    const [showImportWarning, setShowImportWarning] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [showFolderPicker, setShowFolderPicker] = useState(false);

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

            {/* Zone 2: Backup & Database */}
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
                            { id: 'dropbox', icon: Cloud, label: 'Dropbox' }
                        ].map(type => (
                            <button
                                key={type.id}
                                onClick={() => updateSyncSettings({ type: type.id as any })}
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
                                <type.icon size={16} /> {type.label}
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
                                                {settings.sync.dropboxToken && (
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
                                                {settings.sync.dropboxToken ? `${settings.sync.dropboxUserEmail || 'Usuario vinculado'}` : 'No conectado'}
                                            </p>
                                        </div>
                                    </div>
                                    {!settings.sync.dropboxToken && (
                                        <button 
                                            onClick={() => {
                                                const url = DropboxService.getAuthUrl();
                                                window.location.href = url;
                                            }}
                                            style={{ background: '#0061FF', color: 'white', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 700 }}
                                        >
                                            Conectar Cuenta
                                        </button>
                                    )}
                                </div>

                                {settings.sync.dropboxToken && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.25rem' }}>
                                        {/* Path configuration */}
                                        <div>
                                            <label style={labelStyle}><FolderOpen size={16} /> Carpeta en Dropbox</label>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <div style={{ 
                                                    ...selectStyle, 
                                                    flex: 1, 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: '0.5rem',
                                                    background: 'rgba(255,255,255,0.03)',
                                                    cursor: 'default'
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
                                                        whiteSpace: 'nowrap'
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
                                                        updateSyncSettings({ lastSync: timestamp });
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
                                                onClick={() => updateSyncSettings({ dropboxToken: undefined, dropboxUserEmail: undefined })}
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
                            
                            {showFolderPicker && (
                                <DropboxFolderPicker 
                                    currentPath={settings.sync.dropboxPath || '/'}
                                    onSelect={(path) => updateSyncSettings({ dropboxPath: path })}
                                    onClose={() => setShowFolderPicker(false)}
                                />
                            )}
                            {!settings.sync.dropboxToken && (
                                <p style={{ fontSize: '0.75rem', opacity: 0.4, margin: 0, fontStyle: 'italic' }}>
                                    Al conectar Dropbox, la app podrá leer y escribir el archivo 'pcshogar_data.json' en tu cuenta para sincronizar con otros dispositivos.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default AppSettingsView;
