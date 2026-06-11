import React, { useState, useEffect } from 'react';
import { Heart, Coffee, Mail, X, Download, RefreshCw } from 'lucide-react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { UpdateService } from '../../services/updateService';
import versionInfo from '../../../public/version.json';

interface APKInstallerPlugin {
    downloadAndInstall(options: { url: string }): Promise<void>;
}

const APKInstaller = registerPlugin<APKInstallerPlugin>('APKInstaller');

interface HelpFeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const HelpFeedbackModal: React.FC<HelpFeedbackModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const handlePayPal = () => {
        // URL oficial de donaciones PayPal — funciona con cualquier cuenta PayPal personal.
        // No requiere configuración previa de botón en el panel de PayPal.
        // La donación se clasifica como "sin contraprestación" (ítem = descripción informativa).
        const paypalUrl =
            'https://www.paypal.com/donate/?business=pablopcs%40hotmail.com' +
            '&currency_code=EUR' +
            '&item_name=Invita%20a%20un%20caf%C3%A9%20-%20PCS%20Hogar';
        // '_system' indica a Capacitor que abra la URL en el navegador externo del dispositivo
        window.open(paypalUrl, '_system');
    };

    const handleSuggestion = () => {
        const subject = encodeURIComponent('Sugerencia app PCSHogar');
        const mailtoUrl = `mailto:yoayudo2020@gmail.com?subject=${subject}`;
        // '_system' abre el cliente de correo nativo del dispositivo (Gmail, Outlook, etc.)
        window.open(mailtoUrl, '_system');
    };

    const [downloadUrlAndroid, setDownloadUrlAndroid] = useState(versionInfo.url);
    const [downloadUrlWindows, setDownloadUrlWindows] = useState(versionInfo.windowsUrl);
    const [checking, setChecking] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [progress, setProgress] = useState(0);

    const isElectron = typeof window !== 'undefined' && !!(window as any).require;
    const isApp = Capacitor.isNativePlatform() || isElectron;

    useEffect(() => {
        // Fetch the latest URLs dynamically on web platform
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
                                alert('Error al descargar la actualización de forma automática. Intentando descarga manual en el navegador...');
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
                            alert('Error al descargar la actualización de forma automática. Intentando descarga manual en el navegador...');
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
                alert(`Estás utilizando la versión más reciente (v${info.currentVersion}).`);
            }
        } catch (error) {
            console.error(error);
            alert('No se pudo comprobar la actualización. Por favor, verifica tu conexión a internet.');
        } finally {
            setChecking(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            overflowY: 'auto',
            animation: 'fadeIn 0.3s ease'
        }}>
            <div className="glass-panel" style={{
                maxWidth: '440px',
                width: '100%',
                backgroundColor: '#12141a',
                padding: '40px 30px',
                borderRadius: '24px',
                textAlign: 'center',
                position: 'relative',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                margin: 'auto'
            }}>
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <X size={20} />
                </button>

                {/* Heart Icon in Gradient Circle */}
                <div style={{
                    width: '80px',
                    height: '80px',
                    margin: '0 auto 24px',
                    background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                    borderRadius: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 20px rgba(236, 72, 153, 0.3)'
                }}>
                    <Heart size={40} color="white" fill="white" />
                </div>

                {/* Title */}
                <h2 style={{
                    fontSize: '1.75rem',
                    fontWeight: 800,
                    marginBottom: '16px',
                    color: 'white'
                }}>
                    ¡Gracias por usar PCS Hogar!
                </h2>

                {downloading ? (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', margin: '24px 0' }}>
                        <h4 style={{ color: 'white', margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Descargando Actualización...</h4>
                        <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.65)', margin: 0, lineHeight: '1.5' }}>
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
                        {/* Text */}
                        <p style={{
                            fontSize: '1rem',
                            lineHeight: '1.6',
                            color: 'rgba(255, 255, 255, 0.7)',
                            marginBottom: '32px'
                        }}>
                            Esta aplicación ha sido desarrollada de forma independiente y su uso es 100% gratuito. 
                            Si te resulta útil, puedes invitarme a un café de forma totalmente opcional. 
                            La app funcionará completa e idénticamente aportes o no.
                        </p>

                        {/* Buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>

                            {/* PayPal donation button */}
                            <button
                                onClick={handlePayPal}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #009cde 0%, #003087 100%)',
                                    color: 'white',
                                    border: 'none',
                                    fontWeight: 700,
                                    fontSize: '1.05rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 20px rgba(0, 48, 135, 0.45)',
                                    transition: 'opacity 0.2s'
                                }}
                                onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                            >
                                {/* Icono PayPal tipo "P" */}
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M19.554 9.488c.121-.079.144.041.129.142-.49 3.303-2.168 5.089-5.012 5.089H13.15l-.738 4.676-.091.542a.392.392 0 0 1-.385.33H9.964a.313.313 0 0 1-.308-.36l.048-.297.643-4.072.041-.224a.392.392 0 0 1 .385-.331h1.216c2.494 0 4.449-.985 5.02-3.835.234-1.174.12-2.155-.455-2.66z"/>
                                    <path d="M18.605 9.01a5.398 5.398 0 0 0-.65-.144 8.22 8.22 0 0 0-1.3-.098h-3.928a.39.39 0 0 0-.386.33L11.3 14.72l-.034.217a.392.392 0 0 0 .385.45h1.52c2.845 0 4.522-1.786 5.013-5.09.136-.87.11-1.613-.58-2.287z"/>
                                    <path d="M8.15 9.098a.39.39 0 0 1 .386-.33h4.927a8.23 8.23 0 0 1 1.3.097 5.4 5.4 0 0 1 .65.145c.69.674.716 1.417.58 2.287-.491 3.304-2.168 5.09-5.013 5.09H9.46a.392.392 0 0 1-.385-.45l.034-.218 1.041-6.621z" opacity=".5"/>
                                </svg>
                                <Coffee size={20} />
                                Invitar a un café (PayPal)
                            </button>

                            {/* Email suggestion button */}
                            <button
                                onClick={handleSuggestion}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    background: '#1e2028',
                                    color: 'white',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    fontWeight: 600,
                                    fontSize: '1.05rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s, border-color 0.2s'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = '#252830';
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = '#1e2028';
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                                }}
                            >
                                <Mail size={22} />
                                Enviar una sugerencia
                            </button>

                            {/* Dynamic update or download button */}
                            {isApp ? (
                                <>
                                    <style dangerouslySetInnerHTML={{__html: "@keyframes spin { 100% { transform: rotate(360deg); } }" }} />
                                    <button
                                        onClick={handleCheckUpdate}
                                        disabled={checking}
                                        style={{
                                            width: '100%',
                                            padding: '16px',
                                            borderRadius: '12px',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            color: 'white',
                                            border: '1px solid rgba(255, 255, 255, 0.12)',
                                            fontWeight: 600,
                                            fontSize: '1.05rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '10px',
                                            cursor: checking ? 'not-allowed' : 'pointer',
                                            opacity: checking ? 0.7 : 1,
                                            transition: 'background 0.2s, border-color 0.2s'
                                        }}
                                        onMouseEnter={e => {
                                            if (!checking) {
                                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.22)';
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (!checking) {
                                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                                            }
                                        }}
                                    >
                                        <RefreshCw 
                                            size={22} 
                                            style={{ 
                                                animation: checking ? 'spin 1.5s linear infinite' : 'none' 
                                            }} 
                                        />
                                        {checking ? 'Comprobando...' : 'Comprobar actualizaciones'}
                                    </button>
                                </>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                                    <a
                                        href={downloadUrlAndroid}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            width: '100%',
                                            padding: '16px',
                                            borderRadius: '12px',
                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                            color: 'white',
                                            textDecoration: 'none',
                                            fontWeight: 700,
                                            fontSize: '1.05rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '10px',
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                                            boxSizing: 'border-box'
                                        }}
                                    >
                                        <Download size={22} />
                                        Descargar para Android (.apk)
                                    </a>
                                    <a
                                        href={downloadUrlWindows}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            width: '100%',
                                            padding: '16px',
                                            borderRadius: '12px',
                                            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                            color: 'white',
                                            textDecoration: 'none',
                                            fontWeight: 700,
                                            fontSize: '1.05rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '10px',
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                                            boxSizing: 'border-box'
                                        }}
                                    >
                                        <Download size={22} />
                                        Descargar para Windows (.exe)
                                    </a>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Legal Text */}
                <p style={{
                    fontSize: '0.78rem',
                    lineHeight: '1.4',
                    color: 'rgba(255, 255, 255, 0.35)',
                    marginBottom: '24px',
                    padding: '0 10px'
                }}>
                    Aviso Legal: Toda aportación es 100% voluntaria, no reembolsable y no otorga servicios extra. 
                    Yo Te Ayudo (ESP) no recopila datos de pago. Pagos gestionados externamente y de forma segura por PayPal.
                </p>

                {/* Link */}
                <button 
                    onClick={onClose}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255, 255, 255, 0.5)',
                        textDecoration: 'underline',
                        fontSize: '0.9rem',
                        cursor: 'pointer'
                    }}
                >
                    No volver a mostrar
                </button>
            </div>
        </div>
    );
};

export default HelpFeedbackModal;
