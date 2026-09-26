import React, { useState, useEffect } from 'react';
import { MessageSquare, Mail, X, Download, RefreshCw, Copy, Check, Share2, Sparkles } from 'lucide-react';
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

    const [copied, setCopied] = useState(false);

    const handleSuggestion = () => {
        const subject = encodeURIComponent('Sugerencia app PCSHogar');
        const mailtoUrl = `mailto:yoayudo2020@gmail.com?subject=${subject}`;
        window.open(mailtoUrl, '_system');
    };

    const handleCopyEmail = () => {
        navigator.clipboard.writeText('yoayudo2020@gmail.com');
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

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
                padding: '35px 25px',
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

                {/* Message Icon in Gradient Circle */}
                <div style={{
                    width: '70px',
                    height: '70px',
                    margin: '0 auto 20px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 20px rgba(99, 102, 241, 0.3)'
                }}>
                    <MessageSquare size={34} color="white" />
                </div>

                {/* Title */}
                <h2 style={{
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    marginBottom: '12px',
                    color: 'white'
                }}>
                    Sugerencias y Contacto
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
                        <p style={{
                            fontSize: '0.92rem',
                            lineHeight: '1.5',
                            color: 'rgba(255, 255, 255, 0.75)',
                            marginBottom: '20px'
                        }}>
                            PCS Hogar es una aplicación de gestión económica 100% gratuita, independiente y sin publicidad.
                        </p>

                        <div style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '16px',
                            padding: '16px',
                            textAlign: 'left',
                            marginBottom: '24px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#a855f7', fontWeight: 700, fontSize: '0.9rem' }}>
                                <Sparkles size={16} />
                                <span>¿Te resulta útil y quieres colaborar con el proyecto?</span>
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
                                <li><strong>Recomienda la app</strong> a tus familiares o amigos.</li>
                                <li><strong>Envíanos tus sugerencias</strong> para seguir mejorando.</li>
                                <li><strong>Reporta cualquier fallo</strong> para corregirlo rápidamente.</li>
                            </ul>
                        </div>

                        {/* Buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                            <button
                                onClick={handleSuggestion}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                    color: 'white',
                                    border: 'none',
                                    fontWeight: 700,
                                    fontSize: '0.98rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)'
                                }}
                            >
                                <Mail size={18} />
                                Enviar sugerencia por email
                            </button>

                            <button
                                onClick={handleCopyEmail}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    color: copied ? '#10b981' : 'rgba(255, 255, 255, 0.7)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    fontWeight: 600,
                                    fontSize: '0.88rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                                {copied ? '¡Correo copiado!' : 'Copiar correo de contacto'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default HelpFeedbackModal;
