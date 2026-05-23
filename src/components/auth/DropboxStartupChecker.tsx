import React, { useEffect, useState } from 'react';
import { useAppSettings } from '../../contexts/AppSettingsContext';
import { DropboxService } from '../../services/dropboxService';
import { Cloud, ArrowRight, AlertCircle } from 'lucide-react';

const DropboxStartupChecker: React.FC = () => {
    const { settings } = useAppSettings();
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const checkConnection = async () => {
            // Check if Dropbox sync is active and enabled
            if (settings.sync.type === 'dropbox' && settings.sync.enabled) {
                try {
                    if (settings.sync.dropboxToken) {
                        // Initialize DropboxService with current token and path
                        DropboxService.init(settings.sync.dropboxToken, settings.sync.dropboxPath);
                        // Validate connection by making a small request
                        await DropboxService.getUserInfo();
                        // If it succeeds, connection is fine, hide modal
                        setShowModal(false);
                    } else {
                        // Configured to sync but has no token
                        setShowModal(true);
                    }
                } catch (error) {
                    console.error("Dropbox startup connection check failed:", error);
                    // Connection failed (expired token, offline status, etc.)
                    setShowModal(true);
                }
            } else {
                // If Dropbox sync is disabled or not Dropbox type, close modal
                setShowModal(false);
            }
        };

        checkConnection();
    }, [settings.sync.type, settings.sync.enabled, settings.sync.dropboxToken, settings.sync.dropboxPath]);

    const handleConnect = () => {
        const url = DropboxService.getAuthUrl();
        window.location.href = url;
    };

    const handleClose = () => {
        setShowModal(false);
    };

    if (!showModal) return null;

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
                @keyframes cloudPulse {
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
            `}} />
            
            <div style={modalStyle}>
                <div style={iconContainerStyle}>
                    <Cloud size={44} color="#0061FF" style={{ animation: 'cloudPulse 3s infinite ease-in-out' }} />
                </div>
                
                <h3 style={titleStyle}>Sincronización con Dropbox</h3>
                
                <div style={statusBadgeStyle}>
                    <AlertCircle size={14} /> Sin conexión / Token expirado
                </div>
                
                <p style={textStyle}>
                    Hemos detectado que tienes activada la sincronización en la nube, pero no se ha podido verificar la sesión. ¿Deseas volver a conectar tu cuenta de Dropbox ahora o continuar sin conexión en modo local?
                </p>

                <div style={buttonContainerStyle}>
                    <button 
                        onClick={handleConnect}
                        style={connectButtonStyle}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 97, 255, 0.4)';
                            e.currentTarget.style.background = '#1a75ff';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 97, 255, 0.2)';
                            e.currentTarget.style.background = '#0061FF';
                        }}
                    >
                        Conectar con Dropbox <ArrowRight size={18} />
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
    background: 'rgba(0, 97, 255, 0.08)',
    border: '1px solid rgba(0, 97, 255, 0.15)',
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
    background: '#0061FF',
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
    boxShadow: '0 4px 15px rgba(0, 97, 255, 0.2)',
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

export default DropboxStartupChecker;
