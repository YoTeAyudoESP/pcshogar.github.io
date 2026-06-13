import React, { useState, useEffect } from 'react';
import { useAppSettings } from '../../contexts/AppSettingsContext';
import { X, Camera, Lock, Check, Key, Trash2, ShieldAlert } from 'lucide-react';
import UserAvatar, { AVATAR_GRADIENTS } from '../common/UserAvatar';
import { useToast } from '../../contexts/ToastContext';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    profileId?: string; // If provided, edits that profile (for admin view). If omitted, edits active profile.
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, profileId }) => {
    const { settings, activeProfile, updateProfileName, updateProfileAvatar, setProfilePin } = useAppSettings();
    const { showToast } = useToast();

    // Determine which profile is being edited
    const targetProfile = profileId 
        ? settings.profiles?.find(p => p.id === profileId) || null 
        : activeProfile;

    const [name, setName] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState('');
    const [hasPin, setHasPin] = useState(false);
    
    // PIN states
    const [isConfiguringPin, setIsConfiguringPin] = useState(false);
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');

    useEffect(() => {
        if (targetProfile) {
            setName(targetProfile.name);
            setSelectedAvatar(targetProfile.avatar || 'gradient:1');
            setHasPin(!!targetProfile.pinHash);
            setIsConfiguringPin(false);
            setPin('');
            setConfirmPin('');
        }
    }, [targetProfile, isOpen]);

    if (!isOpen || !targetProfile) return null;

    const handleAvatarSelect = (avatarId: string) => {
        setSelectedAvatar(avatarId);
    };

    const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast('El archivo seleccionado debe ser una imagen.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                // Resize image to max 128x128 to keep localStorage clean and fast
                const canvas = document.createElement('canvas');
                const maxDim = 128;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxDim) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    }
                } else {
                    if (height > maxDim) {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                
                const base64 = canvas.toDataURL('image/jpeg', 0.85);
                setSelectedAvatar(base64);
                showToast('Foto cargada correctamente.', 'success');
            };
        };
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            showToast('El nombre no puede estar vacío.', 'error');
            return;
        }

        try {
            // 1. Update Profile Name
            if (name.trim() !== targetProfile.name) {
                await updateProfileName(targetProfile.id, name.trim());
            }

            // 2. Update Profile Avatar
            if (selectedAvatar !== targetProfile.avatar) {
                await updateProfileAvatar(targetProfile.id, selectedAvatar);
            }

            // 3. Update PIN if configured
            if (isConfiguringPin) {
                if (!pin) {
                    showToast('Introduce un PIN de 4 dígitos.', 'error');
                    return;
                }
                if (pin.length !== 4 || isNaN(Number(pin))) {
                    showToast('El PIN debe tener exactamente 4 dígitos numéricos.', 'error');
                    return;
                }
                if (pin !== confirmPin) {
                    showToast('Los PINs introducidos no coinciden.', 'error');
                    return;
                }
                await setProfilePin(pin, targetProfile.id);
                showToast('PIN configurado correctamente.', 'success');
            }

            showToast('Perfil actualizado correctamente.', 'success');
            onClose();
        } catch (err: any) {
            showToast(err.message || 'Error al guardar los cambios.', 'error');
        }
    };

    const handleRemovePin = async () => {
        if (window.confirm('¿Seguro que quieres quitar la protección por PIN de este perfil?')) {
            try {
                await setProfilePin(null, targetProfile.id);
                setHasPin(false);
                setIsConfiguringPin(false);
                showToast('PIN eliminado correctamente.', 'success');
            } catch (err: any) {
                showToast(err.message || 'Error al eliminar el PIN.', 'error');
            }
        }
    };

    return (
        <div style={overlayStyle}>
            <div style={modalStyle}>
                {/* Header */}
                <div style={headerStyle}>
                    <h3 style={titleStyle}>
                        {profileId ? `Editar Perfil de ${targetProfile.name}` : 'Editar Mi Perfil'}
                    </h3>
                    <button onClick={onClose} style={closeButtonStyle}>
                        <X size={20} color="#94a3b8" />
                    </button>
                </div>

                <form onSubmit={handleSave} style={formStyle}>
                    {/* Content Scrollable */}
                    <div style={contentStyle}>
                        
                        {/* Avatar Display & Preview */}
                        <div style={avatarPreviewSectionStyle}>
                            <UserAvatar avatar={selectedAvatar} name={name || 'User'} size={72} fontSize="28px" />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff' }}>Imagen o Avatar</span>
                                <label style={uploadButtonStyle}>
                                    <Camera size={14} style={{ marginRight: '6px' }} />
                                    Subir Foto
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={handleCustomImageUpload} 
                                        style={{ display: 'none' }} 
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Name Input */}
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Nombre de Usuario</label>
                            <input 
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Tu nombre..."
                                style={inputStyle}
                                required
                            />
                        </div>

                        {/* Predefined Gradients */}
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Gradientes Predefinidos</label>
                            <div style={avatarGridStyle}>
                                {AVATAR_GRADIENTS.map(gradient => {
                                    const isSelected = selectedAvatar === gradient.id;
                                    return (
                                        <button
                                            key={gradient.id}
                                            type="button"
                                            onClick={() => handleAvatarSelect(gradient.id)}
                                            style={{
                                                ...avatarOptionStyle,
                                                background: gradient.background,
                                                border: isSelected ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.08)',
                                                boxShadow: isSelected ? '0 0 12px rgba(99, 102, 241, 0.6)' : 'none',
                                                transform: isSelected ? 'scale(1.1)' : 'scale(1)'
                                            }}
                                        >
                                            {isSelected && <Check size={16} color="#ffffff" style={checkmarkOverlayStyle} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* PIN Security Section */}
                        <div style={pinSectionStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <Key size={16} color="var(--color-primary, #6366f1)" />
                                <span style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>Seguridad del Perfil</span>
                            </div>

                            {isConfiguringPin ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={pinLabelStyle}>Nuevo PIN (4 dígitos)</label>
                                            <input
                                                type="password"
                                                maxLength={4}
                                                value={pin}
                                                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                                                style={pinInputStyle}
                                                placeholder="••••"
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={pinLabelStyle}>Confirmar PIN</label>
                                            <input
                                                type="password"
                                                maxLength={4}
                                                value={confirmPin}
                                                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                                                style={pinInputStyle}
                                                placeholder="••••"
                                            />
                                        </div>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setIsConfiguringPin(false)}
                                        style={{ ...cancelButtonStyle, padding: '6px', fontSize: '11px', marginTop: '4px' }}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            ) : hasPin ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#34d399' }}>
                                        <Check size={14} />
                                        <span>Este perfil está protegido con PIN</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsConfiguringPin(true);
                                                setPin('');
                                                setConfirmPin('');
                                            }}
                                            style={secondaryButtonStyle}
                                        >
                                            Cambiar PIN
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleRemovePin}
                                            style={dangerButtonStyle}
                                        >
                                            <Trash2 size={13} style={{ marginRight: '4px' }} />
                                            Quitar PIN
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setIsConfiguringPin(true)}
                                        style={secondaryButtonStyle}
                                    >
                                        <Lock size={13} style={{ marginRight: '6px' }} />
                                        Configurar PIN de Acceso
                                    </button>
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Footer Actions */}
                    <div style={footerStyle}>
                        <button type="button" onClick={onClose} style={cancelButtonStyle}>
                            Cancelar
                        </button>
                        <button type="submit" style={saveButtonStyle}>
                            Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// CSS Styles
const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
};

const modalStyle: React.CSSProperties = {
    background: '#0f172a',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '20px',
    width: '380px',
    maxWidth: '90%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    overflow: 'hidden',
    animation: 'fadeIn 0.2s ease-out'
};

const headerStyle: React.CSSProperties = {
    padding: '18px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
};

const titleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: '16px',
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
    justifyContent: 'center'
};

const formStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
};

const contentStyle: React.CSSProperties = {
    padding: '20px',
    overflowY: 'auto',
    maxHeight: '60vh',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px'
};

const avatarPreviewSectionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    background: 'rgba(255, 255, 255, 0.02)',
    padding: '12px 14px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.04)'
};

const uploadButtonStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#e2e8f0',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '11.5px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    width: 'fit-content',
    transition: 'all 0.15s ease'
};

const inputGroupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
};

const labelStyle: React.CSSProperties = {
    fontSize: '12.5px',
    fontWeight: '600',
    color: '#94a3b8'
};

const inputStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    padding: '9px 12px',
    color: '#ffffff',
    fontSize: '13.5px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box'
};

const avatarGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '10px'
};

const avatarOptionStyle: React.CSSProperties = {
    width: '46px',
    height: '46px',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    position: 'relative',
    padding: 0,
    outline: 'none'
};

const checkmarkOverlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
};

const pinSectionStyle: React.CSSProperties = {
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
    paddingTop: '16px',
    display: 'flex',
    flexDirection: 'column'
};

const secondaryButtonStyle: React.CSSProperties = {
    background: 'rgba(99, 102, 241, 0.08)',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    color: 'var(--color-primary, #6366f1)',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '12.5px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
    width: '100%'
};

const dangerButtonStyle: React.CSSProperties = {
    background: 'rgba(244, 63, 94, 0.08)',
    border: '1px solid rgba(244, 63, 94, 0.2)',
    color: '#f43f5e',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '12.5px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease'
};

const pinLabelStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#94a3b8',
    marginBottom: '4px',
    display: 'block',
    fontWeight: '500'
};

const pinInputStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '8px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
    textAlign: 'center',
    width: '100%',
    boxSizing: 'border-box',
    letterSpacing: '0.3em'
};

const footerStyle: React.CSSProperties = {
    padding: '16px 20px',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px'
};

const cancelButtonStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '9px 16px',
    color: '#94a3b8',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
};

const saveButtonStyle: React.CSSProperties = {
    background: 'var(--color-primary, #6366f1)',
    border: 'none',
    borderRadius: '8px',
    padding: '9px 16px',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
};

export default EditProfileModal;
