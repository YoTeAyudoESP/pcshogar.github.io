import React, { useState, useEffect } from 'react';
import { useAppSettings } from '../../contexts/AppSettingsContext';
import { Lock, Delete, AlertCircle, Fingerprint, Users, User, Key } from 'lucide-react';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import UserAvatar from './UserAvatar';

const AppLockScreen: React.FC = () => {
    const { activeProfile, isAuthenticated, authenticate, setIsAuthenticated, settings, switchProfile } = useAppSettings();
    const [pin, setPin] = useState<string>('');
    const [error, setError] = useState<boolean>(false);
    const [shake, setShake] = useState<boolean>(false);
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(() => activeProfile?.id || null);

    // Sync selected profile state when active profile updates
    useEffect(() => {
        if (activeProfile && !selectedProfileId) {
            setSelectedProfileId(activeProfile.id);
        }
    }, [activeProfile]);

    const triggerBiometric = async () => {
        if (!activeProfile?.biometricEnabled || isAuthenticated) return;
        try {
            const result = await NativeBiometric.isAvailable();
            if (result.isAvailable) {
                await NativeBiometric.verifyIdentity({
                    reason: "Acceso a tu perfil en PCSHogar",
                    title: "Autenticación Biométrica",
                    subtitle: "Usa tu huella o rostro para desbloquear",
                    description: "Confirma tu identidad para continuar"
                });
                setIsAuthenticated(true);
            }
        } catch (err) {
            console.error("Biometric authentication error:", err);
        }
    };

    // Trigger biometric check on mount or active profile change
    useEffect(() => {
        if (activeProfile?.biometricEnabled && !isAuthenticated) {
            triggerBiometric();
        }
    }, [activeProfile, isAuthenticated]);

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
                if (success) {
                    setPin('');
                    setError(false);
                } else {
                    setError(true);
                    setShake(true);
                    setPin('');
                    setTimeout(() => setShake(false), 500);
                }
            };
            verify();
        }
    }, [pin, authenticate, activeProfile, isAuthenticated]);

    // Reset state when lock screen becomes active (user locks/logs out) or active profile changes
    useEffect(() => {
        if (!isAuthenticated) {
            setPin('');
            setError(false);
            setShake(false);
            if (activeProfile) {
                setSelectedProfileId(activeProfile.id);
            }
        }
    }, [isAuthenticated, activeProfile]);


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

    // If authenticated, don't show the lock screen
    if (isAuthenticated) {
        return null;
    }

    if (!activeProfile) {
        return null;
    }

    const hasPin = !!activeProfile.pinHash;
    const hasMultipleProfiles = !!(settings.profiles && settings.profiles.length > 1);

    // If the active profile has no PIN and there are no other profiles to switch to,
    // then we don't need a lock screen at all.
    if (!hasPin && !hasMultipleProfiles) {
        return null;
    }

    const showProfileSelection = hasMultipleProfiles && (!selectedProfileId || !hasPin);

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
                    background: rgba(var(--color-rgb-light), 0.25) !important;
                    transform: scale(0.95);
                }
                .profile-btn:hover {
                    background: rgba(var(--color-rgb-light), 0.08) !important;
                    border-color: rgba(99, 102, 241, 0.3) !important;
                    transform: translateY(-2px);
                }
                .profile-btn:active {
                    transform: scale(0.98);
                }
            `}} />
            
            {showProfileSelection ? (
                /* Profile Selection Card */
                <div style={{
                    ...cardStyle,
                    animation: 'lockFadeIn 0.5s ease-out'
                }}>
                    <div style={headerStyle}>
                        <div style={iconContainerStyle}>
                            <Users size={32} color="var(--color-primary, #6366f1)" />
                        </div>
                        <h2 style={titleStyle}>Seleccionar Perfil</h2>
                        <p style={subtitleStyle}>Elige tu usuario para acceder a la aplicación</p>
                    </div>

                    <div style={profileGridStyle}>
                        {settings.profiles?.map((p) => (
                            <button
                                key={p.id}
                                onClick={async () => {
                                    await switchProfile(p.id);
                                    if (p.pinHash) {
                                        setSelectedProfileId(p.id);
                                    }
                                }}
                                className="profile-btn"
                                style={profileButtonStyle}
                            >
                                <UserAvatar avatar={p.avatar} name={p.name} size={48} style={{ marginBottom: '8px' }} />
                                <span style={profileBtnNameStyle}>{p.name}</span>
                                {p.pinHash && (
                                    <span style={{ fontSize: '10px', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <Key size={10} /> PIN
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                /* Keypad Lock Screen Card */
                <div style={{
                    ...cardStyle,
                    animation: shake ? 'lockShake 0.4s ease-in-out' : 'lockFadeIn 0.5s ease-out'
                }}>
                    {/* Header */}
                    <div style={headerStyle}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <UserAvatar avatar={activeProfile.avatar} name={activeProfile.name} size={72} fontSize="28px" />
                            <div style={{ textAlign: 'center' }}>
                                <span style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Introducir PIN para</span>
                                <span style={{ fontSize: '22px', color: '#ffffff', fontWeight: '800', display: 'block', marginTop: '2px' }}>{activeProfile.name}</span>
                            </div>
                        </div>
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
                                        : 'rgba(var(--color-rgb-light), 0.2)',
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
                        {activeProfile?.biometricEnabled ? (
                            <button
                                onClick={triggerBiometric}
                                className="keypad-btn"
                                style={{ ...keypadButtonStyle, backgroundColor: 'rgba(99, 102, 241, 0.1)' }}
                                title="Desbloquear con biometría"
                            >
                                <Fingerprint size={24} color="var(--color-primary, #6366f1)" />
                            </button>
                        ) : (
                            <div style={{ width: '64px', height: '64px' }} />
                        )}
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

                    {/* Lock Switch link */}
                    {settings.profiles && settings.profiles.length > 1 && (
                        <button
                            onClick={() => {
                                setSelectedProfileId(null);
                                setPin('');
                                setError(false);
                            }}
                            className="profile-btn"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                background: 'var(--panel-bg-2)',
                                border: '1px solid var(--panel-border)',
                                color: '#cbd5e1',
                                padding: '12px 20px',
                                borderRadius: '100px',
                                fontSize: '13px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                marginTop: '24px',
                                width: '100%',
                                transition: 'all 0.2s ease',
                                outline: 'none',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }}
                        >
                            <Users size={16} color="var(--color-primary, #6366f1)" />
                            Cambiar de Usuario
                        </button>
                    )}
                </div>
            )}
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
    background: 'rgba(var(--color-rgb-light), 0.03)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid var(--panel-border)',
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
    background: 'var(--panel-bg-2)',
    border: '1px solid var(--panel-bg-2)',
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

const profileGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    width: '100%',
    marginTop: '12px'
};

const profileButtonStyle: React.CSSProperties = {
    background: 'rgba(var(--color-rgb-light), 0.03)',
    border: '1px solid var(--panel-border)',
    borderRadius: '16px',
    padding: '20px 10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
    color: '#ffffff'
};

const profileAvatarStyle: React.CSSProperties = {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'rgba(var(--color-rgb-light), 0.03)',
    border: '1px solid var(--panel-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px'
};

const profileBtnNameStyle: React.CSSProperties = {
    fontSize: '13.5px',
    fontWeight: '600',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    width: '100%',
    textAlign: 'center'
};

const backToProfilesButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '20px',
    transition: 'color 0.15s ease',
    outline: 'none',
    textDecoration: 'underline'
};

export default AppLockScreen;
