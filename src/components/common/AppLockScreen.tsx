import React, { useState, useEffect } from 'react';
import { useAppSettings } from '../../contexts/AppSettingsContext';
import { Lock, Delete, AlertCircle } from 'lucide-react';

const AppLockScreen: React.FC = () => {
    const { activeProfile, isAuthenticated, authenticate } = useAppSettings();
    const [pin, setPin] = useState<string>('');
    const [error, setError] = useState<boolean>(false);
    const [shake, setShake] = useState<boolean>(false);

    const handleKeyPress = (num: string) => {
        if (!activeProfile?.pinHash || isAuthenticated) return;
        if (pin.length >= 4) return;
        setError(false);
        const newPin = pin + num;
        setPin(newPin);
    };

    const handleDelete = () => {
        if (!activeProfile?.pinHash || isAuthenticated) return;
        setPin(prev => prev.slice(0, -1));
        setError(false);
    };

    // Check PIN when it reaches 4 digits
    useEffect(() => {
        if (!activeProfile?.pinHash || isAuthenticated) return;
        if (pin.length === 4) {
            const verify = async () => {
                const success = await authenticate(pin);
                if (!success) {
                    setError(true);
                    setShake(true);
                    setPin('');
                    setTimeout(() => setShake(false), 500);
                }
            };
            verify();
        }
    }, [pin, authenticate, activeProfile, isAuthenticated]);

    // Handle physical keyboard inputs
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!activeProfile?.pinHash || isAuthenticated) return;
            if (e.key >= '0' && e.key <= '9') {
                handleKeyPress(e.key);
            } else if (e.key === 'Backspace') {
                handleDelete();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [pin, activeProfile, isAuthenticated]);

    // If profile has no PIN or is already authenticated, don't show the lock screen
    if (!activeProfile?.pinHash || isAuthenticated) {
        return null;
    }

    return (
        <div style={containerStyle}>
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes lockShake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-10px); }
                    75% { transform: translateX(10px); }
                }
                @keyframes lockFadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .keypad-btn:active {
                    background: rgba(255, 255, 255, 0.25) !important;
                    transform: scale(0.95);
                }
            `}} />
            
            <div style={{
                ...cardStyle,
                animation: shake ? 'lockShake 0.4s ease-in-out' : 'lockFadeIn 0.5s ease-out'
            }}>
                {/* Header */}
                <div style={headerStyle}>
                    <div style={iconContainerStyle}>
                        <Lock size={32} color="var(--color-primary, #6366f1)" />
                    </div>
                    <h2 style={titleStyle}>Aplicación Protegida</h2>
                    <p style={subtitleStyle}>Introduce tu PIN para acceder al perfil de {activeProfile.name}</p>
                </div>

                {/* PIN Display Dots */}
                <div style={dotsContainerStyle}>
                    {[0, 1, 2, 3].map((index) => (
                        <div
                            key={index}
                            style={{
                                ...dotStyle,
                                backgroundColor: index < pin.length 
                                    ? 'var(--color-primary, #6366f1)' 
                                    : 'rgba(255, 255, 255, 0.2)',
                                transform: index < pin.length ? 'scale(1.2)' : 'scale(1)',
                                boxShadow: index < pin.length 
                                    ? '0 0 10px var(--color-primary, #6366f1)' 
                                    : 'none'
                            }}
                        />
                    ))}
                </div>

                {/* Error message */}
                {error && (
                    <div style={errorContainerStyle}>
                        <AlertCircle size={16} color="#ef4444" style={{ marginRight: '6px' }} />
                        <span style={errorTextStyle}>PIN incorrecto. Inténtalo de nuevo.</span>
                    </div>
                )}

                {/* Keypad */}
                <div style={keypadGridStyle}>
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                        <button
                            key={num}
                            onClick={() => handleKeyPress(num)}
                            className="keypad-btn"
                            style={keypadButtonStyle}
                        >
                            {num}
                        </button>
                    ))}
                    <div style={{ width: '64px', height: '64px' }} /> {/* Placeholder */}
                    <button
                        onClick={() => handleKeyPress('0')}
                        className="keypad-btn"
                        style={keypadButtonStyle}
                    >
                        0
                    </button>
                    <button
                        onClick={handleDelete}
                        className="keypad-btn"
                        style={{ ...keypadButtonStyle, backgroundColor: 'rgba(255, 0, 0, 0.1)' }}
                    >
                        <Delete size={20} color="#f43f5e" />
                    </button>
                </div>
            </div>
        </div>
    );
};

// Styles using vanilla inline styles for maximum safety and customization
const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundImage: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
};

const cardStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '24px',
    padding: '40px 32px',
    width: '380px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
};

const headerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '28px',
    textAlign: 'center'
};

const iconContainerStyle: React.CSSProperties = {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'rgba(99, 102, 241, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
    border: '1px solid rgba(99, 102, 241, 0.2)'
};

const titleStyle: React.CSSProperties = {
    fontSize: '22px',
    fontWeight: '700',
    color: '#ffffff',
    margin: '0 0 8px 0',
    letterSpacing: '-0.025em'
};

const subtitleStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#94a3b8',
    margin: 0,
    lineHeight: '1.5',
    padding: '0 10px'
};

const dotsContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '16px',
    marginBottom: '20px',
    height: '24px',
    alignItems: 'center'
};

const dotStyle: React.CSSProperties = {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
};

const errorContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '8px',
    padding: '6px 12px',
    marginBottom: '24px',
    animation: 'lockFadeIn 0.3s ease-out'
};

const errorTextStyle: React.CSSProperties = {
    color: '#f87171',
    fontSize: '12.5px',
    fontWeight: '500'
};

const keypadGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px 24px',
    justifyItems: 'center',
    width: '100%'
};

const keypadButtonStyle: React.CSSProperties = {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    color: '#ffffff',
    fontSize: '22px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
    outline: 'none'
};

export default AppLockScreen;
