import React, { useState } from 'react';
import { useAppSettings } from '../../contexts/AppSettingsContext';
import { X, Plus, Trash2, Home, Building2, Briefcase, Wallet, HardDrive, Cloud, Info, FolderOpen, Check } from 'lucide-react';
import DropboxFolderPicker from './DropboxFolderPicker';
import { DropboxService } from '../../services/dropboxService';
import { useToast } from '../../contexts/ToastContext';

interface EconomyManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const EconomyManagementModal: React.FC<EconomyManagementModalProps> = ({ isOpen, onClose }) => {
    const { activeProfile, activeEconomy, addEconomy, deleteEconomy, settings, updateSyncSettings } = useAppSettings();
    const { showToast } = useToast();
    const [name, setName] = useState('');
    const [syncType, setSyncType] = useState<'local' | 'dropbox' | 'googledrive'>('local');
    const [syncPath, setSyncPath] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [showFolderPicker, setShowFolderPicker] = useState(false);
    const [isConnectingDropbox, setIsConnectingDropbox] = useState(false);
    // Track actual Dropbox service connection (not just stored token)
    const [dropboxConnected, setDropboxConnected] = useState(() => DropboxService.isConnected());
    // Inline delete confirmation: stores the economy id pending confirmation (avoids window.confirm focus loss)
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    // Generate safe file name slug from economy name
    const toSafeName = (val: string) =>
        val.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

    // Auto-generate sync cloud path when name or syncType changes
    const handleNameChange = (val: string) => {
        setName(val);
        if (val && syncType !== 'local') {
            setSyncPath(`/pcshogar_${toSafeName(val)}.json`);
        } else {
            setSyncPath('');
        }
    };

    const handleSyncTypeChange = (type: 'local' | 'dropbox' | 'googledrive') => {
        setSyncType(type);
        if (type === 'local') {
            setSyncPath('');
        } else if (name) {
            setSyncPath(`/pcshogar_${toSafeName(name)}.json`);
        }
    };

    if (!isOpen || !activeProfile || !activeEconomy) return null;

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!name.trim()) {
            setError('El nombre del entorno es obligatorio.');
            return;
        }
        if (syncType !== 'local' && !syncPath.trim()) {
            setError('La ruta del archivo en la nube es obligatoria para Dropbox/Drive.');
            return;
        }

        try {
            await addEconomy(name.trim(), syncType, syncType === 'local' ? '' : syncPath.trim());
            setName('');
            setSyncPath('');
            setSyncType('local');
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Error al crear la economía.');
        }
    };

    const handleDelete = async (economyId: string) => {
        try {
            await deleteEconomy(economyId);
            setPendingDeleteId(null);
        } catch (err: any) {
            setPendingDeleteId(null);
            setError(err.message || 'Error al eliminar la economía.');
        }
    };

    const getEconomyIcon = (ecoName: string) => {
        const lower = ecoName.toLowerCase();
        if (lower.includes('hogar') || lower.includes('casa') || lower.includes('domest')) {
            return <Home size={16} color="var(--color-primary, #6366f1)" />;
        }
        if (lower.includes('vecino') || lower.includes('comunid') || lower.includes('edifici')) {
            return <Building2 size={16} color="#10b981" />;
        }
        if (lower.includes('trabaj') || lower.includes('negoci') || lower.includes('freelanc') || lower.includes('proyect')) {
            return <Briefcase size={16} color="#f59e0b" />;
        }
        return <Wallet size={16} color="#ec4899" />;
    };

    return (
        <div style={overlayStyle}>
            <div style={modalStyle}>
                {/* Header */}
                <div style={headerStyle}>
                    <h3 style={titleStyle}>Gestión de Entornos Económicos</h3>
                    <button onClick={onClose} style={closeButtonStyle}>
                        <X size={20} color="#94a3b8" />
                    </button>
                </div>

                <div style={contentStyle}>
                    {/* List of Economies */}
                    <div style={sectionStyle}>
                        <h4 style={sectionTitleStyle}>Tus Entornos Actuales</h4>
                        <div style={listContainerStyle}>
                            {activeProfile.economies.map((economy) => (
                                <div
                                    key={economy.id}
                                    style={{
                                        ...itemStyle,
                                        border: economy.id === activeEconomy.id 
                                            ? '1px solid rgba(99, 102, 241, 0.4)' 
                                            : '1px solid rgba(255, 255, 255, 0.08)',
                                        backgroundColor: economy.id === activeEconomy.id
                                            ? 'rgba(99, 102, 241, 0.04)'
                                            : 'rgba(255, 255, 255, 0.02)',
                                        flexDirection: pendingDeleteId === economy.id ? 'column' : 'row',
                                        alignItems: pendingDeleteId === economy.id ? 'flex-start' : 'center',
                                        gap: pendingDeleteId === economy.id ? '10px' : undefined
                                    }}
                                >
                                    {pendingDeleteId === economy.id ? (
                                        // Inline confirmation row
                                        <>
                                            <div style={{ fontSize: '13px', color: '#f87171', fontWeight: 600 }}>
                                                ¿Eliminar <strong>{economy.name}</strong>? Esta acción no borra el archivo en la nube.
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                                <button
                                                    onClick={() => handleDelete(economy.id)}
                                                    style={{
                                                        flex: 1,
                                                        background: 'rgba(244, 63, 94, 0.15)',
                                                        border: '1px solid rgba(244, 63, 94, 0.3)',
                                                        borderRadius: '8px',
                                                        padding: '7px',
                                                        color: '#f43f5e',
                                                        fontSize: '12px',
                                                        fontWeight: 700,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Sí, eliminar
                                                </button>
                                                <button
                                                    onClick={() => setPendingDeleteId(null)}
                                                    style={{
                                                        flex: 1,
                                                        background: 'rgba(255,255,255,0.04)',
                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                        borderRadius: '8px',
                                                        padding: '7px',
                                                        color: '#94a3b8',
                                                        fontSize: '12px',
                                                        fontWeight: 600,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        // Normal economy row
                                        <>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                {getEconomyIcon(economy.name)}
                                                <div>
                                                    <div style={itemNameStyle}>
                                                        {economy.name} 
                                                        {economy.id === activeEconomy.id && (
                                                            <span style={badgeStyle}>Activo</span>
                                                        )}
                                                    </div>
                                                    <div style={itemMetaStyle}>
                                                        {economy.sync.type === 'local' || (!economy.sync.dropboxPath && !economy.sync.googledrivePath) ? (
                                                            <><HardDrive size={12} style={{ marginRight: '4px', display: 'inline' }} />Solo local (este PC)</>
                                                        ) : economy.sync.type === 'googledrive' ? (
                                                            <><Cloud size={12} style={{ marginRight: '4px', display: 'inline' }} />{economy.sync.googledrivePath}</>
                                                        ) : (
                                                            <><Cloud size={12} style={{ marginRight: '4px', display: 'inline' }} />{economy.sync.dropboxPath}</>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setPendingDeleteId(economy.id)}
                                                disabled={activeProfile.economies.length <= 1}
                                                style={{
                                                    ...deleteButtonStyle,
                                                    opacity: activeProfile.economies.length <= 1 ? 0.3 : 1,
                                                    cursor: activeProfile.economies.length <= 1 ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                <Trash2 size={16} color="#f43f5e" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Add New Economy Form */}
                    <div style={{ ...sectionStyle, borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '20px' }}>
                        <h4 style={sectionTitleStyle}>Crear Nuevo Entorno</h4>
                        <form onSubmit={handleAdd} style={formStyle}>
                            {error && <div style={errorStyle}>{error}</div>}
                            
                            <div style={inputGroupStyle}>
                                <label style={labelStyle}>Nombre del Entorno</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Comunidad de Vecinos, Negocio..."
                                    value={name}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>

                            <div style={inputGroupStyle}>
                                <label style={labelStyle}>Almacenamiento de Datos</label>
                                <div style={syncSelectorStyle}>
                                    <button
                                        type="button"
                                        onClick={() => handleSyncTypeChange('local')}
                                        style={{ ...syncOptionStyle, ...(syncType === 'local' ? syncOptionActiveStyle : {}) }}
                                    >
                                        <HardDrive size={16} />
                                        <span>Este PC (local)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleSyncTypeChange('dropbox')}
                                        style={{ ...syncOptionStyle, ...(syncType === 'dropbox' ? syncOptionActiveStyle : {}) }}
                                    >
                                        <Cloud size={16} />
                                        <span>Dropbox</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleSyncTypeChange('googledrive')}
                                        style={{ ...syncOptionStyle, ...(syncType === 'googledrive' ? syncOptionActiveStyle : {}) }}
                                    >
                                        <Cloud size={16} />
                                        <span>Google Drive</span>
                                    </button>
                                </div>
                                {syncType === 'local' && (
                                    <div style={infoContainerStyle}>
                                        <HardDrive size={14} color="#94a3b8" />
                                        <span style={infoTextStyle}>
                                            Los datos se guardarán solo en este PC. Puedes añadir sincronización en la nube más adelante desde Ajustes.
                                        </span>
                                    </div>
                                )}
                            </div>

                            {syncType === 'dropbox' && (() => {
                                const hasToken = dropboxConnected;
                                const autoFileName = name ? `pcshogar_${toSafeName(name)}.json` : 'pcshogar_nueva_economia.json';
                                return (
                                    <div style={inputGroupStyle}>
                                        {/* Connection status */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '10px 14px',
                                            borderRadius: '10px',
                                            background: hasToken ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.03)',
                                            border: `1px solid ${hasToken ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.08)'}`
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Cloud size={16} color={hasToken ? '#10b981' : '#94a3b8'} />
                                                <span style={{ fontSize: '13px', color: hasToken ? '#10b981' : '#94a3b8', fontWeight: 600 }}>
                                                    {hasToken ? `Dropbox conectado ✓` : 'No conectado a Dropbox'}
                                                </span>
                                            </div>
                                            {!hasToken && (
                                                <button
                                                    type="button"
                                                    disabled={isConnectingDropbox}
                                                    onClick={() => {
                                                        const url = DropboxService.getAuthUrl();
                                                        const isElectron = !!(window as any).require;
                                                        if (isElectron) {
                                                            setIsConnectingDropbox(true);
                                                            const { ipcRenderer } = (window as any).require('electron');
                                                            showToast('Abriendo ventana de Dropbox...', 'info');
                                                            ipcRenderer.invoke('connect-dropbox', url)
                                                                .then((token: string) => {
                                                                    DropboxService.init(token, syncPath || `/${autoFileName}`);
                                                                    return DropboxService.getUserInfo().then(user => {
                                                                        updateSyncSettings({ dropboxToken: token, dropboxUserEmail: user.email });
                                                                        setDropboxConnected(true);
                                                                        showToast(`Dropbox conectado: ${user.email}`, 'success');
                                                                    });
                                                                })
                                                                .catch(() => showToast('Autenticación cancelada.', 'error'))
                                                                .finally(() => setIsConnectingDropbox(false));
                                                        } else {
                                                            window.location.href = url;
                                                        }
                                                    }}
                                                    style={{
                                                        background: '#0061FF',
                                                        color: 'white',
                                                        border: 'none',
                                                        padding: '6px 14px',
                                                        borderRadius: '8px',
                                                        fontSize: '12px',
                                                        fontWeight: 700,
                                                        cursor: isConnectingDropbox ? 'wait' : 'pointer'
                                                    }}
                                                >
                                                    {isConnectingDropbox ? 'Conectando...' : 'Conectar'}
                                                </button>
                                            )}
                                        </div>

                                        {/* Folder/path selection - only if connected */}
                                        <label style={labelStyle}>Carpeta en Dropbox</label>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <div style={{
                                                ...inputStyle,
                                                flex: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                opacity: hasToken ? 1 : 0.5
                                            }}>
                                                <Cloud size={14} color="#64748b" />
                                                <span style={{ fontSize: '13px', color: syncPath ? '#ffffff' : '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {syncPath || `/${autoFileName}`}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                disabled={!hasToken}
                                                onClick={() => {
                                                    if (!syncPath) setSyncPath(`/${autoFileName}`);
                                                    setShowFolderPicker(true);
                                                }}
                                                style={{
                                                    background: 'rgba(255,255,255,0.06)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '10px',
                                                    padding: '10px 14px',
                                                    color: hasToken ? '#ffffff' : '#64748b',
                                                    fontSize: '13px',
                                                    fontWeight: 600,
                                                    cursor: hasToken ? 'pointer' : 'not-allowed',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                <FolderOpen size={14} />
                                                Explorar
                                            </button>
                                        </div>
                                        <div style={infoContainerStyle}>
                                            <Info size={14} color="#94a3b8" />
                                            <span style={infoTextStyle}>
                                                El archivo <strong style={{ color: '#e2e8f0' }}>{syncPath ? syncPath.split('/').pop() : autoFileName}</strong> es exclusivo de esta economía y nunca se compartirá con otros entornos.
                                            </span>
                                        </div>

                                        {/* Folder picker overlay */}
                                        {showFolderPicker && (
                                            <DropboxFolderPicker
                                                currentPath={(syncPath || `/${autoFileName}`).substring(0, (syncPath || `/${autoFileName}`).lastIndexOf('/')) || '/'}
                                                fileName={syncPath ? syncPath.split('/').pop()! : autoFileName}
                                                onSelect={(path) => { setSyncPath(path); setShowFolderPicker(false); }}
                                                onClose={() => setShowFolderPicker(false)}
                                            />
                                        )}
                                    </div>
                                );
                            })()}

                            {syncType === 'googledrive' && (() => {
                                const autoFileName = name ? `pcshogar_${toSafeName(name)}.json` : 'pcshogar_nueva_economia.json';
                                return (
                                    <div style={inputGroupStyle}>
                                        <label style={labelStyle}>Ruta en Google Drive</label>
                                        <input
                                            type="text"
                                            placeholder={`Ej. /${autoFileName}`}
                                            value={syncPath}
                                            onChange={(e) => setSyncPath(e.target.value)}
                                            style={inputStyle}
                                        />
                                        <div style={infoContainerStyle}>
                                            <Info size={14} color="#94a3b8" />
                                            <span style={infoTextStyle}>
                                                El archivo <strong style={{ color: '#e2e8f0' }}>{syncPath ? syncPath.split('/').pop() : autoFileName}</strong> es exclusivo de esta economía. La integración con Google Drive para explorar carpetas estará disponible próximamente.
                                            </span>
                                        </div>
                                    </div>
                                );
                            })()}

                            <button type="submit" style={addButtonStyle}>
                                <Plus size={18} style={{ marginRight: '6px' }} />
                                Crear Entorno
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

// CSS styles
const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
};

const modalStyle: React.CSSProperties = {
    background: '#0f172a',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '20px',
    width: '460px',
    maxWidth: '90%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    overflow: 'hidden',
    animation: 'fadeIn 0.2s ease-out'
};

const headerStyle: React.CSSProperties = {
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
};

const titleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: '18px',
    fontWeight: '700',
    color: '#ffffff'
};

const closeButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.15s ease'
};

const contentStyle: React.CSSProperties = {
    padding: '24px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
};

const sectionStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
};

const sectionTitleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: '14px',
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
};

const listContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '200px',
    overflowY: 'auto',
    paddingRight: '4px'
};

const itemStyle: React.CSSProperties = {
    borderRadius: '12px',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'all 0.15s ease'
};

const itemNameStyle: React.CSSProperties = {
    fontSize: '14.5px',
    fontWeight: '600',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
};

const badgeStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--color-primary, #6366f1)',
    background: 'rgba(99, 102, 241, 0.15)',
    padding: '2px 8px',
    borderRadius: '20px'
};

const itemMetaStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '2px'
};

const deleteButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    padding: '8px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.15s ease'
};

const formStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
};

const errorStyle: React.CSSProperties = {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '8px',
    padding: '10px 12px',
    color: '#f87171',
    fontSize: '13px',
    fontWeight: '500'
};

const inputGroupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
};

const labelStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: '600',
    color: '#94a3b8'
};

const inputStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    padding: '10px 14px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.15s ease'
};

const selectStyle: React.CSSProperties = {
    background: '#1e293b',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    padding: '10px 14px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none'
};

const infoContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    marginTop: '4px',
    background: 'rgba(255, 255, 255, 0.02)',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.03)'
};

const infoTextStyle: React.CSSProperties = {
    fontSize: '11.5px',
    color: '#94a3b8',
    lineHeight: '1.4'
};

const addButtonStyle: React.CSSProperties = {
    background: 'var(--color-primary, #6366f1)',
    border: 'none',
    borderRadius: '10px',
    padding: '12px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.15s ease'
};

const syncSelectorStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
};

const syncOptionStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '9px 12px',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    background: 'rgba(255, 255, 255, 0.03)',
    color: '#94a3b8',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    outline: 'none',
    whiteSpace: 'nowrap'
};

const syncOptionActiveStyle: React.CSSProperties = {
    border: '1px solid rgba(99, 102, 241, 0.4)',
    background: 'rgba(99, 102, 241, 0.12)',
    color: '#ffffff'
};

export default EconomyManagementModal;

