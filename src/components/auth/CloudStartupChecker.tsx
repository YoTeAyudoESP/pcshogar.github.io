import React, { useEffect, useState } from 'react';
import { useAppSettings } from '../../contexts/AppSettingsContext';
import { DropboxService } from '../../services/dropboxService';
import { GoogleDriveService } from '../../services/googleDriveService';
import { Cloud, ArrowRight, AlertCircle } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

const CloudStartupChecker: React.FC = () => {
    const { settings, updateSyncSettings } = useAppSettings();
    const { showToast } = useToast();
    const [showModal, setShowModal] = useState(false);

    const type = settings.sync.type;
    const enabled = settings.sync.enabled;
    const isDropbox = type === 'dropbox';
    const isGoogle = type === 'googledrive';

    useEffect(() => {
        const checkConnection = async () => {
            if (isDropbox && enabled) {
                try {
                    if (settings.sync.dropboxToken) {
                        DropboxService.init(settings.sync.dropboxToken, settings.sync.dropboxPath);
                        await DropboxService.getUserInfo();
                        setShowModal(false);
                    } else {
                        setShowModal(true);
                    }
                } catch (error) {
                    console.error("Dropbox startup connection check failed:", error);
                    setShowModal(true);
                }
            } else if (isGoogle && enabled) {
                try {
                    if (settings.sync.googledriveToken) {
                        GoogleDriveService.init(settings.sync.googledriveToken, settings.sync.googledrivePath || 'pcshogar_data.json');
                        await GoogleDriveService.getUserInfo();
                        setShowModal(false);
                    } else {
                        setShowModal(true);
                    }
                } catch (error) {
                    console.error("Google Drive startup connection check failed:", error);
                    setShowModal(true);
                }
            } else {
                setShowModal(false);
            }
        };

        checkConnection();
    }, [type, enabled, settings.sync.dropboxToken, settings.sync.dropboxPath, settings.sync.googledriveToken, settings.sync.googledrivePath]);

    const handleConnect = () => {
        const url = isDropbox ? DropboxService.getAuthUrl() : GoogleDriveService.getAuthUrl(isGoogle ? 'googledrive' : 'web');
        const isElectron = !!(window as any).require;
        if (isElectron) {
            const { ipcRenderer } = (window as any).require('electron');
            showToast('Abriendo ventana de autenticación...', 'info');
            // We use the same 'connect-dropbox' handler in main.js since it just handles oauth redirect
            ipcRenderer.invoke('connect-dropbox', url)
                .then((token: string) => {
                    if (isDropbox) {
                        DropboxService.init(token, settings.sync.dropboxPath);
                        DropboxService.getUserInfo().then(user => {
                            updateSyncSettings({
                                dropboxToken: token,
                                dropboxUserEmail: user.email,
                                enabled: true,
                                type: 'dropbox',
                                googledriveToken: undefined,
                                googledriveUserEmail: undefined
                            });
                            setShowModal(false);
                            showToast(`Dropbox conectado con éxito: ${user.email}`, 'success');
                        }).catch(err => {
                            console.error("Error fetching dropbox user", err);
                            showToast("Error al conectar con Dropbox.", 'error');
                        });
                    } else {
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
                            setShowModal(false);
                            showToast(`Google Drive conectado con éxito: ${user.email}`, 'success');
                        }).catch(err => {
                            console.error("Error fetching google user", err);
                            showToast("Error al conectar con Google Drive.", 'error');
                        });
                    }
                })
                .catch((err: any) => {
                    console.error("Cloud auth failed", err);
                    showToast("Autenticación cancelada o fallida.", 'error');
                });
        } else {
            window.location.href = url;
        }
    };

    const handleClose = () => {
        if (isDropbox) {
            DropboxService.disconnect();
        } else if (isGoogle) {
            GoogleDriveService.disconnect();
        }
        setShowModal(false);
    };

    if (!showModal) return null;

    const brandColor = isDropbox ? '#0061FF' : '#34A853';
    const brandName = isDropbox ? 'Dropbox' : 'Google Drive';
    const pulseAnim = isDropbox ? 'cloudPulseDropbox 3s infinite ease-in-out' : 'cloudPulseGoogle 3s infinite ease-in-out';

    return (
        <div style={overlayStyle}>
            {/* Inject keyframes dynamically */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes startupModalEnter {
                    from {
                        opacity: 0;
                        transform: scale(0.95) translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
                @keyframes cloudPulseDropbox {
                    0% {
                        transform: scale(1);
                        filter: drop-shadow(0 0 0px rgba(0, 97, 255, 0));
                    }
                    50% {
                        transform: scale(1.05);
                        filter: drop-shadow(0 0 15px rgba(0, 97, 255, 0.4));
                    }
                    100% {
                        transform: scale(1);
                        filter: drop-shadow(0 0 0px rgba(0, 97, 255, 0));
                    }
                }
                @keyframes cloudPulseGoogle {
                    0% {
                        transform: scale(1);
                        filter: drop-shadow(0 0 0px rgba(52, 168, 83, 0));
                    }
                    50% {
                        transform: scale(1.05);
                        filter: drop-shadow(0 0 15px rgba(52, 168, 83, 0.4));
                    }
                    100% {
                        transform: scale(1);
                        filter: drop-shadow(0 0 0px rgba(52, 168, 83, 0));
                    }
                }
            `}} />
            
            <div style={modalStyle}>
                <div style={{
                    ...iconContainerStyle,
                    background: isDropbox ? 'rgba(0, 97, 255, 0.08)' : 'rgba(52, 168, 83, 0.08)',
                    borderColor: isDropbox ? 'rgba(0, 97, 255, 0.15)' : 'rgba(52, 168, 83, 0.15)',
                }}>
                    <Cloud size={44} color={brandColor} style={{ animation: pulseAnim }} />
                </div>
                
                <h3 style={titleStyle}>Sincronización con {brandName}</h3>
                
                <div style={statusBadgeStyle}>
                    <AlertCircle size={14} /> Sin conexión / Token expirado
                </div>
                
                <p style={textStyle}>
                    Hemos detectado que tienes activada la sincronización en la nube, pero no se ha podido verificar la sesión. ¿Deseas volver a conectar tu cuenta de {brandName} ahora o continuar sin conexión en modo local?
                </p>

                <div style={buttonContainerStyle}>
                    <button 
                        onClick={handleConnect}
                        style={{
                            ...connectButtonStyle,
                            background: brandColor,
                            boxShadow: `0 4px 15px ${isDropbox ? 'rgba(0, 97, 255, 0.2)' : 'rgba(52, 168, 83, 0.2)'}`
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = `0 8px 25px ${isDropbox ? 'rgba(0, 97, 255, 0.4)' : 'rgba(52, 168, 83, 0.4)'}`;
                            e.currentTarget.style.background = isDropbox ? '#1a75ff' : '#2d9449';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = `0 4px 15px ${isDropbox ? 'rgba(0, 97, 255, 0.2)' : 'rgba(52, 168, 83, 0.2)'}`;
                            e.currentTarget.style.background = brandColor;
                        }}
                    >
                        Conectar con {brandName} <ArrowRight size={18} />
                    </button>
                    
                    <button 
                        onClick={handleClose}
                        style={cancelButtonStyle}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                        }}
                    >
                        Continuar sin conexión
                    </button>
                </div>
            </div>
        </div>
    );
};

// Premium Glassmorphism Styles
const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(7, 9, 15, 0.75)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: '1.5rem',
    boxSizing: 'border-box'
};

const modalStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(30, 32, 45, 0.75) 0%, rgba(18, 20, 30, 0.9) 100%)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '28px',
    padding: '2.5rem 2rem',
    maxWidth: '430px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255,255,255,0.1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.25rem',
    animation: 'startupModalEnter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
    boxSizing: 'border-box'
};

const iconContainerStyle: React.CSSProperties = {
    border: '1px solid',
    borderRadius: '24px',
    padding: '1.25rem',
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '0.25rem'
};

const titleStyle: React.CSSProperties = {
    color: '#ffffff',
    fontSize: '1.5rem',
    fontWeight: 800,
    margin: 0,
    letterSpacing: '-0.025em'
};

const statusBadgeStyle: React.CSSProperties = {
    background: 'rgba(239, 68, 68, 0.1)',
    color: '#f87171',
    border: '1px solid rgba(239, 68, 68, 0.15)',
    borderRadius: '20px',
    padding: '4px 12px',
    fontSize: '0.8rem',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '-0.5rem'
};

const textStyle: React.CSSProperties = {
    color: 'rgba(229, 231, 235, 0.65)',
    fontSize: '0.95rem',
    lineHeight: '1.55',
    margin: 0,
    fontWeight: 500
};

const buttonContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    width: '100%',
    marginTop: '0.75rem'
};

const connectButtonStyle: React.CSSProperties = {
    color: '#ffffff',
    border: 'none',
    borderRadius: '16px',
    padding: '1.1rem',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    width: '100%',
    outline: 'none'
};

const cancelButtonStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.03)',
    color: 'rgba(229, 231, 235, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '1.1rem',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    width: '100%',
    outline: 'none'
};

export default CloudStartupChecker;
