import React, { useState } from 'react';
import { useAppSettings } from '../../contexts/AppSettingsContext';
import { User, Shield, Key, Trash2, Plus, Check, X, Users, Eye } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import UserAvatar from '../common/UserAvatar';
import EditProfileModal from './EditProfileModal';

const UserManagementView: React.FC = () => {
    const { settings, addProfile, deleteProfile, updateProfileShare } = useAppSettings();
    const { showToast } = useToast();
    
    // State for creating a new user profile
    const [isCreating, setIsCreating] = useState(false);
    const [newUserName, setNewUserName] = useState('');
    const [newUserPin, setNewUserPin] = useState('');
    const [selectedEconomies, setSelectedEconomies] = useState<string[]>([]);
    
    // State for editing shared economies of an existing user profile
    const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
    const [editingEconomies, setEditingEconomies] = useState<string[]>([]);

    // State for editing user profile (name, avatar, pin)
    const [editingProfileModalId, setEditingProfileModalId] = useState<string | null>(null);

    const profiles = settings.profiles || [];
    const principalProfile = profiles.find(p => p.id === 'prof_default');
    
    // The Principal profile's economies are the ones available to be shared
    const shareableEconomies = principalProfile?.economies || [];

    const handleCreateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUserName.trim()) {
            showToast('El nombre de usuario es obligatorio.', 'error');
            return;
        }
        if (newUserPin && (newUserPin.length !== 4 || isNaN(Number(newUserPin)))) {
            showToast('El PIN debe ser exactamente de 4 dígitos numéricos.', 'error');
            return;
        }

        try {
            await addProfile(newUserName.trim(), selectedEconomies, newUserPin || undefined);
            showToast(`Perfil "${newUserName}" creado correctamente.`, 'success');
            // Reset state
            setNewUserName('');
            setNewUserPin('');
            setSelectedEconomies([]);
            setIsCreating(false);
        } catch (err: any) {
            showToast(err.message || 'Error al crear el perfil.', 'error');
        }
    };

    const handleDeleteProfile = async (profileId: string, name: string) => {
        try {
            await deleteProfile(profileId);
            showToast(`Perfil "${name}" eliminado correctamente.`, 'success');
        } catch (err: any) {
            showToast(err.message || 'Error al eliminar el perfil.', 'error');
        }
    };

    const handleStartEditShare = (profileId: string, currentSharedEcoIds: string[]) => {
        setEditingProfileId(profileId);
        setEditingEconomies(currentSharedEcoIds);
    };

    const handleSaveShare = async (profileId: string) => {
        try {
            await updateProfileShare(profileId, editingEconomies);
            showToast('Permisos de entornos actualizados con éxito.', 'success');
            setEditingProfileId(null);
        } catch (err: any) {
            showToast(err.message || 'Error al actualizar permisos.', 'error');
        }
    };

    const toggleEconomySelection = (economyId: string, isEditing: boolean) => {
        if (isEditing) {
            setEditingEconomies(prev => 
                prev.includes(economyId) 
                    ? prev.filter(id => id !== economyId) 
                    : [...prev, economyId]
            );
        } else {
            setSelectedEconomies(prev => 
                prev.includes(economyId) 
                    ? prev.filter(id => id !== economyId) 
                    : [...prev, economyId]
            );
        }
    };

    return (
        <div style={containerStyle}>
            {/* Header */}
            <div style={headerStyle}>
                <div style={titleAreaStyle}>
                    <Users size={22} color="var(--color-primary, #6366f1)" />
                    <h3 style={titleStyle}>Gestión de Usuarios</h3>
                </div>
                {!isCreating && (
                    <button onClick={() => setIsCreating(true)} style={addButtonStyle}>
                        <Plus size={16} style={{ marginRight: '6px' }} />
                        Nuevo Usuario
                    </button>
                )}
            </div>

            {/* Create New User Section */}
            {isCreating && (
                <div style={formCardStyle}>
                    <div style={formHeaderStyle}>
                        <h4 style={formTitleStyle}>Crear Perfil de Usuario Secundario</h4>
                        <button onClick={() => setIsCreating(false)} style={cancelIconButtonStyle}>
                            <X size={18} color="#94a3b8" />
                        </button>
                    </div>
                    <form onSubmit={handleCreateProfile} style={formStyle}>
                        <div style={rowStyle}>
                            <div style={{ ...inputGroupStyle, flex: 1 }}>
                                <label style={labelStyle}>Nombre del Usuario</label>
                                <input
                                    type="text"
                                    placeholder="Ej. María, Hijo..."
                                    value={newUserName}
                                    onChange={(e) => setNewUserName(e.target.value)}
                                    style={inputStyle}
                                    required
                                />
                            </div>
                            <div style={{ ...inputGroupStyle, width: '120px' }}>
                                <label style={labelStyle}>PIN de Acceso</label>
                                <input
                                    type="password"
                                    maxLength={4}
                                    placeholder="4 dígitos (opcional)"
                                    value={newUserPin}
                                    onChange={(e) => setNewUserPin(e.target.value.replace(/\D/g, ''))}
                                    style={{ ...inputStyle, textAlign: 'center', letterSpacing: newUserPin ? '0.2em' : 'normal' }}
                                />
                            </div>
                        </div>

                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Compartir Entornos Económicos</label>
                            <span style={hintStyle}>Selecciona las economías a las que este usuario tendrá acceso de lectura y escritura:</span>
                            <div style={checklistGridStyle}>
                                {shareableEconomies.map((eco) => (
                                    <label
                                        key={eco.id}
                                        style={{
                                            ...checkItemStyle,
                                            border: selectedEconomies.includes(eco.id)
                                                ? '1px solid rgba(99, 102, 241, 0.4)'
                                                : '1px solid rgba(255, 255, 255, 0.08)',
                                            background: selectedEconomies.includes(eco.id)
                                                ? 'rgba(99, 102, 241, 0.05)'
                                                : 'rgba(255, 255, 255, 0.01)'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedEconomies.includes(eco.id)}
                                            onChange={() => toggleEconomySelection(eco.id, false)}
                                            style={checkboxStyle}
                                        />
                                        <span style={checkLabelStyle}>{eco.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div style={formActionsStyle}>
                            <button type="button" onClick={() => setIsCreating(false)} style={cancelButtonStyle}>
                                Cancelar
                            </button>
                            <button type="submit" style={saveButtonStyle}>
                                Crear Perfil
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Profiles List */}
            <div style={listContainerStyle}>
                {profiles.map((p) => {
                    const isPrincipal = p.id === 'prof_default';
                    const isEditing = editingProfileId === p.id;
                    const sharedEcoIds = p.economies.map(e => e.id);

                    return (
                        <div key={p.id} style={profileCardStyle}>
                            {/* Profile Info */}
                            <div style={profileMainStyle}>
                                <div style={avatarContainerStyle}>
                                    <UserAvatar avatar={p.avatar} name={p.name} size={44} />
                                </div>
                                <div style={profileMetaStyle}>
                                    <div style={profileNameAreaStyle}>
                                        <span style={profileNameStyle}>{p.name}</span>
                                        {isPrincipal && <span style={principalBadgeStyle}>Principal</span>}
                                        {p.pinHash && (
                                            <span style={securityBadgeStyle} title="PIN configurado">
                                                <Key size={10} style={{ marginRight: '3px' }} /> PIN
                                            </span>
                                        )}
                                        {p.biometricEnabled && (
                                            <span style={securityBadgeStyle} title="Biometría habilitada">
                                                <Shield size={10} style={{ marginRight: '3px' }} /> Biometría
                                            </span>
                                        )}
                                    </div>
                                    <div style={profileSubtitleStyle}>
                                        {isPrincipal 
                                            ? `Administrador con acceso a todos los entornos (${p.economies.length})` 
                                            : `Usuario secundario con acceso a ${p.economies.length} entorno(s)`}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={profileActionsStyle}>
                                    {!isPrincipal ? (
                                        !isEditing ? (
                                            <>
                                                <button
                                                    onClick={() => setEditingProfileModalId(p.id)}
                                                    style={actionSecondaryButtonStyle}
                                                >
                                                    Editar Perfil
                                                </button>
                                                <button
                                                    onClick={() => handleStartEditShare(p.id, sharedEcoIds)}
                                                    style={actionSecondaryButtonStyle}
                                                >
                                                    Editar Accesos
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteProfile(p.id, p.name)}
                                                    style={actionDeleteButtonStyle}
                                                    title="Eliminar Perfil"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => handleSaveShare(p.id)}
                                                    style={actionSaveButtonStyle}
                                                >
                                                    <Check size={14} style={{ marginRight: '4px' }} />
                                                    Guardar
                                                </button>
                                                <button
                                                    onClick={() => setEditingProfileId(null)}
                                                    style={actionCancelButtonStyle}
                                                >
                                                    <X size={14} />
                                                </button>
                                            </>
                                        )
                                    ) : (
                                        <button
                                            onClick={() => setEditingProfileModalId(p.id)}
                                            style={actionSecondaryButtonStyle}
                                        >
                                            Editar Perfil
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Shared Economies List / Editor */}
                            <div style={sharedSectionStyle}>
                                <div style={sharedSectionTitleStyle}>
                                    <Eye size={12} style={{ marginRight: '4px' }} />
                                    Acceso a Entornos Económicos:
                                </div>
                                {isEditing ? (
                                    <div style={checklistGridStyle}>
                                        {shareableEconomies.map((eco) => (
                                            <label
                                                key={eco.id}
                                                style={{
                                                    ...checkItemStyle,
                                                    border: editingEconomies.includes(eco.id)
                                                        ? '1px solid rgba(99, 102, 241, 0.4)'
                                                        : '1px solid rgba(255, 255, 255, 0.08)',
                                                    background: editingEconomies.includes(eco.id)
                                                        ? 'rgba(99, 102, 241, 0.05)'
                                                        : 'rgba(255, 255, 255, 0.01)'
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={editingEconomies.includes(eco.id)}
                                                    onChange={() => toggleEconomySelection(eco.id, true)}
                                                    style={checkboxStyle}
                                                />
                                                <span style={checkLabelStyle}>{eco.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={badgesContainerStyle}>
                                        {p.economies.length > 0 ? (
                                            p.economies.map(eco => (
                                                <span key={eco.id} style={economyBadgeStyle}>
                                                    {eco.name}
                                                </span>
                                            ))
                                        ) : (
                                            <span style={noEconomiesTextStyle}>Ninguno (sin accesos)</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <EditProfileModal
                isOpen={editingProfileModalId !== null}
                onClose={() => setEditingProfileModalId(null)}
                profileId={editingProfileModalId || undefined}
            />
        </div>
    );
};

// Styles for UserManagementView
const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    animation: 'fadeIn 0.3s ease-out'
};

const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: '12px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
};

const titleAreaStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
};

const titleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: '18px',
    fontWeight: '700',
    color: '#ffffff'
};

const addButtonStyle: React.CSSProperties = {
    background: 'var(--color-primary, #6366f1)',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 14px',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'opacity 0.15s ease'
};

const formCardStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
};

const formHeaderStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
};

const formTitleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: '14.5px',
    fontWeight: '700',
    color: '#ffffff'
};

const cancelIconButtonStyle: React.CSSProperties = {
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
    gap: '16px'
};

const rowStyle: React.CSSProperties = {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap'
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

const hintStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#64748b',
    lineHeight: '1.4'
};

const inputStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    padding: '10px 14px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.15s ease'
};

const checklistGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '10px',
    marginTop: '6px'
};

const checkItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
};

const checkboxStyle: React.CSSProperties = {
    cursor: 'pointer',
    width: '16px',
    height: '16px',
    accentColor: 'var(--color-primary, #6366f1)'
};

const checkLabelStyle: React.CSSProperties = {
    fontSize: '13px',
    color: '#e2e8f0',
    fontWeight: '500'
};

const formActionsStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '8px'
};

const cancelButtonStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.05)',
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

const listContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
};

const profileCardStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.01)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '16px',
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
};

const profileMainStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '14px'
};

const avatarContainerStyle: React.CSSProperties = {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
};

const profileMetaStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
};

const profileNameAreaStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap'
};

const profileNameStyle: React.CSSProperties = {
    fontSize: '15px',
    fontWeight: '700',
    color: '#ffffff'
};

const principalBadgeStyle: React.CSSProperties = {
    fontSize: '10.5px',
    fontWeight: '700',
    color: 'var(--color-primary, #6366f1)',
    background: 'rgba(99, 102, 241, 0.12)',
    padding: '1.5px 8px',
    borderRadius: '12px'
};

const securityBadgeStyle: React.CSSProperties = {
    fontSize: '10px',
    fontWeight: '600',
    color: '#34d399',
    background: 'rgba(52, 211, 153, 0.08)',
    padding: '1.5px 6px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center'
};

const profileSubtitleStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#64748b'
};

const profileActionsStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
};

const actionSecondaryButtonStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '6px 12px',
    color: '#e2e8f0',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
};

const actionDeleteButtonStyle: React.CSSProperties = {
    background: 'rgba(244, 63, 94, 0.1)',
    border: '1px solid rgba(244, 63, 94, 0.2)',
    borderRadius: '8px',
    padding: '6px',
    color: '#f43f5e',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease'
};

const actionSaveButtonStyle: React.CSSProperties = {
    background: '#10b981',
    border: 'none',
    borderRadius: '8px',
    padding: '6px 12px',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.15s ease'
};

const actionCancelButtonStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '6px',
    color: '#94a3b8',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease'
};

const sharedSectionStyle: React.CSSProperties = {
    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
    paddingTop: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
};

const sharedSectionTitleStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center'
};

const badgesContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap'
};

const economyBadgeStyle: React.CSSProperties = {
    fontSize: '11.5px',
    fontWeight: '600',
    color: '#e2e8f0',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    padding: '3px 10px',
    borderRadius: '16px'
};

const noEconomiesTextStyle: React.CSSProperties = {
    fontSize: '11.5px',
    color: '#64748b',
    fontStyle: 'italic'
};

export default UserManagementView;
