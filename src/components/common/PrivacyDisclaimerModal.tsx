import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { ShieldCheck, Check, X, AlertTriangle } from 'lucide-react';

const PrivacyDisclaimerModal: React.FC = () => {
    const [showModal, setShowModal] = useState(false);
    const [hasRejected, setHasRejected] = useState(false);

    useEffect(() => {
        const accepted = localStorage.getItem('pcshogar_terms_accepted');
        if (accepted !== 'true') {
            setShowModal(true);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('pcshogar_terms_accepted', 'true');
        setShowModal(false);
    };

    const handleReject = async () => {
        const isElectron = !!(window as any).require;
        const isNative = Capacitor.isNativePlatform();

        if (isNative) {
            try {
                await App.exitApp();
            } catch (err) {
                console.error("Failed to exit app:", err);
                setHasRejected(true);
            }
        } else if (isElectron) {
            try {
                window.close();
            } catch (err) {
                console.error("Failed to close window:", err);
                setHasRejected(true);
            }
        } else {
            // Web
            setHasRejected(true);
        }
    };

    if (!showModal) return null;

    if (hasRejected) {
        return (
            <div style={overlayStyle}>
                <div style={modalStyle}>
                    <div style={iconContainerStyleReject}>
                        <AlertTriangle size={44} color="#ef4444" />
                    </div>
                    <h3 style={titleStyle}>Acceso Denegado</h3>
                    <p style={textStyle}>
                        Has rechazado los términos de privacidad y transparencia. Para poder utilizar la aplicación de forma segura, es necesario aceptarlos.
                    </p>
                    <p style={{ ...textStyle, fontSize: '0.85rem', color: 'rgba(var(--color-rgb-light), 0.4)' }}>
                        Si has cambiado de opinión, por favor recarga la página o vuelve a abrir la aplicación.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={overlayStyle}>
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes privacyModalEnter {
                    from {
                        opacity: 0;
                        transform: scale(0.95) translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
                @keyframes shieldPulse {
                    0% {
                        transform: scale(1);
                        filter: drop-shadow(0 0 0px rgba(99, 102, 241, 0));
                    }
                    50% {
                        transform: scale(1.05);
                        filter: drop-shadow(0 0 15px rgba(99, 102, 241, 0.4));
                    }
                    100% {
                        transform: scale(1);
                        filter: drop-shadow(0 0 0px rgba(99, 102, 241, 0));
                    }
                }
            `}} />
            
            <div style={{ ...modalStyle, maxWidth: '500px' }}>
                <div style={iconContainerStyle}>
                    <ShieldCheck size={44} color="#6366f1" style={{ animation: 'shieldPulse 3s infinite ease-in-out' }} />
                </div>
                
                <h3 style={titleStyle}>Compromiso de Transparencia y Privacidad</h3>
                
                <div style={contentContainerStyle}>
                    <div style={itemStyle}>
                        <strong style={itemTitleStyle}>💎 100% Gratuita y Sin Sorpresas</strong>
                        <p style={itemTextStyle}>
                            Esta aplicación es totalmente gratuita. No contiene anuncios, no tiene compras integradas, ni requiere pagos o suscripciones para desbloquear funciones. Todo está disponible desde el primer segundo.
                        </p>
                    </div>
                    
                    <div style={itemStyle}>
                        <strong style={itemTitleStyle}>🔒 Sin Recopilación de Datos</strong>
                        <p style={itemTextStyle}>
                            No recopilamos, almacenamos ni compartimos ningún tipo de información personal, de uso, ni datos financieros. No tenemos servidores externos vigilando tu actividad.
                        </p>
                    </div>

                    <div style={itemStyle}>
                        <strong style={itemTitleStyle}>📁 Control Total (Local y Nube)</strong>
                        <p style={itemTextStyle}>
                            Tus datos se guardan exclusivamente de forma local en este dispositivo. Si activas la sincronización con Dropbox, la conexión se realiza de forma directa y segura entre tu dispositivo y tu cuenta personal. El creador de la app nunca tiene acceso a tus archivos ni credenciales.
                        </p>
                    </div>

                    <div style={itemStyle}>
                        <strong style={itemTitleStyle}>⚠️ Copias de Seguridad</strong>
                        <p style={itemTextStyle}>
                            Al guardarse los datos localmente o en tu cuenta personal, eres responsable de su resguardo. El desarrollador no se hace responsable de pérdidas de información debidas a fallos del dispositivo o borrados accidentales.
                        </p>
                    </div>
                </div>

                <p style={{ ...textStyle, fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    ¿Aceptas estas condiciones para comenzar a utilizar la aplicación?
                </p>

                <div style={buttonContainerStyle}>
                    <button 
                        onClick={handleAccept}
                        style={acceptButtonStyle}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 8px 25px rgba(99, 102, 241, 0.4)';
                            e.currentTarget.style.background = '#4f46e5';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(99, 102, 241, 0.2)';
                            e.currentTarget.style.background = '#6366f1';
                        }}
                    >
                        <Check size={18} /> Aceptar y Comenzar
                    </button>
                    
                    <button 
                        onClick={handleReject}
                        style={rejectButtonStyle}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                            e.currentTarget.style.color = '#ef4444';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(var(--color-rgb-light), 0.03)';
                            e.currentTarget.style.borderColor = 'rgba(var(--color-rgb-light), 0.08)';
                            e.currentTarget.style.color = 'rgba(229, 231, 235, 0.7)';
                        }}
                    >
                        <X size={18} /> Rechazar y Salir
                    </button>
                </div>
            </div>
        </div>
    );
};

// Premium Styles
const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(7, 9, 15, 0.85)',
    backdropFilter: 'blur(25px)',
    WebkitBackdropFilter: 'blur(25px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999999,
    padding: '1.5rem',
    boxSizing: 'border-box',
    overflowY: 'auto'
};

const modalStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(30, 32, 45, 0.85) 0%, rgba(18, 20, 30, 0.95) 100%)',
    border: '1px solid var(--panel-bg-3)',
    borderRadius: '28px',
    padding: '2.5rem 2rem',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(var(--color-rgb-light),0.15)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.25rem',
    animation: 'privacyModalEnter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
    boxSizing: 'border-box',
    maxHeight: '90vh',
    overflowY: 'auto'
};

const iconContainerStyle: React.CSSProperties = {
    background: 'rgba(99, 102, 241, 0.08)',
    border: '1px solid rgba(99, 102, 241, 0.15)',
    borderRadius: '24px',
    padding: '1.25rem',
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '0.25rem'
};

const iconContainerStyleReject: React.CSSProperties = {
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.15)',
    borderRadius: '24px',
    padding: '1.25rem',
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '0.25rem'
};

const titleStyle: React.CSSProperties = {
    color: '#ffffff',
    fontSize: '1.45rem',
    fontWeight: 800,
    margin: 0,
    letterSpacing: '-0.025em',
    lineHeight: '1.25'
};

const contentContainerStyle: React.CSSProperties = {
    background: 'rgba(0, 0, 0, 0.25)',
    border: '1px solid var(--panel-bg-2)',
    borderRadius: '20px',
    padding: '1.25rem',
    textAlign: 'left',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    boxSizing: 'border-box',
    maxHeight: '40vh',
    overflowY: 'auto'
};

const itemStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
};

const itemTitleStyle: React.CSSProperties = {
    fontSize: '0.9rem',
    color: '#ffffff',
    fontWeight: 700
};

const itemTextStyle: React.CSSProperties = {
    fontSize: '0.8rem',
    color: 'rgba(229, 231, 235, 0.65)',
    lineHeight: '1.4',
    margin: 0,
    fontWeight: 500
};

const textStyle: React.CSSProperties = {
    color: 'rgba(229, 231, 235, 0.75)',
    fontSize: '0.95rem',
    lineHeight: '1.5',
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

const acceptButtonStyle: React.CSSProperties = {
    background: '#6366f1',
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
    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.2)',
    width: '100%',
    outline: 'none'
};

const rejectButtonStyle: React.CSSProperties = {
    background: 'rgba(var(--color-rgb-light), 0.03)',
    color: 'rgba(229, 231, 235, 0.7)',
    border: '1px solid var(--panel-border)',
    borderRadius: '16px',
    padding: '1.1rem',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    width: '100%',
    outline: 'none',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.5rem'
};

export default PrivacyDisclaimerModal;
