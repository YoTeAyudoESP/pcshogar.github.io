import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { UpdateService } from '../../services/updateService';
import type { UpdateInfo } from '../../services/updateService';
import { ArrowDownCircle } from 'lucide-react';

const renderReleaseNotes = (notes: string) => {
    if (!notes) return null;
    const lines = notes.split('\n').filter(line => line.trim() !== '');
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', textAlign: 'left' }}>
            {lines.map((line, idx) => {
                let cleanLine = line.trim();
                if (cleanLine.toLowerCase().startsWith('novedades') && cleanLine.endsWith(':')) {
                    return (
                        <div key={idx} style={{ 
                            fontSize: '0.95rem', 
                            fontWeight: 800, 
                            color: '#10b981', 
                            borderBottom: '1px solid rgba(16, 185, 129, 0.2)',
                            paddingBottom: '6px',
                            marginBottom: '0.4rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <span style={{ fontSize: '1.1rem' }}>🎉</span> {cleanLine}
                        </div>
                    );
                }
                if (cleanLine.startsWith('-') || cleanLine.startsWith('*')) {
                    cleanLine = cleanLine.substring(1).trim();
                }
                const colonIndex = cleanLine.indexOf(':');
                let title = '';
                let desc = cleanLine;
                if (colonIndex > 0) {
                    title = cleanLine.substring(0, colonIndex).trim();
                    desc = cleanLine.substring(colonIndex + 1).trim();
                }
                return (
                    <div key={idx} style={{ 
                        display: 'flex', 
                        gap: '0.75rem', 
                        alignItems: 'flex-start',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                        padding: '0.75rem 1rem',
                        borderRadius: '12px'
                    }}>
                        <div style={{ 
                            background: 'rgba(16, 185, 129, 0.1)', 
                            color: '#10b981', 
                            borderRadius: '50%', 
                            width: '20px', 
                            height: '20px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            flexShrink: 0,
                            marginTop: '2px'
                        }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                        <div style={{ flex: 1, fontSize: '0.85rem', lineHeight: '1.45', color: 'rgba(255,255,255,0.85)' }}>
                            {title && <span style={{ fontWeight: 700, color: 'white', display: 'block', marginBottom: '2px' }}>{title}</span>}
                            <span>{desc}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const AppUpdateChecker: React.FC = () => {
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Automatically check for updates on startup if running natively (Android app) or in Electron (Windows app)
        const isElectron = !!(window as any).require;
        if (Capacitor.isNativePlatform() || isElectron) {
            UpdateService.checkUpdate()
                .then(info => {
                    if (info.hasUpdate) {
                        setUpdateInfo(info);
                        setShowModal(true);
                    }
                })
                .catch(err => {
                    // Fail silently in the background when offline or on network error
                    console.log('Update auto-check skipped (offline/error)', err);
                });
        }
    }, []);

    const handleUpdate = () => {
        if (!updateInfo) return;

        const isElectron = !!(window as any).require;
        if (isElectron) {
            const { ipcRenderer } = (window as any).require('electron');
            setDownloading(true);
            setProgress(0);

            const progressListener = (_event: any, pct: number) => {
                setProgress(pct);
            };
            ipcRenderer.on('download-progress', progressListener);

            ipcRenderer.invoke('download-and-install-update', updateInfo.downloadUrl)
                .catch((err: any) => {
                    console.error('Failed to install update:', err);
                    alert('Error al descargar la actualización de forma automática. Se abrirá la web para la descarga manual.');
                    window.open(updateInfo.downloadUrl, '_system');
                    setDownloading(false);
                })
                .finally(() => {
                    ipcRenderer.removeListener('download-progress', progressListener);
                });
        } else {
            // Open the download URL in the device's native system browser
            window.open(updateInfo.downloadUrl, '_system');
        }
    };

    if (!showModal || !updateInfo) return null;

    return (
        <div style={overlayStyle}>
            {/* Inject keyframes dynamically */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes updateModalEnter {
                    from {
                        opacity: 0;
                        transform: scale(0.95) translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
                @keyframes downloadIconPulse {
                    0% {
                        transform: scale(1);
                        filter: drop-shadow(0 0 0px rgba(16, 185, 129, 0));
                    }
                    50% {
                        transform: scale(1.05);
                        filter: drop-shadow(0 0 15px rgba(16, 185, 129, 0.4));
                    }
                    100% {
                        transform: scale(1);
                        filter: drop-shadow(0 0 0px rgba(16, 185, 129, 0));
                    }
                }
            `}} />
            
            <div style={modalStyle}>
                <div style={iconContainerStyle}>
                    <ArrowDownCircle size={44} color="#10b981" style={{ animation: 'downloadIconPulse 3s infinite ease-in-out' }} />
                </div>
                
                <h3 style={titleStyle}>
                    {downloading ? 'Descargando Actualización...' : 'Actualización Disponible'}
                </h3>
                
                <div style={badgeStyle}>
                    v{updateInfo.currentVersion} → v{updateInfo.latestVersion}
                </div>
                
                {downloading ? (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                        <p style={textStyle}>
                            Descargando la nueva versión. La aplicación se cerrará e iniciará la instalación automáticamente al finalizar.
                        </p>
                        <div style={{
                            width: '100%',
                            height: '10px',
                            background: 'rgba(255,255,255,0.1)',
                            borderRadius: '5px',
                            overflow: 'hidden',
                            position: 'relative',
                            marginTop: '0.5rem'
                        }}>
                            <div style={{
                                width: `${progress}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, #10b981, #34d399)',
                                transition: 'width 0.1s ease',
                                borderRadius: '5px'
                            }} />
                        </div>
                        <span style={{ color: '#34d399', fontWeight: 700, fontSize: '1.2rem', marginTop: '0.2rem' }}>
                            {progress}%
                        </span>
                    </div>
                ) : (
                    <>
                        <p style={textStyle}>
                            Hay una nueva versión de la aplicación disponible en GitHub con mejoras y correcciones importantes. ¿Deseas descargarla e instalarla ahora?
                        </p>

                        {updateInfo.releaseNotes && (
                            <div style={{ ...notesContainerStyle, maxHeight: '200px', overflowY: 'auto' }}>
                                {renderReleaseNotes(updateInfo.releaseNotes)}
                            </div>
                        )}

                        <div style={buttonContainerStyle}>
                            <button 
                                onClick={handleUpdate}
                                style={updateButtonStyle}
                                onMouseEnter={e => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.4)';
                                    e.currentTarget.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.transform = 'none';
                                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.2)';
                                    e.currentTarget.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                                }}
                            >
                                Descargar e Instalar
                            </button>
                            
                            <button 
                                onClick={() => setShowModal(false)}
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
                                Más tarde
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// Premium Glassmorphism Styles (matching DropboxStartupChecker)
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
    zIndex: 99999,
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
    animation: 'updateModalEnter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
    boxSizing: 'border-box'
};

const iconContainerStyle: React.CSSProperties = {
    background: 'rgba(16, 185, 129, 0.08)',
    border: '1px solid rgba(16, 185, 129, 0.15)',
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

const badgeStyle: React.CSSProperties = {
    background: 'rgba(16, 185, 129, 0.1)',
    color: '#34d399',
    border: '1px solid rgba(16, 185, 129, 0.15)',
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

const notesContainerStyle: React.CSSProperties = {
    background: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '16px',
    padding: '1rem',
    textAlign: 'left',
    width: '100%',
    boxSizing: 'border-box'
};

const notesTextStyle: React.CSSProperties = {
    fontSize: '0.82rem',
    color: 'rgba(229, 231, 235, 0.75)',
    lineHeight: '1.45',
    marginTop: '0.4rem',
    maxHeight: '100px',
    overflowY: 'auto',
    fontWeight: 500
};

const buttonContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    width: '100%',
    marginTop: '0.75rem'
};

const updateButtonStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
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
    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.2)',
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

export default AppUpdateChecker;
